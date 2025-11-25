import OpenStreetMap from '@/components/OpenStreetMap';
import { useAuth } from '@/contexts/AuthContext';
import { DriverService } from '@/services/driverService';
import openStreetMapService, { LocationCoords } from '@/services/openStreetMapService';
import { createRideRequest } from '@/services/rideService';
import { getUserData } from '@/services/userFirestore';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const UserRideSummaryScreen = () => {
  const router = useRouter();
  const { userId: firebaseUid } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [tripDuration, setTripDuration] = useState<number | null>(null);
  const [tripDistance, setTripDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  
  const params = useLocalSearchParams();
  
  const origin = params.origin as string || '';
  const destination = params.destination as string || '';
  const originLat = params.originLat as string || '';
  const originLng = params.originLng as string || '';
  const destLat = params.destLat as string || '';
  const destLng = params.destLng as string || '';

  // Precio: mínimo $2; +$0.5 por km después de los primeros 5 km
  const [autoPrice, setAutoPrice] = useState<number>(2);
  const [manualPriceText, setManualPriceText] = useState<string>('');

  const originCoords: LocationCoords = {
    latitude: originLat ? parseFloat(originLat) : 0,
    longitude: originLng ? parseFloat(originLng) : 0,
  };

  const destinationCoords: LocationCoords = {
    latitude: destLat ? parseFloat(destLat) : 0,
    longitude: destLng ? parseFloat(destLng) : 0,
  };

  // Validar que tenemos todos los datos necesarios
  useEffect(() => {
    if (!origin || !destination || !originLat || !originLng || !destLat || !destLng) {
      Alert.alert('Error', 'Datos incompletos para mostrar el resumen del viaje');
      router.back();
    }
  }, []);

  // Calcular distancia y duración usando OpenStreetMap
  useEffect(() => {
    const calculateRoute = async () => {
      try {
        console.log('[UserRideSummary] Calculando ruta con coordenadas:', {
          origin: originCoords,
          destination: destinationCoords
        });
        
        const route = await openStreetMapService.getRoute(originCoords, destinationCoords);
        if (route) {
          console.log('[UserRideSummary] Ruta calculada exitosamente:', {
            distance: route.totalDistance,
            duration: route.totalDuration,
            distanceFormatted: openStreetMapService.formatDistance(route.totalDistance),
            durationFormatted: openStreetMapService.formatDuration(route.totalDuration)
          });
          
          setTripDistance(route.totalDistance);
          setTripDuration(route.totalDuration);
          // ETA basado en la duración real de la ruta (tiempo estimado de llegada del conductor)
          const etaMinutes = Math.round(route.totalDuration / 60);
          setEta(etaMinutes);
          // Calcular precio estimado con distancia en km
          const km = route.totalDistance / 1000;
          const estimated = 2 + Math.max(0, km - 5) * 0.5;
          const rounded = Math.max(2, Math.round(estimated * 100) / 100);
          setAutoPrice(rounded);
          setManualPriceText(String(rounded.toFixed(2)));
        } else {
          console.warn('[UserRideSummary] No se pudo calcular la ruta, usando fallback');
          // Valores por defecto si falla el cálculo
          const fallbackDistance = openStreetMapService.calculateDistance(originCoords, destinationCoords);
          setTripDistance(fallbackDistance);
          setTripDuration(1800); // 30 minutos por defecto
          setEta(30); // ETA por defecto basado en la duración por defecto
          const km = fallbackDistance / 1000;
          const estimated = 2 + Math.max(0, km - 5) * 0.5;
          const rounded = Math.max(2, Math.round(estimated * 100) / 100);
          setAutoPrice(rounded);
          setManualPriceText(String(rounded.toFixed(2)));
        }
      } catch (error) {
        console.error('[UserRideSummary] Error calculando ruta:', error);
        // Valores por defecto si falla el cálculo
        const fallbackDistance = openStreetMapService.calculateDistance(originCoords, destinationCoords);
        setTripDistance(fallbackDistance);
        setTripDuration(1800); // 30 minutos por defecto
        setEta(30); // ETA por defecto basado en la duración por defecto
        const km = fallbackDistance / 1000;
        const estimated = 2 + Math.max(0, km - 5) * 0.5;
        const rounded = Math.max(2, Math.round(estimated * 100) / 100);
        setAutoPrice(rounded);
        setManualPriceText(String(rounded.toFixed(2)));
      }
    };

    if (originCoords.latitude !== 0 && destinationCoords.latitude !== 0) {
      calculateRoute();
    }
  }, [originCoords, destinationCoords]);

  // Consultar conductores disponibles desde Supabase
  useEffect(() => {
    const fetchDrivers = async () => {
      setLoadingDrivers(true);
      try {
        console.log('Buscando conductores disponibles...');
        const availableDrivers = await DriverService.getAvailableDrivers(
          originCoords.latitude,
          originCoords.longitude
        );
        
        if (availableDrivers.length > 0) {
          setDrivers(availableDrivers);
          setSelectedDriver(availableDrivers[0]);
        } else {
          console.log('No se encontraron conductores disponibles');
          // Si no hay conductores reales, mostrar un mensaje
          Alert.alert(
            'Sin conductores disponibles',
            'No hay conductores disponibles en tu área en este momento. Intenta más tarde.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      } catch (error) {
        console.error('Error obteniendo conductores:', error);
        Alert.alert(
          'Error',
          'No se pudieron obtener los conductores disponibles. Intenta de nuevo.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } finally {
        setLoadingDrivers(false);
      }
    };

    if (originCoords.latitude !== 0 && originCoords.longitude !== 0) {
      fetchDrivers();
    }
  }, [originCoords.latitude, originCoords.longitude]);

  // Crear marcadores para el mapa
  const mapMarkers = [];
  
  // Marcador de origen
  if (originCoords.latitude !== 0) {
    mapMarkers.push({
      id: 'origin',
      latitude: originCoords.latitude,
      longitude: originCoords.longitude,
      title: 'Origen',
      color: '#2563EB'
    });
  }
  
  // Marcador de destino
  if (destinationCoords.latitude !== 0) {
    mapMarkers.push({
      id: 'destination',
      latitude: destinationCoords.latitude,
      longitude: destinationCoords.longitude,
      title: 'Destino',
      color: '#F59E42'
    });
  }
  
  // Marcador del conductor seleccionado
  if (selectedDriver && selectedDriver.location) {
    mapMarkers.push({
      id: 'driver',
      latitude: selectedDriver.location.latitude,
      longitude: selectedDriver.location.longitude,
      title: selectedDriver.user?.display_name || selectedDriver.display_name || 'Conductor',
      color: '#10B981'
    });
  }

  const handleCallDriver = () => {
    if (!selectedDriver) return;
    
    Alert.alert(
      'Llamar al conductor',
      `¿Deseas llamar a ${selectedDriver.user?.display_name || 'el conductor'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Llamar', onPress: () => {
          // Aquí iría la lógica para hacer la llamada
          Alert.alert('Llamando...', `Conectando con ${selectedDriver.user?.phone_number || 'el conductor'}`);
        }}
      ]
    );
  };

  const handleMessageDriver = () => {
    if (!selectedDriver) return;
    
    Alert.alert(
      'Mensaje al conductor',
      'Funcionalidad de mensajería próximamente disponible',
      [{ text: 'OK' }]
    );
  };

  const handleCancelRide = () => {
    Alert.alert(
      'Cancelar viaje',
      '¿Estás seguro de que deseas cancelar este viaje?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => {
          router.back();
        }}
      ]
    );
  };

  const handleConfirmRide = async () => {
    if (!selectedDriver) {
      Alert.alert('Error', 'Debes seleccionar un conductor');
      return;
    }

    setIsLoading(true);
    try {
      if (!firebaseUid) {
        Alert.alert('Error', 'No se pudo obtener el ID del usuario.');
        setIsLoading(false);
        return;
      }
      
      const user = await getUserData(firebaseUid);
      if (!user) {
        Alert.alert('Error', 'No se pudo obtener el usuario actual.');
        setIsLoading(false);
        return;
      }

      // Determinar precio final (manual válido o estimado)
      let finalPrice = autoPrice;
      const parsed = parseFloat(manualPriceText.replace(/,/g, '.'));
      if (!isNaN(parsed)) {
        finalPrice = Math.max(2, Math.round(parsed * 100) / 100);
      }

      const rideRequest = await createRideRequest({
        userId: user.id,
        driverId: undefined, // No asignar driver inicialmente, el driver debe aceptar
        origin: {
          address: origin,
          coordinates: {
            latitude: parseFloat(originLat),
            longitude: parseFloat(originLng)
          }
        },
        destination: {
          address: destination,
          coordinates: {
            latitude: parseFloat(destLat),
            longitude: parseFloat(destLng)
          }
        },
        status: 'requested',
        price: finalPrice,
        distance: tripDistance ? Math.round(tripDistance) : undefined,
        duration: tripDuration ? Math.round(tripDuration) : undefined,
      });

      if (rideRequest) {
        Alert.alert(
          '¡Solicitud enviada!',
          'Tu solicitud de viaje ha sido enviada. Los conductores disponibles la verán y podrán aceptarla.',
          [
            { text: 'OK', onPress: () => {
              router.push('/user/user_home');
            }}
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudo crear la solicitud de viaje.');
      }
    } catch (error) {
      console.error('Error confirmando viaje:', error);
      Alert.alert('Error', 'No se pudo confirmar el viaje. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingDrivers) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Buscando conductores disponibles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resumen del Viaje</Text>
      </View>

      <View style={styles.mapContainer}>
        <OpenStreetMap
          latitude={(originCoords.latitude + destinationCoords.latitude) / 2}
          longitude={(originCoords.longitude + destinationCoords.longitude) / 2}
          zoom={12}
          markers={mapMarkers}
          style={styles.map}
        />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Información del conductor */}
        <View style={styles.driverSection}>
          <Text style={styles.sectionTitle}>Conductor</Text>
          <View style={styles.driverInfo}>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{selectedDriver?.user?.display_name}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#F59E0A" />
                <Text style={styles.rating}>{selectedDriver?.rating}</Text>
              </View>
              <Text style={styles.vehicleInfo}>
                {selectedDriver?.car_info ? 
                  `${selectedDriver.car_info.model} ${selectedDriver.car_info.year}` : 
                  'Vehículo no especificado'
                }
              </Text>
              <Text style={styles.plateNumber}>
                {selectedDriver?.car_info?.plate || 'Sin placa'}
              </Text>
            </View>
            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCallDriver}>
                <Ionicons name="call" size={20} color="#2563EB" />
                <Text style={styles.actionButtonText}>Llamar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleMessageDriver}>
                <Ionicons name="chatbubble" size={20} color="#2563EB" />
                <Text style={styles.actionButtonText}>Mensaje</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Detalles del viaje */}
        <View style={styles.tripSection}>
          <Text style={styles.sectionTitle}>Detalles del Viaje</Text>
          <View style={styles.tripDetails}>
            <View style={styles.tripPoint}>
              <Text style={styles.tripLabel}>Origen:</Text>
              <Text style={styles.tripAddress}>{origin}</Text>
            </View>
            <View style={styles.tripPoint}>
              <Text style={styles.tripLabel}>Destino:</Text>
              <Text style={styles.tripAddress}>{destination}</Text>
            </View>
          </View>
        </View>

        {/* Métricas del viaje */}
        <View style={styles.metricsSection}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Distancia</Text>
            <Text style={styles.metricValue}>
              {tripDistance ? openStreetMapService.formatDistance(tripDistance) : 'Calculando...'}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Duración</Text>
            <Text style={styles.metricValue}>
              {tripDuration ? openStreetMapService.formatDuration(tripDuration) : 'Calculando...'}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>ETA</Text>
            <Text style={styles.metricValue}>{eta ? `${eta} min` : 'Calculando...'}</Text>
          </View>
        </View>

        {/* Precio */}
        <View style={styles.priceSection}>
          <Text style={styles.sectionTitle}>Precio</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Estimado</Text>
            <Text style={styles.priceValue}>${autoPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.priceInputRow}>
            <Text style={styles.priceLabel}>Sugerir precio</Text>
            <TextInput
              style={styles.priceInput}
              keyboardType="numeric"
              value={manualPriceText}
              onChangeText={setManualPriceText}
              placeholder={autoPrice.toFixed(2)}
            />
          </View>
          <Text style={styles.priceHint}>Mínimo $2.00. Se calcula +$0.5/km después de 5 km.</Text>
        </View>

        {/* Botones de acción */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRide}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.confirmButton, isLoading && styles.disabledButton]} 
            onPress={handleConfirmRide}
            disabled={isLoading}
          >
            <Text style={styles.confirmButtonText}>
              {isLoading ? 'Confirmando...' : 'Confirmar Viaje'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  mapContainer: {
    height: 200,
  },
  map: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  driverSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  plateNumber: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  driverActions: {
    flexDirection: 'row',
  },
  actionButton: {
    alignItems: 'center',
    marginLeft: 16,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 4,
  },
  tripSection: {
    marginBottom: 20,
  },
  tripDetails: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  tripPoint: {
    marginBottom: 8,
  },
  tripLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  tripAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  metricsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  priceSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  priceInput: {
    flex: 1,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  priceHint: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 12,
  },
});

export default UserRideSummaryScreen; 