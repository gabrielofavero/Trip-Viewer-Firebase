#!/usr/bin/env python3
"""
Firebase Deploy with Build-Based Cache Busting and post-deploy migrations.

- Single `firebase deploy --json` per project (no double deploy): the hosting
  version ID is parsed from the deploy result. version.json is stamped into
  public/ BEFORE the build so the content-hashed file shipped to the site
  carries the correct build/version.
- After each deploy the user is prompted to run pending data migrations
  (see scripts/build/migrations-config.json) on that environment. Migrations
  are executed by scripts/build/run-migrations.py via the local Functions
  emulator against the project's REAL Firestore — no Cloud Functions are
  deployed, so this never triggers the extensions / Blaze billing prompt.
  Per-env run state is tracked in scripts/build/migrations-state.json.
"""

import json
import re
import subprocess
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path

# Repository root (two levels up from scripts/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Single Firebase project — trip-viewer-dev and trip-viewer-tcc were retired.
PROJECT = "trip-viewer-prd"


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
        check=False
    )
    
    if check and result.returncode != 0:
        print(f"Error: Command failed with exit code {result.returncode}", file=sys.stderr)
        print(f"Output: {result.stdout}", file=sys.stderr)
        print(f"Error: {result.stderr}", file=sys.stderr)
        sys.exit(result.returncode)
    
    return result


# ============================================================
# Firebase Project Management
# ============================================================

def get_firebase_project():
    """Get the active Firebase project."""
    result = run_command("firebase use")
    
    if not result.stdout.strip():
        print("Error: Could not determine the active Firebase project.", file=sys.stderr)
        sys.exit(1)
    
    return result.stdout.strip()


# ============================================================
# Version Management
# ============================================================

def load_version_json():
    """Load version.json and return current build number and data."""
    version_json_path = BASE_DIR / "public" / "assets" / "json" / "version.json"
    
    if not version_json_path.exists():
        print(f"version.json does not exist. Creating new file at {version_json_path}")
        version_json_path.parent.mkdir(parents=True, exist_ok=True)
        initial_data = {"build": 0, "projects": {}}
        version_json_path.write_text(json.dumps(initial_data, indent=2) + "\n", encoding="utf-8")
        return initial_data
    
    try:
        version_data = json.loads(version_json_path.read_text(encoding="utf-8"))
        if "build" not in version_data:
            version_data = {"build": 0, "projects": {}}
        if "deployed_at" in version_data:
            version_data["projects"] = version_data.pop("deployed_at")
        return version_data
    except json.JSONDecodeError:
        return {"build": 0, "projects": {}}


def increment_build_number(version_data):
    """Increment the build number and return it."""
    version_data["build"] = version_data.get("build", 0) + 1
    print(f"\n{Colors.BOLD}{Colors.GREEN}Build number: {version_data['build']}{Colors.RESET}")
    return version_data["build"]


def stamp_project_version(version_data, project, system_version):
    """Stamp the current build/system/timestamp into version_data (in memory)
    for the given project. Must run BEFORE the build: the build content-hashes
    public/version.json and rewrites the app's reference to the hashed filename,
    so the ONLY way the deployed site carries the new values is to update
    public/version.json first.

    The real hosting version ID is only known after the deploy; it is captured
    and persisted to public/ by persist_version_state() (the live copy keeps the
    previous ID — informational only, the app reads `version.system`).
    """
    prev = (version_data.get("projects") or {}).get(project, {})
    prev_firebase = (prev.get("version") or {}).get("firebase", "")
    version_data["projects"][project] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": {
            "firebase": prev_firebase,
            "system": system_version,
        },
    }


def write_public_version_json(version_data):
    """Persist version_data to public/version.json (the source the build hashes)
    and to the root public/version.json — the stable, no-store endpoint the app
    polls in the background to detect new versions while it is open."""
    payload = json.dumps(version_data, indent=2) + "\n"
    assets_path = BASE_DIR / "public" / "assets" / "json" / "version.json"
    assets_path.write_text(payload, encoding="utf-8")
    # Stable endpoint for background version polling; kept in sync with the
    # hashed copy so the live build counter matches what the app loaded.
    root_path = BASE_DIR / "public" / "version.json"
    root_path.write_text(payload, encoding="utf-8")
    print(
        f"{Colors.GREEN}✓{Colors.RESET} Stamped public/version.json: "
        f"build={version_data['build']}"
    )


