import OpenStreetMap from '@/components/OpenStreetMap';
import { useAuth } from '@/contexts/AuthContext';
import { DriverService } from '@/services/driverService';
import { LocationCoords } from '@/services/openStreetMapService';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DriverMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  color?: string;
}

export default function UserDrivers() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [markers, setMarkers] = useState<DriverMarker[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);

  useEffect(() => {
    getCurrentLocation();
    loadAvailableDrivers();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'No se pudo obtener la ubicación.');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High 
      });
      
      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      setUserLocation(userCoords);
      console.log('📍 Ubicación del usuario obtenida:', userCoords);
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
    }
  };

  const loadAvailableDrivers = async () => {
    try {
      setLoading(true);
      
      // Obtener conductores disponibles desde Supabase
      const availableDrivers = await DriverService.getAvailableDrivers(
        userLocation?.latitude || 0,
        userLocation?.longitude || 0,
        10 // Radio de 10km
      );

      // Formatear datos de conductores
      const formattedDrivers = availableDrivers.map((driver, index) => ({
        id: driver.id,
        name: driver.user?.display_name || `Conductor ${index + 1}`,
        rating: driver.rating || 4.5,
        vehicle: driver.car_info?.model || 'Vehículo no especificado',
        plate: driver.car_info?.plate || 'Sin placa',
        distance: 'Calculando...', // Se calcularía con la ubicación real
        eta: 'Calculando...', // Se calcularía con la ubicación real
        coordinate: driver.location || { latitude: 0, longitude: 0 },
        driver: driver
      }));

      setDrivers(formattedDrivers);
      
      // Configurar marcadores
      const newMarkers = formattedDrivers.map(driver => ({
        id: driver.id,
        latitude: driver.coordinate.latitude,
        longitude: driver.coordinate.longitude,
        title: 'C',
        color: 'blue'
      }));

      setMarkers(newMarkers);
      
    } catch (error) {
      console.error('Error cargando conductores:', error);
      Alert.alert('Error', 'No se pudieron cargar los conductores disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleDriverPress = (markerId: string) => {
    const driver = drivers.find(d => d.id === markerId);
    if (driver) {
      setSelectedDriver(driver);
    }
  };

  const handleSelectDriver = (driver: any) => {
    Alert.alert(
      'Seleccionar Conductor',
      `¿Deseas seleccionar a ${driver.name}?\n\nVehículo: ${driver.vehicle}\nPlaca: ${driver.plate}\nRating: ${driver.rating}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Seleccionar', onPress: () => {
          Alert.alert('Conductor seleccionado', `Has seleccionado a ${driver.name}. Redirigiendo al viaje...`);
          // Aquí iría la navegación al viaje
        }}
      ]
    );
  };

  const handleCallDriver = (driver: any) => {
    Alert.alert(
      'Llamar al conductor',
      `¿Deseas llamar a ${driver.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Llamar', onPress: () => {
          Alert.alert('Llamando...', `Conectando con ${driver.name}`);
        }}
      ]
    );
  };

  const getInitialRegion = () => {
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      };
    }
    
    // Si no hay ubicación del usuario, mostrar un estado de carga
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Mapa */}
      <View style={styles.mapContainer}>
        {getInitialRegion() ? (
          <OpenStreetMap
            latitude={getInitialRegion()!.latitude}
            longitude={getInitialRegion()!.longitude}
            zoom={15}
            markers={markers}
            onMarkerPress={handleDriverPress}
            style={styles.map}
          />
        ) : (
          <View style={styles.loadingMap}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
          </View>
        )}
      </View>

      {/* Lista de conductores */}
      <View style={styles.driversContainer}>
        <Text style={styles.title}>Conductores Disponibles</Text>
        {loading ? (
          <Text style={styles.loadingText}>Cargando conductores...</Text>
        ) : drivers.length > 0 ? (
          <FlatList
            data={drivers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.driverItem}>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{item.name}</Text>
                  <Text style={styles.driverVehicle}>{item.vehicle} - {item.plate}</Text>
                  <Text style={styles.driverRating}>⭐ {item.rating}</Text>
                </View>
                <View style={styles.driverActions}>
                  <TouchableOpacity 
                    style={styles.selectButton}
                    onPress={() => handleSelectDriver(item)}
                  >
                    <Text style={styles.selectButtonText}>Seleccionar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={() => handleCallDriver(item)}
                  >
                    <Text style={styles.callButtonText}>Llamar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        ) : (
          <Text style={styles.noDriversText}>No hay conductores disponibles en tu área</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    height: 250,
  },
  loadingMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  driversContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#6B7280',
  },
  noDriversText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#6B7280',
  },
  driverItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  driverVehicle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  driverRating: {
    fontSize: 14,
    color: '#6B7280',
  },
  driverActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  selectButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  callButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 14,
  },
}); 