# Scripts

Utility scripts for the Trip Viewer Firebase project.

## Overview

| Script | Description |
|--------|-------------|
| `deploy.py` | Firebase deployment with build-based cache busting. Prompts for target project (dev / prd / both), increments the build number in `version.json`, applies cache-busting parameters to HTML files, deploys hosting via Firebase, then restores HTML files. |
| `readme.py` | README.md maintenance. Parses the project's `README.md` to analyze task distribution, validates task IDs and emoji consistency, detects missing/duplicate tasks, calculates a semantic version, and updates the task count table. |
| `sync.py` | Force-syncs the `master` branch to match `develop`. Fetches latest refs, switches to `master`, does a hard reset to `origin/develop`, then returns to `develop`. All uncommitted changes on `master` are lost — a confirmation prompt is shown first. |
| `setup.ps1` | One-time environment setup for the repo. Checks for Node.js and Python, runs `npm install`, installs `pre-commit` via pip, installs git hooks, and runs all hooks once to verify the setup. |
| `export-maps-data/export-maps-data.py` | Exports place data to the app's destination format. Fetches from Google Places API (by Place ID or search) or reads from JSON input files (Google Places JSON or Pepler Extension CSV/JSON exports). Normalizes and transforms data using emoji, price-level, language, and currency maps. |

## Usage

All scripts should be run from the **repository root** (`Trip-Viewer-Firebase/`):

```powershell
# Deploy to Firebase
python scripts/deploy.py

# Update README.md task table
python scripts/readme.py

# Sync master with develop
python scripts/sync.py

# Initial environment setup
.\scripts\setup.ps1

# Export maps/places data
python scripts/export-maps-data/export-maps-data.py
```