def persist_version_state(version_data, project, firebase_version):
    """After the deploy, capture the real hosting version ID and persist the
    final version.json to public/ (source of truth for the next build)."""
    if firebase_version:
        version_data["projects"][project]["version"]["firebase"] = firebase_version

    write_public_version_json(version_data)
    print(
        f"{Colors.GREEN}✓{Colors.RESET} Persisted version.json: build={version_data['build']}, "
        f"firebase={firebase_version}, system={version_data['projects'][project]['version']['system']}"
    )


# ============================================================
# Changelog Version Selection
# ============================================================

def get_last_changelog_version():
    """Return the latest version (topmost '## [X.Y.Z]' heading) from CHANGELOG.md."""
    changelog_path = BASE_DIR / "CHANGELOG.md"
    if not changelog_path.exists():
        print(f"{Colors.YELLOW}CHANGELOG.md not found, defaulting to 2.0.0.{Colors.RESET}")
        return "2.0.0"
    content = changelog_path.read_text(encoding="utf-8")
    match = re.search(r'^## \[(\d+\.\d+\.\d+)\]', content, re.MULTILINE)
    if not match:
        print(f"{Colors.YELLOW}No version heading found in CHANGELOG.md, defaulting to 2.0.0.{Colors.RESET}")
        return "2.0.0"
    return match.group(1)


def _bump_minor(version):
    """Bump the minor (2.22.0 → 2.23.0)."""
    major, minor, _ = version.split(".")
    return f"{major}.{int(minor) + 1}.0"


def _bump_patch(version):
    """Bump the patch (2.22.0 → 2.22.1)."""
    major, minor, patch = version.split(".")
    return f"{major}.{minor}.{int(patch) + 1}"


def select_version():
    """Ask the user how to label the version for this deployment."""
    last_version = get_last_changelog_version()
    minor_version = _bump_minor(last_version)
    patch_version = _bump_patch(last_version)

    print(f"\n{Colors.BOLD}{Colors.CYAN}Version{Colors.RESET}")
    print(f"{Colors.BLUE}1.{Colors.RESET} Label as {Colors.BOLD}{last_version}{Colors.RESET} (last version on the changelog)")
    print(f"{Colors.BLUE}2.{Colors.RESET} Create {Colors.BOLD}{minor_version}{Colors.RESET} (minor)")
    print(f"{Colors.BLUE}3.{Colors.RESET} Create {Colors.BOLD}{patch_version}{Colors.RESET} (patch)")
    print(f"{Colors.BLUE}0.{Colors.RESET} Cancel")

    while True:
        choice = input(f"\n{Colors.BOLD}Select an option (0-3):{Colors.RESET} ").strip()
        if choice == "0":
            print(f"{Colors.YELLOW}Deployment cancelled.{Colors.RESET}")
            sys.exit(0)
        elif choice == "1":
            return last_version
        elif choice == "2":
            return minor_version
        elif choice == "3":
            return patch_version
        else:
            print(f"{Colors.RED}Invalid option. Please select 0-3.{Colors.RESET}")


def update_changelog(version):
    """Stamp the deployed version as '## [version] - <date>' at the top of CHANGELOG.md."""
    changelog_path = BASE_DIR / "CHANGELOG.md"
    if not changelog_path.exists():
        print(f"{Colors.YELLOW}CHANGELOG.md not found, skipping changelog update.{Colors.RESET}")
        return

    today = datetime.now().strftime("%Y-%m-%d")
    content = changelog_path.read_text(encoding="utf-8")
    lines = content.split("\n")

    # Locate the topmost "## [X.Y.Z]" heading.
    top_idx = None
    for i, line in enumerate(lines):
        if re.match(r'^## \[\d+\.\d+\.\d+\]', line.strip()):
            top_idx = i
            break

    if top_idx is not None and lines[top_idx].strip().startswith(f"## [{version}]"):
        if " - " in lines[top_idx]:
            print(f"{Colors.GREEN}✓{Colors.RESET} CHANGELOG: ## [{version}] already stamped")
        else:
            lines[top_idx] = f"## [{version}] - {today}"
            changelog_path.write_text("\n".join(lines).rstrip("\n") + "\n", encoding="utf-8")
            print(f"{Colors.GREEN}✓{Colors.RESET} CHANGELOG: ## [{version}] - {today}")
        return

    # New version — insert a fresh entry above the current top (or after the title).
    insert_at = top_idx
    if insert_at is None:
        insert_at = 0
        for i, line in enumerate(lines):
            if line.strip().startswith("# "):
                insert_at = i + 1
                break
        while insert_at < len(lines) and lines[insert_at].strip() == "":
            insert_at += 1

    lines[insert_at:insert_at] = [f"## [{version}] - {today}", ""]
    changelog_path.write_text("\n".join(lines).rstrip("\n") + "\n", encoding="utf-8")
    print(f"{Colors.GREEN}✓{Colors.RESET} CHANGELOG: added ## [{version}] - {today}")


