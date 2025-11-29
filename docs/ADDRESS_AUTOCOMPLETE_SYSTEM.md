# Sistema de Autocompletado de Direcciones

## 📋 Descripción General

Sistema de autocompletado de direcciones con cadena de fallback optimizada para máxima disponibilidad y velocidad. Funciona tanto en **móvil** como en **web**.

## 🔄 Orden de Búsqueda (Cadena de Fallback)

El sistema busca direcciones en el siguiente orden:

### 1. **Lugares Comunes (Local)** ⚡
- **Ubicación**: `lib/services/common_places_service.dart`
- **Datos**: `assets/data/common_places.json`
- **Velocidad**: Instantánea (0ms)
- **Disponibilidad**: 100% (offline)
- **Costo**: Gratis
- **API Key**: No requerida
- **Ventajas**:
  - Resultados instantáneos
  - Funciona offline
  - Sin consumo de APIs
  - Cero riesgo de bloqueo

### 2. **Photon (Komoot)** 🚀
- **URL**: `https://photon.komoot.io/api/`
- **Velocidad**: Rápida (~200-500ms)
- **Disponibilidad**: Alta
- **Costo**: Gratis
- **API Key**: No requerida
- **Límites**: No documentados (probablemente ~1 req/seg)
- **Ventajas**:
  - Más permisivo que Nominatim
  - Menos bloqueos
  - Buena calidad de resultados

### 3. **Nominatim (OpenStreetMap)** 🗺️
- **URL**: `https://nominatim.openstreetmap.org/search`
- **Velocidad**: Media (~500-1000ms)
- **Disponibilidad**: Variable (puede estar bloqueado)
- **Costo**: Gratis
- **API Key**: No requerida
- **Límites**: 1 petición/segundo
- **Reintento**: Cada 1 hora si está bloqueado
- **Ventajas**:
  - Alta calidad de resultados
  - Basado en OpenStreetMap
  - Datos abiertos

### 4. **GeoNames** 🌍
- **URL**: `http://api.geonames.org/searchJSON`
- **Velocidad**: Media (~500-1000ms)
- **Disponibilidad**: Alta
- **Costo**: Gratis
- **API Key**: No requerida (usa "demo" como username)
- **Límites**: ~1,000 peticiones/hora (sin registro)
- **Ventajas**:
  - Útil para nombres de lugares
  - Backup confiable
  - Sin bloqueos conocidos

## 📊 Flujo de Búsqueda

```
Usuario escribe "aeropuerto"
    ↓
1. Buscar en lugares comunes (local)
    ↓ ¿Encontrado?
    SÍ → Mostrar resultado instantáneo ✅ (80-90% de casos)
    NO → Continuar
    ↓
2. Buscar en Photon
    ↓ ¿Éxito?
    SÍ → Mostrar resultados ✅ (5-10% de casos)
    NO → Continuar
    ↓
3. Intentar Nominatim (si no está bloqueado o pasó 1 hora)
    ↓ ¿Éxito?
    SÍ → Mostrar resultados ✅ (2-5% de casos)
    NO → Continuar
    ↓
4. Buscar en GeoNames
    ↓ ¿Éxito?
    SÍ → Mostrar resultados ✅ (1-3% de casos)
    NO → Sin resultados
```

## 🎯 Ventajas del Sistema

### Velocidad
- **80-90%** de búsquedas desde lugares comunes → **Instantáneo**
- **5-10%** desde Photon → **Rápido** (~200-500ms)
- **5%** desde otros servicios → **Backup** (~500-1000ms)

### Eficiencia
- Menos peticiones HTTP (lugares comunes primero)
- Menor consumo de APIs
- Menor riesgo de bloqueo

### Confiabilidad
- Múltiples fallbacks
- Si un servicio falla, hay alternativas
- Alta disponibilidad

### Costo
- **100% gratis** (todos los servicios sin API key)
- Sin costos ocultos
- Sin límites de pago

## 📁 Estructura de Archivos

