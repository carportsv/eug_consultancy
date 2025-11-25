import OpenStreetMap from '@/components/OpenStreetMap';
import PlaceInput from '@/components/PlaceInput';
import openStreetMapService, { LocationCoords } from '@/services/openStreetMapService';
import { supabase } from '@/services/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';

export default function UserRideScreen(): React.JSX.Element {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const panelRatio = 0.30; // objetivo final: 30%
  const metricsOffset = React.useMemo(() => {
    if (height < 680) return -40;
    if (height < 740) return -35;
    if (height < 820) return -24;
    return -12;
  }, [height]);
  const metricsPaddingTop = height < 720 ? 2 : 4;
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoords, setOriginCoords] = useState<LocationCoords | null>(null);
  const [destCoords, setDestCoords] = useState<LocationCoords | null>(null);
  const [estim, setEstim] = useState<{ km: number; min: number; price: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [selectedField, setSelectedField] = useState<'origin' | 'destination'>('origin');
  const [driverToUser, setDriverToUser] = useState<{ km: number; min: number } | null>(null);
  const autoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [routeToDestCoords, setRouteToDestCoords] = useState<LocationCoords[] | null>(null);
  const [driverToUserCoords, setDriverToUserCoords] = useState<LocationCoords[] | null>(null);
  const [mapUpdateKey, setMapUpdateKey] = useState(0);

  // Obtener ubicación real del dispositivo
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'No se pudo obtener la ubicación actual.');
          setLoadingLocation(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!isMounted) return;
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCurrentLocation(coords);
      } catch (e) {
        console.warn('[UserRide] Error obteniendo ubicación:', e);
      } finally {
        if (isMounted) setLoadingLocation(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const canEstimate = useMemo(() => !!originCoords && !!destCoords, [originCoords, destCoords]);

  const getCoords = async (text: string): Promise<LocationCoords | null> => {
    const coords = await openStreetMapService.getCoordsFromAddress(text);
    return coords;
  };

  const estimate = async () => {
    if (!canEstimate) return;
    try {
      const route = await openStreetMapService.getRoute(originCoords!, destCoords!);
      if (route) {
        const km = route.totalDistance / 1000;
        const min = Math.round(route.totalDuration / 60);
        const price = Math.max(2, Math.round((2 + Math.max(0, km - 5) * 0.5) * 100) / 100);
        setEstim({ km, min, price });
        const coords = route.points.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
        setRouteToDestCoords(coords);
      }
    } catch {}
  };

  // Auto-estimación en background con debounce cuando haya ambos puntos
  useEffect(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
    }
    if (originCoords && destCoords) {
      autoTimerRef.current = setTimeout(() => {
        estimate();
      }, 600);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [originCoords?.latitude, originCoords?.longitude, destCoords?.latitude, destCoords?.longitude]);

  // Cargar conductores disponibles inmediatamente
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        console.log('[UserRide] Cargando conductores...');
        
        // Cargar solo conductores activos y disponibles que hayan sido actualizados recientemente
        const { data: drivers, error } = await supabase
          .from('drivers')
          .select('id, location, is_available, status, updated_at')
          .eq('status', 'active')
          .eq('is_available', true)
          .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Solo drivers actualizados en las últimas 24 horas
        
        if (error) {
          console.warn('[UserRide] Error en consulta de drivers:', error);
          return;
        }
        
        console.log('[UserRide] Drivers disponibles encontrados:', drivers?.length || 0);
        console.log('[UserRide] Drivers data:', drivers);
        
        if (drivers && drivers.length > 0) {
          setAvailableDrivers(drivers);
        } else {
          console.log('[UserRide] No se encontraron drivers disponibles');
          setAvailableDrivers([]);
        }
      } catch (error) {
        console.warn('[UserRide] Error cargando drivers:', error);
      }
    };
    
    // Limpiar estado al montar el componente
    setAvailableDrivers([]);
    loadDrivers();
  }, []);

  // Calcular ETA del driver más cercano cuando hay origen
  useEffect(() => {
    const calcDriverEta = async () => {
      try {
        if (!originCoords || availableDrivers.length === 0) return;
        
        // Calcular ETA del driver más cercano
        const validDrivers = availableDrivers.filter((d: any) => d?.location?.latitude && d?.location?.longitude);
        console.log('[UserRide] Drivers válidos con ubicación:', validDrivers.length);
        
        if (validDrivers.length > 0) {
          // Elegir driver más cercano por distancia haversine aproximada
          const haversine = (a: LocationCoords, b: LocationCoords) => {
            const R = 6371; // km
            const dLat = (b.latitude - a.latitude) * Math.PI / 180;
            const dLng = (b.longitude - a.longitude) * Math.PI / 180;
            const la1 = a.latitude * Math.PI / 180;
            const lb1 = b.latitude * Math.PI / 180;
            const x = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(lb1)*Math.sin(dLng/2)**2;
            return 2 * R * Math.asin(Math.sqrt(x));
          };
          
          let nearest = validDrivers[0];
          let bestDist = haversine(validDrivers[0].location, originCoords);
          for (let i = 1; i < validDrivers.length; i++) {
            const d = haversine(validDrivers[i].location, originCoords);
            if (d < bestDist) { bestDist = d; nearest = validDrivers[i]; }
          }
          
          console.log('[UserRide] Driver más cercano:', nearest.id, 'distancia:', bestDist.toFixed(2), 'km');
          
          // Ruta real con OSRM
          const route = await openStreetMapService.getRoute(nearest.location, originCoords);
          if (route) {
            setDriverToUser({
              km: route.totalDistance / 1000,
              min: Math.round(route.totalDuration / 60)
            });
            const coords = route.points.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
            setDriverToUserCoords(coords);
          }
        } else {
          console.log('[UserRide] No hay drivers con ubicación válida');
        }
      } catch (error) {
        console.warn('[UserRide] Error calculando ETA del driver:', error);
      }
    };
    
    calcDriverEta();
  }, [originCoords?.latitude, originCoords?.longitude, availableDrivers]);

  // Suscripción realtime para mantener drivers actualizados
  useEffect(() => {
    const channel = supabase
      .channel('drivers_live_user')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        (payload) => {
          console.log('[UserRide] Cambio detectado en drivers:', payload);
          
                     // Actualizar inmediatamente basado en el payload para respuesta instantánea
           if (payload.eventType === 'UPDATE' && payload.new) {
             const updatedDriver = payload.new;
             
             setAvailableDrivers(prevDrivers => {
               // Si el driver ya está en la lista
               const existingIndex = prevDrivers.findIndex(d => d.id === updatedDriver.id);
               
                               // Verificar si el driver está disponible (status active Y is_available true Y actualizado recientemente)
                const isAvailable = updatedDriver.status === 'active' && 
                                   updatedDriver.is_available === true &&
                                   updatedDriver.updated_at && 
                                   new Date(updatedDriver.updated_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);
               
               if (isAvailable) {
                 // Driver disponible - agregar o actualizar
                 if (existingIndex >= 0) {
                   // Actualizar driver existente
                   const newDrivers = [...prevDrivers];
                   newDrivers[existingIndex] = updatedDriver;
                   console.log('[UserRide] Driver actualizado en tiempo real:', updatedDriver.id, 'disponible:', isAvailable);
                   return newDrivers;
                 } else {
                   // Agregar nuevo driver disponible
                   console.log('[UserRide] Driver agregado en tiempo real:', updatedDriver.id, 'disponible:', isAvailable);
                   return [...prevDrivers, updatedDriver];
                 }
               } else {
                 // Driver no disponible - remover de la lista
                 if (existingIndex >= 0) {
                   const newDrivers = prevDrivers.filter(d => d.id !== updatedDriver.id);
                   console.log('[UserRide] Driver removido en tiempo real:', updatedDriver.id, 'disponible:', isAvailable, 'status:', updatedDriver.status);
                   return newDrivers;
                 }
               }
               
               return prevDrivers;
             });
           }
          
                     // Solo usar la actualización inmediata, no recargar desde DB para evitar conflictos
        }
      )
      .subscribe();

    return () => {
      console.log('[UserRide] Limpiando suscripción realtime');
      supabase.removeChannel(channel);
    };
  }, []);

  // Limpiar estado al desmontar el componente
  useEffect(() => {
    return () => {
      console.log('[UserRide] Componente desmontado, limpiando estado');
      setAvailableDrivers([]);
      setDriverToUser(null);
      setDriverToUserCoords(null);
    };
  }, []);

  // Forzar re-render del mapa cuando cambien los drivers
  useEffect(() => {
    console.log('[UserRide] Drivers cambiaron, forzando actualización del mapa:', availableDrivers.length);
    console.log('[UserRide] IDs de drivers disponibles:', availableDrivers.map(d => d.id));
    setMapUpdateKey(prev => prev + 1);
  }, [availableDrivers]);

  const mapCenter = useMemo(() => {
    if (destCoords) return destCoords;
    if (originCoords) return originCoords;
    if (currentLocation) return currentLocation;
    return null;
  }, [destCoords, originCoords, currentLocation]);

  const mapMarkers = useMemo(() => {
    const markers = [];
    
    // Marcador de origen
    if (originCoords) {
      markers.push({
        id: 'origin',
        latitude: originCoords.latitude,
        longitude: originCoords.longitude,
        title: 'Origen',
        color: '#2563EB'
      });
    }
    
    // Marcador de destino
    if (destCoords) {
      markers.push({
        id: 'destination',
        latitude: destCoords.latitude,
        longitude: destCoords.longitude,
        title: 'Destino',
        color: '#DC2626'
      });
    }
    
    // Marcadores de conductores (solo los disponibles aparecen en el mapa)
    const driverMarkers = availableDrivers
      .filter(d => d?.location?.latitude && d?.location?.longitude)
      .map((d: any, idx: number) => ({
        id: `driver-${d.id}-${idx}`,
        latitude: d.location.latitude,
        longitude: d.location.longitude,
        title: 'Conductor disponible',
        color: '#10B981',
      }));
    
    markers.push(...driverMarkers);
    
    console.log('[UserRide] Marcadores generados:', {
      total: markers.length,
      origin: originCoords ? 1 : 0,
      destination: destCoords ? 1 : 0,
      drivers: driverMarkers.length,
      availableDrivers: availableDrivers.length,
      driverIds: availableDrivers.map(d => d.id)
    });
    
    return markers;
  }, [originCoords, destCoords, availableDrivers]);

  const mapPolylines = useMemo(() => {
    const polylines = [];
    if (driverToUserCoords) {
      polylines.push({
        id: 'driverToUser',
        coordinates: driverToUserCoords,
        color: '#2563EB',
        width: 4
      });
    }
    if (routeToDestCoords) {
      polylines.push({
        id: 'originToDest',
        coordinates: routeToDestCoords,
        color: '#EF4444',
        width: 4
      });
    }
    return polylines;
  }, [driverToUserCoords, routeToDestCoords]);

  const handleContinue = () => {
    if (!originCoords || !destCoords || !estim) {
      Alert.alert('Información incompleta', 'Por favor completa el origen y destino para continuar.');
      return;
    }
    
    router.push({
      pathname: '/user/user_ride_summary',
      params: {
        origin,
        destination,
        km: String(estim.km),
        min: String(estim.min),
        price: String(estim.price),
        ox: String(originCoords.latitude),
        oy: String(originCoords.longitude),
        dx: String(destCoords.latitude),
        dy: String(destCoords.longitude),
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitar Viaje</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Panel de entrada de datos */}
      <View style={styles.panelContainer}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>¿A dónde vas?</Text>
          
          <PlaceInput
            placeholder="Origen"
            onPress={(data) => {
              setOrigin(data.description);
              if (data.coordinates) setOriginCoords(data.coordinates);
              setSelectedField('destination');
            }}
            value={origin}
            onChangeText={setOrigin}
            styles={{
              container: { marginBottom: 12 },
              inputContainer: { 
                paddingVertical: 12, 
                minHeight: 48,
                backgroundColor: '#fff',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                elevation: 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
              },
              input: { 
                fontSize: 14, 
                paddingVertical: 0,
                fontFamily: 'Poppins',
                color: '#1f2937',
              },
              suggestionText: { 
                fontSize: 14,
                fontFamily: 'Poppins',
              },
            }}
            textInputProps={{ onFocus: () => setSelectedField('origin') }}
            userLocation={currentLocation || undefined}
          />

          {originCoords && (
            <PlaceInput
              placeholder="Destino"
              onPress={(data) => {
                setDestination(data.description);
                if (data.coordinates) setDestCoords(data.coordinates);
              }}
              value={destination}
              onChangeText={setDestination}
              styles={{
                container: { marginBottom: 12 },
                inputContainer: { 
                  paddingVertical: 12, 
                  minHeight: 48,
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  elevation: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                },
                input: { 
                  fontSize: 14, 
                  paddingVertical: 0,
                  fontFamily: 'Poppins',
                  color: '#1f2937',
                },
                suggestionText: { 
                  fontSize: 14,
                  fontFamily: 'Poppins',
                },
              }}
              textInputProps={{ onFocus: () => setSelectedField('destination') }}
              userLocation={currentLocation || undefined}
            />
          )}

          {/* Botón de continuar */}
          {canEstimate && estim && (
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <MaterialIcons name="directions-car" size={20} color="#fff" style={styles.continueButtonIcon} />
              <Text style={styles.continueButtonText}>Continuar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Métricas bajo panel: solo cuando ya hay destino */}
      {destCoords && (
        <View style={styles.metricsPanel}>
          <View style={styles.metricRow}>
            <View style={styles.metricIcon}>
              <MaterialIcons name="attach-money" size={18} color="#10B981" />
            </View>
            <Text style={styles.metricLabel}>Precio estimado</Text>
            <Text style={styles.metricValue}>{estim ? `$${estim.price.toFixed(2)}` : '—'}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.metricRow}>
            <View style={styles.metricIcon}>
              <MaterialIcons name="directions-car" size={18} color="#2563EB" />
            </View>
            <Text style={styles.metricLabel}>Conductor → Usuario</Text>
            <Text style={styles.metricValue}>{driverToUser ? `${driverToUser.min} min · ${driverToUser.km.toFixed(1)} km` : '—'}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.metricRow}>
            <View style={styles.metricIcon}>
              <MaterialIcons name="flag" size={18} color="#EF4444" />
            </View>
            <Text style={styles.metricLabel}>Origen → Destino</Text>
            <Text style={styles.metricValue}>{estim ? `${estim.min} min · ${estim.km.toFixed(1)} km` : '—'}</Text>
          </View>
        </View>
      )}

      <View style={styles.mapContainer}>
        {!mapCenter ? (
          <View style={styles.mapLoading}> 
            {loadingLocation ? (
              <>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.mapLoadingText}>Obteniendo tu ubicación...</Text>
              </>
            ) : (
              <Text style={styles.mapLoadingText}>Selecciona origen o destino para continuar</Text>
            )}
          </View>
        ) : (
                     <OpenStreetMap 
             key={`map-${mapUpdateKey}`}
             latitude={mapCenter.latitude} 
             longitude={mapCenter.longitude} 
             zoom={13} 
             markers={mapMarkers}
             polylines={mapPolylines}
             style={{ flex: 1 }}
             onMapPress={async (lat: number, lng: number) => {
               const address = await openStreetMapService.getAddressFromCoords(lat, lng);
               const coords = { latitude: lat, longitude: lng };
               if (selectedField === 'origin') {
                 setOrigin(address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                 setOriginCoords(coords);
                 setSelectedField('destination');
               } else {
                 setDestination(address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                 setDestCoords(coords);
               }
             }}
           />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 16,
    backgroundColor: '#2563EB',
  },
  backButton: { 
    padding: 8,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff',
    fontFamily: 'Poppins',
  },
  placeholder: {
    width: 40,
  },
  panelContainer: { 
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mapContainer: { 
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mapLoading: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#fff',
  },
  mapLoadingText: {
    marginTop: 8, 
    color: '#6b7280',
    fontSize: 14,
    fontFamily: 'Poppins',
  },
  content: { 
    padding: 16,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1f2937', 
    marginBottom: 12,
    fontFamily: 'Poppins',
  },
  continueButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  continueButtonIcon: {
    marginRight: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  metricsPanel: { 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    gap: 8,
  },
  metricIcon: {
    width: 24,
    alignItems: 'center',
  },
  metricLabel: { 
    fontSize: 14, 
    color: '#6b7280', 
    flex: 1, 
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  metricValue: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#1f2937',
    fontFamily: 'Poppins',
  },
  rowDivider: { 
    height: 12,
  },
});
