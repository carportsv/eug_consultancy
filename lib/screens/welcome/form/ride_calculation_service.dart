import 'package:latlong2/latlong.dart';
import '../../../services/common_places_service.dart';
import '../../../services/predefined_routes_service.dart';

/// Servicio para calcular distancia y precio estimado del viaje
/// Extraído de welcome_screen.dart
class RideCalculationService {
  /// Calcula la distancia en kilómetros entre dos coordenadas
  static double? calculateDistance(LatLng origin, LatLng destination) {
    try {
      const distance = Distance();
      return distance.as(LengthUnit.Kilometer, origin, destination);
    } catch (e) {
      return null;
    }
  }

  /// Calcula el precio estimado basado en la distancia y tipo de vehículo
  /// Precios por tipo de vehículo:
  /// - sedan: €0.50/km (mín €2.00)
  /// - suv: €0.70/km (mín €3.00)
  /// - van: €0.90/km (mín €4.00)
  /// - luxury: €1.20/km (mín €5.00)
  static double? calculateEstimatedPrice(
    double distanceKm, {
    String vehicleType = 'sedan',
    double? pricePerKm,
  }) {
    try {
      // Precios base por tipo de vehículo (por km)
      final vehiclePrices = {
        'sedan': 0.5,
        'business': 0.7,
        'van': 0.9,
        'luxury': 1.2,
        'minibus_8pax': 1.0,
        'bus_16pax': 1.5,
        'bus_19pax': 1.8,
        'bus_50pax': 2.5,
      };

      // Precios mínimos según tipo de vehículo
      final minPrices = {
        'sedan': 2.0,
        'business': 3.0,
        'van': 4.0,
        'luxury': 5.0,
        'minibus_8pax': 6.0,
        'bus_16pax': 10.0,
        'bus_19pax': 12.0,
        'bus_50pax': 15.0,
      };

      final pricePerKmValue = pricePerKm ?? (vehiclePrices[vehicleType] ?? 0.5);
      final calculatedPrice = distanceKm * pricePerKmValue;

      final minPrice = minPrices[vehicleType] ?? 2.0;
      return calculatedPrice < minPrice ? minPrice : calculatedPrice;
    } catch (e) {
      return null;
    }
  }

  /// Busca el lugar común más cercano con precio fijo
  /// Retorna el precio fijo y la distancia desde el lugar más cercano
  static Future<Map<String, double?>> findNearestFixedPricePlace(LatLng? point) async {
    if (point == null) {
      return {'fixedPrice': null, 'distanceToFixed': null};
    }

    try {
      // Cargar todos los lugares comunes
      final places = await CommonPlacesService.getAllCommonPlaces();
      if (places.isEmpty) {
        return {'fixedPrice': null, 'distanceToFixed': null};
      }

      // Buscar el lugar más cercano con precio fijo
      double? nearestDistance;
      double? fixedPrice;

      for (final place in places) {
        final placeLat = place['lat'] as double?;
        final placeLon = place['lon'] as double?;
        final placeFixedPrice = place['fixed_price'] as num?;

        if (placeLat != null && placeLon != null && placeFixedPrice != null) {
          final placePoint = LatLng(placeLat, placeLon);
          final dist = calculateDistance(point, placePoint);

          if (dist != null && (nearestDistance == null || dist < nearestDistance)) {
            nearestDistance = dist;
            fixedPrice = placeFixedPrice.toDouble();
          }
        }
      }

      return {'fixedPrice': fixedPrice, 'distanceToFixed': nearestDistance};
    } catch (e) {
      return {'fixedPrice': null, 'distanceToFixed': null};
    }
  }

