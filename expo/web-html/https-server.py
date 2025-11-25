#!/usr/bin/env python3
"""
Servidor HTTPS simple para desarrollo local
Permite que reCAPTCHA funcione correctamente
"""

import http.server
import socketserver
import ssl
import os
import sys
import re
from pathlib import Path

def load_env_vars():
    """Cargar variables de entorno desde .env en la raíz del proyecto"""
    env_vars = {}
    try:
        # Buscar .env en la raíz del proyecto (un nivel arriba)
        env_path = os.path.join(os.path.dirname(os.getcwd()), '.env')
        with open(env_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    if '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip()
        print(f"✅ Variables de entorno cargadas desde {env_path}")
        return env_vars
    except FileNotFoundError:
        print("⚠️ Archivo .env no encontrado en la raíz del proyecto")
        return {}
    except Exception as e:
        print(f"⚠️ Error cargando .env: {e}")
        return {}

def create_self_signed_cert():
    """Crear certificado SSL autofirmado para desarrollo usando cryptography"""
    cert_file = "localhost.crt"
    key_file = "localhost.key"
    
    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        print("🔐 Generando certificado SSL autofirmado...")
        
        try:
            from cryptography import x509
            from cryptography.x509.oid import NameOID
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import rsa
            from datetime import datetime, timedelta
            
            # Generar clave privada
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            
            # Crear certificado
            subject = issuer = x509.Name([
                x509.NameAttribute(NameOID.COUNTRY_NAME, "SV"),
                x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "San Salvador"),
                x509.NameAttribute(NameOID.LOCALITY_NAME, "San Salvador"),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Development"),
                x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
            ])
            
            cert = x509.CertificateBuilder().subject_name(
                subject
            ).issuer_name(
                issuer
            ).public_key(
                private_key.public_key()
            ).serial_number(
                x509.random_serial_number()
            ).not_valid_before(
                datetime.now()
            ).not_valid_after(
                datetime.now() + timedelta(days=365)
            ).add_extension(
                x509.SubjectAlternativeName([
                    x509.DNSName("localhost"),
                    x509.DNSName("127.0.0.1"),
                ]),
                critical=False,
            ).sign(private_key, hashes.SHA256())
            
            # Guardar certificado
            with open(cert_file, "wb") as f:
                f.write(cert.public_bytes(serialization.Encoding.PEM))
            
            # Guardar clave privada
            with open(key_file, "wb") as f:
                f.write(private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                ))
            
            print("✅ Certificado SSL generado con cryptography")
            return True
            
        except ImportError:
            print("⚠️ cryptography no disponible, intentando con OpenSSL...")
            # Fallback a OpenSSL
            cmd = f'openssl req -x509 -newkey rsa:4096 -keyout {key_file} -out {cert_file} -days 365 -nodes -subj "/C=SV/ST=San Salvador/L=San Salvador/O=Development/CN=localhost"'
            try:
                os.system(cmd)
                print("✅ Certificado SSL generado")
                return True
            except Exception as e:
                print(f"❌ Error generando certificado: {e}")
                return False
        except Exception as e:
            print(f"❌ Error generando certificado: {e}")
            return False
    
    return True

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, env_vars=None, **kwargs):
        self.env_vars = env_vars or {}
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        # Redirigir la raíz al login
        if self.path == '/' or self.path == '/index.html':
            self.send_response(302)
            self.send_header('Location', '/auth/login.html')
            self.end_headers()
            return
        
        # Interceptar peticiones a config.js
        if self.path == '/js/config.js':
            self.serve_config_with_env()
        else:
            super().do_GET()
    
    def serve_config_with_env(self):
        try:
            # Leer el archivo config.js
            config_path = os.path.join(os.getcwd(), 'js', 'config.js')
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Reemplazar placeholders con variables de entorno
            content = content.replace('{{FIREBASE_API_KEY}}', self.env_vars.get('EXPO_PUBLIC_FIREBASE_API_KEY', '{{FIREBASE_API_KEY}}'))
            content = content.replace('{{FIREBASE_AUTH_DOMAIN}}', self.env_vars.get('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', '{{FIREBASE_AUTH_DOMAIN}}'))
            content = content.replace('{{FIREBASE_PROJECT_ID}}', self.env_vars.get('EXPO_PUBLIC_FIREBASE_PROJECT_ID', '{{FIREBASE_PROJECT_ID}}'))
            content = content.replace('{{FIREBASE_STORAGE_BUCKET}}', self.env_vars.get('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', '{{FIREBASE_STORAGE_BUCKET}}'))
            content = content.replace('{{FIREBASE_MESSAGING_SENDER_ID}}', self.env_vars.get('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '{{FIREBASE_MESSAGING_SENDER_ID}}'))
            content = content.replace('{{FIREBASE_APP_ID}}', self.env_vars.get('EXPO_PUBLIC_FIREBASE_APP_ID', '{{FIREBASE_APP_ID}}'))
            content = content.replace('{{SUPABASE_URL}}', self.env_vars.get('EXPO_PUBLIC_SUPABASE_URL', '{{SUPABASE_URL}}'))
            content = content.replace('{{SUPABASE_ANON_KEY}}', self.env_vars.get('EXPO_PUBLIC_SUPABASE_ANON_KEY', '{{SUPABASE_ANON_KEY}}'))
            
            # Enviar respuesta
            self.send_response(200)
            self.send_header('Content-type', 'application/javascript')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
            
            print("🔧 config.js servido con variables de entorno")
            
        except Exception as e:
            print(f"❌ Error sirviendo config.js: {e}")
            self.send_error(500, f"Error: {e}")

def main():
    PORT = 8443
    
    # Cambiar al directorio del script
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Cargar variables de entorno
    env_vars = load_env_vars()
    
    # Crear certificado SSL
    if not create_self_signed_cert():
        print("❌ No se pudo crear el certificado SSL")
        sys.exit(1)
    
    # Configurar servidor HTTP con handler personalizado
    def handler(*args, **kwargs):
        return CustomHTTPRequestHandler(*args, env_vars=env_vars, **kwargs)
    
    try:
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            # Configurar SSL
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain('localhost.crt', 'localhost.key')
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
            
            print(f"🚀 Servidor HTTPS ejecutándose en https://localhost:{PORT}")
            print(f"📁 Sirviendo archivos desde: {os.getcwd()}")
            print("🔐 Certificado SSL autofirmado - el navegador mostrará una advertencia")
            print("💡 Para continuar, haz clic en 'Avanzado' y luego 'Continuar'")
            print("🛑 Presiona Ctrl+C para detener el servidor")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido")
    except Exception as e:
        print(f"❌ Error iniciando servidor: {e}")

if __name__ == "__main__":
    main() 