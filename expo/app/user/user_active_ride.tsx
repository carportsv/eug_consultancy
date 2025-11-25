import ActiveRideMap from '@/components/ActiveRideMap';
import ChatModal from '@/components/ChatModal';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useRideTracking } from '@/hooks/useRideTracking';
import { useRouteDirections } from '@/hooks/useRouteDirections';
import { realtimeService } from '@/services/realtimeService';
import { supabase } from '@/services/supabaseClient';
import { chatService } from '@/services/chatService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  BackHandler,
  Image
} from 'react-native';

export default function UserActiveRide() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rideId = params.rideId as string | undefined;
  const user = useUser();
  const { user: authUser } = useAuth();

  // Estados para la información del viaje
  const [rideStatus, setRideStatus] = useState<'searching' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'>('searching');
  const [isLoadingRide, setIsLoadingRide] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [driverInfo, setDriverInfo] = useState({
    name: '',
    car: '',
    plate: '',
    phone: '',
    rating: 0,
    photo: null,
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    vehiclePhoto: null,
  });
  const [rideInfo, setRideInfo] = useState<{
    origin: string;
    destination: string;
    distance: string;
    duration: string;
    fare: string;
    eta: string;
    etaType?: 'user_waiting_driver' | 'driver_to_user' | 'driver_to_destination';
    etaDescription: string;
    driverToUserETA: string;
    userToDestinationETA: string;
    driverToUserDistance: string;
    userToDestinationDistance: string;
  }>({
    origin: '',
    destination: '',
    distance: '',
    duration: '',
    fare: '',
    eta: '',
    etaType: 'user_waiting_driver',
    etaDescription: 'Tiempo de llegada',
    driverToUserETA: '',
    userToDestinationETA: '',
    driverToUserDistance: '',
    userToDestinationDistance: '',
  });

  // Coordenadas para el mapa
  const [originCoords, setOriginCoords] = useState({ latitude: 0, longitude: 0 });
  const [destinationCoords, setDestinationCoords] = useState({ latitude: 0, longitude: 0 });
  const [driverCoords, setDriverCoords] = useState({ latitude: 0, longitude: 0 });
  const driverLocSubRef = useRef<any>(null);

  // Usar el hook de tracking compartido
  const { trackingData, currentLocation, isLoading, error } = useRideTracking({
    rideId: rideId || '',
    userId: authUser?.uid,
    isDriver: false,
    updateInterval: 30000
  });

  // Actualizar coordenadas del conductor cuando cambie la ubicación actual
  useEffect(() => {
    if (currentLocation && rideStatus === 'in_progress') {
      // Solo actualizar si el viaje está en progreso
      console.log('[UserActiveRide] Ubicación actual del usuario actualizada:', currentLocation);
    }
  }, [currentLocation?.latitude, currentLocation?.longitude, rideStatus]);

  // Loggear cuando las coordenadas del conductor cambien
  useEffect(() => {
    if (driverCoords.latitude !== 0 && driverCoords.longitude !== 0) {
      console.log('[UserActiveRide] Coordenadas del conductor actualizadas:', driverCoords);
    }
  }, [driverCoords.latitude, driverCoords.longitude]);

  // Estado para mostrar notificaciones
  const [showRideStartedNotification, setShowRideStartedNotification] = useState(false);

  // Calcular dos rutas separadas para el usuario
  // Usar última ubicación conocida del conductor (de realtime o DB)
  const effectiveDriverOrigin = useMemo(() => {
    return (driverCoords && driverCoords.latitude !== 0 && driverCoords.longitude !== 0)
      ? driverCoords
      : (trackingData?.driverLocation || driverCoords);
  }, [driverCoords.latitude, driverCoords.longitude, trackingData?.driverLocation?.latitude, trackingData?.driverLocation?.longitude]);

  const routeToUser = useMemo(() => {
    // Ruta 1: Conductor → Usuario (pickup)
    return {
      origin: effectiveDriverOrigin,
      destination: originCoords,
      waypoints: []
    };
  }, [effectiveDriverOrigin, originCoords]);

  const routeToDestination = useMemo(() => {
    // Ruta 2: Usuario (pickup) → Destino final
    return {
      origin: originCoords,
      destination: destinationCoords,
      waypoints: []
    };
  }, [originCoords, destinationCoords]);

  // Validar que las coordenadas sean válidas
  const hasUserRoute = useMemo(() => {
    return (
      originCoords.latitude !== 0 && originCoords.longitude !== 0 &&
      destinationCoords.latitude !== 0 && destinationCoords.longitude !== 0
    );
  }, [originCoords, destinationCoords]);

  const hasDriverRoute = useMemo(() => {
    return (
      driverCoords.latitude !== 0 && driverCoords.longitude !== 0 &&
      originCoords.latitude !== 0 && originCoords.longitude !== 0
    );
  }, [driverCoords, originCoords]);

  // Usar el hook de direcciones para la ruta del conductor al usuario (misma lógica que en driver)
  const {
    routeData: routeToUserData,
    getRouteCoordinates: getRouteToUserCoordinates
  } = useRouteDirections({
    origin: routeToUser.origin,
    destination: routeToUser.destination,
    waypoints: routeToUser.waypoints,
    mode: 'driving'
  });

  // Usar el hook de direcciones para la ruta del usuario al destino (misma lógica que en driver)
  const {
    routeData: routeToDestinationData,
    getRouteCoordinates: getRouteToDestinationCoordinates
  } = useRouteDirections({
    origin: routeToDestination.origin,
    destination: routeToDestination.destination,
    waypoints: routeToDestination.waypoints,
    mode: 'driving'
  });

  const bottomSheetRef = useRef<any>(null);
  const snapPoints = useMemo(() => ['20%', '60%'], []);
  const [modalVisible, setModalVisible] = useState(false);
  // Forzar que el botón atrás (y hardware back) lleve a Home en este flujo
  useEffect(() => {
    const goHome = () => {
      router.replace('/user/user_home');
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => handler.remove();
  }, []);

  // Memoizar las coordenadas de las rutas para evitar recálculos innecesarios
  const routeToUserCoords = useMemo(() => {
    const rawCoords = getRouteToUserCoordinates();
    const coords = rawCoords.map((coord: any) => ({ latitude: coord[1], longitude: coord[0] }));
    return coords;
  }, [getRouteToUserCoordinates, routeToUserData]); // Agregar routeToUserData como dependencia

  const routeToDestinationCoords = useMemo(() => {
    const coords = getRouteToDestinationCoordinates().map((coord: any) => ({ latitude: coord[1], longitude: coord[0] }));
    return coords;
  }, [getRouteToDestinationCoordinates, routeToDestinationData]); // Agregar routeToDestinationData como dependencia

  // Calcular ETAs y distancias cuando las rutas estén disponibles
  useEffect(() => {
    const calculateETAsAndDistances = async () => {
      try {
        // Conductor → Usuario
        if (routeToUserData) {
          if (routeToUserData.duration) {
            const driverToUserMinutes = Math.round(routeToUserData.duration / 60);
            setRideInfo(prev => ({ ...prev, driverToUserETA: `${driverToUserMinutes} min` }));
          }
          if (routeToUserData.distance) {
            const driverToUserKm = (routeToUserData.distance / 1000).toFixed(1);
            setRideInfo(prev => ({ ...prev, driverToUserDistance: `${driverToUserKm} km` }));
          }
        }

        // Usuario → Destino
        if (routeToDestinationData) {
          if (routeToDestinationData.duration) {
            const userToDestinationMinutes = Math.round(routeToDestinationData.duration / 60);
            setRideInfo(prev => ({ ...prev, userToDestinationETA: `${userToDestinationMinutes} min` }));
          }
          if (routeToDestinationData.distance) {
            const userToDestinationKm = (routeToDestinationData.distance / 1000).toFixed(1);
            setRideInfo(prev => ({ ...prev, userToDestinationDistance: `${userToDestinationKm} km` }));
          }
        }
      } catch (error) {
        console.error('[UserActiveRide] Error al calcular ETAs y distancias:', error);
      }
    };

    calculateETAsAndDistances();
  }, [routeToUserData, routeToDestinationData]);

  useEffect(() => {
    if (!rideId) return;
    
    // Cargar datos iniciales del viaje
    const loadRideData = async () => {
      try {
        const { data: rideData, error } = await supabase
          .from('ride_requests')
          .select('*')
          .eq('id', rideId)
          .single();

        if (error) {
          console.error('Error al cargar datos del viaje:', error);
          return;
        }

        if (rideData) {
          console.log('[UserActiveRide] Datos del viaje recibidos:', rideData);
          
          // Actualizar estado del viaje
          setRideStatus(rideData.status as any);
          
          // Verificar si el viaje acaba de iniciarse
          if (rideData.status === 'in_progress' && rideData.startedAt) {
            const startTime = new Date(rideData.startedAt);
            const now = new Date();
            const timeDiff = now.getTime() - startTime.getTime();
            
            // Si el viaje se inició en los últimos 30 segundos, mostrar notificación
            if (timeDiff < 30000) {
              setShowRideStartedNotification(true);
              setTimeout(() => setShowRideStartedNotification(false), 5000);
            }
          }
          
          // Configurar coordenadas
          if (rideData.origin?.coordinates) {
            setOriginCoords(rideData.origin.coordinates);
          }
          if (rideData.destination?.coordinates) {
            setDestinationCoords(rideData.destination.coordinates);
          }
          
          // Configurar información del viaje
          setRideInfo(prev => ({
            ...prev,
            origin: rideData.origin?.address || '',
            destination: rideData.destination?.address || '',
            distance: rideData.distance ? `${(rideData.distance / 1000).toFixed(1)} km` : '',
            duration: rideData.duration ? `${Math.round(rideData.duration / 60)} min` : '',
              fare: rideData.price ? `$${rideData.price.toFixed(2)}` : 'Calculando...',
          }));

          // Cargar información del conductor si existe (usar snake_case)
          if (rideData.driver_id) {
            await loadDriverInfo(rideData.driver_id);

            // Suscribirse a actualizaciones de ubicación del conductor en tabla drivers
            if (!driverLocSubRef.current) {
              const channel = supabase
                .channel(`driver_${rideData.driver_id}`)
                .on(
                  'postgres_changes',
                  { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `id=eq.${rideData.driver_id}` },
                  (payload: any) => {
                    const newLoc = payload?.new?.location;
                    if (newLoc && newLoc.latitude && newLoc.longitude) {
                      console.log('[UserActiveRide] driver.location realtime:', newLoc);
                      setDriverCoords(newLoc);
                    }
                  }
                )
                .subscribe();
              driverLocSubRef.current = channel;
            }
          }
          
          // Cargar ubicación del conductor si está disponible; si no, intentar desde drivers.location
          if (rideData.driver_location) {
            console.log('[UserActiveRide] Ubicación del conductor en datos del viaje:', rideData.driver_location);
            setDriverCoords(rideData.driver_location);
          } else if (rideData.driver_id) {
            const { data: driverLocRow, error: driverLocErr } = await supabase
              .from('drivers')
              .select('location')
              .eq('id', rideData.driver_id)
              .single();
            if (!driverLocErr && driverLocRow?.location) {
              console.log('[UserActiveRide] Ubicación del conductor desde drivers.location:', driverLocRow.location);
              setDriverCoords(driverLocRow.location);
            }
          }
        }
        
        setIsLoadingRide(false);
      } catch (error) {
        console.error('Error al cargar datos del viaje:', error);
        setIsLoadingRide(false);
      }
    };

    // Suscribirse a actualizaciones en tiempo real
    const subscription = realtimeService.subscribeToRideUpdates(rideId, (update) => {
      console.log('[UserActiveRide] Actualización de viaje recibida:', update);
      
      setRideStatus(update.status as any);

      // Asegurar cargar info del conductor usando snake_case
      if (update.driver_id && !driverInfo.name) {
        loadDriverInfo(update.driver_id);
      }
      
      // Actualizar ubicación del conductor en tiempo real (preferir driver_location; fallback location)
      if (update.driver_location) {
        console.log('[UserActiveRide] Actualizando ubicación del conductor desde update.driver_location:', update.driver_location);
        setDriverCoords(update.driver_location);
      } else if (update.location) {
        console.log('[UserActiveRide] Actualizando ubicación del conductor desde update.location:', update.location);
        setDriverCoords(update.location);
      }
      
      // Actualizar ETA general si está disponible
      if (update.eta !== undefined && update.eta !== null) {
        const etaMinutes = Math.round(update.eta / 60);
        setRideInfo(prev => ({
          ...prev,
          eta: `${etaMinutes} min`,
        }));
      }
    });

    loadRideData();

    return () => {
      subscription && realtimeService.unsubscribe(`ride_${rideId}`);
      if (driverLocSubRef.current) {
        supabase.removeChannel(driverLocSubRef.current);
        driverLocSubRef.current = null;
      }
    };
  }, [rideId]);

  // Función para cargar información del conductor
  const loadDriverInfo = async (driverId: string) => {
    try {
      const { data: driverData, error } = await supabase
        .from('drivers')
        .select(`
          *,
          users:user_id (
            display_name,
            phone_number,
            photo_url
          )
        `)
        .eq('id', driverId)
        .single();

      if (error) {
        console.error('Error al cargar información del conductor:', error);
        return;
      }

      if (driverData) {
        const make = driverData.car_info?.make || '';
        const model = driverData.car_info?.model || '';
        const year = driverData.car_info?.year || '';
        const carParts = [make, model, year].filter(Boolean);
        
        setDriverInfo({
          name: driverData.users?.display_name || 'Conductor',
          car: carParts.length > 0 ? carParts.join(' ') : '',
          plate: driverData.car_info?.plate || '',
          phone: driverData.users?.phone_number || '',
          rating: driverData.rating || 0,
          photo: driverData.users?.photo_url,
          vehicleMake: make,
          vehicleModel: model,
          vehicleColor: driverData.car_info?.color || '',
          vehiclePhoto: driverData.car_info?.photo || null,
        });
      }
    } catch (error) {
      console.error('Error al cargar información del conductor:', error);
    }
  };

  // Loggear coordenadas para debuggear el mapa
  useEffect(() => {
    console.log('[UserActiveRide] Coordenadas actualizadas:', {
      origin: originCoords,
      destination: destinationCoords,
      driverLocation: driverCoords,
      userLocation: currentLocation,
      rideStatus,
      showDriverRoute: rideStatus === 'accepted' || rideStatus === 'in_progress',
      showUserRoute: rideStatus === 'in_progress',
      hasDriverRoute,
      hasUserRoute
    });
  }, [originCoords, destinationCoords, driverCoords, currentLocation, rideStatus, hasDriverRoute, hasUserRoute]);

  // Cargar ubicación del conductor desde la base de datos
  useEffect(() => {
    const loadDriverLocation = async () => {
      if (!rideId) return;
      
      // El chat se activará cuando se abra el modal
      
      try {
        const { data: rideData, error } = await supabase
          .from('ride_requests')
          .select('driver_location')
          .eq('id', rideId)
          .single();
        
        if (error) {
          console.error('[UserActiveRide] Error al cargar ubicación del conductor:', error);
          return;
        }
        
        if (rideData?.driver_location) {
          console.log('[UserActiveRide] Ubicación del conductor cargada desde DB:', rideData.driver_location);
          setDriverCoords(rideData.driver_location);
        }
      } catch (error) {
        console.error('[UserActiveRide] Error al cargar ubicación del conductor:', error);
      }
    };
    
    loadDriverLocation();
  }, [rideId]);

  // Fallback: mientras no tengamos driverCoords, reintentar leer driver_location cada 5s (máx 1 minuto)
  useEffect(() => {
    if (!rideId) return;
    const missingDriver = !driverCoords || driverCoords.latitude === 0 || driverCoords.longitude === 0;
    if (!missingDriver || !(rideStatus === 'accepted' || rideStatus === 'in_progress')) return;

    let attempts = 0;
    const maxAttempts = 12; // 1 minuto
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const { data } = await supabase
          .from('ride_requests')
          .select('driver_location')
          .eq('id', rideId)
          .single();
        if (data?.driver_location && data.driver_location.latitude && data.driver_location.longitude) {
          console.log('[UserActiveRide] Fallback: driver_location obtenido por polling:', data.driver_location);
          setDriverCoords(data.driver_location);
          clearInterval(interval);
        }
      } catch {}
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 5000);

    return () => clearInterval(interval);
  }, [rideId, driverCoords.latitude, driverCoords.longitude, rideStatus]);

  const handleCancelRide = async () => {
    Alert.alert(
      'Cancelar Viaje',
      '¿Estás seguro de que quieres cancelar este viaje?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (rideId) {
                const { error } = await supabase
                  .from('ride_requests')
                  .update({ status: 'cancelled', driver_id: null, updated_at: new Date().toISOString() })
                  .eq('id', rideId);
                if (error) {
                  console.error('[UserActiveRide] Error al cancelar el viaje:', error);
                }
              }
              setRideStatus('cancelled');
              // Notificación local como respaldo
              try {
                const { NotificationService } = await import('@/services/notificationService');
                await NotificationService.showLocalNotification({
                  title: 'Viaje cancelado',
                  body: 'El usuario canceló el viaje',
                  data: { type: 'ride_cancelled', rideId: rideId as string }
                });
              } catch {}
            } catch (e) {
              console.error('[UserActiveRide] Excepción al cancelar:', e);
            } finally {
              setTimeout(() => router.back(), 800);
            }
          }
        },
      ]
    );
  };

  const handleCallDriver = () => {
    if (driverInfo.phone) {
      Alert.alert('Llamar Conductor', `Llamando a ${driverInfo.name} (${driverInfo.phone})...`);
    } else {
      Alert.alert('Llamar Conductor', 'No hay teléfono disponible');
    }
  };

  const handleMessageDriver = () => {
    // Solo mostrar chat si el viaje está aceptado (conductor en camino)
    if (rideStatus === 'accepted') {
      setShowChat(true);
    } else {
      Alert.alert('Chat', 'El chat estará disponible cuando el conductor esté en camino');
    }
  };

  // Renderizar condicional después de todos los hooks
  if (isLoadingRide) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando viaje...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/user/user_home')}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Viaje Activo</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRide}>
          <Ionicons name="close" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      {/* Notificación de viaje iniciado */}
      {showRideStartedNotification && (
        <View style={styles.notificationContainer}>
          <View style={styles.notificationContent}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.notificationText}>¡El conductor ha iniciado el viaje!</Text>
          </View>
        </View>
      )}
      
      {/* Mapa ocupa el 80% */}
      <View style={{ flex: 8 }}>
        <ActiveRideMap
          origin={originCoords}
          destination={destinationCoords}
          driverLocation={effectiveDriverOrigin}
          userLocation={currentLocation || undefined}
          routeCoordinates={routeToUserCoords}
          routeToDestinationCoordinates={routeToDestinationCoords}
          showDriverRoute={rideStatus === 'accepted' || rideStatus === 'in_progress'}
          showUserRoute={rideStatus === 'accepted' || rideStatus === 'in_progress'}
          showCurrentLocation={true}
          eta={rideInfo.eta}
          etaDescription={rideInfo.etaDescription}
          driverToUserETA={rideInfo.driverToUserETA}
          userToDestinationETA={rideInfo.userToDestinationETA}
          rideStatus={rideStatus}
        />
        
        {/* Botón flotante info */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            console.log('[UserActiveRide] Abriendo modal - driverInfo:', driverInfo);
            console.log('[UserActiveRide] Abriendo modal - rideInfo:', rideInfo);
            console.log('[UserActiveRide] Abriendo modal - driverInfo.name:', driverInfo?.name);
            console.log('[UserActiveRide] Abriendo modal - rideInfo.origin:', rideInfo?.origin);
            setModalVisible(true);
          }}
        >
          <Ionicons name="person" size={28} color="#fff" />
        </TouchableOpacity>
        {/* Botón cancelar viaje */}
        <TouchableOpacity
          style={styles.cancelFab}
          onPress={handleCancelRide}
        >
          <Ionicons name="close-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

             {/* Modal con información del viaje */}
       <Modal
         visible={modalVisible}
         animationType="slide"
         transparent
         onRequestClose={() => setModalVisible(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             {rideInfo.origin ? (
               <View style={styles.modalBody}>
                 {/* Header con estado */}
                 <View style={[styles.statusHeader, { backgroundColor: rideStatus === 'in_progress' ? '#4CAF50' : '#2196F3' }]}>
                   <Ionicons name={rideStatus === 'in_progress' ? 'time' : 'car'} size={20} color="white" />
                   <Text style={styles.statusTitle}>
                     {rideStatus === 'in_progress' ? 'En Viaje' : 'Conductor en Camino'}
                   </Text>
                 </View>

                 {/* Información del conductor */}
                 <View style={styles.participantSection}>
                   <View style={styles.participantInfo}>
                     <View style={styles.avatarPlaceholder}>
                       <Ionicons name="person" size={24} color="#666" />
                     </View>
                     
                     <View style={styles.participantDetails}>
                       <Text style={styles.participantName}>{driverInfo.name || 'Conductor'}</Text>
                       <Text style={styles.participantType}>Conductor</Text>
                       
                       {driverInfo.rating > 0 && (
                         <View style={styles.ratingContainer}>
                           <Ionicons name="star" size={16} color="#FFD700" />
                           <Text style={styles.ratingText}>{driverInfo.rating.toFixed(1)}</Text>
                         </View>
                       )}
                     </View>
                   </View>

                   {/* Botones de contacto */}
                   <View style={styles.contactButtons}>
                     {driverInfo.phone && (
                       <TouchableOpacity style={styles.contactButton} onPress={handleCallDriver}>
                         <Ionicons name="call" size={20} color="#2196F3" />
                       </TouchableOpacity>
                     )}
                     
                     <TouchableOpacity style={styles.contactButton} onPress={handleMessageDriver}>
                       <Ionicons name="chatbubble" size={20} color="#4CAF50" />
                     </TouchableOpacity>
                   </View>
                 </View>

                 {/* Información del vehículo */}
                 {(driverInfo.car || driverInfo.plate) && (
                   <View style={styles.vehicleSection}>
                     <Ionicons name="car" size={16} color="#666" />
                     <View style={styles.vehicleInfo}>
                       {driverInfo.car && (
                         <Text style={styles.vehicleText}>{driverInfo.car}</Text>
                       )}
                       {driverInfo.plate && (
                         <Text style={styles.vehicleText}>Placa: {driverInfo.plate}</Text>
                       )}
                     </View>
                   </View>
                 )}

                 {/* Información del viaje */}
                 <View style={styles.rideSection}>
                   <View style={styles.rideItem}>
                     <Ionicons name="location" size={16} color="#4CAF50" />
                     <View style={styles.rideTextContainer}>
                       <Text style={styles.rideLabel}>Origen</Text>
                       <Text style={styles.rideValue} numberOfLines={2}>{rideInfo.origin}</Text>
                     </View>
                   </View>

                   <View style={styles.rideItem}>
                     <Ionicons name="location" size={16} color="#F44336" />
                     <View style={styles.rideTextContainer}>
                       <Text style={styles.rideLabel}>Destino</Text>
                       <Text style={styles.rideValue} numberOfLines={2}>{rideInfo.destination}</Text>
                     </View>
                   </View>

                   <View style={styles.rideStats}>
                     {rideInfo.distance && (
                       <View style={styles.statItem}>
                         <Ionicons name="resize" size={16} color="#666" />
                         <Text style={styles.statText}>{rideInfo.distance}</Text>
                       </View>
                     )}
                     
                     {rideInfo.duration && (
                       <View style={styles.statItem}>
                         <Ionicons name="time" size={16} color="#666" />
                         <Text style={styles.statText}>{rideInfo.duration}</Text>
                       </View>
                     )}
                   </View>

                    {/* ETAs y distancias */}
                   {(rideInfo.driverToUserETA || rideInfo.userToDestinationETA) && (
                     <View style={styles.etaSection}>
                       {rideInfo.driverToUserETA && (
                         <View style={styles.etaRow}>
                           <Ionicons name="car" size={16} color="#2196F3" />
                           <Text style={styles.etaText}>
                             Al usuario: {rideInfo.driverToUserETA}
                             {rideInfo.driverToUserDistance && ` (${rideInfo.driverToUserDistance})`}
                           </Text>
                         </View>
                       )}

                       {rideInfo.userToDestinationETA && (
                         <View style={styles.etaRow}>
                           <Ionicons name="flag" size={16} color="#F44336" />
                           <Text style={styles.etaText}>
                             Al destino: {rideInfo.userToDestinationETA}
                             {rideInfo.userToDestinationDistance && ` (${rideInfo.userToDestinationDistance})`}
                           </Text>
                         </View>
                       )}
                     </View>
                   )}

                    {/* Tarifa */}
                    <View style={styles.fareSection}>
                      <Text style={styles.fareLabel}>Tarifa</Text>
                      <Text style={styles.fareValue}>{rideInfo.fare || 'Calculando...'}</Text>
                    </View>
                 </View>
               </View>
             ) : (
               <View style={styles.loadingSection}>
                 <Text style={styles.loadingText}>Cargando información del viaje...</Text>
               </View>
             )}
             
             <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
               <Text style={styles.closeButtonText}>Cerrar</Text>
             </TouchableOpacity>
           </View>
         </View>
               </Modal>

        {/* Chat Modal */}
        <ChatModal
          visible={showChat}
          onClose={() => setShowChat(false)}
          rideId={rideId || ''}
          userType="user"
          otherParticipantName={driverInfo.name || 'Conductor'}
        />
      </SafeAreaView>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    minHeight: 300,
  },
  infoContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    zIndex: 10,
  },
  cancelFab: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    backgroundColor: '#F44336',
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    alignItems: 'center',
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  notificationContainer: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  notificationContent: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  notificationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingSection: {
    alignItems: 'center',
    padding: 20,
  },
  rideInfoCard: {
    width: '100%',
    marginBottom: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Estilos para el modal personalizado
  modalBody: {
    width: '100%',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statusTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  participantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 80,
    width: '100%',
  },
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  participantDetails: {
    flex: 1,
    minWidth: 0,
  },
  participantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  participantType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    flexShrink: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  rideSection: {
    padding: 16,
  },
  rideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rideTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  rideLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  rideValue: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  rideStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  etaSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  etaText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  fareSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  fareLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  fareValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
}); 