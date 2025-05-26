# ---------------------------
# Firebase Deploy with Version Tracking
# ---------------------------

# --- Get active Firebase project ---
Write-Host "Checking active Firebase project..."

$FirebaseProject = (firebase use 2>&1).Trim()

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to get active Firebase project. Check if Firebase CLI is authenticated and initialized."
    exit $LASTEXITCODE
}

if (-not $FirebaseProject) {
    Write-Error "Could not determine the active Firebase project. Output was empty."
    exit 1
}

Write-Host "Active Firebase Project: $FirebaseProject"

# --- Confirmation Prompt ---
$confirmation = Read-Host "Are you sure you want to deploy to '$FirebaseProject'? (y/n)"
if ($confirmation -ne "y") {
    Write-Host "Deployment cancelled."
    exit 0
}

# --- Variables ---
$VERSION_JSON_PATH = Join-Path -Path "public/assets/json" -ChildPath "version.json"

# --- Step 1: Deploy to get the version ID ---
Write-Host "`nStep 1: Deploying application to get the version ID..."

try {
    $DeployOutput = firebase deploy --only hosting --json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error during the first Firebase deploy. Aborting."
        Write-Output "Firebase Output: $DeployOutput"
        exit $LASTEXITCODE
    }

    Write-Host "First deploy successful. Output:"
    Write-Output $DeployOutput
}
catch {
    Write-Error "Unexpected error during first deploy: $_"
    exit 1
}

# --- Step 2: Parse deploy output and generate version.json ---
Write-Host "`nStep 2: Generating version.json..."

try {
    $DeployData = $DeployOutput | ConvertFrom-Json

    if (-not ($DeployData.status -and $DeployData.result -and $DeployData.result.hosting)) {
        Write-Error "Error: Could not find hosting version in deploy output."
        Write-Output "Received JSON: $DeployOutput"
        exit 1
    }

    # Extract hosting version info
    $Hosting = $DeployData.result.hosting
    $Parts = $Hosting -split "/"
    $Project = $Parts[3]
    $Version = $Parts[5]

    Write-Host "Project: $Project"
    Write-Host "Version: $Version"

    # Check if version.json exists; if not, create an empty one
    if (-not (Test-Path $VERSION_JSON_PATH)) {
        Write-Host "version.json does not exist. Creating new file at $VERSION_JSON_PATH"
        '{}' | Out-File -Encoding utf8 $VERSION_JSON_PATH
    }

    # Read existing JSON
    $VersionJSON = Get-Content $VERSION_JSON_PATH -Raw | ConvertFrom-Json

    # Update the version info
    $VersionJSON | Add-Member -MemberType NoteProperty -Name $Project -Value @{
        version = $Version
        deployedAt = (Get-Date).ToString("o")
    } -Force

    # Write updated JSON back to file
    $VersionJSON | ConvertTo-Json -Depth 5 | Out-File -FilePath $VERSION_JSON_PATH -Encoding utf8

    Write-Host "Successfully wrote version info to $VERSION_JSON_PATH"

}
catch {
    Write-Error "Error processing deploy output or writing file: $_"
    Write-Output "Received JSON string: $DeployOutput"
    exit 1
}

# --- Step 3: Deploy again to include version.json ---
Write-Host "`nStep 3: Deploying again to include version.json..."
try {
    firebase deploy --only hosting
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error during the second Firebase deploy."
        exit $LASTEXITCODE
    }
    Write-Host "`nDeployment complete! version.json included in the latest deploy."
}
catch {
    Write-Error "Unexpected error during second deploy: $_"
    exit 1
}
