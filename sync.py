#!/usr/bin/env python3

import subprocess
import sys
from pathlib import Path

def run(cmd):
    result = subprocess.run(
        cmd,
        shell=True,
        text=True,
        capture_output=True
    )
    if result.returncode != 0:
        print(result.stderr.strip())
        sys.exit(result.returncode)

def main():
    repo_dir = Path(__file__).resolve().parent
    print(f"Repository: {repo_dir}")

    confirm = input(
        "This will FORCE master to match develop.\n"
        "Uncommitted changes on master will be LOST.\n"
        "Continue? (yes/no): "
    ).strip().lower()

    if confirm != "yes":
        print("Aborted.")
        sys.exit(0)

    print("Fetching latest refs...")
    run("git fetch")

    print("Switching to master...")
    run("git checkout master")

    print("Force syncing develop → master...")
    run("git reset --hard origin/develop")

    print("Switching back to develop...")
    run("git checkout develop")

    print("Done.")

if __name__ == "__main__":
    main()
