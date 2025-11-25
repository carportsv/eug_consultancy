#!/usr/bin/env python3
"""
Servidor HTTPS simple para desarrollo local
Usa certificados pre-generados para evitar dependencias externas
"""

import http.server
import socketserver
import ssl
import os
import sys
from pathlib import Path

def create_simple_cert():
    """Crear certificado SSL simple usando OpenSSL o fallback"""
    cert_file = "localhost.crt"
    key_file = "localhost.key"
    
    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        print("🔐 Generando certificado SSL simple...")
        
        # Intentar usar OpenSSL si está disponible
        try:
            import subprocess
            result = subprocess.run([
                'openssl', 'req', '-x509', '-newkey', 'rsa:2048', 
                '-keyout', key_file, '-out', cert_file, '-days', '365', 
                '-nodes', '-subj', '/C=SV/ST=San Salvador/L=San Salvador/O=Development/CN=localhost'
            ], capture_output=True, text=True, check=True)
            
            print("✅ Certificado SSL generado con OpenSSL")
            return True
            
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("⚠️ OpenSSL no disponible, intentando con cryptography...")
            
            # Fallback a cryptography
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
                    datetime.utcnow()
                ).not_valid_after(
                    datetime.utcnow() + timedelta(days=365)
                ).add_extension(
                    x509.SubjectAlternativeName([
                        x509.DNSName("localhost"),
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
                print("❌ Ni OpenSSL ni cryptography están disponibles")
                print("💡 Instala cryptography con: pip install cryptography")
                return False
            except Exception as e:
                print(f"❌ Error generando certificado: {e}")
                return False
    
    return True

def try_port(port):
    """Intentar usar un puerto específico"""
    try:
        httpd = socketserver.TCPServer(("", port), http.server.SimpleHTTPRequestHandler)
        return httpd, port
    except OSError:
        return None, port

def main():
    # Cambiar al directorio del script
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Crear certificado SSL
    if not create_simple_cert():
        print("❌ No se pudo crear el certificado SSL")
        print("🔄 Usando servidor HTTP en puerto 8000...")
        
        # Fallback a HTTP
        try:
            with socketserver.TCPServer(("", 8000), http.server.SimpleHTTPRequestHandler) as httpd:
                print(f"🚀 Servidor HTTP ejecutándose en http://localhost:8000")
                print(f"📁 Sirviendo archivos desde: {os.getcwd()}")
                print("⚠️ reCAPTCHA puede no funcionar en HTTP")
                print("🛑 Presiona Ctrl+C para detener el servidor")
                httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Servidor detenido")
        return
    
    # Intentar puerto 8000 primero, luego 8443
    ports_to_try = [8000, 8443]
    httpd = None
    selected_port = None
    
    for port in ports_to_try:
        print(f"🔍 Intentando puerto {port}...")
        httpd, selected_port = try_port(port)
        if httpd:
            print(f"✅ Puerto {port} disponible")
            break
        else:
            print(f"❌ Puerto {port} ocupado")
    
    if not httpd:
        print("❌ No se pudo usar ningún puerto disponible")
        return
    
    # Configurar SSL
    try:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain('localhost.crt', 'localhost.key')
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
        
        print(f"🚀 Servidor HTTPS ejecutándose en https://localhost:{selected_port}")
        print(f"📁 Sirviendo archivos desde: {os.getcwd()}")
        print("🔐 Certificado SSL autofirmado - el navegador mostrará una advertencia")
        print("💡 Para continuar, haz clic en 'Avanzado' y luego 'Continuar'")
        print("🛑 Presiona Ctrl+C para detener el servidor")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Servidor detenido")
        finally:
            httpd.server_close()
        
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido")
    except Exception as e:
        print(f"❌ Error iniciando servidor HTTPS: {e}")
        print("🔄 Intentando servidor HTTP...")
        
        try:
            with socketserver.TCPServer(("", 8000), http.server.SimpleHTTPRequestHandler) as httpd:
                print(f"🚀 Servidor HTTP ejecutándose en http://localhost:8000")
                print(f"📁 Sirviendo archivos desde: {os.getcwd()}")
                print("⚠️ reCAPTCHA puede no funcionar en HTTP")
                print("🛑 Presiona Ctrl+C para detener el servidor")
                httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Servidor detenido")

if __name__ == "__main__":
    main() 