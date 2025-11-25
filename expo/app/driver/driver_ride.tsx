import ActiveRideMap from '@/components/ActiveRideMap';
import AppHeader from '@/components/AppHeader';
import ChatModal from '@/components/ChatModal';
import RideInfoCard from '@/components/RideInfoCard';
import { useAuth } from '@/contexts/AuthContext';
import { useRideTracking } from '@/hooks/useRideTracking';
import { useRouteDirections } from '@/hooks/useRouteDirections';
import { DriverService } from '@/services/driverService';
import { NotificationService } from '@/services/notificationService';
import { realtimeService } from '@/services/realtimeService';
import { RideRequest } from '@/services/rideService';
import { supabase } from '@/services/supabaseClient';
import { chatService } from '@/services/chatService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// OpenStreetMap no requiere API key
const { width, height } = Dimensions.get('window');

export default function DriverRide() {
  // Solo loggear una vez al montar el componente
  useEffect(() => {
    console.log('[DriverRide] Componente iniciado - VERSIÓN OPTIMIZADA');
  }, []);
  const router = useRouter();
  const { rideId: paramRideId } = useLocalSearchParams();
  const { userId: firebaseUid } = useAuth();
  const [ride, setRide] = useState<RideRequest | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRide, setIsLoadingRide] = useState(true);
  const [hasCheckedForRide, setHasCheckedForRide] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name?: string; phone?: string }>({});
  const [rideStatus, setRideStatus] = useState<'accepted' | 'in_progress' | 'completed' | 'cancelled'>('accepted');

  // Coordenadas para el mapa
  const [originCoords, setOriginCoords] = useState({ latitude: 0, longitude: 0 });
  const [destinationCoords, setDestinationCoords] = useState({ latitude: 0, longitude: 0 });
  const [driverCoords, setDriverCoords] = useState({ latitude: 0, longitude: 0 });

  // Información del viaje
  const [rideInfo, setRideInfo] = useState({
    origin: '',
    destination: '',
    distance: '',
    duration: '',
    fare: '',
    eta: '',
    etaDescription: '',
    driverToUserETA: '',
    userToDestinationETA: '',
    driverToUserDistance: '',
    userToDestinationDistance: '',
  });

  const bottomSheetRef = useRef<any>(null);
  const snapPoints = useMemo(() => ['20%', '60%'], []);
  const [modalVisible, setModalVisible] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const loadDriverId = async () => {
      console.log('[DriverRide] loadDriverId llamado con firebaseUid:', firebaseUid);
      
      if (!firebaseUid) {
        console.error('[DriverRide] No se pudo obtener el firebase_uid');
        return;
      }
      
      // Obtener el driver_id de Supabase usando el firebase_uid
      // Intentar obtener drivers.id por firebase_uid o por users.id
      let driverId = await DriverService.getDriverIdByFirebaseUid(firebaseUid);
      console.log('[DriverRide] Driver ID obtenido (drivers.id):', driverId);
      if (!driverId) {
        console.error('[DriverRide] No se pudo obtener el driver_id de Supabase');
        // Fallback: buscar user_id y luego drivers.id
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('firebase_uid', firebaseUid)
          .single();
        if (userRow?.id) {
          const { data: drv } = await supabase
            .from('drivers')
            .select('id')
            .or(`id.eq.${userRow.id},user_id.eq.${userRow.id}`)
            .limit(1);
          if (drv && drv.length > 0 && drv[0]?.id) driverId = drv[0].id;
        }
        if (!driverId) return;
      }
      
      setDriverId(driverId);
    };
    loadDriverId();
  }, [firebaseUid]);

  // Usar el hook de tracking compartido
  const { trackingData, currentLocation, isLoading: trackingLoading, error } = useRideTracking({
    rideId: ride?.id || '',
    driverId: driverId || '',
    isDriver: true,
    updateInterval: 300000 // Aumentado a 300 segundos (5 minutos)
  });

  // Actualizar coordenadas del conductor cuando cambie la ubicación - con debounce
  useEffect(() => {
    if (currentLocation) {
      // Usar debounce para evitar actualizaciones frecuentes
      const timeoutId = setTimeout(() => {
        console.log('[DriverRide] Actualizando coordenadas del conductor (después de 5s debounce):', currentLocation);
        setDriverCoords(currentLocation);
      }, 5000); // Esperar 5 segundos antes de actualizar
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  // Memoizar las coordenadas para evitar re-renders innecesarios
  const routeOrigin = useMemo(() => {
    return currentLocation || driverCoords;
  }, [currentLocation?.latitude, currentLocation?.longitude, driverCoords.latitude, driverCoords.longitude]);

  // Calcular dos rutas separadas para el conductor
  const routeToUser = useMemo(() => {
    // Ruta 1: Conductor → Usuario (pickup)
    return {
      origin: routeOrigin,
      destination: originCoords,
      waypoints: []
    };
  }, [routeOrigin, originCoords]);

  const routeToDestination = useMemo(() => {
    // Ruta 2: Usuario (pickup) → Destino final
    return {
      origin: originCoords,
      destination: destinationCoords,
      waypoints: []
    };
  }, [originCoords, destinationCoords]);

  // Validar que las coordenadas sean válidas antes de calcular rutas
  const hasValidCoordinates = useMemo(() => {
    const originValid = routeOrigin.latitude !== 0 && routeOrigin.longitude !== 0;
    const userValid = originCoords.latitude !== 0 && originCoords.longitude !== 0;
    const destinationValid = destinationCoords.latitude !== 0 && destinationCoords.longitude !== 0;
    return originValid && userValid && destinationValid;
  }, [routeOrigin, originCoords, destinationCoords]);

  // Usar el hook de direcciones para la ruta al usuario
  const { 
    routeData: routeToUserData, 
    getRouteCoordinates: getRouteToUserCoordinates, 
    refetch: refetchRouteToUser 
  } = useRouteDirections({
    origin: routeToUser.origin,
    destination: routeToUser.destination,
    waypoints: routeToUser.waypoints,
    mode: 'driving'
  });

  // Usar el hook de direcciones para la ruta al destino
  const { 
    routeData: routeToDestinationData, 
    getRouteCoordinates: getRouteToDestinationCoordinates, 
    refetch: refetchRouteToDestination 
  } = useRouteDirections({
    origin: routeToDestination.origin,
    destination: routeToDestination.destination,
    waypoints: routeToDestination.waypoints,
    mode: 'driving'
  });

  // Log para debugging
  useEffect(() => {
    console.log('[DriverRide] Estado de coordenadas:', {
      hasValidCoordinates,
      routeOrigin,
      routeToUser,
      routeToDestination,
      rideStatus
    });
  }, [hasValidCoordinates, routeOrigin, routeToUser, routeToDestination, rideStatus]);

  // Calcular ETAs y distancias cuando las rutas estén disponibles
  useEffect(() => {
    const calculateETAsAndDistances = async () => {
      if (!hasValidCoordinates) return;

      try {
        // Calcular ETA y distancia del conductor al usuario
        if (routeToUserData) {
          if (routeToUserData.duration) {
            const driverToUserMinutes = Math.round(routeToUserData.duration / 60);
            setRideInfo(prev => ({
              ...prev,
              driverToUserETA: `${driverToUserMinutes} min`
            }));
          }
          if (routeToUserData.distance) {
            const driverToUserKm = (routeToUserData.distance / 1000).toFixed(1);
            setRideInfo(prev => ({
              ...prev,
              driverToUserDistance: `${driverToUserKm} km`
            }));
          }
        }

        // Calcular ETA y distancia del usuario al destino
        if (routeToDestinationData) {
          if (routeToDestinationData.duration) {
            const userToDestinationMinutes = Math.round(routeToDestinationData.duration / 60);
            setRideInfo(prev => ({
              ...prev,
              userToDestinationETA: `${userToDestinationMinutes} min`
            }));
          }
          if (routeToDestinationData.distance) {
            const userToDestinationKm = (routeToDestinationData.distance / 1000).toFixed(1);
            setRideInfo(prev => ({
              ...prev,
              userToDestinationDistance: `${userToDestinationKm} km`
            }));
          }
        }
      } catch (error) {
        console.error('[DriverRide] Error al calcular ETAs y distancias:', error);
      }
    };

    calculateETAsAndDistances();
  }, [hasValidCoordinates, routeToUserData, routeToDestinationData]);

  // Memoizar las funciones refetch para evitar re-renders
  const stableRefetchRouteToUser = useCallback(() => {
    refetchRouteToUser();
  }, [refetchRouteToUser]);

  const stableRefetchRouteToDestination = useCallback(() => {
    refetchRouteToDestination();
  }, [refetchRouteToDestination]);

  // Asegurar driver_location inicial en ride_requests cuando tengamos ubicación
  useEffect(() => {
    const updateInitialDriverLocation = async () => {
      if (!ride?.id || !currentLocation) return;
      try {
        await supabase
          .from('ride_requests')
          .update({
            driver_location: currentLocation,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ride.id);
      } catch {}
    };
    updateInitialDriverLocation();
  }, [ride?.id, currentLocation?.latitude, currentLocation?.longitude]);

  // ELIMINADO: useEffect que actualizaba rutas automáticamente
  // Ahora las rutas solo se calculan cuando las coordenadas cambian significativamente en useRouteDirections

  useEffect(() => {
    if (!driverId && !paramRideId) return;
    setIsLoadingRide(true);
    setIsLoading(true);
    setHasCheckedForRide(false);

    // Buscar viaje activo para el conductor
    const loadActiveRide = async () => {
      console.log('[DriverRide] Buscando viaje activo', { driverId, paramRideId });
      
      // Si viene rideId por params, cargar directo
      let directRideId: string | undefined = paramRideId ? String(paramRideId) : undefined;
      if (!directRideId) {
        try {
          const stored = await AsyncStorage.getItem('activeRideId');
          if (stored) directRideId = stored;
        } catch {}
      }
      
                  // El chat se activará cuando se abra el modal
      
      if (directRideId) {
        const { data: rr, error: rrErr } = await supabase
          .from('ride_requests')
          .select('*')
          .eq('id', directRideId)
          .single();
        setIsLoadingRide(false);
        setIsLoading(false);
        setHasCheckedForRide(true);
        if (rrErr) {
          console.error('[DriverRide] Error cargando ride por id:', rrErr);
          return;
        }
        if (rr) {
          const rideData = rr as unknown as RideRequest;
          setRide(rideData);
          setRideStatus(rideData.status as any);
          if (rideData.origin?.coordinates) setOriginCoords(rideData.origin.coordinates);
          if (rideData.destination?.coordinates) setDestinationCoords(rideData.destination.coordinates);
          setRideInfo(prev => ({
            ...prev,
            origin: rideData.origin?.address || '',
            destination: rideData.destination?.address || '',
            distance: rideData.distance ? `${(rideData.distance / 1000).toFixed(1)} km` : '',
            duration: rideData.duration ? `${Math.round(rideData.duration / 60)} min` : '',
            fare: rideData.price ? `$${rideData.price.toFixed(2)}` : '',
          }));
          if ((rideData as any).userId) loadUserInfo((rideData as any).userId);
          return;
        }
      }
      // Si por error se guardó users.id en driver_id, buscar por ambos
      let supabaseUserId: string | null = null;
      try {
        const { data: u } = await supabase
          .from('users')
          .select('id')
          .eq('firebase_uid', firebaseUid || '')
          .single();
        supabaseUserId = u?.id || null;
      } catch {}

      const orFilter = supabaseUserId
        ? `driver_id.eq.${driverId},driver_id.eq.${supabaseUserId}`
        : `driver_id.eq.${driverId}`;

      const { data: rides, error } = await supabase
        .from('ride_requests')
        .select('*')
        .or(orFilter)
        .in('status', ['accepted', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log('[DriverRide] Resultado de búsqueda:', { rides, error, driverId });
      
      setIsLoadingRide(false);
      setIsLoading(false);
      setHasCheckedForRide(true);
      
      if (error) {
        console.error('[DriverRide] Error al buscar viaje activo:', error);
        return;
      }
      
      if (rides && rides.length > 0) {
        const rideData = rides[0] as RideRequest;
        console.log('[DriverRide] Viaje encontrado:', rideData);
        setRide(rideData);
        setRideStatus(rideData.status as any);
        if (rideData.origin?.coordinates) setOriginCoords(rideData.origin.coordinates);
        if (rideData.destination?.coordinates) setDestinationCoords(rideData.destination.coordinates);
        setRideInfo(prev => ({
          ...prev,
          origin: rideData.origin?.address || '',
          destination: rideData.destination?.address || '',
          distance: rideData.distance ? `${(rideData.distance / 1000).toFixed(1)} km` : '',
          duration: rideData.duration ? `${Math.round(rideData.duration / 60)} min` : '',
          fare: rideData.price ? `$${rideData.price.toFixed(2)}` : '',
        }));
        // Cargar info del usuario
        if (rideData.userId) loadUserInfo(rideData.userId);
      } else {
        console.log('[DriverRide] No se encontraron viajes activos');
        setRide(null);
      }
    };

    // Suscribirse a actualizaciones en tiempo real
    let subscription: any = null;
    if (ride && ride.id) {
      subscription = realtimeService.subscribeToRideUpdates(ride.id, (update) => {
        setRideStatus(update.status as any);
        if (update.location) setDriverCoords(update.location);
        if (update.eta !== undefined && update.eta !== null) {
          const etaMinutes = Math.round(update.eta / 60);
          setRideInfo(prev => ({ ...prev, eta: `${etaMinutes} min` }));
        }
      });
    }

    loadActiveRide();

    return () => {
      if (subscription) realtimeService.unsubscribe(`ride_${ride?.id}`);
    };
  }, [driverId, paramRideId]);

  // Función para cargar información del usuario
  const loadUserInfo = async (userId: string) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('display_name, phone_number')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('[DriverRide] Error al cargar info del usuario:', error);
        return;
      }
      setUserInfo({ name: user.display_name, phone: user.phone_number });
    } catch (error) {
      console.error('[DriverRide] Error al cargar info del usuario:', error);
    }
  };

  const handleStartRide = async () => {
    if (!ride) return;

    try {
      console.log('[DriverRide] Iniciando viaje con ID:', ride.id);
      
      // Actualizar estado del viaje (versión temporal sin startedAt)
      const { data, error } = await supabase.from('ride_requests').update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
      }).eq('id', ride.id);

      if (error) {
        console.error('[DriverRide] Error al actualizar estado del viaje:', error);
        
        // Si el error persiste, intentar sin las columnas nuevas
        console.log('[DriverRide] Intentando actualización básica...');
        const { data: basicData, error: basicError } = await supabase.from('ride_requests').update({
          status: 'in_progress'
        }).eq('id', ride.id);
        
        if (basicError) {
          console.error('[DriverRide] Error en actualización básica:', basicError);
          Alert.alert('Error', 'No se pudo iniciar el viaje');
          return;
        }
        
        console.log('[DriverRide] Viaje iniciado con actualización básica');
      } else {
        console.log('[DriverRide] Viaje iniciado exitosamente:', data);
      }
      
      setRideStatus('in_progress');

      // Notificar al usuario que el viaje ha comenzado
      Alert.alert(
        'Viaje Iniciado',
        'El viaje ha comenzado. El usuario será notificado automáticamente.',
        [{ text: 'OK' }]
      );

      // Calcular ETA inicial para el usuario inmediatamente
      if (currentLocation && ride.origin?.coordinates) {
        try {
          const eta = await calculateETA(currentLocation, ride.origin.coordinates);
          console.log('[DriverRide] ETA calculado para usuario:', eta);
          
          // Actualizar ETA en la base de datos con todas las columnas
          await supabase.from('ride_requests').update({
            eta: eta,
            etaType: 'driver_to_user',
            etaDescription: 'Tiempo para llegar al usuario',
            updated_at: new Date().toISOString()
          }).eq('id', ride.id);
          
          console.log('[DriverRide] ETA actualizado en base de datos:', eta);
          
          // Enviar notificación al usuario sobre el ETA
          // Aquí podríamos usar una notificación específica si existiera; por ahora omitimos push ETA
        } catch (etaError) {
          console.error('[DriverRide] Error al calcular ETA:', etaError);
        }
      }
      
      // Enviar notificación de inicio de viaje al usuario
      // Enviar notificación de inicio (si se requiere, usar métodos disponibles)

    } catch (error) {
      console.error('[DriverRide] Error al iniciar el viaje:', error);
      Alert.alert('Error', 'No se pudo iniciar el viaje');
    }
  };

  // Función para calcular ETA
  const calculateETA = async (from: any, to: any): Promise<string> => {
    try {
      const openStreetMapService = (await import('@/services/openStreetMapService')).default;
      const route = await openStreetMapService.getRoute(from, to, 'driving');
      if (route) {
        const etaMinutes = Math.round(route.totalDuration / 60);
        return `${etaMinutes} min`;
      }
      return 'Calculando...';
    } catch (error) {
      console.error('[DriverRide] Error al calcular ETA:', error);
      return 'Calculando...';
    }
  };

  const handleCompleteRide = async () => {
    if (!ride) return;

    try {
      // 1. Actualizar estado del viaje
      await supabase.from('ride_requests').update({
        status: 'completed',
        completedAt: new Date().toISOString()
      }).eq('id', ride.id);
      setRideStatus('completed');
      
             // 2. Procesar el pago final (CAPTURE)
       try {
         const { paymentService } = await import('@/services/paymentService');
         
         // Obtener el método de pago del viaje
         const paymentMethod = ride.payment_method || 'cash';
         const amount = ride.actual_fare || ride.estimated_fare || 0;
         
         if (paymentMethod === 'cash') {
           // Para pagos en efectivo, crear transacción directamente
           if (!ride.id) {
             console.error('[DriverRide] ❌ No se puede procesar pago: ride.id es undefined');
             return;
           }
           
           const success = await paymentService.processCashPayment(
             ride.id,
             ride.user_id || '',
             ride.driver_id || '',
             amount
           );
           
           if (success) {
             console.log('[DriverRide] ✅ Pago en efectivo procesado correctamente');
           } else {
             console.error('[DriverRide] ❌ Error procesando pago en efectivo');
           }
         } else {
           // Para pagos con tarjeta, confirmar el HOLD (CAPTURE)
           // Aquí necesitaríamos el payment_intent_id del viaje
           // Por ahora, solo loggear
           console.log('[DriverRide] 💳 Pago con tarjeta - CAPTURE pendiente');
           console.log('[DriverRide] 💡 Necesitamos el payment_intent_id para confirmar');
         }
       } catch (paymentError) {
         console.error('[DriverRide] ❌ Error procesando pago:', paymentError);
         // No bloquear la finalización del viaje por errores de pago
       }
      
      // 3. Redirigir después de completar
      setTimeout(() => {
        router.replace('/driver/driver_home');
      }, 2000);
    } catch (error) {
      console.error('Error al completar el viaje:', error);
      Alert.alert('Error', 'No se pudo completar el viaje');
    }
  };

  const handleCallPassenger = () => {
    if (userInfo.phone) {
      Alert.alert('Llamar Pasajero', `Llamando a ${userInfo.name} (${userInfo.phone})...`);
    } else {
      Alert.alert('Llamar Pasajero', 'No hay teléfono disponible');
    }
  };

  const handleMessagePassenger = () => {
    // Solo mostrar chat si el viaje está aceptado (conductor en camino)
    if (rideStatus === 'accepted') {
      setShowChat(true);
    } else {
      Alert.alert('Chat', 'El chat estará disponible cuando el conductor esté en camino');
    }
  };

  const handleCancelRide = async () => {
    console.log('[DriverRide] handleCancelRide llamado con ride:', ride);
    if (!ride) {
      console.error('[DriverRide] No hay ride para cancelar');
      Alert.alert('Error', 'No hay viaje para cancelar');
      return;
    }

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
              console.log('[DriverRide] Intentando cancelar viaje con ID:', ride.id);
                             const { data, error } = await supabase.from('ride_requests').update({
                 status: 'cancelled',
                 driver_id: null
               }).eq('id', ride.id);
              
              if (error) {
                console.error('[DriverRide] Error de Supabase al cancelar:', error);
                Alert.alert('Error', `Error de base de datos: ${error.message}`);
                return;
              }
              
              console.log('[DriverRide] Viaje cancelado exitosamente:', data);
              setRideStatus('cancelled');
              // Notificación local como respaldo
              try {
                const { NotificationService } = await import('@/services/notificationService');
                await NotificationService.showLocalNotification({
                  title: 'Viaje cancelado',
                  body: 'El conductor canceló el viaje',
                  data: { type: 'ride_cancelled', rideId: ride.id }
                });
              } catch {}
              
              setTimeout(() => {
                router.replace('/driver/driver_home');
              }, 1000);
            } catch (error) {
              console.error('[DriverRide] Error al cancelar el viaje:', error);
              Alert.alert('Error', 'No se pudo cancelar el viaje');
            }
          }
        },
      ]
    );
  };

  // Memoizar las coordenadas de las rutas para evitar recálculos innecesarios
  const routeToUserCoords = useMemo(() => {
    return getRouteToUserCoordinates().map((coord: any) => ({ latitude: coord[1], longitude: coord[0] }));
  }, [getRouteToUserCoordinates]);

  const routeToDestinationCoords = useMemo(() => {
    return getRouteToDestinationCoordinates().map((coord: any) => ({ latitude: coord[1], longitude: coord[0] }));
  }, [getRouteToDestinationCoordinates]);

  // Solo loggear cuando hay rutas disponibles y han cambiado
  // Reducir logs de rutas

  if (isLoadingRide) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader subtitle="Viaje Activo" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando viaje...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader subtitle="Viaje Activo" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader subtitle="Viaje Activo" />
        <View style={styles.noRideContainer}>
          <Ionicons name="car" size={64} color="#ccc" />
          <Text style={styles.noRideText}>No hay viajes activos</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
             {/* Header con AppHeader */}
       <View style={styles.headerContainer}>
         <AppHeader subtitle="Viaje Activo" />
       </View>
             {/* Mapa ocupa el 80% */}
       <View style={{ flex: 8 }}>
                                       <ActiveRideMap
             origin={originCoords}
             destination={destinationCoords}
             driverLocation={currentLocation || driverCoords}
             userLocation={undefined}
             routeCoordinates={routeToUserCoords}
             routeToDestinationCoordinates={routeToDestinationCoords}
             showDriverRoute={rideStatus === 'accepted' || rideStatus === 'in_progress'}
             showUserRoute={rideStatus === 'accepted' || rideStatus === 'in_progress'}
             showCurrentLocation={true}
             eta={rideInfo.eta}
             etaDescription={rideInfo.etaDescription}
             driverToUserETA={rideInfo.driverToUserETA}
             userToDestinationETA={rideInfo.userToDestinationETA}
           />
       </View>
      {/* Modal con la info del usuario */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
                        <RideInfoCard
              participant={{
                name: userInfo.name || 'Pasajero',
                phone: userInfo.phone,
                photo: null,
                rating: 5,
                vehicleMake: '',
                vehicleModel: '',
                vehicleColor: '',
              }}
              rideInfo={rideInfo}
              status={rideStatus}
              isDriver={true}
              roleLabel="Pasajero"
              onCall={handleCallPassenger}
              onMessage={handleMessagePassenger}
              onCancel={() => setModalVisible(false)}
              style={{ width: '100%' }}
            />
                                       {/* Contenedor para botones */}
              <View style={styles.modalButtonsContainer}>
                {/* Botón para empezar el viaje */}
                {rideStatus === 'accepted' && (
                  <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleStartRide}>
                    <Ionicons name="play" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.modalPrimaryButtonText}>Empezar viaje</Text>
                  </TouchableOpacity>
                )}
                
                {/* Botón Cerrar */}
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCloseButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
          </View>
        </View>
      </Modal>
             {/* Botones flotantes */}
       <TouchableOpacity
         style={styles.fab}
         onPress={() => setModalVisible(true)}
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

       {/* Chat Modal */}
       <ChatModal
         visible={showChat}
         onClose={() => setShowChat(false)}
         rideId={paramRideId as string || ''}
         userType="driver"
         otherParticipantName={userInfo.name || 'Pasajero'}
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
    marginTop: 16,
  },
  
  mapContainer: {
    flex: 1,
    minHeight: 300,
  },
  infoContainer: {
    flex: 1,
  },
  actionContainer: {
    padding: 16,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingTop: 60,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  noRideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingTop: 60,
  },
  noRideText: {
    fontSize: 18,
    color: '#666',
    marginTop: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
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
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 0,
    width: '100%',
    maxHeight: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  modalPrimaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalPrimaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalCloseButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalCancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerContainer: {
    position: 'relative',
    backgroundColor: '#2563EB',
  },
  modalButtonsContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },

}); 