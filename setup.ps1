Write-Host "========================================"
Write-Host " Trip Viewer – Environment Setup"
Write-Host "========================================"
Write-Host ""

# Fail fast on errors
$ErrorActionPreference = "Stop"

# 1) Check Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js not found. Install it from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2) Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python not found. Install it from https://python.org" -ForegroundColor Red
    exit 1
}

# 3) Install npm dependencies (from package-lock.json)
Write-Host "`nInstalling npm dependencies..."
npm install

# 4) Install pre-commit
Write-Host "`nInstalling pre-commit..."
pip install pre-commit

# 5) Install git hooks
Write-Host "`nInstalling git hooks..."
pre-commit install

# 6) Run all hooks once to verify
Write-Host "`nRunning pre-commit checks..."
pre-commit run --all-files

Write-Host ""
Write-Host "========================================"
Write-Host " Setup complete. This repo is ready."
Write-Host "========================================"
