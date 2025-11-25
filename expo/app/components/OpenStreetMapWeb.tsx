import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

interface OpenStreetMapWebProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    color?: string;
  }>;
  polylines?: Array<{
    id: string;
    coordinates: Array<{ latitude: number; longitude: number }>;
    color: string;
    width: number;
  }>;
  onMarkerPress?: (markerId: string) => void;
  onMapPress?: (latitude: number, longitude: number) => void;
  style?: any;
  showUserLocation?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

const OpenStreetMapWeb: React.FC<OpenStreetMapWebProps> = ({
  latitude,
  longitude,
  zoom = 15,
  markers = [],
  polylines = [],
  onMarkerPress,
  onMapPress,
  style,
  showUserLocation = false,
  userLocation,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    }
  }, []);

  useEffect(() => {
    if (isMapLoaded && mapInstanceRef.current) {
      updateMap();
    }
  }, [latitude, longitude, zoom, markers, polylines, showUserLocation, userLocation, isMapLoaded]);

  const initializeMap = async () => {
    try {
      // Cargar Leaflet CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Cargar Leaflet JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        createMap();
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error loading Leaflet:', error);
    }
  };

  const createMap = () => {
    if (!mapRef.current || !window.L) return;

    const L = window.L;
    
    // Crear el mapa
    mapInstanceRef.current = L.map(mapRef.current).setView([latitude, longitude], zoom);

    // Agregar capa de tiles de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    // Configurar eventos del mapa
    if (onMapPress) {
      mapInstanceRef.current.on('click', (e: any) => {
        onMapPress(e.latlng.lat, e.latlng.lng);
      });
    }

    setIsMapLoaded(true);
  };

  const updateMap = () => {
    if (!mapInstanceRef.current || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Limpiar marcadores y polylines existentes
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Agregar marcadores
    markers.forEach((marker) => {
      const isDriver = marker.id.startsWith('driver-');
      
      let icon;
      if (isDriver) {
        icon = L.divIcon({
          className: 'custom-marker',
          html: '<div style="background-color: #fff; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #2563EB; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15); padding: 4px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#2563EB"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg></div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
      } else {
        icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${marker.color || '#ff0000'}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
      }

      const leafletMarker = L.marker([marker.latitude, marker.longitude], { icon })
        .bindPopup(marker.title || 'Marcador')
        .addTo(map);

      if (onMarkerPress) {
        leafletMarker.on('click', () => {
          onMarkerPress(marker.id);
        });
      }
    });

    // Agregar polylines
    polylines.forEach((polyline) => {
      if (polyline.coordinates.length >= 2) {
        const coordinates = polyline.coordinates.map(coord => [coord.latitude, coord.longitude]);
        L.polyline(coordinates, {
          color: polyline.color,
          weight: polyline.width,
          opacity: 0.8
        }).addTo(map);
      }
    });

    // Agregar ubicación del usuario si está habilitada
    if (showUserLocation && userLocation) {
      L.marker([userLocation.latitude, userLocation.longitude], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: '<div style="background-color: #4285f4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).bindPopup('Tu ubicación').addTo(map);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 400,
          backgroundColor: '#eaeaea'
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
  },
});

// Extender la interfaz Window para incluir Leaflet
declare global {
  interface Window {
    L: any;
  }
}

export default OpenStreetMapWeb; 