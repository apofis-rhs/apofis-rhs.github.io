# Genera galerias.js con la lista de fotos y videos de cada carpeta hobbyX/.
# Solo hace falta si abres me.html con doble clic o lo subes a GitHub Pages;
# con Live Server la página lee las carpetas sola.
# Uso (en esta carpeta):  powershell -ExecutionPolicy Bypass -File .\actualizar-galerias.ps1

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$ext = '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp', '.mp4', '.webm', '.ogv', '.mov'

# Cada carpeta hobbyX y cada subcarpeta (p. ej. hobby4/albumes) tiene su propia lista
$dirs = foreach ($dir in Get-ChildItem -Path $here -Directory -Filter 'hobby*' | Sort-Object Name) {
    $dir
    Get-ChildItem -Path $dir.FullName -Directory | Sort-Object Name
}

$entries = foreach ($dir in $dirs) {
    $key = $dir.FullName.Substring($here.Length + 1) -replace '\\', '/'
    $files = Get-ChildItem -Path $dir.FullName -File |
        Where-Object { $ext -contains $_.Extension.ToLower() } |
        Sort-Object Name |
        ForEach-Object { '"' + ($_.Name -replace '"', '\"') + '"' }
    '    "' + $key + '": [' + ($files -join ', ') + ']'
}

$js = "// Archivo generado por actualizar-galerias.ps1. No lo edites a mano.`r`nwindow.GALERIAS = {`r`n" + ($entries -join ",`r`n") + "`r`n};`r`n"
[System.IO.File]::WriteAllText((Join-Path $here 'galerias.js'), $js, (New-Object System.Text.UTF8Encoding $false))
Write-Host "galerias.js actualizado"
