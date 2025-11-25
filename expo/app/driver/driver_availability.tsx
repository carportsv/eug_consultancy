import AppHeader from '@/components/AppHeader';
import OpenStreetMapWrapper from '@/components/OpenStreetMapWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { LocationCoords } from '@/services/openStreetMapService';
import { realtimeService } from '@/services/realtimeService';
import { supabase } from '@/services/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

export default function DriverAvailability() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const gotFirstFixRef = useRef<boolean>(false);

  const INITIAL_CENTER: LocationCoords = { latitude: 0, longitude: 0 };
  const INITIAL_ZOOM = 3;

  // Manejar botón físico de atrás en Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        try {
          router.replace('/driver/driver_home');
        } catch {}
        return true; // Consumir el evento siempre
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [router])
  );

  useEffect(() => {
    loadDriverData();
    getCurrentLocation();

    return () => {
      // Limpiar watcher de ubicación
      try {
        locationSubscriptionRef.current?.remove();
        locationSubscriptionRef.current = null;
      } catch {}
    };
  }, []);

  // Conectar con sistema híbrido
  const connectToHybridSystem = async () => {
    if (!user?.uid) return;

    const context = {
      role: 'driver' as const,
      hasActiveRide: false,
      isAvailable: isAvailable,
      isSearching: false
    };

    await realtimeService.realtimeManager.connectUser(user.uid, context);
    
    // Verificar si está usando realtime
    const stats = realtimeService.realtimeManager.getStats();
    setIsRealtimeActive(stats.activeConnections > 0);
    
    console.log('[DriverAvailability] Conectado al sistema híbrido:', stats);
  };

  // Actualizar contexto cuando cambie la disponibilidad
  const updateDriverContext = async (available: boolean) => {
    if (!user?.uid) return;

    const context = {
      role: 'driver' as const,
      hasActiveRide: false,
      isAvailable: available,
      isSearching: false
    };

    // Reconectar con nueva prioridad
    realtimeService.realtimeManager.disconnectUser(user.uid);
    await realtimeService.realtimeManager.connectUser(user.uid, context);
    
    // Actualizar estado de realtime
    const stats = realtimeService.realtimeManager.getStats();
    setIsRealtimeActive(stats.activeConnections > 0);
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (user?.uid) {
        realtimeService.realtimeManager.disconnectUser(user.uid);
      }
    };
  }, [user?.uid]);

  const loadDriverData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      // Obtener el user_id primero usando el firebase_uid
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', user.uid)
        .single();

      if (userError) {
        console.error('Error obteniendo usuario:', userError);
        return;
      }

      // Obtener el driver_id usando el user_id
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('id, is_available')
        .eq('user_id', userData.id)
        .single();

      let currentDriverId: string | null = null;

      if (driverError) {
        console.error('Error cargando datos del conductor:', driverError);
        
        // Si no existe el conductor, crearlo
        if (driverError.code === 'PGRST116') {
          const { data: newDriver, error: createError } = await supabase
            .from('drivers')
            .insert({
              user_id: userData.id,
              is_available: false,
              status: 'inactive'
            })
            .select('id, is_available')
            .single();

          if (createError) {
            console.error('Error creando conductor:', createError);
            return;
          }

          currentDriverId = newDriver.id;
          setDriverId(newDriver.id);
          setIsAvailable(newDriver.is_available || false);
        } else {
          return;
        }
      } else {
        currentDriverId = driverData.id;
        setDriverId(driverData.id);
        setIsAvailable(driverData.is_available || false);
      }

      // Cargar marcadores de otros conductores
      if (currentDriverId) {
        const { data: otherDrivers } = await supabase
          .from('drivers')
          .select('id, location, is_available')
          .eq('is_available', true)
          .neq('id', currentDriverId);

        if (otherDrivers) {
          const driverMarkers = otherDrivers.map(driver => ({
            id: driver.id,
            coordinate: driver.location,
            title: 'Conductor disponible',
            description: 'Otro conductor en el área'
          }));
          setMarkers(driverMarkers);
        }
      }

      // Conectar con sistema híbrido después de cargar datos
      await connectToHybridSystem();
      
    } catch (error) {
      console.error('Error cargando datos del conductor:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para mostrar tu posición en el mapa');
        return;
      }

      // Verificar que los servicios de ubicación estén activos
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Ubicación desactivada',
          'Activa los servicios de ubicación del dispositivo para centrar el mapa en tu posición.'
        );
      }

      // 1) Intentar última ubicación conocida para mostrar el mapa al instante
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords) {
          const quickCoords = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
          setCurrentLocation(quickCoords);
          gotFirstFixRef.current = true;
          if (driverId && isAvailable) {
            await realtimeService.updateDriverLocation(driverId, quickCoords);
          }
        }
      } catch {}

      // 2) Intentar una lectura puntual para obtener un fix rápido (con límite de tiempo)
      try {
        const quickFix = await Promise.race<unknown>([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: true }),
          new Promise(resolve => setTimeout(() => resolve(null), 4000)),
        ]);
        if (quickFix && typeof quickFix === 'object' && 'coords' in (quickFix as any)) {
          const pos = quickFix as Location.LocationObject;
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCurrentLocation(coords);
          gotFirstFixRef.current = true;
          if (driverId && isAvailable) {
            await realtimeService.updateDriverLocation(driverId, coords);
          }
        }
      } catch {}

      // 3) Suscribirse a cambios de ubicación para obtener la primera corrección rápida y mantener actualizada
      try {
        locationSubscriptionRef.current?.remove();
      } catch {}
      // Throttle: evitar actualizaciones demasiado frecuentes si el movimiento es mínimo
      let lastUpdateTs = Date.now();
      let lastCoords: LocationCoords | null = null;

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 7000,
          distanceInterval: 15,
        },
        async (loc) => {
          const live = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };

          // Aplicar throttle simple por tiempo y distancia
          const now = Date.now();
          const elapsed = now - lastUpdateTs;
          const movedEnough = !lastCoords ||
            Math.hypot(live.latitude - lastCoords.latitude, live.longitude - lastCoords.longitude) > 0.0003; // ~30-35m

          if (elapsed < 10000 && !movedEnough) {
            return;
          }
          lastUpdateTs = now;
          lastCoords = live;

          setCurrentLocation(live);
          if (!gotFirstFixRef.current) {
            gotFirstFixRef.current = true;
          }
          if (driverId && isAvailable) {
            await realtimeService.updateDriverLocation(driverId, live);
          }
        }
      );
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
    }
  };

  const handleAvailabilityToggle = async (value: boolean) => {
    if (!driverId) {
      Alert.alert('Error', 'No se pudo identificar al conductor');
      return;
    }

    try {
      setLoading(true);

      // Actualizar disponibilidad en la base de datos
      const { error } = await supabase
        .from('drivers')
        .update({
          is_available: value,
          status: value ? 'active' : 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (error) {
        console.error('Error actualizando disponibilidad:', error);
        Alert.alert('Error', 'No se pudo actualizar la disponibilidad');
        return;
      }

      setIsAvailable(value);

      // Actualizar contexto en el sistema híbrido
      await updateDriverContext(value);

      // Si se activó disponible y ya tenemos coordenadas, persistirlas en drivers.location de inmediato
      try {
        if (value && driverId && currentLocation) {
          await realtimeService.updateDriverLocation(driverId, currentLocation);
        }
      } catch {}

      // Mostrar mensaje de confirmación
      if (value) {
        Alert.alert(
          'Disponible',
          'Ahora estás disponible para recibir solicitudes de viaje',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No Disponible',
          'Ya no estás disponible para recibir solicitudes',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('Error en toggle de disponibilidad:', error);
      Alert.alert('Error', 'Ocurrió un error al cambiar la disponibilidad');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    await getCurrentLocation();
    Alert.alert('Ubicación Actualizada', 'Tu ubicación ha sido actualizada en el sistema');
  };

  // Crear marcadores del mapa
  const mapMarkers = [];

  // Agregar marcador del conductor actual
  if (currentLocation) {
    mapMarkers.push({
      id: 'current-driver',
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      title: 'Tu ubicación',
      color: isAvailable ? '#4CAF50' : '#F44336'
    });
  }

  // Agregar marcadores de otros conductores
  markers.forEach(marker => {
    if (marker.coordinate) {
      mapMarkers.push({
        id: `driver-${marker.id}`,
        latitude: marker.coordinate.latitude,
        longitude: marker.coordinate.longitude,
        title: marker.title,
        color: '#2563EB'
      });
    }
  });

  // Calcular centro del mapa sin coordenadas quemadas
  const mapCenter = (() => {
    if (currentLocation) return currentLocation;
    const valid = markers.filter(m => m.coordinate && !isNaN(m.coordinate.latitude) && !isNaN(m.coordinate.longitude));
    if (valid.length > 0) {
      const avgLat = valid.reduce((sum, m) => sum + m.coordinate.latitude, 0) / valid.length;
      const avgLng = valid.reduce((sum, m) => sum + m.coordinate.longitude, 0) / valid.length;
      return { latitude: avgLat, longitude: avgLng } as LocationCoords;
    }
    return INITIAL_CENTER;
  })();

  if (loading && !currentLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text>Obteniendo tu ubicación...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        subtitle="Gestiona tu disponibilidad"
        showBackButton
        onBackPress={() => {
          if ((router as any)?.canGoBack?.()) {
            router.back();
          } else {
            router.replace('/driver/driver_home');
          }
        }}
      />
      
      <View style={styles.mapContainer}>
        <OpenStreetMapWrapper
          latitude={mapCenter.latitude}
          longitude={mapCenter.longitude}
          zoom={currentLocation ? 15 : INITIAL_ZOOM}
          markers={mapMarkers}
          showUserLocation={!!currentLocation}
          userLocation={currentLocation || undefined}
        />
        {!currentLocation && markers.length === 0 && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
          </View>
        )}
      </View>

      {/* Botón Flotante */}
      <TouchableOpacity
        style={[styles.floatingButton, isExpanded && styles.floatingButtonExpanded]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        {!isExpanded ? (
          <MaterialIcons 
            name="toggle-on" 
            size={24} 
            color="#fff" 
          />
        ) : (
          <MaterialIcons 
            name="close" 
            size={24} 
            color="#fff" 
          />
        )}
      </TouchableOpacity>

      {/* Panel Expandido */}
      {isExpanded && (
        <View style={styles.expandedPanel}>
          <Text style={styles.title}>Disponibilidad</Text>
          
          {/* Indicador de estado */}
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: isAvailable ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.statusText}>
              {isAvailable ? 'Disponible' : 'No Disponible'}
            </Text>
            {isRealtimeActive && (
              <View style={styles.realtimeIndicator}>
                <View style={styles.realtimeDot} />
                <Text style={styles.realtimeText}>En tiempo real</Text>
              </View>
            )}
          </View>
          
          {/* Botones de control */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, isAvailable && styles.buttonActive]}
              onPress={() => handleAvailabilityToggle(true)}
              disabled={loading}
            >
              <MaterialIcons 
                name="check-circle" 
                size={20} 
                color={isAvailable ? '#fff' : '#4CAF50'} 
              />
              <Text style={[styles.buttonText, isAvailable && styles.buttonTextActive]}>
                Disponible
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, !isAvailable && styles.buttonActive]}
              onPress={() => handleAvailabilityToggle(false)}
              disabled={loading}
            >
              <MaterialIcons 
                name="cancel" 
                size={20} 
                color={!isAvailable ? '#fff' : '#F44336'} 
              />
              <Text style={[styles.buttonText, !isAvailable && styles.buttonTextActive]}>
                No Disponible
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Información de ubicación */}
          {currentLocation && (
            <View style={styles.locationInfo}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.locationText}>
                Lat: {currentLocation.latitude.toFixed(4)}, Lng: {currentLocation.longitude.toFixed(4)}
              </Text>
            </View>
          )}
          
          {/* Botón para actualizar ubicación */}
          <TouchableOpacity
            style={styles.updateLocationButton}
            onPress={handleUpdateLocation}
            disabled={loading}
          >
            <MaterialIcons name="refresh" size={20} color="#2563EB" />
            <Text style={styles.updateLocationText}>Actualizar Ubicación</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  loadingMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontFamily: 'Poppins',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)'
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  floatingButtonExpanded: {
    backgroundColor: '#E53E3E',
  },
  expandedPanel: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1F2937',
    fontFamily: 'Poppins',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  infoSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  infoText: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins',
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  realtimeText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins',
  },
  buttonActive: {
    backgroundColor: '#4CAF50',
  },
  buttonTextActive: {
    color: '#fff',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F0F9EB',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  updateLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  updateLocationText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
});