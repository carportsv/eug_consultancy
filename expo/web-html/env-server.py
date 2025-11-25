#!/usr/bin/env python3
"""
Servidor HTTP que carga variables de entorno y las inyecta en el HTML
"""

import http.server
import socketserver
import os
import sys
import re
from pathlib import Path

def load_env_file():
    """Carga variables desde archivo .env en la raíz del proyecto"""
    env_vars = {}
    
    # Buscar .env en el directorio actual (web-html)
    env_file = Path(__file__).parent / '.env'
    if not env_file.exists():
        # Buscar .env en el directorio padre (raíz del proyecto)
        env_file = Path(__file__).parent.parent / '.env'
    
    if env_file.exists():
        print(f"📋 Cargando variables desde: {env_file}")
        
        # Intentar diferentes codificaciones
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        
        for encoding in encodings:
            try:
                with open(env_file, 'r', encoding=encoding) as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            env_vars[key.strip()] = value.strip()
                print(f"✅ Archivo leído con codificación: {encoding}")
                break
            except UnicodeDecodeError:
                print(f"⚠️ Error con codificación {encoding}, intentando siguiente...")
                continue
            except Exception as e:
                print(f"❌ Error leyendo archivo: {e}")
                break
    else:
        print("⚠️ No se encontró archivo .env")
    
    return env_vars

def inject_env_vars(html_content, env_vars):
    """Inyecta variables de entorno en el HTML como meta tags"""
    # Crear meta tags para las variables de entorno
    meta_tags = []
    for key, value in env_vars.items():
        meta_tags.append(f'<meta name="{key}" content="{value}">')
    
    # Insertar meta tags después del <head>
    head_pattern = r'(<head[^>]*>)'
    replacement = r'\1\n    ' + '\n    '.join(meta_tags)
    
    return re.sub(head_pattern, replacement, html_content)

class EnvHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Si la ruta es /, servir index.html
        if self.path == '/':
            self.path = '/index.html'
        
        # Si la ruta termina en /, agregar index.html
        elif self.path.endswith('/'):
            self.path += 'index.html'
        
        # Si es un archivo HTML, inyectar variables de entorno
        if self.path.endswith('.html'):
            try:
                file_path = Path(self.path.lstrip('/'))
                if file_path.exists():
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Cargar variables de entorno
                    env_vars = load_env_file()
                    
                    # Inyectar variables en el HTML
                    modified_content = inject_env_vars(content, env_vars)
                    
                    # Servir el contenido modificado
                    self.send_response(200)
                    self.send_header('Content-type', 'text/html; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(modified_content.encode('utf-8'))
                    return
                    
            except Exception as e:
                print(f"Error procesando HTML: {e}")
        
        # Para otros archivos, usar el comportamiento normal
        return super().do_GET()

def main():
    # Cambiar al directorio del script
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Cargar variables de entorno
    env_vars = load_env_file()
    print(f"📋 Variables de entorno cargadas: {list(env_vars.keys())}")
    
    # Intentar puerto 8000
    port = 8000
    
    try:
        with socketserver.TCPServer(("", port), EnvHTTPRequestHandler) as httpd:
            print(f"🚀 Servidor HTTP con variables de entorno ejecutándose en http://localhost:{port}")
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