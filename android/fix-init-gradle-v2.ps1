# Script para corregir archivos init.gradle eliminando BOM

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Archivo 1: gradle/init/init.gradle
$file1 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\init\init.gradle"

if (Test-Path $file1) {
    Write-Host "Eliminando archivo existente: $file1" -ForegroundColor Yellow
    Remove-Item $file1 -Force
}

# Crear archivo nuevo sin BOM
$dir1 = Split-Path -Parent $file1
if (-not (Test-Path $dir1)) {
    New-Item -ItemType Directory -Path $dir1 -Force | Out-Null
}

# Usar FileStream para escribir sin BOM
$stream = [System.IO.File]::Create($file1)
$writer = New-Object System.IO.StreamWriter($stream, $utf8NoBom)
$writer.Write("// Init script de Gradle para la extension de Java")
$writer.Close()
$stream.Close()

Write-Host "Archivo creado sin BOM: $file1" -ForegroundColor Green

# Archivo 2: gradle/protobuf/init.gradle
$file2 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\protobuf\init.gradle"

if (Test-Path $file2) {
    Write-Host "Eliminando archivo existente: $file2" -ForegroundColor Yellow
    Remove-Item $file2 -Force
}

# Crear archivo nuevo sin BOM
$dir2 = Split-Path -Parent $file2
if (-not (Test-Path $dir2)) {
    New-Item -ItemType Directory -Path $dir2 -Force | Out-Null
}

# Usar FileStream para escribir sin BOM
$stream2 = [System.IO.File]::Create($file2)
$writer2 = New-Object System.IO.StreamWriter($stream2, $utf8NoBom)
$writer2.Write("// Script de inicializacion de protobuf para Red Hat Java extension")
$writer2.Close()
$stream2.Close()

Write-Host "Archivo creado sin BOM: $file2" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Archivos init.gradle corregidos sin BOM" -ForegroundColor Green

