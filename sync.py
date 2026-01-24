#!/usr/bin/env python3
"""
Force-sync master with develop
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

def main():
    repo_dir = Path(__file__).resolve().parent
    print(f"{Colors.CYAN}Repository:{Colors.RESET} {Colors.BOLD}{repo_dir}{Colors.RESET}")

    print(
        "\nThis will FORCE master to match develop. Uncommitted changes on master will be lost."
    )

    confirm = input(
        f"\n{Colors.BOLD}Continue?{Colors.RESET} "
        f"{Colors.YELLOW}(y/n): {Colors.RESET}"
    ).strip().lower()

    if confirm != "y":
        print(f"\n{Colors.YELLOW}Operation cancelled by user.{Colors.RESET}")
        sys.exit(0)

    print(f"\n{Colors.CYAN}Fetching latest refs...{Colors.RESET}")
    run_command("git fetch")

    print(f"{Colors.CYAN}Switching to master...{Colors.RESET}")
    run_command("git checkout master")

    print(f"{Colors.CYAN}Force syncing develop → master...{Colors.RESET}")
    run_command("git reset --hard origin/develop")

    print(f"{Colors.CYAN}Switching back to develop...{Colors.RESET}")
    run_command("git checkout develop")

    print(f"\n{Colors.GREEN}✓{Colors.RESET} "
          f"{Colors.BOLD}master is now identical to develop{Colors.RESET}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Operation interrupted by user.{Colors.RESET}")
        sys.exit(0)
