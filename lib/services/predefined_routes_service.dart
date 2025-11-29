import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:latlong2/latlong.dart';

/// Servicio para buscar rutas predefinidas con precios fijos
/// Estas rutas se cargan desde un archivo JSON local
/// Funciona offline y es instantáneo
class PredefinedRoutesService {
  static List<Map<String, dynamic>>? _cachedRoutes;
  static bool _isLoading = false;

  /// Carga las rutas predefinidas desde el archivo JSON
  static Future<void> _loadRoutes() async {
    if (_cachedRoutes != null || _isLoading) return;

    _isLoading = true;
    try {
      final String jsonString = await rootBundle.loadString('assets/data/predefined_routes.json');
      final Map<String, dynamic> jsonData = json.decode(jsonString);
      _cachedRoutes =
          (jsonData['routes'] as List<dynamic>?)
              ?.map((item) => item as Map<String, dynamic>)
              .toList() ??
          [];

      if (kDebugMode) {
        debugPrint(
          '[PredefinedRoutesService] ✅ Cargadas ${_cachedRoutes!.length} rutas predefinidas',
        );
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[PredefinedRoutesService] ⚠️ Error cargando rutas: $e');
        debugPrint(
          '[PredefinedRoutesService] Continuando sin rutas predefinidas (usando cálculo estándar)',
        );
      }
      _cachedRoutes = [];
    } finally {
      _isLoading = false;
    }
  }

  /// Busca una ruta predefinida que coincida con origen y destino
  /// Retorna el precio fijo para el tipo de vehículo especificado
  /// Tolerancia: 2km para considerar que un punto coincide con la ruta
  static Future<double?> findPredefinedRoutePrice(
    LatLng? origin,
    LatLng? destination,
    String vehicleType,
  ) async {
    if (origin == null || destination == null) return null;

    // Cargar rutas si no están en caché
    await _loadRoutes();

    if (_cachedRoutes == null || _cachedRoutes!.isEmpty) {
      return null;
    }

    const distance = Distance();
    const maxDistanceForMatch = 2.0; // km - tolerancia para considerar coincidencia

    // Buscar ruta que coincida con origen y destino
    for (final route in _cachedRoutes!) {
      final originData = route['origin'] as Map<String, dynamic>?;
      final destinationData = route['destination'] as Map<String, dynamic>?;
      final prices = route['prices'] as Map<String, dynamic>?;

      if (originData == null || destinationData == null || prices == null) {
        continue;
      }

      final routeOriginLat = (originData['lat'] as num?)?.toDouble();
      final routeOriginLon = (originData['lon'] as num?)?.toDouble();
      final routeDestLat = (destinationData['lat'] as num?)?.toDouble();
      final routeDestLon = (destinationData['lon'] as num?)?.toDouble();

      if (routeOriginLat == null ||
          routeOriginLon == null ||
          routeDestLat == null ||
          routeDestLon == null) {
        continue;
      }

      final routeOrigin = LatLng(routeOriginLat, routeOriginLon);
      final routeDestination = LatLng(routeDestLat, routeDestLon);

      // Calcular distancia desde el origen del usuario al origen de la ruta
      final distanceFromOrigin = distance.as(LengthUnit.Kilometer, origin, routeOrigin);

      // Calcular distancia desde el destino del usuario al destino de la ruta
      final distanceFromDestination = distance.as(
        LengthUnit.Kilometer,
        destination,
        routeDestination,
      );

      // Si ambos puntos están cerca de la ruta predefinida
      if (distanceFromOrigin <= maxDistanceForMatch &&
          distanceFromDestination <= maxDistanceForMatch) {
        // Mapear el tipo de vehículo a la clave en el JSON
        final priceKey = _mapVehicleTypeToPriceKey(vehicleType);
        final price = prices[priceKey] as num?;

        if (price != null) {
          if (kDebugMode) {
            debugPrint(
              '[PredefinedRoutesService] ✅ Ruta predefinida encontrada: '
              '${originData['name']} → ${destinationData['name']} '
              '($vehicleType: €${price.toStringAsFixed(2)})',
            );
          }
          return price.toDouble();
        }
      }

      // También verificar la ruta inversa (destino → origen)
      final distanceFromOriginToDest = distance.as(LengthUnit.Kilometer, origin, routeDestination);
      final distanceFromDestToOrigin = distance.as(LengthUnit.Kilometer, destination, routeOrigin);

      if (distanceFromOriginToDest <= maxDistanceForMatch &&
          distanceFromDestToOrigin <= maxDistanceForMatch) {
        final priceKey = _mapVehicleTypeToPriceKey(vehicleType);
        final price = prices[priceKey] as num?;

        if (price != null) {
          if (kDebugMode) {
            debugPrint(
              '[PredefinedRoutesService] ✅ Ruta predefinida encontrada (inversa): '
              '${destinationData['name']} → ${originData['name']} '
              '($vehicleType: €${price.toStringAsFixed(2)})',
            );
          }
          return price.toDouble();
        }
      }
    }

    return null;
  }

  /// Mapea el tipo de vehículo del sistema a la clave en el JSON de precios
  static String _mapVehicleTypeToPriceKey(String vehicleType) {
    // Mapeo directo: los tipos en el sistema coinciden con las claves en el JSON
    final mapping = {
      'sedan': 'sedan',
      'business': 'business',
      'van': 'van', // Minivan 7pax
      'luxury': 'luxury', // Minivan Luxury 6pax
      'minibus_8pax': 'minibus_8pax',
      'bus_16pax': 'bus_16pax',
      'bus_19pax': 'bus_19pax',
      'bus_50pax': 'bus_50pax',
    };

    return mapping[vehicleType] ?? 'sedan';
  }

  /// Limpia la caché (útil para recargar después de actualizar el JSON)
  static void clearCache() {
    _cachedRoutes = null;
    if (kDebugMode) {
      debugPrint('[PredefinedRoutesService] Caché limpiada');
    }
  }
}