  /// Calcula el precio considerando rutas predefinidas primero
  /// Si hay una ruta predefinida que coincida, usa ese precio
  /// Si no, busca lugares cercanos con precio fijo
  static Future<double?> calculatePriceWithFixedPlaces(
    LatLng? origin,
    LatLng? destination, {
    String vehicleType = 'sedan',
    double? pricePerKm,
  }) async {
    if (origin == null || destination == null) return null;

    final distance = calculateDistance(origin, destination);
    if (distance == null) return null;

    // PRIMERO: Buscar si hay una ruta predefinida que coincida
    final predefinedPrice = await PredefinedRoutesService.findPredefinedRoutePrice(
      origin,
      destination,
      vehicleType,
    );

    if (predefinedPrice != null) {
      // Si encontramos una ruta predefinida, usar ese precio directamente
      return predefinedPrice;
    }

    // SEGUNDO: Si no hay ruta predefinida, buscar lugares con precio fijo cercanos
    final originFixed = await findNearestFixedPricePlace(origin);
    final destinationFixed = await findNearestFixedPricePlace(destination);

    // Si hay un lugar con precio fijo muy cercano (dentro de 2km), usar ese precio
    const maxDistanceForFixedPrice = 2.0; // km

    if (originFixed['distanceToFixed'] != null &&
        originFixed['distanceToFixed']! <= maxDistanceForFixedPrice &&
        originFixed['fixedPrice'] != null) {
      // Ajustar precio basado en la distancia desde el lugar fijo
      final distanceFromFixed = originFixed['distanceToFixed']!;
      final basePrice = originFixed['fixedPrice']!;

      // Si estamos muy cerca (menos de 500m), usar precio fijo directamente
      if (distanceFromFixed < 0.5) {
        return basePrice;
      }

      // Si estamos cerca pero no exactamente, calcular precio base + distancia adicional
      final additionalDistance = distance - distanceFromFixed;
      final vehiclePrices = {
        'sedan': 0.5,
        'business': 0.7,
        'van': 0.9,
        'luxury': 1.2,
        'minibus_8pax': 1.0,
        'bus_16pax': 1.5,
        'bus_19pax': 1.8,
        'bus_50pax': 2.5,
      };
      final pricePerKmValue = pricePerKm ?? (vehiclePrices[vehicleType] ?? 0.5);

      if (additionalDistance > 0) {
        return basePrice + (additionalDistance * pricePerKmValue);
      } else {
        return basePrice;
      }
    }

    if (destinationFixed['distanceToFixed'] != null &&
        destinationFixed['distanceToFixed']! <= maxDistanceForFixedPrice &&
        destinationFixed['fixedPrice'] != null) {
      // Similar para el destino
      final distanceFromFixed = destinationFixed['distanceToFixed']!;
      final basePrice = destinationFixed['fixedPrice']!;

      if (distanceFromFixed < 0.5) {
        return basePrice;
      }

      final additionalDistance = distance - distanceFromFixed;
      final vehiclePrices = {'sedan': 0.5, 'business': 0.7, 'van': 0.9, 'luxury': 1.2};
      final pricePerKmValue = pricePerKm ?? (vehiclePrices[vehicleType] ?? 0.5);

      if (additionalDistance > 0) {
        return basePrice + (additionalDistance * pricePerKmValue);
      } else {
        return basePrice;
      }
    }

    // Si no hay lugares con precio fijo cercanos, calcular precio normal
    return calculateEstimatedPrice(distance, vehicleType: vehicleType, pricePerKm: pricePerKm);
  }

  /// Calcula distancia y precio en una sola llamada
  /// Ahora considera lugares cercanos con precio fijo
  static Future<Map<String, double?>> calculateDistanceAndPrice(
    LatLng? origin,
    LatLng? destination, {
    String vehicleType = 'sedan',
    double? pricePerKm,
    bool useFixedPlaces = true,
  }) async {
    if (origin == null || destination == null) {
      return {'distance': null, 'price': null};
    }

    final distance = calculateDistance(origin, destination);
    double? price;

    if (useFixedPlaces) {
      price = await calculatePriceWithFixedPlaces(
        origin,
        destination,
        vehicleType: vehicleType,
        pricePerKm: pricePerKm,
      );
    } else {
      price = distance != null
          ? calculateEstimatedPrice(distance, vehicleType: vehicleType, pricePerKm: pricePerKm)
          : null;
    }

    return {'distance': distance, 'price': price};
  }
}
