# Scripts

Utility scripts for the Trip Viewer Firebase project.

## Directory Structure

| Directory | Description |
|-----------|-------------|
| `build/` | Build pipeline, deployment, and environment setup |
| `lint/` | Code quality checks, static analysis, and auto-fix tools |
| `utils/` | Repository utilities (README maintenance, git sync) |
| `export-maps-data/` | Place data export from Google Places API / JSON input |

## Overview

### `build/` — Build & Deployment

| Script | Description |
|--------|-------------|
| `build.js` | Copies `public/` → `dist/`, injects HTML partials, copies Firebase config. `--watch` for watch mode; `--use-emulator true|false` controls emulator vs real Firebase connection (default true). |
| `inject-partials.js` | Called by `build.js`. Replaces `<!-- #include ... -->` directives with shared partial content. |
| `deploy.py` | Firebase deployment with build-based cache busting. Prompts for target project (dev / prd / both), labels the release version from `CHANGELOG.md` (use last / bump minor / bump patch), stamps the changelog entry, increments build number, applies cache-busting params, deploys, restores HTML files. |
| `setup.ps1` | One-time environment setup. Checks Node.js/Python, runs `npm install`, installs `pre-commit` hooks. |

### `lint/` — Code Quality

| Script | Description |
|--------|-------------|
| `check-cross-module-refs.py` | Scans JS for broken import paths, undeclared variables, missing exports, and read-only import modifications. |
| `check-imports.js` | Static analysis: finds unimported function calls, `window.xxx` pollution, direct `FIRESTORE_DATA` references. |
| `check-errors.js` | Opens each HTML page in a headless browser (Puppeteer) and captures console errors, exceptions, and 404s. |
| `fix-imports.py` | Reads `check-cross-module-refs.py` JSON output and auto-adds missing imports. |
| `fix-imports.js` | Scans all exports across JS codebase, then auto-adds missing imports to files that call unimported functions. |
| `add-exports.py` | Adds `export` keyword to functions/vars that are used by other files but never exported. Run before `fix-imports.py`. |
| `export-missing.js` | Adds `export` to functions that are called from other files but not yet exported (uses `check-imports.js` output). |
| `migrate-firestore-data.js` | One-time migration: replaces `FIRESTORE_DATA` references with `getState()`/`setState()` calls. |

### `utils/` — Repository Utilities

| Script | Description |
|--------|-------------|
| `readme.py` | README.md maintenance. Analyzes task distribution, validates task IDs and emoji consistency, detects missing/duplicate tasks. |
| `sync.py` | Force-syncs `master` branch to match `develop`. Shows confirmation before proceeding. |

### `export-maps-data/` — Place Data Export

| Script | Description |
|--------|-------------|
| `export-maps-data.py` | Fetches from Google Places API (by Place ID or search) or reads JSON input files. Normalizes and transforms data using emoji, price-level, language, and currency maps. |

## Usage

All scripts should be run from the **repository root** (`Trip-Viewer-Firebase/`):

```powershell
# Build
node scripts/build/build.js
node scripts/build/build.js --watch

# Deploy to Firebase
python scripts/build/deploy.py

# Code quality checks
node scripts/lint/check-imports.js
node scripts/lint/check-errors.js
python scripts/lint/check-cross-module-refs.py

# Auto-fix imports
python scripts/lint/check-cross-module-refs.py --json > issues.json
python scripts/lint/fix-imports.py issues.json

# Update README.md task table
python scripts/utils/readme.py

# Sync master with develop
python scripts/utils/sync.py

# Initial environment setup
.\scripts\build\setup.ps1

# Export maps/places data
python scripts/export-maps-data/export-maps-data.py
```
