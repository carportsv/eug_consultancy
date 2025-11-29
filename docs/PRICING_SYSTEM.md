# Sistema de Precios - Rutas Predefinidas y Lugares con Precio Fijo

## 📋 Descripción General

Sistema de cálculo de precios que prioriza rutas predefinidas con precios fijos por tipo de vehículo. Si no hay una ruta predefinida, busca lugares cercanos con precio fijo individual.

## 🎯 Funcionamiento

### 1. Rutas Predefinidas (Prioridad Alta)

Las rutas predefinidas están en `assets/data/predefined_routes.json` y contienen:
- Origen y destino específicos
- Precios fijos por tipo de vehículo

**Ejemplo de ruta predefinida:**
```json
{
  "origin": {
    "name": "Aeroporto Napoli",
    "lat": 40.8860,
    "lon": 14.2908
  },
  "destination": {
    "name": "Napoli Centro",
    "lat": 40.8518,
    "lon": 14.2681
  },
  "prices": {
    "sedan": 60.0,
    "business": 80.0,
    "van": 90.0,
    "luxury": 120.0,
    "minibus_8pax": 100.0,
    "bus_16pax": 350.0,
    "bus_19pax": 450.0,
    "bus_50pax": 550.0
  }
}
```

### 2. Cálculo de Precio (Orden de Prioridad)

El sistema calcula el precio en el siguiente orden:

#### **Opción 1: Ruta Predefinida (Máxima Prioridad)**

1. **Si el origen y destino coinciden con una ruta predefinida (dentro de 2km)**:
   - Usa el precio fijo directamente según el tipo de vehículo
   - Ejemplo: Aeroporto Napoli → Napoli Centro, Sedan = €60.00

2. **Tolerancia**: 2km para considerar que un punto coincide con la ruta
   - Si el origen está a ≤2km del origen de la ruta
   - Y el destino está a ≤2km del destino de la ruta
   - Se aplica el precio fijo

#### **Opción 2: Lugares con Precio Fijo Individual**

Si no hay ruta predefinida, busca lugares cercanos con precio fijo:

1. **Si el origen o destino está muy cerca del lugar fijo (< 500m)**:
   - Usa el precio fijo directamente

2. **Si está cerca pero no exactamente (500m - 2km)**:
   - Precio = Precio fijo + (Distancia adicional × Precio por km del vehículo)

#### **Opción 3: Cálculo Estándar**

Si no hay ruta predefinida ni lugares fijos cercanos:
- Calcula el precio estándar basado en:
  - Distancia total
  - Tipo de vehículo
  - Precio mínimo según tipo de vehículo

## 📊 Rutas Predefinidas Actuales

### Rutas Aeropuerto → Centro Ciudad

1. **Aeroporto Napoli → Napoli Centro**
   - Sedan: €60 | Business: €80 | Van: €90 | Luxury: €120

2. **Aeroporto Malpensa → Milano Centro**
   - Sedan: €110 | Business: €150 | Van: €140 | Luxury: €180

3. **Aeroporto Catania Fontanarossa → Catania Centro**
   - Sedan: €50 | Business: €70 | Van: €70 | Luxury: €100

4. **Aeroporto Catania Fontanarossa → Catania Taormina**
   - Sedan: €100 | Business: €120 | Van: €150 | Luxury: €180

5. **Aeroporto Catania Fontanarossa → Catania Siracusa**
   - Sedan: €100 | Business: €120 | Van: €150 | Luxury: €180

6. **Aeroporto Palermo → Palermo Centro**
   - Sedan: €60 | Business: €70 | Van: €80 | Luxury: €90

7. **Aeroporto Bologna → Bologna Centro**
   - Sedan: €60 | Business: €70 | Van: €80 | Luxury: €90

8. **Aeroporto Pisa → Pisa Centro**
   - Sedan: €60 | Business: €70 | Van: €80 | Luxury: €90

9. **Aeroporto Firenze → Firenze Centro**
   - Sedan: €90 | Business: €120 | Van: €120 | Luxury: €180

### Agregar una Nueva Ruta Predefinida

Edita `assets/data/predefined_routes.json`:

```json
{
  "routes": [
    {
      "origin": {
        "name": "Nombre del Origen",
        "lat": 40.8860,
        "lon": 14.2908
      },
      "destination": {
        "name": "Nombre del Destino",
        "lat": 40.8518,
        "lon": 14.2681
      },
      "prices": {
        "sedan": 60.0,
        "business": 80.0,
        "van": 90.0,
        "luxury": 120.0,
        "minibus_8pax": 100.0,
        "bus_16pax": 350.0,
        "bus_19pax": 450.0,
        "bus_50pax": 550.0
      }
    }
  ]
}
```

### Cálculo Automático

Cuando un usuario selecciona origen y destino:

1. **Primero**: El sistema busca si hay una ruta predefinida que coincida (dentro de 2km)
2. **Si encuentra**: Usa el precio fijo según el tipo de vehículo seleccionado
3. **Si no encuentra**: Busca lugares con precio fijo individual
4. **Si no encuentra ninguno**: Calcula el precio estándar por distancia

## 🔧 Configuración

### Tolerancia para coincidencia de rutas

En `lib/services/predefined_routes_service.dart`:

```dart
const maxDistanceForMatch = 2.0; // km
```

- Si el origen está a ≤2km del origen de la ruta predefinida
- Y el destino está a ≤2km del destino de la ruta predefinida
- Se aplica el precio fijo de la ruta

### Distancia máxima para precio fijo individual

En `lib/screens/welcome/form/ride_calculation_service.dart`:

```dart
const maxDistanceForFixedPrice = 2.0; // km
```

### Distancia para precio fijo directo

```dart
if (distanceFromFixed < 0.5) { // 500 metros
  return basePrice; // Usa precio fijo directamente
}
```

## 🚗 Tipos de Vehículos Soportados

### Tipos Actuales en el Selector
- **sedan**: Sedan (3 pasajeros)
- **business**: Business (6 pasajeros)
- **van**: Minivan 7pax (8 pasajeros)
- **luxury**: Minivan Luxury 6pax (3 pasajeros)

### Tipos Adicionales en JSON (para futura implementación)
- **minibus_8pax**: Minibús 8 pasajeros
- **bus_16pax**: Bus 16 pasajeros
- **bus_19pax**: Bus 19 pasajeros
- **bus_50pax**: Bus 50 pasajeros

## 💡 Ventajas

1. **Precios predefinidos**: Para rutas comunes (aeropuertos, centros turísticos)
2. **Flexibilidad**: Ajusta el precio según la distancia adicional
3. **Transparencia**: Los usuarios ven precios consistentes para lugares conocidos
4. **Automatización**: No requiere intervención manual para cada viaje

## 📝 Notas

- El campo `fixed_price` es opcional
- Si un lugar no tiene `fixed_price`, se calcula el precio estándar
- El sistema busca el lugar con precio fijo más cercano
- La distancia se calcula en línea recta (no ruta real)

---

**Última actualización**: 2025-01-27
**Versión**: 1.0.0

