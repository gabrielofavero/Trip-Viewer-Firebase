#Requires -Version 5.1
<#
.SYNOPSIS
    Run gosom/google-maps-scraper locally via Docker and produce JSON results.

.DESCRIPTION
    Thin PowerShell wrapper around the gosom/google-maps-scraper Docker image.
    Reads one Google Maps URL or search query per line from queries.txt and
    writes the results to output/results.json.

    See docs/ai-analysis/9-google-maps-local-scraping-research.md for the
    research behind this tool.

.PARAMETER Queries
    Path to the input file (default: queries.txt next to this script).

.PARAMETER Results
    Output file path inside ./output (default: results.json).

.PARAMETER Depth
    Max scroll depth for search results. For single place URLs 1 is enough.

.PARAMETER Concurrency
    Number of parallel scrape jobs (-c). Kept low to avoid memory pressure.

.PARAMETER Lang
    Language code passed to the scraper (default: en).

.PARAMETER Inactivity
    Exit after this much inactivity (e.g. '3m', '30s'). Keeps the container
    from running forever once results stop arriving.

.PARAMETER ExtraArgs
    Any extra CLI flags passed through to the container.

.EXAMPLE
    .\run.ps1
#>
[CmdletBinding()]
param(
    [string]$Queries = "",
    [string]$Results = "results.json",
    [int]$Depth = 1,
    [int]$Concurrency = 2,
    [string]$Lang = "en",
    [string]$Inactivity = "3m",
    [string]$ExtraArgs = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Queries) {
    $Queries = Join-Path $scriptDir "queries.txt"
}
$outDir = Join-Path $scriptDir "output"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$resultsAbs = Join-Path $outDir $Results

if (-not (Test-Path $Queries)) {
    Write-Host "Input file not found: $Queries" -ForegroundColor Red
    exit 1
}

Write-Host "==> Starting google-maps-scraper" -ForegroundColor Cyan
Write-Host "    queries : $Queries"
Write-Host "    results : $resultsAbs"
Write-Host "    depth   : $Depth"
Write-Host "    c       : $Concurrency"
Write-Host "    lang    : $Lang"
Write-Host "    inactivity: $Inactivity"
Write-Host ""

# Mount the input read-only and the output folder writable.
# gmaps-playwright-cache is a named volume reused across runs so Playwright
# browsers are downloaded only once.
$dockerArgs = @(
    "run", "--rm",
    "-v", "gmaps-playwright-cache:/opt",
    "-v", "${Queries}:/queries.txt:ro",
    "-v", "${outDir}:/out",
    "gosom/google-maps-scraper",
    "-input", "/queries.txt",
    "-json",
    "-results", "/out/$Results",
    "-depth", "$Depth",
    "-c", "$Concurrency",
    "-lang", "$Lang",
    "-exit-on-inactivity", "$Inactivity"
)

if ($ExtraArgs) {
    $dockerArgs += $ExtraArgs.Trim().Split(" ")
}

Write-Host "docker $($dockerArgs -join ' ')" -ForegroundColor DarkGray
& docker @dockerArgs
$code = $LASTEXITCODE
if ($code -ne 0) {
    Write-Host "Scraper exited with code $code" -ForegroundColor Red
    exit $code
}

Write-Host ""
Write-Host "Done. Results written to $resultsAbs" -ForegroundColor Green
