import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, BackHandler, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/services/supabaseClient';
import ChatModal from '@/components/ChatModal';
import { chatService } from '@/services/chatService';
import { cancelRideRequest as cancelRideRequestService } from '@/services/rideService';

export default function UserBuscandoConductor(): React.JSX.Element {
  const router = useRouter();
  const { rideId, price, origin, destination, paymentMethod } = useLocalSearchParams();
  const [status, setStatus] = useState<string>('requested');
  const [driver, setDriver] = useState<any>(null);
  const [etaToUser, setEtaToUser] = useState<string>('');
  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [driverCoords, setDriverCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Función para cancelar la solicitud de viaje
  const cancelRideRequest = async () => {
    if (!rideId || isCancelling) return;
    
    try {
      setIsCancelling(true);
      console.log('[BuscandoConductor] Cancelando solicitud de viaje:', rideId);
      
      // Usar el servicio para cancelar la solicitud
      await cancelRideRequestService(rideId as string);
      
      console.log('[BuscandoConductor] Solicitud cancelada exitosamente');
      
      // Navegar de vuelta a la pantalla de resumen
      router.back();
      
    } catch (error) {
      console.error('[BuscandoConductor] Error inesperado cancelando viaje:', error);
      Alert.alert('Error', 'Ocurrió un error al cancelar la solicitud');
    } finally {
      setIsCancelling(false);
    }
  };

  // Manejar botón de retroceso del dispositivo
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'requested') {
        // Si aún no ha sido aceptado, cancelar automáticamente
        cancelRideRequest();
        return true; // Prevenir navegación por defecto
      }
      return false; // Permitir navegación normal
    });

    return () => backHandler.remove();
  }, [status, rideId]);

  const fetchDriverInfo = async (drvId: string) => {
    try {
      let { data } = await supabase
        .from('drivers')
        .select('*, users:user_id!inner(display_name, phone_number, photo_url)')
        .eq('id', drvId)
        .maybeSingle();

      // Fallback: algunos registros antiguos guardaron users.id en driver_id
      if (!data) {
        const alt = await supabase
          .from('drivers')
          .select('*, users:user_id!inner(display_name, phone_number, photo_url)')
          .eq('user_id', drvId)
          .maybeSingle();
        data = alt.data as any;
      }

      if (data) {
        const userInfo: any = (data as any).users || {};
        const carInfo: any = (data as any).car_info || (data as any).vehicle_info || {};
        const make = carInfo.make || '';
        const model = carInfo.model || carInfo.vehicle_model || '';
        const year = carInfo.year || '';
        const plate = carInfo.plate || carInfo.placa || carInfo.license_plate || '';
        const vehiclePhoto = carInfo.photo || null;
        const carParts = [make, model, year].filter(Boolean);
        setDriver({
          id: (data as any).id,
          name: userInfo.display_name || 'Conductor',
          phone: userInfo.phone_number || '',
          photo: userInfo.photo_url || null,
          car: carParts.length > 0 ? carParts.join(' ') : '',
          plate,
          vehiclePhoto,
          rating: (data as any).rating || 0,
        });
      }
    } catch {}
  };

  useEffect(() => {
    if (!rideId) return;
    
    // El chat se activará cuando se abra el modal
    
    const channel = supabase
      .channel(`ride_${rideId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests', filter: `id=eq.${rideId}` }, async (payload: any) => {
        const row = (payload as any).new || (payload as any).old;
        if (row?.status) setStatus(row.status);
        if (row?.origin?.coordinates) setPickupCoords(row.origin.coordinates);
        if (row?.driver_location) setDriverCoords(row.driver_location);
        // ETA real (driver -> usuario)
        if (row?.driver_location && row?.origin?.coordinates) {
          try {
            const osm = (await import('@/services/openStreetMapService')).default;
            const route = await osm.getRoute(row.driver_location, row.origin.coordinates, 'driving');
            if (route?.totalDuration) {
              setEtaToUser(`${Math.round(route.totalDuration / 60)} min`);
            }
          } catch {}
        }
        if (row?.driver_id) fetchDriverInfo(row.driver_id);
      })
      .subscribe();

    // Inicializar estado actual del ride por si ya estaba aceptado antes de suscribirse
    (async () => {
      try {
        const { data } = await supabase
          .from('ride_requests')
          .select('status, driver_id, origin, driver_location')
          .eq('id', rideId)
          .maybeSingle();
        if (data?.status) setStatus(data.status);
        if (data?.driver_id) fetchDriverInfo(data.driver_id);
        if (data?.origin?.coordinates) setPickupCoords(data.origin.coordinates);
        if (data?.driver_location) setDriverCoords(data.driver_location);
        if (data?.driver_location && data?.origin?.coordinates) {
          try {
            const osm = (await import('@/services/openStreetMapService')).default;
            const route = await osm.getRoute(data.driver_location, data.origin.coordinates, 'driving');
            if (route?.totalDuration) setEtaToUser(`${Math.round(route.totalDuration / 60)} min`);
          } catch {}
        }
      } catch {}
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  // Bloquear navegación hacia atrás si el viaje ya fue aceptado
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Si el chat está abierto, permitir que se cierre normalmente
      if (showChat) {
        console.log('[BuscandoConductor] 🔙 BackHandler: Chat abierto, permitiendo cierre normal');
        return false; // Permitir que el modal maneje el back
      }
      
      if (status === 'accepted' || status === 'in_progress' || status === 'completed') {
        // Redirigir a home en lugar de permitir volver al resumen
        console.log('[BuscandoConductor] 🔙 BackHandler: Redirigiendo a home');
        router.replace('/user/user_home');
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [status, router, showChat]);

  const handleCallDriver = () => {
    if (driver?.phone) {
      Linking.openURL(`tel:${driver.phone}`);
    } else {
      Alert.alert('Error', 'Número de teléfono no disponible');
    }
  };

  const handleMessageDriver = () => {
    console.log('🚀🚀🚀 [BuscandoConductor] 🚀 Abriendo chat, status:', status);
    if (status === 'accepted') {
      console.log('✅✅✅ [BuscandoConductor] ✅ Status aceptado, abriendo chat');
      setShowChat(true);
      console.log('🎯🎯🎯 [BuscandoConductor] showChat establecido a true');
    } else {
      console.log('❌❌❌ [BuscandoConductor] ❌ Status no aceptado:', status);
      Alert.alert('Chat no disponible', 'El chat solo está disponible cuando el conductor está en camino');
    }
  };

  const handleViewActiveRide = () => {
    router.push({
      pathname: '/user/user_active_ride',
      params: { rideId, price, origin, destination }
    });
  };

  console.log('🎭🎭🎭 [BuscandoConductor] 🔄 Renderizando, showChat:', showChat, 'status:', status);
  
  if (status === 'accepted' && driver) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/user/user_home')} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Conductor en camino</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Información del conductor */}
          <View style={styles.driverCard}>
            <View style={styles.driverInfo}>
              <View style={styles.driverPhotoContainer}>
                {driver.photo ? (
                  <Image source={{ uri: driver.photo }} style={styles.driverPhoto} />
                ) : (
                  <View style={styles.driverPhotoPlaceholder}>
                    <MaterialIcons name="person" size={32} color="#9CA3AF" />
                  </View>
                )}
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <Text style={styles.driverCar}>{driver.car}</Text>
                <Text style={styles.driverPlate}>{driver.plate}</Text>
                {etaToUser && (
                  <View style={styles.etaContainer}>
                    <MaterialIcons name="access-time" size={16} color="#10b981" />
                    <Text style={styles.etaText}>Llegará en {etaToUser}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Foto del vehículo */}
            {driver.vehiclePhoto && (
              <View style={styles.vehiclePhotoContainer}>
                <Image source={{ uri: driver.vehiclePhoto }} style={styles.vehiclePhoto} />
              </View>
            )}

            {/* Botones de acción */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCallDriver}>
                <View style={styles.actionButtonIcon}>
                  <MaterialIcons name="phone" size={24} color="#2563EB" />
                </View>
                <Text style={styles.actionButtonText}>Llamar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={handleMessageDriver}>
                <View style={styles.actionButtonIcon}>
                  <MaterialIcons name="chat" size={24} color="#10B981" />
                </View>
                <Text style={styles.actionButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>

            {/* Botón para ver viaje activo */}
            <TouchableOpacity style={styles.viewRideButton} onPress={handleViewActiveRide}>
              <Text style={styles.viewRideButtonText}>Ver viaje activo</Text>
              <MaterialIcons name="chevron-right" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Modal */}
        <ChatModal
          visible={showChat}
          rideId={rideId as string}
          userType="user"
          otherParticipantName={driver.name}
          onClose={() => {
            console.log('🚪🚪🚪 [BuscandoConductor] 🚪 Cerrando chat modal');
            setShowChat(false);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={cancelRideRequest} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buscando conductor</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.searchingContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.searchingTitle}>Buscando conductor cercano...</Text>
            <Text style={styles.searchingSubtitle}>Esto puede tomar unos momentos</Text>
          </View>
        </View>

        <View style={styles.rideInfo}>
          <Text style={styles.rideInfoTitle}>Detalles del viaje</Text>
          <View style={styles.rideInfoRow}>
            <View style={styles.rideInfoIcon}>
              <MaterialIcons name="my-location" size={16} color="#2563EB" />
            </View>
            <Text style={styles.rideInfoText}>{origin}</Text>
          </View>
          <View style={styles.rideInfoRow}>
            <View style={styles.rideInfoIcon}>
              <MaterialIcons name="location-on" size={16} color="#DC2626" />
            </View>
            <Text style={styles.rideInfoText}>{destination}</Text>
          </View>
          <View style={styles.rideInfoRow}>
            <View style={styles.rideInfoIcon}>
              <MaterialIcons name="attach-money" size={16} color="#10B981" />
            </View>
            <Text style={styles.rideInfoText}>${price}</Text>
          </View>
          <View style={styles.rideInfoRow}>
            <View style={styles.rideInfoIcon}>
              <MaterialIcons 
                name={paymentMethod === 'card' ? 'credit-card' : 'money'} 
                size={16} 
                color={paymentMethod === 'card' ? '#8B5CF6' : '#10B981'} 
              />
            </View>
            <Text style={styles.rideInfoText}>
              Pago: {paymentMethod === 'card' ? 'Tarjeta' : 'Efectivo'}
            </Text>
          </View>
        </View>

        {/* Botón de cancelación */}
        <TouchableOpacity 
          style={[styles.cancelButton, isCancelling && styles.cancelButtonDisabled]} 
          onPress={cancelRideRequest}
          disabled={isCancelling}
        >
          {isCancelling ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="close" size={20} color="#fff" />
          )}
          <Text style={styles.cancelButtonText}>
            {isCancelling ? 'Cancelando...' : 'Cancelar solicitud'}
          </Text>
        </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 16,
  },
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  searchingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 8,
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  searchingSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  rideInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rideInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    fontFamily: 'Poppins',
  },
  rideInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideInfoIcon: {
    width: 24,
    alignItems: 'center',
  },
  rideInfoText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    fontFamily: 'Poppins',
  },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  driverPhotoContainer: {
    marginRight: 16,
  },
  driverPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  driverPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  driverCar: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
    fontFamily: 'Poppins',
  },
  driverPlate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  etaText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
  vehiclePhotoContainer: {
    marginBottom: 20,
  },
  vehiclePhoto: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    minWidth: 80,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionButtonIcon: {
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Poppins',
    fontWeight: '500',
  },
  viewRideButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  viewRideButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    fontFamily: 'Poppins',
  },
  cancelButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cancelButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
});
