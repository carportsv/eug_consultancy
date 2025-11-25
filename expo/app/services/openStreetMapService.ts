// Servicios alternativos gratuitos para reemplazar Google Maps
// Usando OpenStreetMap, Nominatim para geocoding, y OSRM para direcciones

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  instructions?: string;
  distance?: number;
  duration?: number;
}

export interface Route {
  points: RoutePoint[];
  totalDistance: number; // en metros
  totalDuration: number; // en segundos
  summary: string;
}

export interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

class OpenStreetMapService {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private routingUrl = 'https://router.project-osrm.org';

  /**
   * Geocodificación: convertir dirección a coordenadas
   */
  async geocode(address: string): Promise<LocationCoords | null> {
    try {
      if (!address || address.trim().length < 3) {
        console.warn('[OpenStreetMap] Dirección muy corta para geocodificar:', address);
        return null;
      }

      console.log(`[OpenStreetMap] Geocodificando: "${address}"`);
      
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(address.trim())}&format=json&limit=1&addressdetails=1`
      );
      
      if (!response.ok) {
        console.warn(`[OpenStreetMap] Error HTTP ${response.status} en geocodificación de: "${address}"`);
        return null;
      }

      const data = await response.json();
      console.log(`[OpenStreetMap] Respuesta de geocodificación para "${address}":`, data);
      
      if (data && Array.isArray(data) && data.length > 0) {
        const result = data[0];
        const coords = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        };
        
        console.log(`[OpenStreetMap] Geocodificación exitosa para "${address}":`, coords);
        console.log(`[OpenStreetMap] Verificación de coordenadas: lat=${coords.latitude}, lng=${coords.longitude}`);
        
        // Verificar que las coordenadas son válidas
        if (isNaN(coords.latitude) || isNaN(coords.longitude)) {
          console.error(`[OpenStreetMap] Coordenadas inválidas para "${address}":`, coords);
          return null;
        }
        
        if (coords.latitude < -90 || coords.latitude > 90 || coords.longitude < -180 || coords.longitude > 180) {
          console.error(`[OpenStreetMap] Coordenadas fuera de rango para "${address}":`, coords);
          return null;
        }
        
        return coords;
      }
      
      console.warn(`[OpenStreetMap] No se encontraron resultados para: "${address}"`);
      return null;
    } catch (error) {
      console.error(`[OpenStreetMap] Error en geocodificación de "${address}":`, error);
      return null;
    }
  }

  /**
   * Geocodificación inversa: convertir coordenadas a dirección
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Error en geocodificación inversa');
      }

      const data = await response.json();
      
      if (data && data.display_name) {
        return data.display_name;
      }
      
      return null;
    } catch (error) {
      console.error('Error en geocodificación inversa:', error);
      return null;
    }
  }

  /**
   * Buscar lugares (autocompletado) - Estrategia mejorada
   */
  async searchPlaces(query: string, userLocation?: { latitude: number; longitude: number }): Promise<GeocodingResult[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      const cleanQuery = query.trim();
      console.log(`[OpenStreetMap] Buscando lugares: "${cleanQuery}"`);

      // Estrategia optimizada: buscar local primero, luego general
      let localResults: GeocodingResult[] = [];
      if (userLocation) {
        localResults = await this.searchLocalPlaces(cleanQuery, userLocation);
      }
      
      // Si tenemos suficientes resultados locales, no buscar general
      if (localResults.length >= 2) {
        console.log(`[OpenStreetMap] Usando solo resultados locales (${localResults.length})`);
        return localResults.slice(0, 5);
      }
      
      const generalResults = await this.searchGeneralPlaces(cleanQuery);
      const allResults = [...localResults, ...generalResults];
      const uniqueResults = this.removeDuplicateResults(allResults);
      
      // Optimización: limitar resultados y priorizar por relevancia
      const sortedResults = uniqueResults
        .sort((a, b) => {
          // Priorizar resultados locales
          const aIsLocal = localResults.some(local => 
            Math.abs(parseFloat(local.lat) - parseFloat(a.lat)) < 0.001 &&
            Math.abs(parseFloat(local.lon) - parseFloat(a.lon)) < 0.001
          );
          const bIsLocal = localResults.some(local => 
            Math.abs(parseFloat(local.lat) - parseFloat(b.lat)) < 0.001 &&
            Math.abs(parseFloat(local.lon) - parseFloat(b.lon)) < 0.001
          );
          
          if (aIsLocal && !bIsLocal) return -1;
          if (!aIsLocal && bIsLocal) return 1;
          
          // Si ambos son locales o ambos general, sort por importancia
          return (b.importance || 0) - (a.importance || 0);
        })
        .slice(0, 6); // Reducido de 8 a 6 para mejor rendimiento

      console.log(`[OpenStreetMap] Resultados encontrados: ${sortedResults.length}`);
      return sortedResults;
    } catch (error) {
      console.error(`[OpenStreetMap] Error en búsqueda de lugares:`, error);
      return [];
    }
  }

  /**
   * Detectar código de país basado en coordenadas
   */
  private async detectCountryCode(latitude: number, longitude: number): Promise<string> {
    try {
      // Usar geocodificación inversa para detectar el país
      const response = await fetch(
        `${this.baseUrl}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=3`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data?.address?.country_code) {
          console.log(`[OpenStreetMap] País detectado: ${data.address.country_code.toUpperCase()}`);
          return data.address.country_code.toLowerCase();
        }
      }
    } catch (error) {
      console.warn('[OpenStreetMap] Error detectando país:', error);
    }
    
    // Fallback: sin restricción de país
    console.log('[OpenStreetMap] No se pudo detectar país, usando búsqueda global');
    return '';
  }

  /**
   * Búsqueda localizada con radio específico
   */
  private async searchLocalPlaces(query: string, userLocation: { latitude: number; longitude: number }): Promise<GeocodingResult[]> {
    try {
      // Detectar país automáticamente basado en ubicación
      const countryCode = await this.detectCountryCode(userLocation.latitude, userLocation.longitude);
      
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '8', // Aumentado para tener más opciones locales
        addressdetails: '1',
        lat: userLocation.latitude.toString(),
        lon: userLocation.longitude.toString(),
        radius: '20000', // 20km radius - balance entre local y opciones
      });

      // Solo agregar countrycodes si se detectó el país
      if (countryCode) {
        params.append('countrycodes', countryCode);
        console.log(`[OpenStreetMap] Búsqueda local en país: ${countryCode.toUpperCase()}`);
      } else {
        console.log('[OpenStreetMap] Búsqueda local sin restricción de país');
      }

      const response = await fetch(`${this.baseUrl}/search?${params}`);
      
      if (!response.ok) {
        console.warn(`[OpenStreetMap] Error en búsqueda local: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return this.processSearchResults(data);
    } catch (error) {
      console.error(`[OpenStreetMap] Error en búsqueda local:`, error);
      return [];
    }
  }

  /**
   * Búsqueda general sin restricciones de ubicación
   */
  private async searchGeneralPlaces(query: string): Promise<GeocodingResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '8', // Reducido de 10 a 8 para mejor rendimiento
        addressdetails: '1',
        countrycodes: 'us,mx,sv,gt,hn,ni,cr,pa' // Códigos de países relevantes
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`);
      
      if (!response.ok) {
        console.warn(`[OpenStreetMap] Error en búsqueda general: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return this.processSearchResults(data);
    } catch (error) {
      console.error(`[OpenStreetMap] Error en búsqueda general:`, error);
      return [];
    }
  }

  /**
   * Procesar resultados de búsqueda
   */
  private processSearchResults(data: any[]): GeocodingResult[] {
    if (!Array.isArray(data)) return [];
    
    return data
      .filter(item => {
        // Filtrado optimizado: solo resultados válidos y relevantes
        return item && 
               item.display_name && 
               item.lat && 
               item.lon &&
               item.display_name.length > 5 &&
               !item.display_name.toLowerCase().includes('coordinate') &&
               !item.display_name.toLowerCase().includes('gps');
      })
      .map(item => ({
        display_name: this.formatDisplayName(item.display_name),
        lat: item.lat,
        lon: item.lon,
        type: item.type || 'unknown',
        importance: item.importance || 0
      }))
      .slice(0, 6); // Limitar a 6 resultados para mejor rendimiento
  }

  /**
   * Eliminar resultados duplicados basados en coordenadas similares
   */
  private removeDuplicateResults(results: GeocodingResult[]): GeocodingResult[] {
    const unique: GeocodingResult[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      const key = `${parseFloat(result.lat).toFixed(4)},${parseFloat(result.lon).toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Formatear nombre de lugar para usuarios normales - Versión mejorada
   */
  private formatDisplayName(name: string): string {
    if (!name) return '';
    
    let formatted = name;
    
    // Optimización: reemplazos más eficientes
    const replacements = [
      /, El Salvador$/i,
      /, United States$/i,
      /, United States of America$/i,
      /, USA$/i,
      /, México$/i,
      /, Mexico$/i,
      /, Guatemala$/i,
      /, Honduras$/i,
      /, Nicaragua$/i,
      /, Costa Rica$/i,
      /, Panama$/i,
      /, Panamá$/i,
      /, Provincia de [^,]+$/i,
      /, State of [^,]+$/i,
      /,$/ // Remover comas al final
    ];
    
    replacements.forEach(regex => {
      formatted = formatted.replace(regex, '');
    });
    
    // Estrategia inteligente simplificada para mejor rendimiento
    const parts = formatted.split(',').map(part => part.trim()).filter(part => part.length > 0);
    
    if (parts.length > 3) {
      // Mantener solo las partes más importantes
      const importantParts = [
        parts[0], // Dirección
        parts[1], // Ciudad/área local
        parts[2]  // Estado/condado (si no es redundante)
      ].filter(Boolean);
      
      formatted = importantParts.join(', ');
    }
    
    // Limitar longitud para mejor legibilidad móvil
    if (formatted.length > 50) { // Reducido de 60 a 50
      formatted = formatted.substring(0, 47) + '...';
    }
    
    return formatted.trim();
  }

  /**
   * Verificar si el país es el esperado (local)
   */
  private isExpectedCountry(countryPart: string): boolean {
    const expectedCountries = [
      'el salvador', 'united states', 'usa', 'mexico', 'méxico',
      'guatemala', 'honduras', 'nicaragua', 'costa rica', 'panama', 'panamá'
    ];
    return expectedCountries.includes(countryPart.toLowerCase());
  }

  /**
   * Obtener ruta entre dos puntos usando OSRM
   */
  async getRoute(
    origin: LocationCoords,
    destination: LocationCoords,
    mode: 'driving' | 'walking' | 'cycling' = 'driving',
    waypoints: LocationCoords[] = []
  ): Promise<Route | null> {
    try {
      console.log('[OpenStreetMap] Calculando ruta:', {
        origin,
        destination,
        mode
      });
      
      const profile = mode === 'driving' ? 'driving' : mode === 'walking' ? 'foot' : 'bike';
      
      // Construir la URL con waypoints si existen
      let coordinates = `${origin.longitude},${origin.latitude}`;
      
      // Agregar waypoints si existen
      if (waypoints.length > 0) {
        const waypointsStr = waypoints.map(wp => `${wp.longitude},${wp.latitude}`).join(';');
        coordinates += `;${waypointsStr}`;
      }
      
      // Agregar destino
      coordinates += `;${destination.longitude},${destination.latitude}`;
      
      const url = `${this.routingUrl}/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=true&annotations=true`;
      console.log('[OpenStreetMap] URL de ruta:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('[OpenStreetMap] Error HTTP en cálculo de ruta:', response.status, response.statusText);
        throw new Error('Error al obtener ruta');
      }

      const data = await response.json();
      console.log('[OpenStreetMap] Respuesta de OSRM:', data);
      
      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // console.log('[OpenStreetMap] Ruta obtenida:', {
        //   distance: route.distance,
        //   duration: route.duration,
        //   distanceKm: (route.distance / 1000).toFixed(2),
        //   durationMinutes: Math.round(route.duration / 60)
        // });
        
        const points: RoutePoint[] = [];
        
                 // Convertir coordenadas de la ruta usando GeoJSON
         if (route.geometry && route.geometry.coordinates && Array.isArray(route.geometry.coordinates)) {
           const coordinates = route.geometry.coordinates;
           console.log('[OpenStreetMap] Usando geometría GeoJSON con', coordinates.length, 'coordenadas');
           console.log('[OpenStreetMap] Primeras 3 coordenadas GeoJSON:', coordinates.slice(0, 3));
          
          console.log('[OpenStreetMap] Coordenadas de ruta procesadas:', coordinates.length);
          console.log('[OpenStreetMap] Primeras 3 coordenadas:', coordinates.slice(0, 3));
          
          coordinates.forEach((coord: number[], index: number) => {
            // Verificar que las coordenadas son válidas
            if (coord && coord.length >= 2 && !isNaN(coord[0]) && !isNaN(coord[1])) {
              points.push({
                latitude: coord[1],
                longitude: coord[0],
                instructions: route.legs[0]?.steps[index]?.maneuver?.instruction || '',
                distance: route.legs[0]?.steps[index]?.distance || 0,
                duration: route.legs[0]?.steps[index]?.duration || 0
              });
            } else {
              console.warn('[OpenStreetMap] Coordenada inválida encontrada:', coord, 'en índice:', index);
            }
          });
          
          console.log('[OpenStreetMap] Puntos generados:', points.length);
          console.log('[OpenStreetMap] Primeros 3 puntos:', points.slice(0, 3));
        }

        const result = {
          points,
          totalDistance: route.distance,
          totalDuration: route.duration,
          summary: route.legs[0]?.summary || ''
        };
        
        console.log('[OpenStreetMap] Ruta procesada:', {
          totalDistance: result.totalDistance,
          totalDuration: result.totalDuration,
          pointsCount: result.points.length
        });
        
        return result;
      } else {
        console.warn('[OpenStreetMap] No se encontraron rutas en la respuesta');
        return null;
      }
      
    } catch (error) {
      console.error('[OpenStreetMap] Error al obtener ruta:', error);
      return null;
    }
  }

  /**
   * Decodificar polyline de Google/OSRM
   */
  private decodePolyline(encoded: string): number[][] {
    console.log('[OpenStreetMap] Decodificando polyline:', encoded);
    
    if (!encoded || encoded.length === 0) {
      console.warn('[OpenStreetMap] Polyline vacío o inválido');
      return [];
    }
    
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    try {
      while (index < len) {
        let shift = 0, result = 0;

        do {
          if (index >= len) {
            console.warn('[OpenStreetMap] Índice fuera de rango en decodificación de polyline');
            break;
          }
          let b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (result >= 0x20);

        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;

        do {
          if (index >= len) {
            console.warn('[OpenStreetMap] Índice fuera de rango en decodificación de polyline');
            break;
          }
          let b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (result >= 0x20);

        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        const finalLat = lat / 1e5;
        const finalLng = lng / 1e5;
        
        // Verificar que las coordenadas son válidas
        if (!isNaN(finalLat) && !isNaN(finalLng) && 
            finalLat >= -90 && finalLat <= 90 && 
            finalLng >= -180 && finalLng <= 180) {
          poly.push([finalLng, finalLat]);
        } else {
          console.warn('[OpenStreetMap] Coordenada inválida generada:', { finalLat, finalLng });
        }
      }
    } catch (error) {
      console.error('[OpenStreetMap] Error en decodificación de polyline:', error);
      return [];
    }

    console.log('[OpenStreetMap] Polyline decodificado, puntos generados:', poly.length);
    if (poly.length > 0) {
      console.log('[OpenStreetMap] Primeras 3 coordenadas decodificadas:', poly.slice(0, 3));
    }
    return poly;
  }

  /**
   * Calcular distancia entre dos puntos (fórmula de Haversine)
   */
  calculateDistance(point1: LocationCoords, point2: LocationCoords): number {
    console.log('[OpenStreetMap] calculateDistance llamado con:', { point1, point2 });
    
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distancia en metros
    console.log('[OpenStreetMap] Distancia calculada (metros):', distance);
    console.log('[OpenStreetMap] Distancia calculada (km):', (distance / 1000).toFixed(2));
    
    return distance;
  }

  /**
   * Obtener dirección desde coordenadas usando Nominatim
   */
  async getAddressFromCoords(latitude: number, longitude: number): Promise<string> {
    try {
      const address = await this.reverseGeocode(latitude, longitude);
      return address || 'Dirección no disponible';
    } catch (error) {
      console.error('Error al obtener dirección:', error);
      return 'Dirección no disponible';
    }
  }

  /**
   * Obtener coordenadas desde dirección usando Nominatim
   */
  async getCoordsFromAddress(address: string): Promise<LocationCoords | null> {
    try {
      console.log(`[OpenStreetMap] getCoordsFromAddress llamado con: "${address}"`);
      const coords = await this.geocode(address);
      console.log(`[OpenStreetMap] getCoordsFromAddress resultado para "${address}":`, coords);
      return coords;
    } catch (error) {
      console.error(`[OpenStreetMap] Error en getCoordsFromAddress para "${address}":`, error);
      return null;
    }
  }

  /**
   * Formatear distancia en formato legible
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Formatear duración en formato legible
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

export default new OpenStreetMapService(); 