#!/usr/bin/env python3
"""
Sync master with develop by attempting a merge.

Non-destructive by default: tries to fast-forward / merge origin/develop into
master. Only when the merge hits conflicts does it ask whether to force master
to match develop, or leave the conflicts for the user to resolve manually.
"""

import subprocess
import sys
from pathlib import Path


# ============================================================
# Colors
# ============================================================

class Colors:
    BOLD = '\033[1m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    RED = '\033[91m'
    RESET = '\033[0m'


# ============================================================
# Utility Functions
# ============================================================

def run_command(cmd, capture_output=True, check=True):
    result = subprocess.run(
        cmd,
        shell=True,
        capture_output=capture_output,
        text=True,
        check=False
    )

    if check and result.returncode != 0:
        print(f"{Colors.RED}✗ Command failed:{Colors.RESET} {cmd}", file=sys.stderr)
        if result.stderr:
            print(result.stderr.strip(), file=sys.stderr)
        sys.exit(result.returncode)

    return result


# ============================================================
# Main Workflow
# ============================================================

def current_branch(repo_dir):
    result = run_command(f"git -C {repo_dir} rev-parse --abbrev-ref HEAD")
    return result.stdout.strip()


def checkout(repo_dir, branch):
    run_command(f"git -C {repo_dir} checkout {branch}")


def main():
    repo_dir = Path(__file__).resolve().parent.parent.parent
    start_branch = current_branch(repo_dir)
    on_master = start_branch == "master"

    print(f"{Colors.CYAN}Repository:{Colors.RESET} {Colors.BOLD}{repo_dir}{Colors.RESET}")

    # Merging over uncommitted changes is unsafe — require a clean tracked tree.
    status = run_command(
        f"git -C {repo_dir} status --porcelain --untracked-files=no"
    )
    if status.stdout.strip():
        print(
            f"\n{Colors.RED}✗ Working tree has uncommitted changes.{Colors.RESET}\n"
            "Commit or stash them first, then run sync again."
        )
        sys.exit(1)

    print(f"\n{Colors.CYAN}Fetching latest refs...{Colors.RESET}")
    run_command(f"git -C {repo_dir} fetch")

    if not on_master:
        print(f"{Colors.CYAN}Switching to master...{Colors.RESET}")
        checkout(repo_dir, "master")

    # Attempt a merge: git fast-forwards when possible, otherwise performs a
    # real (3-way) merge of origin/develop into master.
    print(f"{Colors.CYAN}Merging develop → master...{Colors.RESET}")
    merge = run_command(
        f"git -C {repo_dir} merge origin/develop --no-edit",
        check=False,
    )

    if merge.returncode == 0:
        master_sha = run_command(
            f"git -C {repo_dir} rev-parse master"
        ).stdout.strip()
        develop_sha = run_command(
            f"git -C {repo_dir} rev-parse origin/develop"
        ).stdout.strip()
        if master_sha == develop_sha:
            message = "master is now identical to develop (fast-forwarded)"
        else:
            message = "develop merged into master cleanly (no conflicts)"
        print(f"\n{Colors.GREEN}✓{Colors.RESET} {Colors.BOLD}{message}{Colors.RESET}")
        if not on_master:
            print(f"{Colors.CYAN}Switching back to {start_branch}...{Colors.RESET}")
            checkout(repo_dir, start_branch)
        return

    # Merge failed. Distinguish a real conflict from other errors.
    merge_head = repo_dir / ".git" / "MERGE_HEAD"
    if not merge_head.exists():
        print(f"\n{Colors.RED}✗ Merge could not be completed.{Colors.RESET}")
        if merge.stdout.strip():
            print(merge.stdout.strip())
        if merge.stderr.strip():
            print(merge.stderr.strip())
        print(
            f"{Colors.CYAN}Aborting merge and returning to {start_branch}...{Colors.RESET}"
        )
        run_command(f"git -C {repo_dir} merge --abort")
        if not on_master:
            checkout(repo_dir, start_branch)
        sys.exit(1)

    # Real conflicts — master has diverged from develop.
    print(f"\n{Colors.RED}✗ Merge conflicts between master and develop.{Colors.RESET}")
    if merge.stdout.strip():
        print(merge.stdout.strip())
    print(
        f"{Colors.BOLD}How do you want to proceed?{Colors.RESET}\n"
        f"  {Colors.CYAN}[1]{Colors.RESET} {Colors.BOLD}Force{Colors.RESET} — reset master to "
        "match develop (discards master's diverged changes)\n"
        f"  {Colors.CYAN}[2]{Colors.RESET} {Colors.BOLD}Resolve manually{Colors.RESET} — stay on "
        "master with the merge in progress so you can resolve the conflicts"
    )

    choice = input(
        f"\n{Colors.BOLD}Choice{Colors.RESET} {Colors.YELLOW}(1/2): {Colors.RESET}"
    ).strip().lower()

    if choice in ("1", "f", "force"):
        print(f"\n{Colors.CYAN}Force syncing develop → master...{Colors.RESET}")
        run_command(f"git -C {repo_dir} reset --hard origin/develop")
        print(
            f"{Colors.GREEN}✓{Colors.RESET} "
            f"{Colors.BOLD}master is now identical to develop{Colors.RESET}"
        )
        if not on_master:
            print(f"{Colors.CYAN}Switching back to {start_branch}...{Colors.RESET}")
            checkout(repo_dir, start_branch)
        return

    if choice in ("2", "r", "resolve"):
        print(
            f"\n{Colors.YELLOW}Leaving master checked out with the merge in progress.{Colors.RESET}"
        )
        print(
            "Resolve the conflicts in your editor, then finish the merge:\n"
            f"  {Colors.CYAN}git add -A && git commit{Colors.RESET}\n"
            "To cancel the merge instead, run:\n"
            f"  {Colors.CYAN}git merge --abort{Colors.RESET}"
        )
        return

    print(f"\n{Colors.YELLOW}Invalid choice — aborting merge.{Colors.RESET}")
    run_command(f"git -C {repo_dir} merge --abort")
    if not on_master:
        checkout(repo_dir, start_branch)
    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Operation interrupted by user.{Colors.RESET}")
        sys.exit(0)
