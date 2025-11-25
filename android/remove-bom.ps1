# Script para eliminar BOM de archivos init.gradle

$file1 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\init\init.gradle"
$file2 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\protobuf\init.gradle"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Remove-BOM {
    param([string]$filePath, [string]$content)
    
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
    }
    
    $dir = Split-Path -Parent $filePath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    # Crear archivo sin BOM usando StreamWriter
    $fs = [System.IO.File]::Create($filePath)
    $sw = New-Object System.IO.StreamWriter($fs, $utf8NoBom)
    $sw.Write($content)
    $sw.Close()
    $fs.Close()
    
    Write-Host "Archivo corregido: $filePath" -ForegroundColor Green
}

# Corregir archivo 1
Remove-BOM -filePath $file1 -content "// Init script de Gradle"

# Corregir archivo 2
Remove-BOM -filePath $file2 -content "// Protobuf init script"

Write-Host ""
Write-Host "✅ Archivos corregidos. Por favor, recarga la ventana de Cursor (Ctrl+Shift+P -> Reload Window)" -ForegroundColor Green

