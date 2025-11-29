import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Servicio para buscar en lugares comunes predefinidos
/// Estos lugares se cargan desde un archivo JSON local
/// Funciona offline y es instantáneo
class CommonPlacesService {
  static List<Map<String, dynamic>>? _cachedPlaces;
  static bool _isLoading = false;

  /// Carga los lugares comunes desde el archivo JSON
  static Future<void> _loadPlaces() async {
    if (_cachedPlaces != null || _isLoading) return;

    _isLoading = true;
    try {
      final String jsonString = await rootBundle.loadString('assets/data/common_places.json');
      final Map<String, dynamic> jsonData = json.decode(jsonString);
      _cachedPlaces =
          (jsonData['places'] as List<dynamic>?)
              ?.map((item) => item as Map<String, dynamic>)
              .toList() ??
          [];

      if (kDebugMode) {
        debugPrint('[CommonPlacesService] ✅ Cargados ${_cachedPlaces!.length} lugares comunes');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[CommonPlacesService] ⚠️ Error cargando lugares: $e');
        debugPrint('[CommonPlacesService] Continuando sin lugares comunes (usando solo APIs)');
      }
      _cachedPlaces = [];
    } finally {
      _isLoading = false;
    }
  }

  /// Obtiene todos los lugares comunes (sin filtrar por query)
  static Future<List<Map<String, dynamic>>> getAllCommonPlaces() async {
    await _loadPlaces();
    return _cachedPlaces ?? [];
  }

  /// Busca lugares comunes que coincidan con la query
  /// Retorna resultados instantáneos sin necesidad de API
  static Future<List<Map<String, dynamic>>> searchCommonPlaces(String query) async {
    // Cargar lugares si no están en caché
    await _loadPlaces();

    if (_cachedPlaces == null || _cachedPlaces!.isEmpty) {
      return [];
    }

    final queryLower = query.trim().toLowerCase();

    // Si la query está vacía o tiene menos de 2 caracteres, retornar todos los lugares
    if (queryLower.length < 2) {
      return _cachedPlaces!
          .map(
            (place) => {
              'display_name': place['display_name'] as String,
              'lat': (place['lat'] as num?)?.toDouble() ?? 0.0,
              'lon': (place['lon'] as num?)?.toDouble() ?? 0.0,
              'fixed_price': place['fixed_price'] as num?,
            },
          )
          .where((item) => item['lat'] != 0.0 && item['lon'] != 0.0)
          .toList();
    }

    // Buscar coincidencias en nombre, keywords, ciudad, etc.
    final results = _cachedPlaces!
        .where((place) {
          final name = (place['name'] as String? ?? '').toLowerCase();
          final displayName = (place['display_name'] as String? ?? '').toLowerCase();
          final city = (place['city'] as String? ?? '').toLowerCase();
          final keywords = (place['keywords'] as List<dynamic>? ?? [])
              .map((k) => k.toString().toLowerCase())
              .toList();

          // Buscar en nombre, display_name, ciudad o keywords
          return name.contains(queryLower) ||
              displayName.contains(queryLower) ||
              city.contains(queryLower) ||
              keywords.any((keyword) => keyword.contains(queryLower));
        })
        .map(
          (place) => {
            'display_name': place['display_name'] as String,
            'lat': (place['lat'] as num?)?.toDouble() ?? 0.0,
            'lon': (place['lon'] as num?)?.toDouble() ?? 0.0,
          },
        )
        .where((item) => item['lat'] != 0.0 && item['lon'] != 0.0)
        .toList();

    if (kDebugMode && results.isNotEmpty) {
      debugPrint(
        '[CommonPlacesService] ✅ Encontrados ${results.length} lugares comunes para: "$query"',
      );
    }

    return results;
  }

  /// Limpia la caché (útil para recargar después de actualizar el JSON)
  static void clearCache() {
    _cachedPlaces = null;
    if (kDebugMode) {
      debugPrint('[CommonPlacesService] Caché limpiada');
    }
  }
}
