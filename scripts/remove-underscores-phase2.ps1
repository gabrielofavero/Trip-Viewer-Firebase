# Phase 2-5: Comprehensive _ removal from all JS files
$jsPath = "d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\js"

Write-Host "=== Starting comprehensive _ removal ==="

Get-ChildItem -Path $jsPath -Recurse -Filter "*.js" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $orig = $content
    
    # ---- Remove _ from function CALL sites ----
    # Match _word( where _ is NOT preceded by a dot (negative lookbehind)
    $content = [regex]::Replace($content, '(?<!\.)_(\w+)\(', '$1(')
    
    # ---- String literal callbacks (double-quoted) ----
    # "_functionName()" -> "functionName()"
    $content = [regex]::Replace($content, '"_(\w+)\(\)"', '"$1()"')
    
    # ---- String literal callbacks (backtick) ----
    # `_functionName()` -> `functionName()`
    $content = [regex]::Replace($content, '`_(\w+)\(\)`', '`$1()`')
    
    # ---- Window assignments: window._name -> window.name ----
    $content = [regex]::Replace($content, 'window\._(\w+)', 'window.$1')
    
    # ---- Barrel export lists: _name, -> name, ----
    $content = [regex]::Replace($content, '(?m)^\t_(\w+),', "`t`$1,")
    
    if ($content -ne $orig) {
        Set-Content $_.FullName -Value $content -NoNewline
        Write-Host "Updated: $($_.Name)"
    }
}

Write-Host "=== Done ==="
