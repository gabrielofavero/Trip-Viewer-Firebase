#!/usr/bin/env python3
"""
Run Firestore data migrations against a live Firebase project WITHOUT deploying
any Cloud Functions to production.

Replaces the old manual workflow:
    expose migration(s) on functions/src/index.ts  →  npm run functions
    →  hit http://localhost:5001/... with Postman  →  remove from index

with a single automated command:

    1. Build functions and temporarily generate functions/src/index.ts that
       exposes ONLY the selected migration(s) (initLocalDb is never included).
    2. Start the Functions emulator ALONE (--only functions) against the target
       project's REAL Firestore (no Firestore emulator is started, so the admin
       SDK connects to the live project -- exactly like the manual flow).
    3. Invoke each selected migration over http://localhost:5001.
    4. Restore the original functions/src/index.ts (revert everything).
    5. Mark successful non-dry-run runs as completed per environment, so they
       are NOT offered again automatically on the next deploy.

Usage:
    python scripts/build/run-migrations.py --project <dev|prd>          # interactive
    python scripts/build/run-migrations.py --project dev --ids 18,19    # non-interactive
    npm run migrations -- --project dev                                  # npm wrapper

Internal/dev flags:
    --generate-only   generate temp index + build + restore, but do NOT start
                      the emulator or touch the database (CI / sanity check).

Config: scripts/build/migrations-config.json  (runnable migrations + inputs)
State:  scripts/build/migrations-state.json   (per-env completed map)
"""

