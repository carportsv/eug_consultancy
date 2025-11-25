# Script para crear/corregir archivos init.gradle sin BOM

# Directorio 1: gradle/init/init.gradle
$dir1 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\init"
if (-not (Test-Path $dir1)) {
    New-Item -ItemType Directory -Path $dir1 -Force | Out-Null
    Write-Host "Directorio creado: $dir1" -ForegroundColor Green
}

$file1 = Join-Path $dir1 "init.gradle"
# Si el archivo existe, eliminarlo primero para asegurarse de que no tenga BOM
if (Test-Path $file1) {
    Remove-Item $file1 -Force
    Write-Host "Archivo existente eliminado: $file1" -ForegroundColor Yellow
}
# Crear archivo vacío primero
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$null = [System.IO.File]::WriteAllText($file1, "", $utf8NoBom)
# Agregar contenido sin BOM
$content1 = "// Init script de Gradle para la extension de Java"
[System.IO.File]::AppendAllText($file1, $content1, $utf8NoBom)
Write-Host "Archivo creado/corregido: $file1" -ForegroundColor Green

# Directorio 2: gradle/protobuf/init.gradle
$dir2 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\protobuf"
if (-not (Test-Path $dir2)) {
    New-Item -ItemType Directory -Path $dir2 -Force | Out-Null
    Write-Host "Directorio creado: $dir2" -ForegroundColor Green
}

$file2 = Join-Path $dir2 "init.gradle"
# Si el archivo existe, eliminarlo primero para asegurarse de que no tenga BOM
if (Test-Path $file2) {
    Remove-Item $file2 -Force
    Write-Host "Archivo existente eliminado: $file2" -ForegroundColor Yellow
}
# Crear archivo vacío primero
$null = [System.IO.File]::WriteAllText($file2, "", $utf8NoBom)
# Agregar contenido sin BOM
$content2 = "// Script de inicializacion de protobuf para Red Hat Java extension"
[System.IO.File]::AppendAllText($file2, $content2, $utf8NoBom)
Write-Host "Archivo creado/corregido: $file2" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Archivos init.gradle corregidos sin BOM" -ForegroundColor Green
