# 🔧 Solución para Problemas de CORS con Nominatim

## 🚨 Problema Identificado

El error que estás viendo es un problema de **CORS (Cross-Origin Resource Sharing)**. Nominatim está bloqueando las peticiones desde `https://localhost:8443` porque no tiene los headers CORS apropiados.

## ✅ Soluciones Implementadas

### 1. **Servidor Proxy Local (Recomendado)**

He creado un servidor proxy local que evita completamente los problemas de CORS:

```bash
# En una nueva terminal, ejecuta:
cd web-html
python proxy-server.py
```

El servidor proxy se ejecutará en `http://localhost:8080` y redirigirá todas las peticiones a Nominatim.

### 2. **Múltiples Métodos de Fallback**

El código ahora intenta **4 métodos diferentes** en orden:

1. **Proxy Local** (`http://localhost:8080/nominatim/`)
2. **Fetch Directo** (puede fallar por CORS)
3. **Proxy Público** (`api.allorigins.win`)
4. **JSONP** (método legacy)

### 3. **Mejoras en el Código**

- ✅ Headers apropiados para Nominatim
- ✅ Manejo de errores robusto
- ✅ Logs detallados para depuración
- ✅ Timeouts para evitar bloqueos
- ✅ Soporte para idioma español

## 🚀 Cómo Usar

### Opción 1: Con Proxy Local (Recomendado)

1. **Abrir una nueva terminal**
2. **Navegar al directorio web-html:**
   ```bash
   cd web-html
   ```
3. **Ejecutar el servidor proxy:**
   ```bash
   python proxy-server.py
   ```
4. **Mantener esta terminal abierta**
5. **En otra terminal, ejecutar el servidor principal:**
   ```bash
   python https-server.py
   ```
6. **Abrir el navegador en:** `https://localhost:8443/admin/assign-drivers.html`

### Opción 2: Sin Proxy Local

Si no quieres usar el proxy local, el código automáticamente intentará los otros métodos:

1. **Ejecutar solo el servidor principal:**
   ```bash
   python https-server.py
   ```
2. **El código intentará automáticamente:**
   - Fetch directo a Nominatim
   - Proxy público
   - JSONP

## 🔍 Verificación

Para verificar que funciona:

1. **Abrir la consola del navegador** (F12)
2. **Ir al modal "Crear Nuevo Viaje"**
3. **Escribir en el campo "Origen":** `zacatecoluca`
4. **Deberías ver logs como:**
   ```
   🔍 Buscando direcciones para: "zacatecoluca" (origin)
   🌐 URL de búsqueda: http://localhost:8080/nominatim/search?...
   📍 Encontradas X direcciones para "zacatecoluca"
   ✅ Dropdown mostrado con X resultados
   ```

## 🛠️ Solución de Problemas

### Si el proxy local no funciona:

1. **Verificar que Python esté instalado**
2. **Verificar que el puerto 8080 esté libre**
3. **Cambiar el puerto en `proxy-server.py` si es necesario**

### Si ningún método funciona:

1. **Verificar conexión a internet**
2. **Verificar que Nominatim esté disponible**
3. **Revisar los logs en la consola del navegador**

## 📝 Notas Técnicas

- **Proxy Local:** Evita completamente CORS
- **Proxy Público:** Puede tener limitaciones de rate
- **JSONP:** Método legacy, menos confiable
- **Headers:** Incluye User-Agent apropiado para Nominatim
- **Idioma:** Configurado para español (`accept-language=es`)

## 🎯 Resultado Esperado

Después de implementar estas soluciones, deberías poder:

- ✅ Escribir direcciones en los inputs
- ✅ Ver dropdowns de autocompletado
- ✅ Seleccionar direcciones del dropdown
- ✅ Ver marcadores en el mapa
- ✅ Hacer clic en el mapa para seleccionar ubicaciones
- ✅ Calcular rutas automáticamente
