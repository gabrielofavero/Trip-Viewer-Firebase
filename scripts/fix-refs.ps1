$jsPath = 'd:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\js'
Get-ChildItem -Path $jsPath -Recurse -Filter '*.js' | ForEach-Object {
    $c = Get-Content $_.FullName -Raw
    $o = $c
    
    # Function references as object property values: key: _name,
    $c = [regex]::Replace($c, ':\s+_(\w+),', ': $1,')
    
    # Function references as arguments: , _name)
    $c = [regex]::Replace($c, ',\s+_(\w+)\)', ', $1)')
    
    # Function references in arrays: [_name]
    $c = [regex]::Replace($c, '\[_(\w+)\]', '[$1]')
    
    # Event listener callbacks
    $c = [regex]::Replace($c, 'addEventListener\("(\w+)",\s+_(\w+)', 'addEventListener("$1", $2')
    $c = [regex]::Replace($c, "addEventListener\('(\w+)',\s+_(\w+)", "addEventListener('$1', $2")
    $c = [regex]::Replace($c, 'removeEventListener\("(\w+)",\s+_(\w+)', 'removeEventListener("$1", $2')
    
    if ($c -ne $o) {
        Set-Content $_.FullName -Value $c -NoNewline
        Write-Host "Fixed: $($_.Name)"
    }
}
Write-Host 'Done'
