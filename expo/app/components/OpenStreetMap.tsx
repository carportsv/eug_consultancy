import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface OpenStreetMapProps {
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

const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
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
  const webViewRef = useRef<WebView>(null);
  const [mapHtml, setMapHtml] = useState('');

  useEffect(() => {
    console.log('[OpenStreetMap] useEffect ejecutado con markers:', markers.length);
    const html = generateMapHTML();
    setMapHtml(html);
  }, [latitude, longitude, zoom, markers, polylines, showUserLocation, userLocation]);

  const generateMapHTML = () => {
    console.log('[OpenStreetMap] Generando HTML con markers:', markers.length, 'markers');
    console.log('[OpenStreetMap] Markers:', markers.map(m => ({ id: m.id, title: m.title, color: m.color })));
    console.log('[OpenStreetMap] Generando HTML con polylines:', polylines.length, 'polylines');
    polylines.forEach((polyline, index) => {
      console.log(`[OpenStreetMap] Polyline ${index}:`, {
        id: polyline.id,
        color: polyline.color,
        coordinatesCount: polyline.coordinates.length,
        firstCoord: polyline.coordinates[0],
        lastCoord: polyline.coordinates[polyline.coordinates.length - 1]
      });
    });
    const markersHtml = markers
      .map(
        (marker) => {
          // Si es un marcador de conductor, usar icono de carro como en Firebase
          const isDriver = marker.id.startsWith('driver-');
          const iconHtml = isDriver 
            ? '<div style="background-color: #fff; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #2563EB; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.15); padding: 4px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#2563EB"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg></div>'
            : `<div style="background-color: ${marker.color || '#ff0000'}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`;
          
          return `
            L.marker([${marker.latitude}, ${marker.longitude}], {
              icon: L.divIcon({
                className: 'custom-marker',
                html: '${iconHtml}',
                iconSize: [${isDriver ? 28 : 20}, ${isDriver ? 28 : 20}],
                iconAnchor: [${isDriver ? 14 : 10}, ${isDriver ? 14 : 10}]
              })
            })
            .bindPopup('Marcador')
            .addTo(map)
            .on('click', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'markerPress',
                markerId: '${marker.id}'
              }));
            });
          `;
        }
      )
      .join('');

    const userLocationHtml = showUserLocation && userLocation
      ? `
        L.marker([${userLocation.latitude}, ${userLocation.longitude}], {
          icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div style="background-color: #4285f4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        })
        .bindPopup('Tu ubicación')
        .addTo(map);
      `
      : '';

    const polylinesHtml = polylines
      .filter(polyline => {
        // Filtrar polylines que tengan al menos 2 coordenadas válidas
        const validCoords = polyline.coordinates.filter(coord => 
          coord.latitude !== 0 && coord.longitude !== 0 &&
          !isNaN(coord.latitude) && !isNaN(coord.longitude)
        );
        return validCoords.length >= 2;
      })
      .map(
        (polyline) => {
          const validCoords = polyline.coordinates.filter(coord => 
            coord.latitude !== 0 && coord.longitude !== 0 &&
            !isNaN(coord.latitude) && !isNaN(coord.longitude)
          );
          return `
            L.polyline([${validCoords.map(coord => `[${coord.latitude}, ${coord.longitude}]`).join(', ')}], {
              color: '${polyline.color}',
              weight: ${polyline.width},
              opacity: 0.8
            }).addTo(map);
          `;
        }
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>OpenStreetMap</title>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              height: 100vh; 
              width: 100vw; 
            }
            #map { 
              height: 100%; 
              width: 100%; 
            }
            .custom-marker {
              background: transparent;
              border: none;
            }
            .user-location-marker {
              background: transparent;
              border: none;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = L.map('map').setView([${latitude}, ${longitude}], ${zoom});
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Función para limpiar todas las capas del mapa
            function clearAllLayers() {
              map.eachLayer(function(layer) {
                if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                  map.removeLayer(layer);
                }
              });
            }

            // Limpiar todas las capas antes de agregar nuevas
            clearAllLayers();

            ${markersHtml}
            ${userLocationHtml}
            ${polylinesHtml}

            map.on('click', function(e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapPress',
                latitude: e.latlng.lat,
                longitude: e.latlng.lng
              }));
            });

            // Función para actualizar la vista del mapa
            window.updateMapView = function(lat, lng, newZoom) {
              map.setView([lat, lng], newZoom || ${zoom});
            };

            // Función para agregar marcadores dinámicamente
            window.addMarker = function(markerData) {
              const marker = L.marker([markerData.latitude, markerData.longitude], {
                icon: L.divIcon({
                  className: 'custom-marker',
                  html: '<div style="background-color: ' + (markerData.color || '#ff0000') + '; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                })
              })
                             .bindPopup('Marcador')
              .addTo(map)
              .on('click', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'markerPress',
                  markerId: markerData.id
                }));
              });
              return marker;
            };

            // Función para limpiar marcadores
            window.clearMarkers = function() {
              map.eachLayer(function(layer) {
                if (layer instanceof L.Marker) {
                  map.removeLayer(layer);
                }
              });
            };
          </script>
        </body>
      </html>
    `;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'markerPress' && onMarkerPress) {
        onMarkerPress(data.markerId);
      } else if (data.type === 'mapPress' && onMapPress) {
        onMapPress(data.latitude, data.longitude);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const updateMapView = (lat: number, lng: number, newZoom?: number) => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'updateView',
        latitude: lat,
        longitude: lng,
        zoom: newZoom || zoom,
      })
    );
  };

  const addMarker = (markerData: {
    id: string;
    latitude: number;
    longitude: number;
    title?: string;
    color?: string;
  }) => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'addMarker',
        markerData,
      })
    );
  };

  const clearMarkers = () => {
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'clearMarkers',
      })
    );
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        mixedContentMode="always"
        originWhitelist={["*"]}
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  webview: {
    flex: 1,
  },
});

export default OpenStreetMap; 