@echo off
REM Script de Backup Local para el Proyecto Flutter (Windows Batch)
REM Uso: scripts\backup-project.bat

echo ========================================
echo   BACKUP LOCAL DEL PROYECTO
echo ========================================
echo.

REM Configuración
set "PROJECT_PATH=%~dp0.."
set "BACKUP_BASE=D:\carposv\apps\taxi\backups"
set "TIMESTAMP=%date:~-4,4%-%date:~-7,2%-%date:~-10,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "BACKUP_FOLDER=%BACKUP_BASE%\backup_%TIMESTAMP%"

REM Crear directorio de backup
if not exist "%BACKUP_BASE%" mkdir "%BACKUP_BASE%"
if not exist "%BACKUP_FOLDER%" mkdir "%BACKUP_FOLDER%"

echo Creando backup en: %BACKUP_FOLDER%
echo.

REM Copiar archivos (excluyendo build, .dart_tool, etc.)
echo Copiando archivos del proyecto...
xcopy "%PROJECT_PATH%\*" "%BACKUP_FOLDER%\" /E /I /H /Y /EXCLUDE:scripts\backup-exclude.txt >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo Archivos copiados exitosamente
) else (
    echo Error al copiar archivos
    pause
    exit /b 1
)

REM Crear archivo de información
echo BACKUP DEL PROYECTO FZKT_OPENSTREET > "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo ==================================== >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo Fecha: %date% %time% >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo Ubicacion: %BACKUP_FOLDER% >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo. >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo Para restaurar este backup: >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo 1. Copia todos los archivos de esta carpeta a la ubicacion del proyecto >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"
echo 2. Ejecuta: flutter pub get >> "%BACKUP_FOLDER%\BACKUP_INFO.txt"

echo.
echo ========================================
echo   BACKUP COMPLETADO
echo ========================================
echo.
echo Ubicacion del backup:
echo   %BACKUP_FOLDER%
echo.
pause

