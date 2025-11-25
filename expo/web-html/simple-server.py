#!/usr/bin/env python3
"""
Servidor HTTP simple para desarrollo local
Sirve la aplicación de taxi correctamente
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Si la ruta es /, servir index.html
        if self.path == '/':
            self.path = '/index.html'
        
        # Si la ruta termina en /, agregar index.html
        elif self.path.endswith('/'):
            self.path += 'index.html'
        
        return super().do_GET()

def main():
    # Cambiar al directorio del script
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Intentar puerto 8000
    port = 8000
    
    try:
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            print(f"🚀 Servidor HTTP ejecutándose en http://localhost:{port}")
            print(f"📁 Sirviendo archivos desde: {os.getcwd()}")
            print(f"🌐 Abre tu navegador en: http://localhost:{port}")
            print("🛑 Presiona Ctrl+C para detener el servidor")
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n🛑 Servidor detenido")
                
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Puerto {port} ocupado")
            print("💡 Intenta con otro puerto o cierra otros procesos")
        else:
            print(f"❌ Error: {e}")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")

if __name__ == "__main__":
    main() 