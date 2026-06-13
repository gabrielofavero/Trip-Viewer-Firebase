#!/usr/bin/env python3
"""
Firebase Deploy with Build-Based Cache Busting
"""

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Repository root (two levels up from scripts/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent


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



def select_deployment_targets():
    """Display menu and return selected deployment target(s)."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}Firebase Deployment Menu{Colors.RESET}")
    print(f"{Colors.BLUE}1.{Colors.RESET} Deploy to trip-viewer-dev")
    print(f"{Colors.BLUE}2.{Colors.RESET} Deploy to trip-viewer-prd")
    print(f"{Colors.BLUE}3.{Colors.RESET} Deploy to both (dev and prd)")
    print(f"{Colors.BLUE}0.{Colors.RESET} Cancel")
    
    while True:
        choice = input(f"\n{Colors.BOLD}Select an option (0-3):{Colors.RESET} ").strip()
        
        if choice == "0":
            print(f"{Colors.YELLOW}Deployment cancelled.{Colors.RESET}")
            sys.exit(0)
        elif choice == "1":
            return ["trip-viewer-dev"]
        elif choice == "2":
            return ["trip-viewer-prd"]
        elif choice == "3":
            return ["trip-viewer-dev", "trip-viewer-prd"]
        else:
            print(f"{Colors.RED}Invalid option. Please select 0-3.{Colors.RESET}")


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
        version_json_path.write_text(json.dumps(initial_data, indent=2) + "\n")
        return initial_data
    
    try:
        version_data = json.loads(version_json_path.read_text())
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


def save_version_json(version_data, project, system_version, firebase_version=None):
    """Save updated version.json with deployment info."""
    version_json_path = BASE_DIR / "public" / "assets" / "json" / "version.json"
    
    version_data["projects"][project] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": {
            "firebase": firebase_version,
            "system": system_version
        }
    }
    
    version_json_path.write_text(json.dumps(version_data, indent=2) + "\n")
    print(f"{Colors.GREEN}✓{Colors.RESET} Updated version.json: {Colors.BOLD}build={version_data['build']}{Colors.RESET}, firebase={firebase_version}, system={system_version}")


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
        data = json.loads(package_json_path.read_text())
        original_version = data.get("version")
        if original_version and original_version != system_version:
            data["version"] = system_version
            package_json_path.write_text(json.dumps(data, indent=2) + "\n")
            originals["package.json"] = original_version
            print(f"  {Colors.GREEN}✓{Colors.RESET} package.json: {Colors.BOLD}{original_version}{Colors.RESET} \u2192 {Colors.GREEN}{system_version}{Colors.RESET}")
        else:
            print(f"  {Colors.YELLOW}Already at {system_version}, no change needed.{Colors.RESET}")

    # Update package-lock.json (top-level and packages[""] version)
    if package_lock_path.exists():
        data = json.loads(package_lock_path.read_text())
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
            package_lock_path.write_text(json.dumps(data, indent=2) + "\n")
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
        data = json.loads(package_json_path.read_text())
        data["version"] = originals["package.json"]
        package_json_path.write_text(json.dumps(data, indent=2) + "\n")
        print(f"  {Colors.GREEN}✓{Colors.RESET} package.json restored to {Colors.BOLD}{originals['package.json']}{Colors.RESET}")

    if "package-lock.json" in originals:
        package_lock_path = BASE_DIR / "package-lock.json"
        data = json.loads(package_lock_path.read_text())
        orig = originals["package-lock.json"]
        data["version"] = orig["version"]
        if orig.get("packages_version") is not None and "" in data.get("packages", {}):
            data["packages"][""]["version"] = orig["packages_version"]
        package_lock_path.write_text(json.dumps(data, indent=2) + "\n")
        print(f"  {Colors.GREEN}✓{Colors.RESET} package-lock.json restored to {Colors.BOLD}{orig['version']}{Colors.RESET}")

    print(f"{Colors.GREEN}✓{Colors.RESET} Restored {len(originals)} package file(s) to original state")


# ============================================================
# HTML Cache Busting
# ============================================================

def update_html_cache_busting(build_number):
    """Add cache busting parameters to HTML files with data-main attribute."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}Cache Busting{Colors.RESET} (b={build_number})")
    
    public_dir = BASE_DIR / "public"
    html_files = []
    
    if public_dir.exists():
        html_files.extend(public_dir.glob("*.html"))
    
    edit_dir = public_dir / "edit"
    if edit_dir.exists():
        html_files.extend(edit_dir.glob("*.html"))
    
    modified_files = {}
    
    for html_file in html_files:
        content = html_file.read_text()
        original_content = content
        
        def replace_script(match):
            tag = match.group(0)
            tag = re.sub(r'[?&]b=\d+', '', tag)
            tag = re.sub(r'(src="[^"?]+)([^"]*")', rf'\1?b={build_number}\2', tag)
            return tag
        
        content = re.sub(
            r'<script[^>]*data-main[^>]*src="[^"]*"[^>]*>',
            replace_script,
            content
        )
        
        def replace_link(match):
            tag = match.group(0)
            tag = re.sub(r'[?&]b=\d+', '', tag)
            tag = re.sub(r'(href="[^"?]+)([^"]*")', rf'\1?b={build_number}\2', tag)
            return tag
        
        content = re.sub(
            r'<link[^>]*data-main[^>]*href="[^"]*"[^>]*>',
            replace_link,
            content
        )
        
        if content != original_content:
            html_file.write_text(content)
            modified_files[html_file] = original_content
            print(f"  {Colors.GREEN}✓{Colors.RESET} {html_file}")
    
    if not modified_files:
        print(f"  {Colors.YELLOW}No files with data-main attribute found.{Colors.RESET}")
    
    return modified_files


