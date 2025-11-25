import { LocationCoords } from '@/services/openStreetMapService';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import OpenStreetMap, { MapMarker, MapPolyline } from './OpenStreetMap';

export interface MapSelectorProps {
  onLocationSelect?: (coordinate: LocationCoords, address: string) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  style?: any;
}

export function MapSelector({ 
  onLocationSelect, 
  initialRegion,
  markers = [],
  polylines = [],
  style 
}: MapSelectorProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationCoords | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');

  const handleMapPress = async (coordinate: LocationCoords) => {
    try {
      // Aquí podrías usar el servicio de geocoding para obtener la dirección
      // Por ahora usamos las coordenadas directamente
      setSelectedLocation(coordinate);
      setSelectedAddress(`${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`);
      
      if (onLocationSelect) {
        onLocationSelect(coordinate, selectedAddress);
      }
    } catch (error) {
      console.error('Error al seleccionar ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener la dirección de la ubicación seleccionada');
    }
  };

  const handleMarkerPress = (marker: MapMarker) => {
    if (onLocationSelect) {
      onLocationSelect(marker.coordinate, marker.title || 'Ubicación seleccionada');
    }
  };

  return (
    <View style={[styles.container, style]}>
      <OpenStreetMap
        initialRegion={initialRegion}
        markers={markers}
        polylines={polylines}
        onMapPress={handleMapPress}
        onMarkerPress={handleMarkerPress}
        style={styles.map}
      />
      {selectedLocation && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            Ubicación seleccionada: {selectedAddress}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  locationInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
}); 