# Script para crear el archivo init.gradle faltante del IDE
# Este script resuelve el error: "The specified initialization script does not exist"

$initScriptPath = "$env:APPDATA\Cursor\User\globalStorage\redhat.java\1.47.0\config_win\org.eclipse.osgi\58\0\.cp\gradle\protobuf\init.gradle"

# Crear el directorio si no existe
$directory = Split-Path -Parent $initScriptPath
if (-not (Test-Path $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    Write-Host "Directorio creado: $directory" -ForegroundColor Green
}

# Crear el archivo init.gradle vacío si no existe
if (-not (Test-Path $initScriptPath)) {
    New-Item -ItemType File -Path $initScriptPath -Force | Out-Null
    Write-Host "Archivo init.gradle creado: $initScriptPath" -ForegroundColor Green
    Write-Host "Problema resuelto. Intenta ejecutar Gradle nuevamente." -ForegroundColor Green
} else {
    Write-Host "El archivo ya existe: $initScriptPath" -ForegroundColor Yellow
}
