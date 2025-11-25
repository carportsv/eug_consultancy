// Servicio de HERE Maps como alternativa gratuita a Google Maps
// Gratis hasta 250,000 transacciones por mes - PERFECTO para apps tipo Uber/Lyft

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface HereGeocodingResult {
  title: string;
  id: string;
  resultType: string;
  address: {
    label: string;
    countryCode: string;
    countryName: string;
    state: string;
    county: string;
    city: string;
    street: string;
    postalCode: string;
    houseNumber: string;
  };
  position: {
    lat: number;
    lng: number;
  };
  access: Array<{
    lat: number;
    lng: number;
  }>;
  categories: Array<{
    id: string;
    name: string;
    primary: boolean;
  }>;
  references: Array<{
    supplier: {
      id: string;
    };
    id: string;
  }>;
  foodTypes: Array<{
    id: string;
    name: string;
  }>;
  contacts: Array<{
    phone: Array<{
      value: string;
    }>;
    website: Array<{
      value: string;
    }>;
  }>;
}

export interface HereRoute {
  routes: Array<{
    id: string;
    sections: Array<{
      id: string;
      type: string;
      departure: {
        time: string;
        place: {
          type: string;
          location: {
            lat: number;
            lng: number;
          };
          originalLocation: {
            lat: number;
            lng: number;
          };
        };
      };
      arrival: {
        time: string;
        place: {
          type: string;
          location: {
            lat: number;
            lng: number;
          };
          originalLocation: {
            lat: number;
            lng: number;
          };
        };
      };
      summary: {
        length: number;
        duration: number;
        baseDuration: number;
      };
      transport: {
        mode: string;
      };
    }>;
  }>;
}

class HereMapsService {
  private apiKey = 'YOUR_HERE_API_KEY'; // Reemplazar con tu API key
  private baseUrl = 'https://geocode.search.hereapi.com/v1';
  private routingUrl = 'https://router.hereapi.com/v8';

  /**
   * Geocoding: convertir dirección a coordenadas
   */
  async geocode(address: string): Promise<LocationCoords | null> {
    try {
      console.log(`[HERE] Geocodificando: "${address}"`);
      
      const response = await fetch(
        `${this.baseUrl}/geocode?q=${encodeURIComponent(address)}&apiKey=${this.apiKey}&limit=1`
      );
      
      if (!response.ok) {
        console.warn(`[HERE] Error HTTP ${response.status} en geocodificación de: "${address}"`);
        return null;
      }

      const data = await response.json();
      console.log(`[HERE] Respuesta de geocodificación:`, data);
      
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        const coords = {
          latitude: item.position.lat,
          longitude: item.position.lng
        };
        
        console.log(`[HERE] Geocodificación exitosa:`, coords);
        return coords;
      }
      
      console.warn(`[HERE] No se encontraron resultados para: "${address}"`);
      return null;
    } catch (error) {
      console.error(`[HERE] Error en geocodificación de "${address}":`, error);
      return null;
    }
  }

  /**
   * Autocompletado de direcciones (similar a Google Places)
   */
  async autocomplete(query: string, userLocation?: LocationCoords): Promise<HereGeocodingResult[]> {
    try {
      console.log(`[HERE] Autocompletado para: "${query}"`);
      
      let url = `${this.baseUrl}/autosuggest?q=${encodeURIComponent(query)}&apiKey=${this.apiKey}&limit=5`;
      
      // Si tenemos ubicación del usuario, priorizar resultados cercanos
      if (userLocation) {
        url += `&at=${userLocation.latitude},${userLocation.longitude}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`[HERE] Error HTTP ${response.status} en autocompletado`);
        return [];
      }

      const data = await response.json();
      console.log(`[HERE] Resultados de autocompletado:`, data);
      
      if (data && data.items) {
        return data.items;
      }
      
      return [];
    } catch (error) {
      console.error(`[HERE] Error en autocompletado:`, error);
      return [];
    }
  }

  /**
   * Obtener ruta entre dos puntos
   */
  async getRoute(
    origin: LocationCoords,
    destination: LocationCoords,
    mode: 'car' | 'pedestrian' | 'bicycle' = 'car'
  ): Promise<{
    distance: number;
    duration: number;
    geometry: number[][];
  } | null> {
    try {
      console.log(`[HERE] Calculando ruta:`, { origin, destination, mode });
      
      const transportMode = mode === 'car' ? 'car' : 
                           mode === 'pedestrian' ? 'pedestrian' : 'bicycle';
      
      const url = `${this.routingUrl}/routes?transportMode=${transportMode}&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&return=summary&apiKey=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`[HERE] Error HTTP ${response.status} en cálculo de ruta`);
        return null;
      }

      const data: HereRoute = await response.json();
      console.log(`[HERE] Respuesta de ruta:`, data);
      
      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const summary = route.sections[0].summary;
        
        const result = {
          distance: summary.length,
          duration: summary.duration,
          geometry: [] // HERE no devuelve geometría por defecto
        };
        
        console.log(`[HERE] Ruta calculada:`, {
          distance: `${(result.distance / 1000).toFixed(2)}km`,
          duration: `${Math.round(result.duration / 60)}min`
        });
        
        return result;
      }
      
      return null;
    } catch (error) {
      console.error(`[HERE] Error al calcular ruta:`, error);
      return null;
    }
  }

  /**
   * Geocodificación inversa: coordenadas a dirección
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/revgeocode?at=${latitude},${longitude}&apiKey=${this.apiKey}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Error en geocodificación inversa');
      }

      const data = await response.json();
      
      if (data && data.items && data.items.length > 0) {
        return data.items[0].address.label;
      }
      
      return null;
    } catch (error) {
      console.error('Error en geocodificación inversa:', error);
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

export default new HereMapsService(); 