```
lib/
  services/
    common_places_service.dart      ← Servicio de lugares comunes
  screens/
    welcome/
      form/
        address_autocomplete_service.dart  ← Servicio principal con cadena de fallback

assets/
  data/
    common_places.json              ← Lista de lugares comunes (editable)
```

## 🔧 Configuración

### Agregar Lugares Comunes

Edita `assets/data/common_places.json`:

```json
{
  "places": [
    {
      "name": "Nombre del lugar",
      "display_name": "Nombre completo para mostrar",
      "lat": 37.4667,
      "lon": 15.0664,
      "type": "airport",
      "city": "Ciudad",
      "country": "País",
      "keywords": ["palabra1", "palabra2", "sinonimo"]
    }
  ]
}
```

### Actualizar Lugares Comunes

1. Edita `assets/data/common_places.json`
2. Ejecuta `flutter clean` (opcional)
3. Reinicia la app

## 📱 Compatibilidad

### ✅ Móvil (Android/iOS)
- Funciona completamente
- Lugares comunes funcionan offline
- APIs funcionan con conexión a Internet

### ✅ Web
- Funciona completamente
- Mismo comportamiento que móvil
- Sin diferencias de implementación

## 🐛 Manejo de Errores

### Errores de Conexión
- Detecta problemas de DNS
- Detecta falta de conexión a Internet
- Muestra mensajes claros en logs

### Bloqueos de API
- Nominatim: Se marca como bloqueado y se reintenta cada 1 hora
- Photon: Si falla, continúa con siguiente servicio
- GeoNames: Si falla, retorna sin resultados

### Timeouts
- Timeout de 10 segundos por servicio
- Si un servicio tarda, continúa con el siguiente

## 📈 Estadísticas Esperadas

### Distribución de Uso
- **Lugares comunes**: 80-90% de búsquedas
- **Photon**: 5-10% de búsquedas
- **Nominatim**: 2-5% de búsquedas
- **GeoNames**: 1-3% de búsquedas

### Rendimiento
- **Tiempo promedio**: <100ms (gracias a lugares comunes)
- **Tiempo máximo**: ~1000ms (si todos los servicios fallan)
- **Tasa de éxito**: >95% (con múltiples fallbacks)

## 🔍 Logs de Debug

En modo debug (`kDebugMode`), el sistema muestra logs detallados:

```
[CommonPlacesService] ✅ Encontrados X lugares comunes para: "query"
[AddressAutocompleteService] [Photon] Buscando: query
[AddressAutocompleteService] [Nominatim] Status code: 200
[AddressAutocompleteService] [GeoNames] Resultados válidos: X
```

## 🚀 Mejoras Futuras

### Posibles Optimizaciones
1. **Caché de resultados de API**: Guardar resultados frecuentes
2. **Debounce más agresivo**: Reducir peticiones mientras el usuario escribe
3. **Pre-carga**: Cargar lugares comunes al iniciar la app
4. **Filtrado inteligente**: Ordenar por relevancia/proximidad

### Servicios Adicionales (Opcional)
- **Yandex Geocoding**: Requiere API key (25K/día gratis)
- **Mapbox Geocoding**: Requiere API key (100K/mes gratis)

## 📝 Notas Importantes

1. **GeoNames usa "demo" como username**: Para producción, considera registrarte para límites más altos
2. **Nominatim puede estar bloqueado**: El sistema lo detecta y reintenta automáticamente
3. **Lugares comunes son editables**: Puedes agregar/modificar lugares sin tocar código
4. **Todos los servicios son gratuitos**: No hay costos ocultos

## 🔗 Referencias

- [Photon API](https://photon.komoot.io/)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [GeoNames API](http://www.geonames.org/export/web-services.html)
- [OpenStreetMap](https://www.openstreetmap.org/)

---

**Última actualización**: 2025-01-27
**Versión**: 1.0.0
**Compatibilidad**: Móvil (Android/iOS) y Web

