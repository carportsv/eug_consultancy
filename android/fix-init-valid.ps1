# Script para crear archivos init.gradle con sintaxis Gradle valida (sin BOM)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Contenido valido para init.gradle (bloque vacio es valido)
$validContent = @'
// Init script de Gradle
'@

$file1 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\init\init.gradle"
$file2 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\protobuf\init.gradle"

function Create-ValidInitFile {
    param([string]$filePath, [string]$content)
    
    # Asegurar directorio
    $dir = Split-Path -Parent $filePath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    # Eliminar archivo existente
    if (Test-Path $filePath) {
        Remove-Item $filePath -Force
        Start-Sleep -Milliseconds 200  # Esperar un poco para que el sistema libere el archivo
    }
    
    # Escribir archivo sin BOM usando Encoding UTF8 sin BOM
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
    # Filtrar BOM si existe (primeros 3 bytes: EF BB BF)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $bytes = $bytes[3..($bytes.Length - 1)]
    }
    [System.IO.File]::WriteAllBytes($filePath, $bytes)
    
    Write-Host "Archivo creado: $filePath" -ForegroundColor Green
}

Write-Host "Creando archivos init.gradle validos..." -ForegroundColor Cyan

# Crear archivos validos
Create-ValidInitFile -filePath $file1 -content $validContent
Create-ValidInitFile -filePath $file2 -content "// Protobuf init script"

Write-Host ""
Write-Host "✅ Archivos init.gradle creados con sintaxis valida" -ForegroundColor Green
Write-Host "🔄 IMPORTANTE: Recarga la ventana de Cursor ahora:" -ForegroundColor Yellow
Write-Host "   - Presiona Ctrl+Shift+P" -ForegroundColor Yellow
Write-Host "   - Escribe 'Reload Window' y presiona Enter" -ForegroundColor Yellow
Write-Host "   - O presiona Ctrl+R" -ForegroundColor Yellow