import argparse
import json
import os
import re
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Repository root (two levels up from scripts/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
FUNCTIONS_DIR = BASE_DIR / "functions"
INDEX_TS_PATH = FUNCTIONS_DIR / "src" / "index.ts"
MIGRATIONS_CONFIG_PATH = BASE_DIR / "scripts" / "build" / "migrations-config.json"
MIGRATIONS_STATE_PATH = BASE_DIR / "scripts" / "build" / "migrations-state.json"
FUNCTIONS_REGION = "us-central1"
EMULATOR_READY_TIMEOUT = 180  # seconds to wait for the Functions emulator to boot


# ============================================================
# Colors
# ============================================================

class Colors:
    BOLD = '\033[1m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RED = '\033[91m'
    RESET = '\033[0m'


# ============================================================
# Utility Functions
# ============================================================

def run_command(cmd, capture_output=True, check=True):
    """Run a shell command and return the result."""
    result = subprocess.run(
        cmd,
        shell=True,
        capture_output=capture_output,
        text=True,
        check=False,
    )
    if check and result.returncode != 0:
        print(f"Error: Command failed with exit code {result.returncode}", file=sys.stderr)
        print(f"Output: {result.stdout}", file=sys.stderr)
        print(f"Error: {result.stderr}", file=sys.stderr)
        sys.exit(result.returncode)
    return result


def load_functions_port():
    """Read the Functions emulator port from firebase.json (default 5001)."""
    try:
        fjson = json.loads((BASE_DIR / "firebase.json").read_text(encoding="utf-8"))
        return int(fjson.get("emulators", {}).get("functions", {}).get("port", 5001))
    except (OSError, ValueError, json.JSONDecodeError):
        return 5001


def resolve_project(value):
    """Resolve a .firebaserc alias (dev/prd) to its project id, or pass through."""
    firebaserc = BASE_DIR / ".firebaserc"
    if firebaserc.exists() and value:
        try:
            projects = json.loads(firebaserc.read_text(encoding="utf-8")).get("projects", {})
            if value in projects:
                return projects[value]
        except json.JSONDecodeError:
            pass
    return value


def get_active_project():
    """Return the active `firebase use` project alias/id, or ''."""
    result = run_command("firebase use", capture_output=True, check=False)
    return result.stdout.strip()


def is_port_free(port):
    """True when nothing is listening on the given TCP port."""
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            return False
    except OSError:
        return True


def resolve_firebase_cmd():
    """Return the Firebase CLI executable path for Popen (handles the Windows
    `.cmd` shim and a local node_modules/.bin install)."""
    import shutil
    names = ["firebase.cmd", "firebase"] if os.name == "nt" else ["firebase"]
    for name in names:
        found = shutil.which(name)
        if found:
            return found
    local_bin = BASE_DIR / "node_modules" / ".bin"
    for name in names:
        candidate = local_bin / name
        if candidate.exists():
            return str(candidate)
    return names[0]


# ============================================================
# Migrations Config / State
# ============================================================

def load_migrations_config():
    """Load the runnable-migrations config (scripts/build/migrations-config.json)."""
    if not MIGRATIONS_CONFIG_PATH.exists():
        print(
            f"{Colors.YELLOW}Migrations config not found at {MIGRATIONS_CONFIG_PATH}.{Colors.RESET}",
            file=sys.stderr,
        )
        return {"region": FUNCTIONS_REGION, "runnable": []}
    return json.loads(MIGRATIONS_CONFIG_PATH.read_text(encoding="utf-8"))


def load_migrations_state():
    """Load the per-environment migration run state."""
    if not MIGRATIONS_STATE_PATH.exists():
        return {}
    try:
        return json.loads(MIGRATIONS_STATE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_migrations_state(state):
    """Persist the per-environment migration run state."""
    MIGRATIONS_STATE_PATH.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    print(f"{Colors.GREEN}✓{Colors.RESET} Saved migration run state to {MIGRATIONS_STATE_PATH.name}.")


# ============================================================
# Temporary index generation
# ============================================================

def find_migration_file(mid):
    """Return the migration source file for a config id (e.g. 18 →
    '18-migrate-trip-destination-metadata.ts')."""
    migrations_dir = FUNCTIONS_DIR / "src" / "migrations"
    pattern = re.compile(rf"^{re.escape(str(mid))}-migrate-.*\.ts$")
    for p in sorted(migrations_dir.iterdir()):
        if p.is_file() and pattern.match(p.name):
            return p.name
    raise FileNotFoundError(
        f"No migration source file for id {mid} in {migrations_dir} "
        f"(expected '{mid}-migrate-*.ts')."
    )


def build_temp_index(selected):
    """Generate functions/src/index.ts exposing ONLY the selected migrations."""
    lines = [
        "import * as admin from 'firebase-admin';",
        "",
        "admin.initializeApp();",
        "",
        "// ============================================================",
        "// TEMPORARY index generated by scripts/build/run-migrations.py",
        "// Exposes ONLY the selected migration functions so the Functions",
        "// emulator can serve them against the live Firestore. The original",
        "// functions/src/index.ts is restored automatically afterwards.",
        "// initLocalDb is intentionally NEVER included.",
        "// DO NOT EDIT BY HAND.",
        "// ============================================================",
        "",
    ]
    for m in selected:
        fid = str(m["id"])
        func = m["function"]
        file = find_migration_file(fid)
        mod = f"migrate_{fid}"
        # Import without the `.ts` extension (allowImportingTsExtensions is off).
        lines.append(f"import * as {mod} from './migrations/{file[:-3]}';")
        lines.append(f"export const {func} = {mod}.migrate;")
        lines.append("")
    return "\n".join(lines)


def temp_index_context(selected):
    """Context manager: backup index.ts → write temp index → restore original."""
    original = INDEX_TS_PATH.read_text(encoding="utf-8")
    INDEX_TS_PATH.write_text(build_temp_index(selected), encoding="utf-8")
    print(
        f"{Colors.BLUE}Temporary index.ts written with {len(selected)} migration "
        f"export(s).{Colors.RESET}"
    )
    return original


def restore_index(original):
    """Restore the original functions/src/index.ts contents."""
    INDEX_TS_PATH.write_text(original, encoding="utf-8")
    print(
        f"{Colors.GREEN}✓{Colors.RESET} Restored functions/src/index.ts "
        f"(temporary migration exports reverted)."
    )


def build_functions():
    """Compile the functions package (tsc → functions/lib)."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}Building functions...{Colors.RESET}")
    run_command("npm --prefix functions run build", capture_output=False, check=True)
    print(f"{Colors.GREEN}✓{Colors.RESET} Functions build complete.")


# ============================================================
# Selection & input prompts
# ============================================================

def select_migrations(project, runnable, completed):
    """Prompt the user to pick one or more migrations to run. Returns a list of
    migration dicts (empty when the user is done)."""
    pending = [m for m in runnable if str(m["id"]) not in completed]
    rerunnable = [m for m in runnable if str(m["id"]) in completed]

    print(f"\n{Colors.BOLD}{Colors.CYAN}Migrations on {project}{Colors.RESET}")
    if pending:
        for i, m in enumerate(pending, 1):
            print(f"  {Colors.BLUE}{i}.{Colors.RESET} [{m['id']}] {m['label']}")
    else:
        print(f"  {Colors.YELLOW}(all runnable migrations already completed){Colors.RESET}")

    if rerunnable:
        print(f"  {Colors.BLUE}r.{Colors.RESET} Re-run an already-completed migration")

    while True:
        choice = input(
            "\nSelect migration(s) to run (comma-separated numbers or IDs,"
            + (" r = re-run completed," if rerunnable else "")
            + " 0 = skip): "
        ).strip().lower()

        if choice in ("0", ""):
            return []
        if choice == "r" and rerunnable:
            return prompt_rerun_selection(rerunnable)

        try:
            indices = [int(x) for x in choice.replace(" ", "").split(",") if x]
        except ValueError:
            print(f"{Colors.RED}Invalid selection.{Colors.RESET}")
            continue

        selected = []
        for idx in indices:
            if 1 <= idx <= len(pending):
                selected.append(pending[idx - 1])
            else:
                # Also accept the migration's own ID (e.g. typing "18" instead
                # of its list index "1").
                match = [m for m in pending if int(m["id"]) == idx]
                if match:
                    selected.append(match[0])
                else:
                    print(f"{Colors.YELLOW}Ignoring out-of-range selection: {idx}{Colors.RESET}")
        if selected:
            return selected
        print(f"{Colors.RED}No valid migrations selected.{Colors.RESET}")


def prompt_rerun_selection(rerunnable):
    """Pick from already-completed migrations to re-run."""
    print(f"\n  {Colors.CYAN}Completed migrations available to re-run:{Colors.RESET}")
    labels = "abcdefghijklmnopqrstuvwxyz"
    for i, m in enumerate(rerunnable):
        letter = labels[i] if i < len(labels) else str(i + 1)
        print(f"    {letter}) [{m['id']}] {m['label']}")
    choice = input("  Select (letters or numbers, comma-separated, 0 = cancel): ").strip().lower()
    if choice in ("0", ""):
        return []
    selected = []
    for token in choice.replace(" ", "").split(","):
        if not token:
            continue
        for i, m in enumerate(rerunnable):
            key = labels[i] if i < len(labels) else str(i + 1)
            if token == key or token == str(i + 1):
                selected.append(m)
                break
    return selected


def collect_selection(project, runnable, completed):
    """Loop the selection menu until the user is done picking migrations."""
    selected = []
    while True:
        batch = select_migrations(project, runnable, completed)
        if not batch:
            break
        selected.extend(batch)
        more = input(f"\n{Colors.CYAN}Select more migrations?{Colors.RESET} [y/N]: ").strip().lower()
        if more not in ("y", "yes"):
            break
    return selected


def select_by_ids(ids_arg, runnable):
    """Non-interactive selection from --ids (e.g. '18,19')."""
    ids = [x.strip() for x in ids_arg.split(",") if x.strip()]
    selected = []
    for sid in ids:
        matches = [m for m in runnable if str(m["id"]) == sid]
        if not matches:
            print(f"{Colors.YELLOW}Unknown / not-runnable migration id: {sid}. Ignoring.{Colors.RESET}")
            continue
        selected.append(matches[0])
    return selected


def prompt_migration_input(field):
    """Prompt for one declared input field. Returns the value to send, or None
    when the user chooses to ignore/omit the field."""
    ftype = field.get("type", "string")
    name = field.get("name", "?")
    label = field.get("label", name)
    default = field.get("default")
    has_default = default is not None

    if ftype == "bool":
        default_bool = default is True
        bracket = "[Y/n/i]" if default_bool else "[y/N/i]"
        raw = input(f"    {label} {bracket} (i = ignore): ").strip().lower()
        if raw in ("i", "ignore"):
            return None
        if raw in ("y", "yes"):
            return "true"
        if raw in ("n", "no"):
            return "false"
        return "true" if default_bool else "false"

    if ftype == "string[]":
        default_text = ", ".join(default) if isinstance(default, list) else (default or "")
        raw = input(f"    {label} (comma-separated; 'i' to ignore) [{default_text}]: ").strip()
        if not raw or raw.lower() in ("i", "ignore"):
            return default if has_default else None
        return [x.strip() for x in raw.split(",") if x.strip()]

    if ftype == "number":
        raw = input(f"    {label} ('i' to ignore) [{default}]: ").strip()
        if not raw or raw.lower() in ("i", "ignore"):
            return default if has_default else None
        try:
            return int(raw)
        except ValueError:
            return raw

    # string
    default_text = default if has_default else ""
    raw = input(f"    {label} ('i' to ignore) [{default_text}]: ").strip()
    if not raw or raw.lower() in ("i", "ignore"):
        return default if has_default else None
    return raw


def prompt_migration_inputs(migration):
    """Ask the user for each declared query param / body field. Returns
    (query_params, body_fields) containing only the values the user sent."""
    query_params = {}
    body_fields = {}
    params = migration.get("params") or []
    body = migration.get("body") or []

    if not params and not body:
        print("    (no configurable inputs — running with defaults)")
        return query_params, body_fields

    for field in params:
        value = prompt_migration_input(field)
        if value is not None:
            query_params[field["name"]] = value
    for field in body:
        value = prompt_migration_input(field)
        if value is not None:
            body_fields[field["name"]] = value
    return query_params, body_fields


# ============================================================
# Emulator lifecycle & migration invocation
# ============================================================

def start_emulator(project):
    """Start the Functions emulator alone against the project's real Firestore."""
    port = load_functions_port()
    if not is_port_free(port):
        print(
            f"{Colors.RED}Port {port} (Functions emulator) is already in use.{Colors.RESET}",
            file=sys.stderr,
        )
        print(
            f"{Colors.YELLOW}Stop any running dev/emulator process first "
            f"(e.g. `npm run kill-ports`).{Colors.RESET}",
            file=sys.stderr,
        )
        sys.exit(1)

    cmd = [resolve_firebase_cmd(), "emulators:start", "--only", "functions", "--project", project]

    print(f"\n{Colors.BOLD}{Colors.MAGENTA}Starting Functions emulator on {project}...{Colors.RESET}")
    return subprocess.Popen(
        cmd,
        cwd=str(BASE_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def stop_emulator(proc):
    """Terminate the emulator process tree (taskkill on Windows)."""
    if proc is None or proc.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
            capture_output=True,
            check=False,
        )
    else:
        proc.terminate()
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            proc.kill()


def invoke_migration(project, region, func, query_params, body_fields):
    """Invoke a migration over the local Functions emulator. Returns
    {ok: bool, dry_run: bool}, or None on a network-level failure."""
    port = load_functions_port()
    url = f"http://localhost:{port}/{project}/{region}/{func}"
    if query_params:
        url += "?" + urllib.parse.urlencode(query_params)
    payload = json.dumps(body_fields).encode("utf-8") if body_fields else None

    print(f"  {Colors.CYAN}POST {url}{Colors.RESET}")
    req = urllib.request.Request(url, data=payload, method="POST")
    if payload is not None:
        req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=600) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            status = resp.status
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", errors="replace")
        status = err.code
    except urllib.error.URLError as err:
        print(f"{Colors.RED}  ✗ Network error calling {func}: {err.reason}{Colors.RESET}")
        return None

    ok = status == 200
    try:
        parsed = json.loads(raw)
        print(json.dumps(parsed, indent=2))
        ok = ok and parsed.get("success", True) is not False
    except json.JSONDecodeError:
        print(raw)

    if ok:
        print(f"{Colors.GREEN}  ✓ {func} finished (HTTP {status}).{Colors.RESET}")
    else:
        print(f"{Colors.RED}  ✗ {func} returned HTTP {status}.{Colors.RESET}")
    return {"ok": ok, "dry_run": query_params.get("dryRun") == "true"}


def run_jobs_under_emulator(project, region, jobs):
    """Start the emulator, wait for readiness, run each job, then shut down."""
    proc = start_emulator(project)
    ready = threading.Event()
    backend_errors = []

    def reader():
        try:
            for line in proc.stdout:
                line = line.rstrip("\n")
                if not line.strip():
                    continue
                print(line)
                lower = line.lower()
                if (
                    "all emulators ready" in lower
                    or "functions emulator started" in lower
                    or "http function initialized" in lower
                ):
                    ready.set()
                if (
                    "cannot determine backend" in lower
                    or "failed to load function definition" in lower
                ):
                    backend_errors.append(line)
        except Exception:
            pass

    threading.Thread(target=reader, daemon=True).start()

    try:
        deadline = time.time() + EMULATOR_READY_TIMEOUT
        while time.time() < deadline:
            if ready.is_set():
                break
            if proc.poll() is not None:
                print(
                    f"{Colors.RED}✗ Functions emulator exited early "
                    f"(code {proc.returncode}).{Colors.RESET}",
                    file=sys.stderr,
                )
                sys.exit(proc.returncode or 1)
            time.sleep(0.5)
        else:
            print(
                f"{Colors.RED}✗ Functions emulator did not become ready within "
                f"{EMULATOR_READY_TIMEOUT}s.{Colors.RESET}",
                file=sys.stderr,
            )
            sys.exit(1)

        if backend_errors:
            print(f"{Colors.RED}✗ Functions emulator failed to load the backend:{Colors.RESET}", file=sys.stderr)
            for line in backend_errors:
                print(f"  {line}", file=sys.stderr)
            sys.exit(1)

        print(f"\n{Colors.GREEN}✓{Colors.RESET} Functions emulator ready.\n")

        state = load_migrations_state()
        project_state = state.setdefault(project, {"completed": {}})
        completed = project_state["completed"]

        for job in jobs:
            mid = str(job["id"])
            label = job.get("label", job["function"])
            print(f"{Colors.BOLD}{Colors.CYAN}▶ {label} [{mid}]{Colors.RESET}")
            result = invoke_migration(
                project, region, job["function"], job["query_params"], job["body_fields"]
            )
            if result is None:
                print(
                    f"{Colors.YELLOW}Migration {mid} did not run (network/HTTP error). "
                    f"Not marked as completed.{Colors.RESET}"
                )
                continue
            if result["ok"] and not result["dry_run"]:
                completed[mid] = {"at": datetime.now(timezone.utc).isoformat()}
                print(f"{Colors.GREEN}✓{Colors.RESET} Marked migration {mid} as completed on {project}.")
            elif result["dry_run"]:
                print(
                    f"{Colors.YELLOW}Dry run — not marked as completed "
                    f"(run again without dry run to apply).{Colors.RESET}"
                )
            else:
                print(f"{Colors.RED}✗ Migration {mid} failed — not marked as completed.{Colors.RESET}")
            save_migrations_state(state)
    finally:
        stop_emulator(proc)


# ============================================================
# Main Workflow
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="Run Firestore migrations via the local Functions emulator "
                    "(no Cloud Function deploy, no billing prompt)."
    )
    parser.add_argument(
        "--project",
        help="Firebase project alias or id (default: active `firebase use` project).",
    )
    parser.add_argument(
        "--ids",
        help="Comma-separated migration IDs to run (skips the interactive menu).",
    )
    parser.add_argument(
        "--generate-only",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    parser.add_argument(
        "--boot-only",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    args = parser.parse_args()

    try:
        project = resolve_project(args.project or get_active_project())
        if not project:
            print(
                f"{Colors.RED}Could not determine the target project. "
                f"Pass --project <dev|prd>.{Colors.RESET}",
                file=sys.stderr,
            )
            sys.exit(1)

        config = load_migrations_config()
        state = load_migrations_state()
        runnable = config.get("runnable", [])
        if not runnable:
            print(
                f"{Colors.YELLOW}No runnable migrations configured in "
                f"migrations-config.json.{Colors.RESET}"
            )
            return
        region = config.get("region", FUNCTIONS_REGION)
        project_state = state.setdefault(project, {"completed": {}})
        completed = project_state["completed"]

        if args.ids:
            selected = select_by_ids(args.ids, runnable)
        else:
            selected = collect_selection(project, runnable, completed)

        if not selected:
            print(f"{Colors.YELLOW}No migrations selected.{Colors.RESET}")
            return

        # Sanity-check: generate temp index + build + restore, no emulator.
        if args.generate_only:
            original = temp_index_context(selected)
            try:
                build_functions()
            finally:
                restore_index(original)
            print(
                f"\n{Colors.GREEN}✓{Colors.RESET} Temporary index generated, built and "
                f"restored (no migrations ran, database untouched)."
            )
            return

        # Sanity-check: boot the Functions emulator against the project's real
        # Firestore, confirm readiness, then shut down — no migration is invoked,
        # so no data is read or written. Validates the emulator launch path.
        if args.boot_only:
            original = temp_index_context(selected)
            try:
                build_functions()
                run_jobs_under_emulator(project, region, [])
            finally:
                restore_index(original)
            print(
                f"\n{Colors.GREEN}✓{Colors.RESET} Emulator booted and shut down cleanly "
                f"(no migrations ran, database untouched)."
            )
            return

        # Prompt for each migration's declared inputs BEFORE booting the
        # emulator, so the emulator is only up while migrations actually run.
        jobs = []
        for m in selected:
            query_params, body_fields = prompt_migration_inputs(m)
            jobs.append({
                "id": m["id"],
                "function": m["function"],
                "label": m["label"],
                "query_params": query_params,
                "body_fields": body_fields,
            })

        original = temp_index_context(selected)
        try:
            build_functions()
            run_jobs_under_emulator(project, region, jobs)
        finally:
            restore_index(original)

        print(
            f"\n{Colors.BOLD}{Colors.GREEN}✓ Migration run complete on {project}.{Colors.RESET} "
            f"functions/src/index.ts restored to its original state.\n"
        )
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Migration run cancelled by user.{Colors.RESET}")
        sys.exit(0)
    except Exception as e:
        print(f"{Colors.RED}Unexpected error: {e}{Colors.RESET}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
