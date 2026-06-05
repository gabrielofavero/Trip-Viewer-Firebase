# Phase 1: Remove _ prefix from function definitions
Write-Host "Phase 1: Function definitions..."
Get-ChildItem -Path "d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\js" -Recurse -Filter "*.js" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $orig = $content
    
    # function _name( -> function name(
    $content = [regex]::Replace($content, 'function _(\w+)\(', 'function $1(')
    # = function _name( -> = function name(  
    $content = [regex]::Replace($content, '= function _(\w+)\(', '= function $1(')
    # = async function _name( -> = async function name(
    $content = [regex]::Replace($content, '= async function _(\w+)\(', '= async function $1(')
    
    if ($content -ne $orig) {
        Set-Content $_.FullName -Value $content -NoNewline
        Write-Host "  Defs: $($_.Name)"
    }
}
Write-Host "Phase 1 done."
