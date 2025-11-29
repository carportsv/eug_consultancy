import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../../../services/common_places_service.dart';

/// Servicio para autocompletado de direcciones con cadena de fallback:
/// 1. Lugares comunes (local, instantáneo)
/// 2. Photon (Komoot) - gratuito, sin API key
/// 3. Nominatim (OpenStreetMap) - gratuito, sin API key
/// 4. GeoNames - gratuito, sin API key
///
/// Funciona en móvil y web
class AddressAutocompleteService {
  // Rate limiting: última vez que se hizo una petición
  static DateTime? _lastRequestTime;
  static const _minDelayBetweenRequests = Duration(seconds: 1);

  // Estado del bloqueo de Nominatim
  static bool _nominatimBlocked = false;
  static DateTime? _lastNominatimCheck;
  static const _nominatimRetryInterval = Duration(hours: 1);

  /// Busca direcciones usando cadena de fallback optimizada
  /// Orden: Lugares comunes → Photon → Nominatim → GeoNames
  static Future<List<Map<String, dynamic>>> searchAddresses(String query) async {
    // Validación: mínimo 2 caracteres
    if (query.trim().length < 2) {
      return [];
    }

    // 1. PRIMERO: Buscar en lugares comunes (local, instantáneo)
    final commonPlaces = await CommonPlacesService.searchCommonPlaces(query);
    if (commonPlaces.isNotEmpty) {
      if (kDebugMode) {
        debugPrint(
          '[AddressAutocompleteService] ✅ Encontrados ${commonPlaces.length} lugares comunes, retornando resultados instantáneos',
        );
      }
      return commonPlaces;
    }

    // 2. SEGUNDO: Photon (más confiable, menos bloqueos)
    final photonResults = await _searchWithPhoton(query);
    if (photonResults.isNotEmpty) {
      if (kDebugMode) {
        debugPrint(
          '[AddressAutocompleteService] ✅ Photon encontró ${photonResults.length} resultados',
        );
      }
      return photonResults;
    }

    // 3. TERCERO: Nominatim (reintentar si no está bloqueado o ha pasado tiempo)
    final shouldTryNominatim =
        !_nominatimBlocked ||
        (_lastNominatimCheck != null &&
            DateTime.now().difference(_lastNominatimCheck!) > _nominatimRetryInterval);

    if (shouldTryNominatim) {
      final nominatimResults = await _searchWithNominatim(query);
      if (nominatimResults.isNotEmpty) {
        if (kDebugMode) {
          debugPrint(
            '[AddressAutocompleteService] ✅ Nominatim encontró ${nominatimResults.length} resultados',
          );
        }
        return nominatimResults;
      }
    } else {
      if (kDebugMode) {
        debugPrint(
          '[AddressAutocompleteService] ⏭️ Nominatim bloqueado, saltando (último check: $_lastNominatimCheck)',
        );
      }
    }

    // 4. CUARTO: GeoNames (último recurso)
    final geoNamesResults = await _searchWithGeoNames(query);
    if (geoNamesResults.isNotEmpty) {
      if (kDebugMode) {
        debugPrint(
          '[AddressAutocompleteService] ✅ GeoNames encontró ${geoNamesResults.length} resultados',
        );
      }
      return geoNamesResults;
    }

    // No se encontraron resultados en ningún servicio
    if (kDebugMode) {
      debugPrint(
        '[AddressAutocompleteService] ❌ No se encontraron resultados en ningún servicio para: "$query"',
      );
    }
    return [];
  }

