# Script para crear archivos init.gradle completamente vacios (sin BOM)

$file1 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\init\init.gradle"
$file2 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\protobuf\init.gradle"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Create-EmptyFile {
    param([string]$filePath)
    
    # Asegurar directorio
    $dir = Split-Path -Parent $filePath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    # Eliminar archivo existente
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
    }
    
    # Crear archivo completamente vacio sin BOM
    $fs = [System.IO.File]::Create($filePath)
    $fs.Close()
    
    Write-Host "Archivo vacio creado: $filePath" -ForegroundColor Green
}

# Crear archivos vacios
Create-EmptyFile -filePath $file1
Create-EmptyFile -filePath $file2

Write-Host ""
Write-Host "✅ Archivos init.gradle vacios creados sin BOM" -ForegroundColor Green
Write-Host "💡 Ahora recarga la ventana de Cursor (Ctrl+Shift+P -> Reload Window)" -ForegroundColor Yellow

