# 🚀 Servidores Web para Flutter

Esta carpeta contiene scripts para ejecutar tu aplicación Flutter Web y abrir automáticamente el navegador en `http://localhost:8000`.

## 📋 Scripts Disponibles

### 1. `flutter-web-server.py` (Recomendado)

Servidor Python que compila la app Flutter y sirve los archivos desde `build/web`.

**Ventajas:**
- ✅ Similar al servidor de `expo/web-html/simple-server.py`
- ✅ Compila automáticamente si no encuentra archivos compilados
- ✅ Sirve archivos estáticos desde `build/web`
- ✅ Abre el navegador automáticamente

**Uso:**
```bash
# Desde cualquier ubicación
python web-servers/flutter-web-server.py

# O desde la carpeta web-servers
cd web-servers
python flutter-web-server.py
```

### 2. `run-flutter-web.py`

Ejecuta `flutter run` directamente con hot reload habilitado.

**Ventajas:**
- ✅ Hot reload durante el desarrollo
- ✅ Recarga automática al hacer cambios
- ✅ Abre el navegador automáticamente

**Uso:**
```bash
python web-servers/run-flutter-web.py
```

### 3. `run-flutter-web.bat` (Windows - CMD)

Script en batch para Windows que ejecuta Flutter y abre el navegador.

**Uso:**
```bash
# Doble clic en el archivo
# O desde CMD
web-servers\run-flutter-web.bat

# O desde PowerShell
.\web-servers\run-flutter-web.bat
```

### 4. `run-flutter-web.ps1` (Windows - PowerShell) ⭐ Recomendado para Windows

Script optimizado para PowerShell que detecta mejor Flutter en Windows.

**Uso:**
```powershell
# Desde PowerShell
.\web-servers\run-flutter-web.ps1

# Si tienes problemas de política de ejecución:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\web-servers\run-flutter-web.ps1
```

## 🔧 Requisitos

1. **Flutter instalado** y disponible en el PATH
2. **Python 3** (para los scripts .py)
3. **Puerto 8000 libre** (según memoria del usuario: siempre puerto 8000)

## 📱 Puerto

Todos los scripts usan el puerto **8000** por defecto, como se configuró en las memorias del proyecto.

## 🐛 Solución de Problemas

### Error: "Flutter no está instalado o no está en el PATH"

**Solución:**
1. Verifica que Flutter esté instalado: `flutter --version`
2. Asegúrate de que Flutter esté en tu PATH de Windows
3. En Windows, puedes necesitar reiniciar PowerShell/CMD después de instalar Flutter

### Error: "Puerto 8000 ya está en uso"

**Solución:**
- Cierra la aplicación que está usando el puerto 8000
- O cambia el puerto en el script (aunque según las memorias, debe ser siempre 8000)

### Error: "No se encontró pubspec.yaml"

**Solución:**
- Asegúrate de ejecutar el script desde la carpeta `web-servers` o desde la raíz del proyecto
- Los scripts están diseñados para funcionar desde cualquier ubicación

## 💡 Recomendaciones

- **Para desarrollo rápido**: Usa `run-flutter-web.ps1` (PowerShell) o `run-flutter-web.py`
- **Para producción/testing**: Usa `flutter-web-server.py` que sirve archivos compilados
- **En Windows**: Prefiere los scripts `.ps1` o `.bat` para mejor compatibilidad

## 📝 Notas

- Los scripts detectan automáticamente el directorio del proyecto
- Todos los scripts abren automáticamente el navegador en `http://localhost:8000`
- Presiona `Ctrl+C` para detener cualquier servidor