  /// Busca direcciones usando Nominatim (OpenStreetMap)
  static Future<List<Map<String, dynamic>>> _searchWithNominatim(String query) async {
    // Rate limiting: esperar al menos 1 segundo entre peticiones
    if (_lastRequestTime != null) {
      final timeSinceLastRequest = DateTime.now().difference(_lastRequestTime!);
      if (timeSinceLastRequest < _minDelayBetweenRequests) {
        final waitTime = _minDelayBetweenRequests - timeSinceLastRequest;
        if (kDebugMode) {
          debugPrint(
            '[AddressAutocompleteService] [Nominatim] Rate limiting: esperando ${waitTime.inMilliseconds}ms',
          );
        }
        await Future.delayed(waitTime);
      }
    }
    _lastRequestTime = DateTime.now();
    _lastNominatimCheck = DateTime.now();

    try {
      final uri = Uri.parse(
        'https://nominatim.openstreetmap.org/search?'
        'format=json&'
        'q=${Uri.encodeComponent(query)}&'
        'limit=10&'
        'addressdetails=1&'
        'extratags=1&'
        'namedetails=1&'
        'accept-language=es,en&'
        'dedupe=1',
      );

      if (kDebugMode) {
        debugPrint('[AddressAutocompleteService] [Nominatim] Buscando: $query');
        debugPrint('[AddressAutocompleteService] [Nominatim] URI: $uri');
      }

      final response = await http
          .get(
            uri,
            headers: {
              'Accept': 'application/json',
              // User-Agent más específico según política de Nominatim
              // Debe incluir información de contacto para aplicaciones
              'User-Agent': 'FZKT_TaxiApp/1.0 (com.carposv.taxizkt; contacto: support@carposv.com)',
              'Referer': 'https://nominatim.openstreetmap.org/',
            },
          )
          .timeout(
            const Duration(seconds: 10),
            onTimeout: () {
              if (kDebugMode) {
                debugPrint('[AddressAutocompleteService] Timeout en la petición');
              }
              throw TimeoutException('La petición tardó demasiado');
            },
          );

      if (kDebugMode) {
        debugPrint('[AddressAutocompleteService] [Nominatim] Status code: ${response.statusCode}');
        debugPrint(
          '[AddressAutocompleteService] [Nominatim] Response body length: ${response.body.length}',
        );
      }

      if (response.statusCode == 200) {
        _nominatimBlocked = false; // Reset bloqueo si funciona
        final List<dynamic> data = json.decode(response.body);

        if (kDebugMode) {
          debugPrint(
            '[AddressAutocompleteService] [Nominatim] Datos recibidos: ${data.length} items',
          );
        }

        if (data.isEmpty) {
          if (kDebugMode) {
            debugPrint('[AddressAutocompleteService] [Nominatim] No hay datos en la respuesta');
          }
          return [];
        }

        final results = data
            .map(
              (item) => {
                'display_name': item['display_name'] as String? ?? '',
                'lat': double.tryParse(item['lat'] as String? ?? '0') ?? 0.0,
                'lon': double.tryParse(item['lon'] as String? ?? '0') ?? 0.0,
                'importance': (item['importance'] as num?)?.toDouble() ?? 0.0,
                'type': item['type'] as String? ?? '',
                'class': item['class'] as String? ?? '',
              },
            )
            .where((item) => item['lat'] != 0.0 && item['lon'] != 0.0)
            .toList();

        if (kDebugMode) {
          debugPrint(
            '[AddressAutocompleteService] [Nominatim] Resultados válidos (con coordenadas): ${results.length}',
          );
        }

        results.sort((a, b) {
          final importanceA = a['importance'] as double;
          final importanceB = b['importance'] as double;
          return importanceB.compareTo(importanceA);
        });

        final finalResults = results
            .map(
              (item) => {
                'display_name': item['display_name'] as String,
                'lat': item['lat'] as double,
                'lon': item['lon'] as double,
              },
            )
            .toList();

        if (kDebugMode) {
          debugPrint(
            '[AddressAutocompleteService] [Nominatim] Resultados finales: ${finalResults.length}',
          );
        }

        return finalResults;
      } else if (response.statusCode == 403) {
        // Nominatim bloqueado
        _nominatimBlocked = true;
        if (kDebugMode) {
          debugPrint(
            '[AddressAutocompleteService] [Nominatim] ⚠️ Bloqueado (403). Se reintentará en 1 hora.',
          );
        }
        return [];
      } else {
        if (kDebugMode) {
          debugPrint('[AddressAutocompleteService] [Nominatim] Error HTTP: ${response.statusCode}');
          if (response.statusCode != 200) {
            debugPrint('[AddressAutocompleteService] [Nominatim] Response body: ${response.body}');
          }
        }
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[AddressAutocompleteService] [Nominatim] Error: ${e.toString()}');

        // Detectar errores de conexión específicos
        final errorStr = e.toString().toLowerCase();
        if (errorStr.contains('failed host lookup') ||
            errorStr.contains('no address associated with hostname') ||
            errorStr.contains('socketexception')) {
          debugPrint(
            '[AddressAutocompleteService] [Nominatim] ⚠️ ERROR DE CONEXIÓN: El dispositivo no puede conectarse a Internet o hay un problema de DNS.',
          );
        } else if (errorStr.contains('timeout')) {
          debugPrint(
            '[AddressAutocompleteService] [Nominatim] ⚠️ TIMEOUT: La petición tardó demasiado.',
          );
        }
      }
      return [];
    }
  }

