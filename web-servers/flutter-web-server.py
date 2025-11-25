#!/usr/bin/env python3
"""
Servidor HTTP simple para desarrollo local de Flutter Web
Compila la app Flutter si es necesario, inicia el servidor y abre el navegador automáticamente
"""

import http.server
import socketserver
import os
import sys
import subprocess
import webbrowser
import time
import threading
from pathlib import Path

# Puerto por defecto (según memoria del usuario: siempre puerto 8000)
PORT = 8000

# Directorios importantes
# El script está en web-servers/, pero build/web está en la raíz del proyecto
ROOT_DIR = Path(__file__).parent.parent  # Ir un nivel arriba desde web-servers/
BUILD_DIR = ROOT_DIR / "build" / "web"


def check_flutter_installed():
    """Verifica si Flutter está instalado"""
    try:
        # En Windows, intentar con diferentes variantes del comando
        commands = ["flutter", "flutter.bat"]
        for cmd in commands:
            try:
                result = subprocess.run(
                    [cmd, "--version"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    shell=True  # Usar shell=True en Windows
                )
                if result.returncode == 0:
                    return True
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue
        return False
    except Exception:
        return False


def build_flutter_web():
    """Compila la aplicación Flutter para web"""
    print("🔨 Compilando aplicación Flutter para web...")
    print("   Esto puede tomar unos momentos...")
    
    try:
        # En Windows, usar shell=True para mejor compatibilidad
        import platform
        use_shell = platform.system() == "Windows"
        
        result = subprocess.run(
            ["flutter", "build", "web"],
            cwd=ROOT_DIR,
            capture_output=True,
            text=True,
            shell=use_shell
        )
        
        if result.returncode == 0:
            print("✅ Compilación completada exitosamente")
            return True
        else:
            print(f"❌ Error durante la compilación:")
            if result.stderr:
                print(result.stderr)
            if result.stdout:
                print(result.stdout)
            return False
    except Exception as e:
        print(f"❌ Error ejecutando Flutter: {e}")
        return False


def check_build_exists():
    """Verifica si los archivos compilados existen"""
    index_file = BUILD_DIR / "index.html"
    return index_file.exists()


def open_browser():
    """Abre el navegador después de un breve delay"""
    time.sleep(1.5)  # Esperar a que el servidor esté listo
    url = f"http://localhost:{PORT}"
    print(f"🌐 Abriendo navegador en {url}...")
    webbrowser.open(url)


class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Handler HTTP personalizado para servir archivos Flutter"""
    
    # Archivos sensibles que NO deben ser servidos
    BLOCKED_FILES = ['.env', '.env.local', '.env.production', 'secrets.json']
    
    # Rutas bloqueadas (incluyendo subdirectorios)
    BLOCKED_PATHS = ['/assets/.env', '/.env']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BUILD_DIR), **kwargs)
    
    def log_message(self, format, *args):
        """Sobrescribir logging para suprimir errores 404 normales"""
        # Solo loggear si no es un 404 de archivos opcionales comunes
        status_code = args[1] if len(args) > 1 else None
        path = args[0] if len(args) > 0 else ''
        
        # Suprimir 404s de archivos opcionales comunes
        optional_files = [
            '.well-known',
            '.map',
            'flutter.js.map',
            'main.dart.js.map',
        ]
        
        if status_code == 404 and any(opt in path for opt in optional_files):
            return  # No loggear estos 404s
        
        # Loggear normalmente para otros casos
        super().log_message(format, *args)
    
    def do_GET(self):
        # Bloquear archivos sensibles
        path_lower = self.path.lower()
        
        # Verificar rutas bloqueadas
        for blocked_path in self.BLOCKED_PATHS:
            if blocked_path.lower() in path_lower:
                self.send_error(403, "Forbidden: Access to sensitive files is not allowed")
                return
        
        # Verificar nombres de archivos bloqueados
        for blocked in self.BLOCKED_FILES:
            if blocked in path_lower:
                self.send_error(403, "Forbidden: Access to sensitive files is not allowed")
                return
        
        # Si la ruta es /, servir index.html
        if self.path == '/':
            self.path = '/index.html'
        # Si la ruta termina en /, agregar index.html
        elif self.path.endswith('/'):
            self.path += 'index.html'
        
        # Servir archivos estáticos normalmente
        try:
            return super().do_GET()
        except (ConnectionAbortedError, BrokenPipeError):
            # Suprimir errores de conexión abortada (normales cuando el navegador cancela)
            pass
        except Exception as e:
            # Solo loggear errores reales
            if "File not found" not in str(e):
                self.log_error(f"Error serving {self.path}: {e}")


def main():
    print("=" * 60)
    print("🚀 Servidor Flutter Web")
    print("=" * 60)
    print()
    
    # Verificar que estamos en el directorio correcto
    if not (ROOT_DIR / "pubspec.yaml").exists():
        print(f"❌ Error: No se encontró pubspec.yaml en {ROOT_DIR}")
        print("   Asegúrate de ejecutar este script desde la carpeta web-servers")
        sys.exit(1)
    
    # Verificar si Flutter está instalado
    print("🔍 Verificando Flutter...")
    if not check_flutter_installed():
        print("❌ Error: Flutter no está instalado o no está en el PATH")
        print("   Por favor, instala Flutter desde: https://flutter.dev")
        print("   O asegúrate de que Flutter esté en tu PATH de Windows")
        sys.exit(1)
    print("✅ Flutter encontrado")
    print()
    
    # Verificar si los archivos compilados existen
    if not check_build_exists():
        print("⚠️  No se encontraron archivos compilados en build/web")
        print("   Iniciando compilación...")
        print()
        
        if not build_flutter_web():
            print()
            print("❌ No se pudo compilar la aplicación")
            print("   Puedes compilar manualmente con: flutter build web")
            sys.exit(1)
        print()
    else:
        print("✅ Archivos compilados encontrados")
        print()
    
    # Cambiar al directorio de compilación
    if not BUILD_DIR.exists():
        print(f"❌ Error: No se encontró el directorio {BUILD_DIR}")
        sys.exit(1)
    
    # Iniciar el servidor
    try:
        # Crear el servidor con el handler personalizado
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print("=" * 60)
            print(f"✅ Servidor HTTP ejecutándose en http://localhost:{PORT}")
            print(f"📁 Sirviendo archivos desde: {BUILD_DIR.absolute()}")
            print("=" * 60)
            print()
            print("🛑 Presiona Ctrl+C para detener el servidor")
            print()
            
            # Abrir navegador en un thread separado
            browser_thread = threading.Thread(target=open_browser, daemon=True)
            browser_thread.start()
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print()
                print("=" * 60)
                print("🛑 Servidor detenido")
                print("=" * 60)
                
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Error: Puerto {PORT} ya está en uso")
            print(f"   Cierra la aplicación que está usando el puerto {PORT}")
            print("   o cambia el puerto en el script")
        else:
            print(f"❌ Error iniciando servidor: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

