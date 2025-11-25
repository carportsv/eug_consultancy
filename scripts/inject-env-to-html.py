#!/usr/bin/env python3
"""
Script para inyectar variables de entorno del .env (raíz) en web/index.html
Este script lee el .env de la raíz y actualiza web/index.html con las variables
"""

import re
import sys
from pathlib import Path

def load_env_file(root_dir):
    """Carga variables desde .env en la raíz del proyecto"""
    env_vars = {}
    env_file = root_dir / '.env'
    
    if not env_file.exists():
        print(f"ERROR: No se encontro .env en: {env_file}")
        return env_vars
    
    print(f"Leyendo .env desde: {env_file}")
    
    try:
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Ignorar comentarios y líneas vacías
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    # Solo incluir variables que empiecen con EXPO_PUBLIC_
                    if key.startswith('EXPO_PUBLIC_'):
                        env_vars[key] = value
        print(f"OK: Cargadas {len(env_vars)} variables de entorno")
    except Exception as e:
        print(f"ERROR leyendo .env: {e}")
    
    return env_vars

def inject_env_vars_to_html(html_file, env_vars):
    """Inyecta variables de entorno en el HTML como window.flutterEnv"""
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Crear el objeto JavaScript con las variables
        js_vars = []
        for key, value in sorted(env_vars.items()):
            # Escapar comillas y caracteres especiales
            escaped_value = value.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
            js_vars.append(f'      {key}: "{escaped_value}"')
        
        js_content = '    window.flutterEnv = {\n' + ',\n'.join(js_vars) + '\n    };'
        
        # Buscar y reemplazar el bloque window.flutterEnv existente
        pattern = r'  <!-- Environment variables injected for Flutter Web -->\s*<script>.*?</script>'
        
        replacement = f'''  <!-- Environment variables injected for Flutter Web -->
  <!-- Variables loaded from .env in root directory -->
  <script>
{js_content}
  </script>'''
        
        if re.search(pattern, content, re.DOTALL):
            # Reemplazar el bloque existente
            new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        else:
            # Insertar antes de </head>
            new_content = content.replace('</head>', f'{replacement}\n</head>')
        
        # Escribir el archivo actualizado
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"OK: Variables inyectadas en: {html_file}")
        return True
    except Exception as e:
        print(f"ERROR procesando HTML: {e}")
        return False

def main():
    # Configurar encoding para Windows
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    # Obtener directorio raíz (donde está este script, subir un nivel)
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent
    html_file = root_dir / 'web' / 'index.html'
    
    print("=" * 60)
    print("Inyectando variables de entorno en index.html")
    print("=" * 60)
    
    # Cargar variables desde .env
    env_vars = load_env_file(root_dir)
    
    if not env_vars:
        print("WARNING: No se encontraron variables de entorno. Verifica el archivo .env")
        sys.exit(1)
    
    # Inyectar en HTML
    if inject_env_vars_to_html(html_file, env_vars):
        print("=" * 60)
        print("Proceso completado exitosamente")
        print("=" * 60)
    else:
        print("=" * 60)
        print("ERROR: Error durante el proceso")
        print("=" * 60)
        sys.exit(1)

if __name__ == '__main__':
    main()