  /// Busca direcciones usando Photon (Komoot) como servicio alternativo
  /// Photon es gratuito, no requiere API key y es más permisivo
  static Future<List<Map<String, dynamic>>> _searchWithPhoton(String query) async {
    try {
      // Photon requiere al menos 3 caracteres para búsquedas efectivas
      if (query.trim().length < 3) {
        if (kDebugMode) {
          debugPrint('[AddressAutocompleteService] [Photon] Query muy corta: "$query"');
        }
        return [];
      }

      // Photon acepta un solo código de idioma, no una lista
      // Construir URI sin el parámetro lang si no es necesario
      final uri = Uri.parse(
        'https://photon.komoot.io/api/?'
        'q=${Uri.encodeComponent(query.trim())}&'
        'limit=10',
      );

      if (kDebugMode) {
        debugPrint('[AddressAutocompleteService] [Photon] Buscando: $query');
        debugPrint('[AddressAutocompleteService] [Photon] URI: $uri');
      }

      final response = await http
          .get(
            uri,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'FZKT_TaxiApp/1.0 (com.carposv.taxizkt)',
            },
          )
          .timeout(
            const Duration(seconds: 10),
            onTimeout: () {
              if (kDebugMode) {
                debugPrint('[AddressAutocompleteService] [Photon] Timeout en la petición');
              }
              throw TimeoutException('La petición tardó demasiado');
            },
          );

      if (kDebugMode) {
        debugPrint('[AddressAutocompleteService] [Photon] Status code: ${response.statusCode}');
        if (response.statusCode != 200) {
          debugPrint('[AddressAutocompleteService] [Photon] Response body: ${response.body}');
        }
      }

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        final List<dynamic> features = data['features'] as List<dynamic>? ?? [];

        if (kDebugMode) {
          debugPrint(
            '[AddressAutocompleteService] [Photon] Datos recibidos: ${features.length} items',
          );
        }

        if (features.isEmpty) {
          return [];
        }

        final results = features
            .map((feature) {
              final properties = feature['properties'] as Map<String, dynamic>? ?? {};
              final geometry = feature['geometry'] as Map<String, dynamic>? ?? {};
              final coordinates = geometry['coordinates'] as List<dynamic>? ?? [];

              // Construir display_name desde las propiedades de Photon
              final name = properties['name'] as String? ?? '';
              final street = properties['street'] as String? ?? '';
              final city = properties['city'] as String? ?? '';
              final country = properties['country'] as String? ?? '';

              String displayName = name;
              if (street.isNotEmpty) displayName += ', $street';
              if (city.isNotEmpty) displayName += ', $city';
              if (country.isNotEmpty) displayName += ', $country';

              if (displayName.isEmpty) {
                displayName =
                    properties['osm_value'] as String? ?? properties['osm_key'] as String? ?? query;
              }

              final lon = coordinates.isNotEmpty
                  ? (coordinates[0] as num?)?.toDouble() ?? 0.0
                  : 0.0;
              final lat = coordinates.length > 1
                  ? (coordinates[1] as num?)?.toDouble() ?? 0.0
                  : 0.0;

              return {'display_name': displayName, 'lat': lat, 'lon': lon};
            })
            .where((item) => item['lat'] != 0.0 && item['lon'] != 0.0)
            .toList();

        if (kDebugMode) {
          debugPrint('[AddressAutocompleteService] [Photon] Resultados válidos: ${results.length}');
        }

        return results;
      } else {
        if (kDebugMode) {
          debugPrint('[AddressAutocompleteService] [Photon] Error HTTP: ${response.statusCode}');
        }
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[AddressAutocompleteService] [Photon] Error: ${e.toString()}');
      }
      return [];
    }
  }

  /// Busca direcciones usando GeoNames como último recurso
  /// GeoNames es gratuito, sin API key (con límites sin registro)
  /// Mejor para nombres de lugares que para direcciones específicas
  static Future<List<Map<String, dynamic>>> _searchWithGeoNames(String query) async {
    try {
      // GeoNames requiere al menos 2 caracteres
      if (query.trim().length < 2) {
        return [];
      }

      final uri = Uri.parse(
        'http://api.geonames.org/searchJSON?'
        'q=${Uri.encodeComponent(query.trim())}&'
        'maxRows=10&'
        'username=demo&'
        'style=full',
      );

      if (kDebugMode) {
        debugPrint('[AddressAutocompleteService] [GeoNames] Buscando: $query');
        debugPrint('[AddressAutocompleteService] [GeoNames] URI: $uri');
      }

      final response = await http
          .get(
            uri,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'FZKT_TaxiApp/1.0 (com.carposv.taxizkt)',
            },
          )
          .timeout(
            const Duration(seconds: 10),
            onTimeout: () {
              if (kDebugMode) {
                debugPrint('[AddressAutocompleteService] [GeoNames] Timeout en la petición');
              }
              throw TimeoutException('La petición tardó demasiado');
            },
          );

      if (kDebugMode) {
        debugPrint('[AddressAutocompleteService] [GeoNames] Status code: ${response.statusCode}');
        if (response.statusCode != 200) {
          debugPrint('[AddressAutocompleteService] [GeoNames] Response body: ${response.body}');
        }
      }

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        final List<dynamic> geonames = data['geonames'] as List<dynamic>? ?? [];

        if (kDebugMode) {
          debugPrint(
            '[AddressAutocompleteService] [GeoNames] Datos recibidos: ${geonames.length} items',
          );
        }

        if (geonames.isEmpty) {
          return [];
        }

        final results = geonames
            .map((item) {
              final name = item['name'] as String? ?? '';
              final adminName1 = item['adminName1'] as String? ?? '';
              final countryName = item['countryName'] as String? ?? '';

              String displayName = name;
              if (adminName1.isNotEmpty) displayName += ', $adminName1';
              if (countryName.isNotEmpty) displayName += ', $countryName';

              final lat = (item['lat'] as num?)?.toDouble() ?? 0.0;
              final lon = (item['lng'] as num?)?.toDouble() ?? 0.0;

              return {'display_name': displayName, 'lat': lat, 'lon': lon};
            })
            .where((item) => item['lat'] != 0.0 && item['lon'] != 0.0)
            .toList();

        if (kDebugMode) {
          debugPrint(
            '[AddressAutocompleteService] [GeoNames] Resultados válidos: ${results.length}',
          );
        }

        return results;
      } else {
        if (kDebugMode) {
          debugPrint('[AddressAutocompleteService] [GeoNames] Error HTTP: ${response.statusCode}');
        }
      }
      return [];
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[AddressAutocompleteService] [GeoNames] Error: ${e.toString()}');
      }
      return [];
    }
  }
}
