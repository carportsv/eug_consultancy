# Script final para corregir archivos init.gradle con sintaxis Gradle valida

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Archivo 1: gradle/init/init.gradle - Crear con contenido Gradle valido
$file1 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\init\init.gradle"

# Asegurar directorio
$dir1 = Split-Path -Parent $file1
if (-not (Test-Path $dir1)) {
    New-Item -ItemType Directory -Path $dir1 -Force | Out-Null
}

# Eliminar archivo existente
if (Test-Path $file1) {
    Remove-Item $file1 -Force
}

# Crear archivo con sintaxis Gradle valida sin BOM
$stream1 = [System.IO.File]::Create($file1)
$writer1 = New-Object System.IO.StreamWriter($stream1, $utf8NoBom)
$writer1.WriteLine("// Init script de Gradle para la extension de Java")
$writer1.Close()
$stream1.Close()

Write-Host "Archivo creado sin BOM: $file1" -ForegroundColor Green

# Archivo 2: gradle/protobuf/init.gradle - Crear con contenido Gradle valido
$file2 = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\protobuf\init.gradle"

# Asegurar directorio
$dir2 = Split-Path -Parent $file2
if (-not (Test-Path $dir2)) {
    New-Item -ItemType Directory -Path $dir2 -Force | Out-Null
}

# Eliminar archivo existente
if (Test-Path $file2) {
    Remove-Item $file2 -Force
}

# Crear archivo con sintaxis Gradle valida sin BOM
$stream2 = [System.IO.File]::Create($file2)
$writer2 = New-Object System.IO.StreamWriter($stream2, $utf8NoBom)
$writer2.WriteLine("// Script de inicializacion de protobuf para Red Hat Java extension")
$writer2.Close()
$stream2.Close()

Write-Host "Archivo creado sin BOM: $file2" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Archivos init.gradle recreados sin BOM" -ForegroundColor Green
Write-Host "💡 Si el error persiste, intenta:" -ForegroundColor Yellow
Write-Host "   1. Reiniciar Cursor/VS Code" -ForegroundColor Yellow
Write-Host "   2. Limpiar cache de Gradle: gradle clean" -ForegroundColor Yellow
Write-Host "   3. Limpiar cache del IDE" -ForegroundColor Yellow

