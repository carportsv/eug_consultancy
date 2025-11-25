# Script para ejecutar Flutter Web en PowerShell y abrir automáticamente el navegador
# Similar al servidor Python pero usando comandos nativos de PowerShell

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[*] Iniciando Flutter Web" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio raíz del proyecto (un nivel arriba de web-servers)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# Verificar que existe pubspec.yaml
if (-not (Test-Path "$projectRoot\pubspec.yaml")) {
    Write-Host "[X] Error: No se encontro el proyecto Flutter" -ForegroundColor Red
    Write-Host "   Asegúrate de ejecutar este script desde la carpeta web-servers"
    pause
    exit 1
}

Set-Location $projectRoot

# Verificar Flutter
Write-Host "[*] Verificando Flutter..." -ForegroundColor Yellow
try {
    $null = flutter --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Error: Flutter no esta instalado o no esta en el PATH" -ForegroundColor Red
        Write-Host "   Por favor, instala Flutter desde: https://flutter.dev"
        pause
        exit 1
    }
    Write-Host "[OK] Flutter encontrado" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Error: Flutter no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "   Por favor, instala Flutter desde: https://flutter.dev"
    pause
    exit 1
}

# Verificar si el puerto 8000 está en uso
Write-Host "[*] Verificando puerto 8000..." -ForegroundColor Yellow
$portInUse = $false
try {
    $connection = Test-NetConnection -ComputerName localhost -Port 8000 -WarningAction SilentlyContinue -InformationLevel Quiet -ErrorAction SilentlyContinue
    if ($connection) {
        $portInUse = $true
    }
} catch {
    # Si Test-NetConnection no está disponible, usar netstat
    $netstat = netstat -ano | Select-String ":8000"
    if ($netstat) {
        $portInUse = $true
    }
}

if ($portInUse) {
    Write-Host "[X] Error: El puerto 8000 ya esta en uso" -ForegroundColor Red
    Write-Host "   Por favor, cierra la aplicación que está usando el puerto 8000" -ForegroundColor Yellow
    Write-Host "   O ejecuta este comando para encontrar el proceso:" -ForegroundColor Yellow
    Write-Host "   netstat -ano | findstr :8000" -ForegroundColor Cyan
    pause
    exit 1
}

Write-Host "[OK] Puerto 8000 disponible" -ForegroundColor Green
Write-Host ""
Write-Host "[*] La aplicacion estara disponible en: http://localhost:8000" -ForegroundColor Cyan
Write-Host "[*] Compilando... esto puede tomar unos momentos" -ForegroundColor Yellow
Write-Host ""

# Función para abrir el navegador después de un delay
$openBrowser = {
    Start-Sleep -Seconds 8
    Write-Host "[*] Abriendo navegador..." -ForegroundColor Green
    Start-Process "http://localhost:8000"
}

# Iniciar el proceso de abrir navegador en background
$browserJob = Start-Job -ScriptBlock $openBrowser

# Ejecutar Flutter
try {
    Write-Host "[*] Ejecutando Flutter Web..." -ForegroundColor Cyan
    Write-Host "[!] Presiona Ctrl+C para detener el servidor" -ForegroundColor Yellow
    Write-Host ""
    
    flutter run -d web-server --web-port=8000
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[X] Error: Flutter no pudo iniciar el servidor" -ForegroundColor Red
        if ($LASTEXITCODE -eq 1) {
            Write-Host "   Verifica que el puerto 8000 no esté en uso" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "[X] Error ejecutando Flutter: $_" -ForegroundColor Red
    Stop-Job $browserJob -ErrorAction SilentlyContinue
    Remove-Job $browserJob -ErrorAction SilentlyContinue
    pause
    exit 1
}
finally {
    # Limpiar el job de abrir navegador si aún está ejecutándose
    Stop-Job $browserJob -ErrorAction SilentlyContinue
    Remove-Job $browserJob -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "Servidor detenido" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Cyan
}

