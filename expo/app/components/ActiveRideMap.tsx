import openStreetMapService, { LocationCoords } from '@/services/openStreetMapService';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import OpenStreetMapWrapper from './OpenStreetMapWrapper';

interface MapMarker {
  id: string;
  coordinate: LocationCoords;
  title: string;
  description: string;
  color: string;
}

interface MapPolyline {
  id: string;
  coordinates: LocationCoords[];
  color: string;
  width: number;
}

const { width, height } = Dimensions.get('window');

export interface ActiveRideMapProps {
  origin: LocationCoords;
  destination: LocationCoords;
  driverLocation?: LocationCoords;
  userLocation?: LocationCoords;
  routeCoordinates?: LocationCoords[];
  routeToDestinationCoordinates?: LocationCoords[];
  showDriverRoute?: boolean;
  showUserRoute?: boolean;
  style?: any;
  onRegionChange?: (region: any) => void;
  showCurrentLocation?: boolean;
  eta?: string;
  etaDescription?: string;
  driverToUserETA?: string;
  userToDestinationETA?: string;
  rideStatus?: string;
}

export default function ActiveRideMap({
  origin,
  destination,
  driverLocation,
  userLocation,
  routeCoordinates = [],
  routeToDestinationCoordinates = [],
  showDriverRoute = true,
  showUserRoute = true,
  style,
  onRegionChange,
  showCurrentLocation = false,
  eta,
  etaDescription,
  driverToUserETA,
  userToDestinationETA,
  rideStatus
}: ActiveRideMapProps) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [polylines, setPolylines] = useState<MapPolyline[]>([]);
  const [fallbackRouteToUser, setFallbackRouteToUser] = useState<LocationCoords[]>([]);

  useEffect(() => {
    console.log('[ActiveRideMap] useEffect ejecutado con props:', {
      routeCoordinatesLength: routeCoordinates.length,
      routeToDestinationCoordinatesLength: routeToDestinationCoordinates.length,
      showDriverRoute,
      showUserRoute,
      rideStatus,
      routeCoordinatesSample: routeCoordinates.slice(0, 3), // Primeras 3 coordenadas para debug
      hasDriverLocation: !!driverLocation
    });
    
    const newMarkers: MapMarker[] = [];
    const newPolylines: MapPolyline[] = [];

    // Marcador de origen
    newMarkers.push({
      id: 'origin',
      coordinate: origin,
             title: 'Origen',
      description: 'Punto de origen',
      color: 'green'
    });

    // Marcador de destino
    newMarkers.push({
      id: 'destination',
      coordinate: destination,
             title: 'Destino',
      description: 'Punto de destino',
      color: 'red'
    });

    // Marcador del conductor (solo ubicación real)
    if (driverLocation) {
      const driverDescription = eta && etaDescription 
        ? `Conductor - ${etaDescription}: ${eta}`
        : 'Conductor';
      
      newMarkers.push({
        id: 'driver',
        coordinate: driverLocation,
        title: 'Conductor',
        description: driverDescription,
        color: '#2196F3'
      });
    }

    // Marcador del usuario
    if (userLocation) {
      newMarkers.push({
        id: 'user',
        coordinate: userLocation,
        title: 'Usuario',
        description: 'Tu ubicación',
        color: 'purple'
      });
    }

    // Ruta 1: Conductor → Usuario (pickup) - Color azul
    const driverToUserCoords = routeCoordinates.length > 0 ? routeCoordinates : fallbackRouteToUser;
    if (showDriverRoute && driverToUserCoords.length > 0) {
      newPolylines.push({
        id: 'routeToUser',
        coordinates: driverToUserCoords,
        color: '#2196F3', // Azul
        width: 4
      });
    }

    // Ruta 2: Usuario (pickup) → Destino final - Color rojo
    if (showUserRoute && routeToDestinationCoordinates.length > 0) {
      newPolylines.push({
        id: 'routeToDestination',
        coordinates: routeToDestinationCoordinates,
        color: '#F44336', // Rojo
        width: 4
      });
    }

    // Línea diagonal completamente eliminada - solo se muestran rutas calculadas por OSRM

    // Ruta del usuario al origen eliminada para evitar línea diagonal

    setMarkers(newMarkers);
    setPolylines(newPolylines);
  }, [
    origin.latitude, origin.longitude,
    destination.latitude, destination.longitude,
    driverLocation?.latitude, driverLocation?.longitude,
    userLocation?.latitude, userLocation?.longitude,
    routeCoordinates.length, routeToDestinationCoordinates.length,
    showDriverRoute, showUserRoute, eta, etaDescription,
    driverToUserETA, userToDestinationETA, rideStatus,
    fallbackRouteToUser.length
  ]);

  // Simulación desactivada - solo ubicación real del conductor

  // Fallback: si no vienen coordenadas de ruta al usuario, calcularlas localmente
  useEffect(() => {
    const canCalculateFallback =
      showDriverRoute &&
      routeCoordinates.length === 0 &&
      !!driverLocation &&
      driverLocation.latitude !== 0 && driverLocation.longitude !== 0 &&
      origin.latitude !== 0 && origin.longitude !== 0;

    if (!canCalculateFallback) {
      if (fallbackRouteToUser.length) setFallbackRouteToUser([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const route = await openStreetMapService.getRoute(driverLocation as LocationCoords, origin, 'driving');
        if (!cancelled && route && Array.isArray(route.points) && route.points.length > 0) {
          setFallbackRouteToUser(route.points);
        }
      } catch (_) {
        // Ignorar errores del fallback
      }
    })();

    return () => { cancelled = true; };
  }, [showDriverRoute, routeCoordinates.length, driverLocation?.latitude, driverLocation?.longitude, origin.latitude, origin.longitude]);

  // Memoizar el centro del mapa para evitar recálculos innecesarios
  const mapCenter = useMemo(() => {
    // Si tenemos ubicación actual del conductor, usarla como centro principal
    if (driverLocation && driverLocation.latitude !== 0 && driverLocation.longitude !== 0) {
      return driverLocation;
    }
    
    // Si no hay conductor, usar el origen
    if (origin.latitude !== 0 && origin.longitude !== 0) {
      return origin;
    }
    
    // Si no hay origen, usar el destino
    if (destination.latitude !== 0 && destination.longitude !== 0) {
      return destination;
    }
    
    // Fallback: calcular centro de todas las coordenadas disponibles
    const allCoordinates = [
      origin,
      destination,
      ...(driverLocation ? [driverLocation] : []),
      ...(userLocation ? [userLocation] : [])
    ].filter(coord => coord.latitude !== 0 && coord.longitude !== 0);

    if (allCoordinates.length === 0) {
      return { latitude: 13.7942, longitude: -88.8965 }; // San Salvador por defecto
    }

    const lats = allCoordinates.map(coord => coord.latitude);
    const lngs = allCoordinates.map(coord => coord.longitude);

    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    return {
      latitude: centerLat,
      longitude: centerLng
    };
  }, [driverLocation?.latitude, driverLocation?.longitude, origin.latitude, origin.longitude, destination.latitude, destination.longitude, userLocation?.latitude, userLocation?.longitude]);

  // Convertir marcadores al formato que espera OpenStreetMap
  const openStreetMapMarkers = markers.map(marker => ({
    id: marker.id,
    latitude: marker.coordinate.latitude,
    longitude: marker.coordinate.longitude,
    title: marker.title,
    color: marker.color
  }));

  // Convertir polylines al formato que espera OpenStreetMap
  const openStreetMapPolylines = polylines.map(polyline => ({
    id: polyline.id,
    coordinates: polyline.coordinates,
    color: polyline.color,
    width: polyline.width
  }));

  return (
    <View style={[styles.container, style]}>
      <OpenStreetMapWrapper
        latitude={mapCenter.latitude}
        longitude={mapCenter.longitude}
        zoom={15}
        markers={openStreetMapMarkers}
        polylines={openStreetMapPolylines}
        style={styles.map}
        showUserLocation={showCurrentLocation && !!driverLocation}
        userLocation={showCurrentLocation ? driverLocation : userLocation}
      />
      
      {/* Simulación desactivada - solo ubicación real del conductor */}
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
}); 