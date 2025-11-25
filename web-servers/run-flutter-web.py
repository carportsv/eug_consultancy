#!/usr/bin/env python3
"""
Script para ejecutar Flutter Web y abrir automáticamente el navegador
Similar a flutter run pero con apertura automática del navegador
"""

import subprocess
import sys
import webbrowser
import time
import threading
from pathlib import Path

# Puerto por defecto (según memoria del usuario: siempre puerto 8000)
PORT = 8000

def open_browser_after_delay():
    """Abre el navegador después de que Flutter compile la app"""
    # Esperar un tiempo para que Flutter compile y levante el servidor
    time.sleep(8)  # Flutter tarda un poco en compilar
    url = f"http://localhost:{PORT}"
    print(f"\n🌐 Abriendo navegador en {url}...")
    webbrowser.open(url)


def main():
    print("=" * 60)
    print("🚀 Iniciando Flutter Web")
    print("=" * 60)
    print()
    print(f"📱 La aplicación estará disponible en: http://localhost:{PORT}")
    print("⏳ Compilando... esto puede tomar unos momentos")
    print()
    
    # Abrir navegador en un thread separado después de un delay
    browser_thread = threading.Thread(target=open_browser_after_delay, daemon=True)
    browser_thread.start()
    
    # Ejecutar flutter run
    try:
        # Usar web-server para no abrir Chrome automáticamente
        # y poder controlar la apertura del navegador nosotros
        # El script está en web-servers/, pero Flutter debe ejecutarse desde la raíz
        project_root = Path(__file__).parent.parent
        
        process = subprocess.run(
            [
                "flutter", "run", 
                "-d", "web-server",
                "--web-port", str(PORT)
            ],
            cwd=project_root
        )
        
        sys.exit(process.returncode)
        
    except KeyboardInterrupt:
        print("\n🛑 Deteniendo Flutter...")
        sys.exit(0)
    except FileNotFoundError:
        print("❌ Error: Flutter no está instalado o no está en el PATH")
        print("   Por favor, instala Flutter desde: https://flutter.dev")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