# ============================================================
# Package Version Update
# ============================================================

def update_package_jsons(system_version):
    """Update version in package.json and package-lock.json to match system version."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}Updating package version to {system_version}...{Colors.RESET}")

    package_json_path = BASE_DIR / "package.json"
    package_lock_path = BASE_DIR / "package-lock.json"

    originals = {}

    # Update package.json
    if package_json_path.exists():
        data = json.loads(package_json_path.read_text(encoding="utf-8"))
        original_version = data.get("version")
        if original_version and original_version != system_version:
            data["version"] = system_version
            package_json_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
            originals["package.json"] = original_version
            print(f"  {Colors.GREEN}✓{Colors.RESET} package.json: {Colors.BOLD}{original_version}{Colors.RESET} \u2192 {Colors.GREEN}{system_version}{Colors.RESET}")
        else:
            print(f"  {Colors.YELLOW}Already at {system_version}, no change needed.{Colors.RESET}")

    # Update package-lock.json (top-level and packages[""] version)
    if package_lock_path.exists():
        data = json.loads(package_lock_path.read_text(encoding="utf-8"))
        original_top_version = data.get("version")
        modified = False
        original_pkg_version = None

        if original_top_version and original_top_version != system_version:
            data["version"] = system_version
            modified = True

        if "" in data.get("packages", {}):
            pkg = data["packages"][""]
            original_pkg_version = pkg.get("version")
            if original_pkg_version and original_pkg_version != system_version:
                pkg["version"] = system_version
                modified = True

        if modified:
            package_lock_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
            originals["package-lock.json"] = {
                "version": original_top_version,
                "packages_version": original_pkg_version
            }
            print(f"  {Colors.GREEN}✓{Colors.RESET} package-lock.json: {Colors.BOLD}{original_top_version}{Colors.RESET} \u2192 {Colors.GREEN}{system_version}{Colors.RESET}")
        else:
            print(f"  {Colors.YELLOW}Already at {system_version}, no change needed.{Colors.RESET}")

    return originals


def restore_package_jsons(originals):
    """Restore package.json and package-lock.json to original versions."""
    if not originals:
        return

    print(f"\n{Colors.BOLD}{Colors.CYAN}Restoring package version files...{Colors.RESET}")

    if "package.json" in originals:
        package_json_path = BASE_DIR / "package.json"
        data = json.loads(package_json_path.read_text(encoding="utf-8"))
        data["version"] = originals["package.json"]
        package_json_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        print(f"  {Colors.GREEN}✓{Colors.RESET} package.json restored to {Colors.BOLD}{originals['package.json']}{Colors.RESET}")

    if "package-lock.json" in originals:
        package_lock_path = BASE_DIR / "package-lock.json"
        data = json.loads(package_lock_path.read_text(encoding="utf-8"))
        orig = originals["package-lock.json"]
        data["version"] = orig["version"]
        if orig.get("packages_version") is not None and "" in data.get("packages", {}):
            data["packages"][""]["version"] = orig["packages_version"]
        package_lock_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        print(f"  {Colors.GREEN}✓{Colors.RESET} package-lock.json restored to {Colors.BOLD}{orig['version']}{Colors.RESET}")

    print(f"{Colors.GREEN}✓{Colors.RESET} Restored {len(originals)} package file(s) to original state")


# ============================================================
# Firebase Deployment
# ============================================================

def run_command_stream_json(cmd):
    """Run a command streaming stderr live to the console while capturing stdout
    (used for `firebase deploy --json`). Returns the captured stdout text."""
    proc = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    def _stream_stderr():
        for line in iter(proc.stderr.readline, ""):
            print(line, end="", flush=True)

    stderr_thread = threading.Thread(target=_stream_stderr, daemon=True)
    stderr_thread.start()

    out_chunks = []
    for line in iter(proc.stdout.readline, ""):
        out_chunks.append(line)

    stderr_thread.join()
    proc.wait()

    if proc.returncode != 0:
        print(
            f"\n{Colors.RED}✗ Command failed with exit code {proc.returncode}{Colors.RESET}",
            file=sys.stderr,
        )
        sys.exit(proc.returncode)

    return "".join(out_chunks)


def parse_hosting_version(output):
    """Extract the Firebase hosting version ID from `firebase deploy --json`
    stdout (the final `{status, result}` object written by the CLI)."""
    if not output:
        return None

    # The result JSON is the last thing the CLI writes to stdout, so scan
    # backwards for the last `{` that starts a parseable object.
    text = output.rstrip()
    end = len(text)
    while end > 0:
        start = text.rfind("{", 0, end)
        if start == -1:
            return None
        try:
            data = json.loads(text[start:])
        except json.JSONDecodeError:
            end = start
            continue
        if isinstance(data, dict) and data.get("status") == "success":
            hosting = data.get("result", {}).get("hosting")
            if hosting:
                return str(hosting).split("/")[-1]
        return None
    return None


def deploy_firebase(project):
    """Deploy to Firebase for a specific project and return the Firebase version."""
    print(f"\n{Colors.BOLD}{Colors.MAGENTA}Deploying to {project}...{Colors.RESET}\n")

    # Single deploy: `--json` yields the hosting version ID from the result,
    # so no second deploy is needed. stderr streams live so progress still shows.
    output = run_command_stream_json(
        f"firebase deploy --only hosting,firestore:rules --project {project} --json"
    )

    firebase_version = parse_hosting_version(output)
    if not firebase_version:
        print(f"{Colors.YELLOW}⚠ Could not determine hosting version ID from deploy output.{Colors.RESET}")

    print(f"\n{Colors.GREEN}✓{Colors.RESET} Deploy complete for {project}. "
          f"Firebase version: {Colors.BOLD}{firebase_version}{Colors.RESET}")
    return firebase_version


# ============================================================
# Post-Deploy Migrations
# ============================================================

def post_deploy_migrations(project):
    """After a deployment, offer to run pending migrations on the environment.

    Migrations are executed by scripts/build/run-migrations.py via the local
    Functions emulator against the project's REAL Firestore — no Cloud
    Functions are deployed, so this never triggers the extensions / Blaze
    billing prompt. Per-env run state lives in scripts/build/migrations-state.json.
    """
    answer = input(
        f"\n{Colors.CYAN}Run migrations on {project}?{Colors.RESET} [y/N]: "
    ).strip().lower()
    if answer not in ("y", "yes"):
        print(f"{Colors.YELLOW}Skipping migrations for {project}.{Colors.RESET}")
        return

    runner = (BASE_DIR / "scripts" / "build" / "run-migrations.py").as_posix()
    run_command(f'python "{runner}" --project {project}', capture_output=False, check=False)


# ============================================================
# Main Workflow
# ============================================================

def run_build():
    """Run the npm build step (copies public/ → dist/, injects partials)."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}Running npm build...{Colors.RESET}")
    run_command("npm run build", capture_output=False, check=True)
    print(f"{Colors.GREEN}✓ Build complete.{Colors.RESET}\n")


