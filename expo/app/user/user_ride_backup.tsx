
import OpenStreetMap from '@/components/OpenStreetMap';
import PlaceInput from '@/components/PlaceInput';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import openStreetMapService, { LocationCoords } from '@/services/openStreetMapService';
import { realtimeService } from '@/services/realtimeService';
import { supabase } from '@/services/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Constantes del mapa
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = 0.02;

export default function UserRideScreen(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const { nick } = useUser();
  const [region, setRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<'origin' | 'destination' | null>(null);
  const [originText, setOriginText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [originCoords, setOriginCoords] = useState<LocationCoords | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<LocationCoords | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [driverMarkers, setDriverMarkers] = useState<any[]>([]);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Inicializar ubicación del usuario
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'No se pudo obtener la ubicación. Se usará la ubicación por defecto.');
          setLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(userCoords);
        setRegion({
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
        setLoading(false);
        
        // Cargar conductores disponibles
        await loadAvailableDrivers(userCoords);
        
        // Conectar con sistema híbrido
        await connectToHybridSystem();
        
      } catch (error) {
        console.error('Error inicializando ubicación:', error);
        setLoading(false);
      }
    };
    initializeLocation();
  }, []);

  // Conectar con sistema híbrido
  const connectToHybridSystem = async () => {
    if (!user?.uid) return;

    const context = {
      role: 'user' as const,
      hasActiveRide: false,
      isSearching: false,
      isAvailable: false
    };

    await realtimeService.realtimeManager.connectUser(user.uid, context);
    
    // Verificar si está usando realtime
    const stats = realtimeService.realtimeManager.getStats();
    setIsRealtimeActive(stats.activeConnections > 0);
    
    console.log('[UserRide] Conectado al sistema híbrido:', stats);
  };

  // Actualizar contexto cuando el usuario empiece a buscar
  const updateUserContext = async (isSearching: boolean) => {
    if (!user?.uid) return;

    const context = {
      role: 'user' as const,
      hasActiveRide: false,
      isSearching: isSearching,
      isAvailable: false
    };

    // await realtimeService.realtimeManager.updateUserContext(user.uid, context);
    console.log('[UserRide] Contexto actualizado:', context);
  };

  // Cargar conductores disponibles
  const loadAvailableDrivers = async (userCoords: LocationCoords) => {
    try {
      console.log('🚗 Cargando conductores disponibles...');
      
      const { data: drivers, error } = await supabase
        .from('drivers')
        .select(`
          id,
          is_available,
          location,
          user:users(display_name, phone_number),
          car_info
        `)
        .eq('is_available', true)
        .eq('status', 'active');

      if (error) {
        console.error('Error cargando conductores:', error);
        return;
      }

      console.log(`✅ ${drivers.length} conductores encontrados`);
      setAvailableDrivers(drivers);

      // Crear marcadores para conductores
      const markers = drivers.map((driver: any, index: number) => ({
        id: `driver-${driver.id}`,
        latitude: driver.location?.latitude || userCoords.latitude + (Math.random() - 0.5) * 0.01,
        longitude: driver.location?.longitude || userCoords.longitude + (Math.random() - 0.5) * 0.01,
        title: `${driver.user?.display_name || `Conductor ${index + 1}`} - ${driver.car_info?.model || 'Vehículo'}`,
        color: '#2563EB',
        driver: driver
      }));

      setDriverMarkers(markers);
      
    } catch (error) {
      console.error('❌ Error cargando conductores:', error);
    }
  };





  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (user?.uid) {
        realtimeService.realtimeManager.disconnectUser(user.uid);
      }
    };
  }, [user?.uid]);

  const handleMapPress = async (latitude: number, longitude: number) => {
    if (!selectedLocation) return;

    try {
      // Obtener dirección desde coordenadas usando OpenStreetMap
      const address = await openStreetMapService.getAddressFromCoords(latitude, longitude);
      
      if (selectedLocation === 'origin') {
        setOriginCoords({ latitude, longitude });
        setOriginText(address);
        setOrigin(address);
      } else {
        setDestinationCoords({ latitude, longitude });
        setDestinationText(address);
        setDestination(address);
      }
    } catch (error) {
      console.error('[UserRide] Error obteniendo dirección del mapa:', error);
      // Fallback: usar coordenadas formateadas
      const coords = { latitude, longitude };
      const formattedCoords = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
      
      if (selectedLocation === 'origin') {
        setOriginCoords(coords);
        setOriginText(formattedCoords);
        setOrigin(formattedCoords);
      } else {
        setDestinationCoords(coords);
        setDestinationText(formattedCoords);
        setDestination(formattedCoords);
      }
    }
  };

  const handlePoiClick = async (latitude: number, longitude: number) => {
    if (!selectedLocation) return;

    const coords = { latitude, longitude };
    
    if (selectedLocation === 'origin') {
      setOriginCoords(coords);
      setOriginText(`POI en Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
    } else {
      setDestinationCoords(coords);
      setDestinationText(`POI en Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
    }
  };

  const handleDriverMarkerPress = (markerId: string) => {
    console.log('Driver marker pressed:', markerId);
  };

  // Crear marcadores del mapa
  const mapMarkers = [];

  // Agregar marcador de origen
  if (originCoords) {
    mapMarkers.push({
      id: 'origin',
      latitude: originCoords.latitude,
      longitude: originCoords.longitude,
      title: 'Origen',
      color: '#2563EB'
    });
  }

  // Agregar marcador de destino
  if (destinationCoords) {
    mapMarkers.push({
      id: 'destination',
      latitude: destinationCoords.latitude,
      longitude: destinationCoords.longitude,
      title: 'Destino',
      color: '#F59E42'
    });
  }

  // Agregar marcadores de conductores disponibles
  mapMarkers.push(...driverMarkers);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text>Cargando mapa...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {region ? (
          <OpenStreetMap
            latitude={region.latitude}
            longitude={region.longitude}
            zoom={15}
            markers={mapMarkers}
            onMapPress={handleMapPress}
            onMarkerPress={(markerId) => {
              if (markerId === 'user') {
                // Centrar en ubicación del usuario
                if (userLocation) {
                  setRegion({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: LATITUDE_DELTA,
                    longitudeDelta: LONGITUDE_DELTA,
                  });
                }
              } else if (markerId.startsWith('driver-')) {
                // Manejar clic en conductor
                handleDriverMarkerPress(markerId);
              }
            }}
            style={styles.map}
            showUserLocation={true}
            userLocation={userLocation || undefined}
          />
        ) : (
          <View style={styles.loadingMap}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
          </View>
        )}

        {/* Botón Flotante */}
        <TouchableOpacity
          style={[styles.floatingButton, isExpanded && styles.floatingButtonExpanded]}
          onPress={() => {
            setIsExpanded(!isExpanded);
            // Actualizar contexto cuando empiece a buscar
            if (!isExpanded) {
              updateUserContext(true);
            }
          }}
        >
          {!isExpanded ? (
            <MaterialIcons 
              name="local-taxi" 
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
          <Text style={styles.title}>Solicitar Taxi</Text>
          
          {/* Indicador de conductores disponibles */}
          <View style={styles.driversIndicator}>
            <MaterialIcons name="local-taxi" size={16} color="#2563EB" />
            <Text style={styles.driversText}>
              {availableDrivers.length} conductor{availableDrivers.length !== 1 ? 'es' : ''} disponible{availableDrivers.length !== 1 ? 's' : ''} en tu área
            </Text>
            {isRealtimeActive && (
              <View style={styles.realtimeIndicator}>
                <View style={styles.realtimeDot} />
                <Text style={styles.realtimeText}>En tiempo real</Text>
              </View>
            )}
          </View>
          
          {/* Botones de selección */}
          <View style={styles.selectionButtons}>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                selectedLocation === 'origin' && styles.selectionButtonActive
              ]}
              onPress={() => setSelectedLocation('origin')}
            >
              <MaterialIcons 
                name="my-location" 
                size={20} 
                color={selectedLocation === 'origin' ? '#fff' : '#2563EB'} 
              />
              <Text style={[
                styles.selectionButtonText,
                selectedLocation === 'origin' && styles.selectionButtonTextActive
              ]}>
                Origen
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                selectedLocation === 'destination' && styles.selectionButtonActive
              ]}
              onPress={() => setSelectedLocation('destination')}
            >
              <MaterialIcons 
                name="place" 
                size={20} 
                color={selectedLocation === 'destination' ? '#fff' : '#F59E42'} 
              />
              <Text style={[
                styles.selectionButtonText,
                selectedLocation === 'destination' && styles.selectionButtonTextActive
              ]}>
                Destino
              </Text>
            </TouchableOpacity>
          </View>

          {/* Indicador de selección */}
          {selectedLocation && (
            <View style={styles.selectionIndicator}>
              <Text style={styles.selectionIndicatorText}>
                Selecciona {selectedLocation === 'origin' ? 'origen' : 'destino'} tocando el mapa o escribiendo abajo
              </Text>
            </View>
          )}

          <View style={styles.inputsContainer}>
            <PlaceInput
              placeholder="Punto de inicio"
              onPress={(data) => {
                console.log('[UserRide] Origen seleccionado:', data);
                setOrigin(data.description);
                setOriginText(data.description);
                if (data.coordinates) {
                  console.log('[UserRide] Coordenadas de origen:', data.coordinates);
                  setOriginCoords(data.coordinates);
                } else {
                  console.warn('[UserRide] No se obtuvieron coordenadas para el origen');
                  setOriginCoords(null);
                }
              }}
              value={originText}
              onChangeText={setOriginText}
              textInputProps={{
                onFocus: () => setSelectedLocation('origin'),
              }}
              styles={originAutocompleteStyles}
              userLocation={userLocation || undefined}
            />
            
            <PlaceInput
              placeholder="Destino"
              onPress={(data) => {
                console.log('[UserRide] Destino seleccionado:', data);
                setDestination(data.description);
                setDestinationText(data.description);
                if (data.coordinates) {
                  console.log('[UserRide] Coordenadas de destino:', data.coordinates);
                  setDestinationCoords(data.coordinates);
                } else {
                  console.warn('[UserRide] No se obtuvieron coordenadas para el destino');
                  setDestinationCoords(null);
                }
              }}
              value={destinationText}
              onChangeText={setDestinationText}
              textInputProps={{
                onFocus: () => setSelectedLocation('destination'),
              }}
              styles={destinationAutocompleteStyles}
              userLocation={userLocation || undefined}
            />
          </View>

          {/* Estimación preliminar de costo/duración (si hay ambas coordenadas) */}
          {originCoords && destinationCoords && (
            <TouchableOpacity
              style={styles.estimationButton}
              onPress={async () => {
                try {
                  const route = await openStreetMapService.getRoute(originCoords, destinationCoords);
                  if (route) {
                    const km = route.totalDistance / 1000;
                    const estimated = 2 + Math.max(0, km - 5) * 0.5;
                    const rounded = Math.max(2, Math.round(estimated * 100) / 100);
                    Alert.alert('Estimación', `Distancia: ${km.toFixed(1)} km\nDuración: ${Math.round(route.totalDuration/60)} min\nPrecio estimado: $${rounded.toFixed(2)}`);
                  }
                } catch {}
              }}
            >
              <Text style={styles.estimationButtonText}>Ver estimación</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              console.log('[UserRide] Validando datos para solicitar taxi...');
              console.log('[UserRide] Origen:', { text: originText, coords: originCoords });
              console.log('[UserRide] Destino:', { text: destinationText, coords: destinationCoords });
              
              if (!originText || !destinationText) {
                Alert.alert('Faltan datos', 'Debes seleccionar origen y destino');
                return;
              }
              
              if (!originCoords || !destinationCoords) {
                // Verificar si las coordenadas están en proceso de obtención
                if (originText && destinationText) {
                  Alert.alert(
                    'Procesando ubicaciones...', 
                    'Las coordenadas están siendo calculadas. Intenta nuevamente en unos segundos.',
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'Dirección no válida', 
                    'No se pudo encontrar la ubicación exacta. Intenta:\n\n' +
                    '• Escribir una dirección más específica\n' +
                    '• Seleccionar una sugerencia de la lista\n' +
                    '• Tocar directamente en el mapa para seleccionar los puntos'
                  );
                }
                return;
              }
              
              console.log('[UserRide] Datos válidos, navegando a resumen...');
              
              // Navegar a la pantalla de resumen del viaje
              router.push({
                pathname: '/user/user_ride_summary',
                params: {
                  origin: originText,
                  destination: destinationText,
                  originLat: originCoords.latitude.toString(),
                  originLng: originCoords.longitude.toString(),
                  destLat: destinationCoords.latitude.toString(),
                  destLng: destinationCoords.longitude.toString(),
                }
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Solicitar Taxi</Text>
          </TouchableOpacity>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const autocompleteStyles = {
  container: {
    flex: 0,
    marginBottom: 10,
  },
  textInput: {
    height: 40,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  listView: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
};

const originAutocompleteStyles = {
  container: {
    flex: 0,
    marginBottom: 15, // Más espacio para evitar solapamiento
    zIndex: 100, // Z-index muy alto para el contenedor del origen
  },
  textInput: {
    height: 40,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  listView: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 8,
    zIndex: 100, // Z-index muy alto para sugerencias de origen
  },
  suggestionsContainer: {
    zIndex: 100,
    elevation: 8,
  },
};

const destinationAutocompleteStyles = {
  container: {
    flex: 0,
    marginBottom: 10,
    zIndex: 50, // Z-index menor que origen
  },
  textInput: {
    height: 40,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  listView: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 4,
    zIndex: 50, // Z-index menor que origen
  },
  suggestionsContainer: {
    zIndex: 50,
    elevation: 4,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingMap: {
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
  sheetContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1F2937',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  estimationButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  estimationButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  selectionButton: {
    padding: 10,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  selectionButtonActive: {
    backgroundColor: '#2563EB',
  },
  selectionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    marginLeft: 5,
  },
  selectionButtonTextActive: {
    color: '#fff',
  },
  selectionIndicator: {
    backgroundColor: '#2563EB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectionIndicatorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  driversIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#E0F2F7',
    borderRadius: 8,
  },
  driversText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: '#10B981',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 5,
  },
  realtimeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    width: 320,
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
  inputsContainer: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 10,
  },

});