# ============================================================
# HTML Restoration
# ============================================================

def restore_html_files(modified_files):
    """Restore HTML files to their original content."""
    if not modified_files:
        return
    
    print(f"\n{Colors.BOLD}{Colors.CYAN}Restoring HTML files...{Colors.RESET}")
    
    for html_file, original_content in modified_files.items():
        html_file.write_text(original_content)
        print(f"  {Colors.GREEN}✓{Colors.RESET} {html_file}")
    
    print(f"{Colors.GREEN}✓{Colors.RESET} Restored {len(modified_files)} file(s) to original state")


# ============================================================
# Firebase Deployment
# ============================================================

def deploy_firebase(project):
    """Deploy to Firebase for a specific project and return Firebase version."""
    print(f"\n{Colors.BOLD}{Colors.MAGENTA}Deploying to {project}...{Colors.RESET}\n")

    # Explicitly bind deploy to project
    result = run_command(
        f"firebase deploy --only hosting --project {project}",
        capture_output=False,
        check=False
    )

    if result.returncode != 0:
        print(f"\n{Colors.RED}✗ Deployment failed for {project}{Colors.RESET}", file=sys.stderr)
        sys.exit(result.returncode)

    # Fetch deploy info deterministically
    version_result = run_command(
        f"firebase deploy --only hosting --project {project} --json",
        check=False
    )

    firebase_version = None

    try:
        deploy_data = json.loads(version_result.stdout)
        if deploy_data.get("status") == "success":
            hosting = deploy_data.get("result", {}).get("hosting")
            if hosting:
                firebase_version = hosting.split("/")[-1]
    except Exception:
        pass

    print(f"\n{Colors.GREEN}✓{Colors.RESET} Firebase version: {Colors.BOLD}{firebase_version}{Colors.RESET}")
    return firebase_version


# ============================================================
# Main Workflow
# ============================================================

def run_build():
    """Run the npm build step (copies public/ → dist/, injects partials)."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}Running npm build...{Colors.RESET}")
    run_command("npm run build", capture_output=False, check=True)
    print(f"{Colors.GREEN}✓ Build complete.{Colors.RESET}\n")


def main():
    """Main deployment workflow."""
    try:
        original_project = get_firebase_project()
        print(f"{Colors.CYAN}Current Firebase project:{Colors.RESET} {Colors.BOLD}{original_project}{Colors.RESET}")

        target_projects = select_deployment_targets()

        # Compute system version once from README
        try:
            import sys as _sys
            _sys.path.insert(0, str(BASE_DIR / "scripts"))
            from readme import get_system_version
            system_version = get_system_version()
        except Exception:
            system_version = "Unknown"

        run_build()

        version_data = load_version_json()
        build_number = increment_build_number(version_data)

        modified_files = update_html_cache_busting(build_number)
        package_originals = update_package_jsons(system_version)

        try:
            for project in target_projects:
                firebase_version = deploy_firebase(project)
                save_version_json(version_data, project, system_version, firebase_version)

            print(
                f"\n{Colors.BOLD}{Colors.GREEN}✓ All deployments complete!{Colors.RESET} "
                f"Build: {Colors.BOLD}{build_number}{Colors.RESET}\n"
            )

        finally:
            restore_html_files(modified_files)
            restore_package_jsons(package_originals)

    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Deployment cancelled by user.{Colors.RESET}")
        sys.exit(0)
    except Exception as e:
        print(f"{Colors.RED}Unexpected error: {e}{Colors.RESET}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
