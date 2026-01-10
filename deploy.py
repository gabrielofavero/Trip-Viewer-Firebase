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


def switch_firebase_project(project_name):
    """Switch to a specific Firebase project."""
    print(f"Switching to Firebase project: {project_name}")
    run_command(f"firebase use {project_name}", capture_output=False)


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
    version_json_path = Path("public/assets/json/version.json")
    
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


def save_version_json(version_data, project, firebase_version=None):
    """Save updated version.json with deployment info."""
    version_json_path = Path("public/assets/json/version.json")
    
    try:
        import sys
        sys.path.insert(0, str(Path.cwd()))
        from readme import get_system_version
        system_version = get_system_version()
    except Exception:
        system_version = "Unknown"
    
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
# HTML Cache Busting
# ============================================================

def update_html_cache_busting(build_number):
    """Add cache busting parameters to HTML files with data-main attribute."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}Cache Busting{Colors.RESET} (b={build_number})")
    
    public_dir = Path("public")
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
    
    # Run deployment and show logs in real-time
    result = run_command("firebase deploy --only hosting", capture_output=False, check=False)
    
    if result.returncode != 0:
        print(f"\n{Colors.RED}✗ Deployment failed for {project}{Colors.RESET}", file=sys.stderr)
        sys.exit(result.returncode)
    
    # Get version from Firebase hosting
    version_result = run_command("firebase deploy --only hosting --json", check=False)
    firebase_version = None
    
    try:
        deploy_data = json.loads(version_result.stdout)
        if deploy_data.get("status") == "success" and deploy_data.get("result"):
            hosting = deploy_data["result"].get("hosting")
            if hosting:
                parts = hosting.split("/")
                firebase_version = parts[-1] if len(parts) > 0 else None
    except (json.JSONDecodeError, KeyError, IndexError):
        pass
    
    print(f"\n{Colors.GREEN}✓{Colors.RESET} Firebase version: {Colors.BOLD}{firebase_version}{Colors.RESET}")
    return firebase_version


# ============================================================
# Main Workflow
# ============================================================

def main():
    """Main deployment workflow."""
    try:
        original_project = get_firebase_project()
        print(f"{Colors.CYAN}Current Firebase project:{Colors.RESET} {Colors.BOLD}{original_project}{Colors.RESET}")
        
        target_projects = select_deployment_targets()
        version_data = load_version_json()
        build_number = increment_build_number(version_data)
        
        modified_files = update_html_cache_busting(build_number)
        
        try:
            for project in target_projects:
                if project != original_project:
                    print(f"\n{Colors.BOLD}{Colors.YELLOW}Switching to: {project}{Colors.RESET}")
                    switch_firebase_project(project)
                else:
                    print(f"\n{Colors.BOLD}{Colors.CYAN}Using current project: {project}{Colors.RESET}")
                
                firebase_version = deploy_firebase(project)
                save_version_json(version_data, project, firebase_version)
            
            current_project = get_firebase_project()
            if current_project != original_project:
                print(f"\n{Colors.BOLD}{Colors.YELLOW}Restoring original project: {original_project}{Colors.RESET}")
                switch_firebase_project(original_project)
            
            print(f"\n{Colors.BOLD}{Colors.GREEN}✓ All deployments complete!{Colors.RESET} Build: {Colors.BOLD}{build_number}{Colors.RESET}\n")
        
        finally:
            restore_html_files(modified_files)
        
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Deployment cancelled by user.{Colors.RESET}")
        sys.exit(0)
    except Exception as e:
        print(f"{Colors.RED}Unexpected error: {e}{Colors.RESET}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
