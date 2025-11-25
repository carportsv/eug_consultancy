# Script para inicializar Git y configurar el repositorio
# Ejecutar: .\setup-git.ps1

Write-Host "Configurando Git para el proyecto..." -ForegroundColor Cyan

# Verificar si ya es un repositorio Git
if (Test-Path .git) {
    Write-Host "Ya existe un repositorio Git" -ForegroundColor Yellow
    $continue = Read-Host "Deseas continuar de todos modos? (s/n)"
    if ($continue -ne "s") {
        exit
    }
}

# Inicializar Git
Write-Host "Inicializando repositorio Git..." -ForegroundColor Green
git init

# Agregar archivos
Write-Host "Agregando archivos..." -ForegroundColor Green
git add .

# Hacer commit inicial
Write-Host "Creando commit inicial..." -ForegroundColor Green
git commit -m "Initial commit: Flutter app con configuracion de despliegue"

# Verificar si ya existe un remote
$remoteCheck = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
    if ($remoteCheck -notmatch "error" -and $remoteCheck -ne "") {
        Write-Host "Remote ya configurado: $remoteCheck" -ForegroundColor Green
    } else {
        # No hay remote, configurarlo
        Write-Host "Configurando remote..." -ForegroundColor Green
        Write-Host "Por favor, ingresa la URL de tu repositorio GitHub:" -ForegroundColor Yellow
        Write-Host "Ejemplo: https://github.com/carportsv/fzkt_openstreet.git" -ForegroundColor Gray
        $repoUrl = Read-Host "URL del repositorio"
        
        if ($repoUrl) {
            git remote add origin $repoUrl
            Write-Host "Remote configurado: $repoUrl" -ForegroundColor Green
        } else {
            Write-Host "No se configuro el remote. Puedes hacerlo despues con:" -ForegroundColor Yellow
            Write-Host '   git remote add origin URL' -ForegroundColor Gray
        }
    }
} else {
    # No hay remote, configurarlo
    Write-Host "Configurando remote..." -ForegroundColor Green
    Write-Host "Por favor, ingresa la URL de tu repositorio GitHub:" -ForegroundColor Yellow
    Write-Host "Ejemplo: https://github.com/carportsv/fzkt_openstreet.git" -ForegroundColor Gray
    $repoUrl = Read-Host "URL del repositorio"
    
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Host "Remote configurado: $repoUrl" -ForegroundColor Green
    } else {
        Write-Host "No se configuro el remote. Puedes hacerlo despues con:" -ForegroundColor Yellow
        Write-Host '   git remote add origin URL' -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Configuracion completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "1. Agregar los secrets en GitHub (ver GITHUB_SECRETS_GUIDE.md)" -ForegroundColor White
Write-Host "2. Hacer push: git push -u origin main" -ForegroundColor White
Write-Host "3. Activar GitHub Pages en Settings > Pages" -ForegroundColor White
Write-Host ""