def main():
    """Main deployment workflow (single project: trip-viewer-prd)."""
    try:
        original_project = get_firebase_project()
        print(f"{Colors.CYAN}Current Firebase project:{Colors.RESET} {Colors.BOLD}{original_project}{Colors.RESET}")

        # Choose the deployment version label (from the changelog)
        system_version = select_version()

        # Stamp the release entry in CHANGELOG.md for the production deployment
        update_changelog(system_version)

        version_data = load_version_json()
        build_number = increment_build_number(version_data)

        # Stamp the new build/system/timestamp into public/version.json BEFORE
        # the build, because the build content-hashes version.json and rewrites
        # the app's reference to the hashed filename — so this is the only way
        # the deployed site carries the new values (and it needs just ONE deploy).
        stamp_project_version(version_data, PROJECT, system_version)
        write_public_version_json(version_data)

        run_build()

        package_originals = {}

        try:
            package_originals = update_package_jsons(system_version)
            # Single deploy (--json); the hosting version ID is parsed from its result.
            firebase_version = deploy_firebase(PROJECT)
            persist_version_state(version_data, PROJECT, firebase_version)

            # Post-deploy: run pending migrations via the local Functions
            # emulator against the project's real Firestore (run-migrations.py
            # generates/restores a temporary index.ts, so nothing is deployed).
            post_deploy_migrations(PROJECT)

            print(
                f"\n{Colors.BOLD}{Colors.GREEN}✓ Deployment complete!{Colors.RESET} "
                f"Build: {Colors.BOLD}{build_number}{Colors.RESET}\n"
            )

        finally:
            restore_package_jsons(package_originals)

    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Deployment cancelled by user.{Colors.RESET}")
        sys.exit(0)
    except Exception as e:
        print(f"{Colors.RED}Unexpected error: {e}{Colors.RESET}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
