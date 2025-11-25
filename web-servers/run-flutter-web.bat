@echo off
REM Script para ejecutar Flutter Web en Windows y abrir automáticamente el navegador

echo ============================================================
echo 🚀 Iniciando Flutter Web
echo ============================================================
echo.
echo 📱 La aplicación estará disponible en: http://localhost:8000
echo ⏳ Compilando... esto puede tomar unos momentos
echo.

REM Cambiar al directorio raíz del proyecto (un nivel arriba de web-servers)
cd /d %~dp0..
if not exist "%CD%\pubspec.yaml" (
    echo ❌ Error: No se encontró el proyecto Flutter
    echo    Asegúrate de ejecutar este script desde la carpeta web-servers
    pause
    exit /b 1
)

REM Iniciar Flutter y esperar un poco antes de abrir el navegador
start /B flutter run -d web-server --web-port=8000

REM Esperar unos segundos para que Flutter compile
timeout /t 8 /nobreak >nul

REM Abrir el navegador
echo 🌐 Abriendo navegador...
start http://localhost:8000

echo.
echo ✅ Servidor iniciado y navegador abierto
echo 🛑 Presiona Ctrl+C en la ventana de Flutter para detener el servidor
echo.

REM Esperar a que el usuario presione una tecla
pause

