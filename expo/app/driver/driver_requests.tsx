import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { DriverService } from '@/services/driverService';
import { acceptRide, RideRequest } from '@/services/rideService';
import { supabase } from '@/services/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Estado simple para tracking
let lastKnownCount = 0;
let lastKnownRequestIds = new Set<string>(); // Track IDs específicos de solicitudes

export default function DriverRequestsScreen() {
  console.log('[DriverRequests] 🚀 COMPONENTE INICIANDO - DriverRequestsScreen');
  const router = useRouter();
  const { userId: firebaseUid } = useAuth();
  const { showLocalNotification, hasPermission } = useNotifications();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [assignedRides, setAssignedRides] = useState<RideRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasNewRequests, setHasNewRequests] = useState(false);
  const [lastRequestCount, setLastRequestCount] = useState(0);
  const [forceRefresh, setForceRefresh] = useState(0); // Para forzar re-renders
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const subscriptionRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const pollingIntervalRef = useRef<any>(null);
  const lastFetchTimeRef = useRef<number>(0); // Controlar frecuencia de fetch

  const MAX_REQUESTS = 20; // Límite de solicitudes a mostrar
  const MIN_FETCH_INTERVAL = 5000; // Mínimo 5 segundos entre fetches

  // Función para mostrar errores de manera elegante
  const showErrorToast = (message: string) => {
    setErrorMessage(message);
    setShowError(true);
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      setShowError(false);
      setErrorMessage(null);
    }, 3000);
  };

  // Función para cargar solicitudes con detección persistente
  const fetchRequests = async (force = false) => {
    try {
      const now = Date.now();
      
      // Evitar fetches muy frecuentes
      if (!force && (now - lastFetchTimeRef.current) < MIN_FETCH_INTERVAL) {
        console.log('[DriverRequests] ⏰ Fetch muy reciente, saltando...');
        return;
      }
      
      lastFetchTimeRef.current = now;
      
      console.log('[DriverRequests] 🔄 Cargando solicitudes DISPONIBLES...');
      console.log('[DriverRequests] 🔍 Query: status=requested, driver_id=null, limit=', MAX_REQUESTS);
      
      const { data, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('status', 'requested') // SOLO solicitudes pendientes
        .is('driver_id', null) // Sin driver asignado
        .order('created_at', { ascending: false })
        .limit(MAX_REQUESTS);
      
      if (error) {
        console.error('[DriverRequests] ❌ Error al cargar solicitudes:', error);
        return;
      }
      
      const newCount = data?.length || 0;
      const previousCount = lastKnownCount;
      
      // Detectar nuevas solicitudes por IDs específicos
      const currentRequestIds = new Set(data?.map(r => r.id) || []);
      const newRequestIds = new Set([...currentRequestIds].filter(id => !lastKnownRequestIds.has(id)));
      const hasNewRequests = newRequestIds.size > 0;
      
      console.log('[DriverRequests] 📊 Solicitudes:', {
        anteriores: previousCount,
        actuales: newCount,
        nuevas: newRequestIds.size,
        nuevosIds: Array.from(newRequestIds)
      });
      
      // Detectar nuevas solicitudes - LÓGICA MEJORADA
      if (hasNewRequests && newRequestIds.size > 0) {
        console.log('[DriverRequests] 🚨 ¡NUEVAS SOLICITUDES DETECTADAS!', newRequestIds.size);
        console.log('[DriverRequests] 🔔 Llamando función de notificación...');
        
        // Mostrar notificación usando el NotificationContext
        if (hasPermission) {
          await showLocalNotification(
            '🚗 Nueva Solicitud de Viaje',
            `Tienes ${newRequestIds.size} nueva(s) solicitud(es) de viaje disponible(s)`,
            { type: 'new_ride_request', count: newRequestIds.size }
          );
        }
        
        // Actualizar UI
        setHasNewRequests(true);
        
        // Vibrar para alertar al usuario
        Vibration.vibrate([0, 500, 200, 500]);
      }
      
      // Actualizar estado
      setAssignedRides(data || []);
      setLastRequestCount(newCount);
      lastKnownCount = newCount;
      lastKnownRequestIds = currentRequestIds;
      
      console.log('[DriverRequests] ✅ Solicitudes cargadas:', data?.length || 0);
      
    } catch (error) {
      console.error('[DriverRequests] ❌ Error en fetchRequests:', error);
    }
  };

  // Obtener ID del driver al montar el componente
  useEffect(() => {
    const getDriverId = async () => {
      try {
        console.log('[DriverRequests] 🔍 Obteniendo ID del driver...');
        
        if (!firebaseUid) {
          console.log('[DriverRequests] ⚠️ No hay Firebase UID disponible');
          return;
        }

        // Obtener datos del usuario desde la tabla users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('firebase_uid', firebaseUid)
          .single();

        if (userError || !userData) {
          console.error('[DriverRequests] ❌ Error obteniendo datos del usuario:', userError);
          return;
        }

        const supabaseUserId = userData.id;
        console.log('[DriverRequests] 🔑 Usando Supabase ID (UUID):', supabaseUserId);

        // Verificar si existe en la tabla drivers
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('id, notification_token')
          .eq('user_id', supabaseUserId)
          .single();

        if (driverError && driverError.code !== 'PGRST116') {
          console.error('[DriverRequests] ❌ Error verificando driver:', driverError);
          return;
        }

        if (!driverData) {
          console.log('[DriverRequests] ⚠️ Usuario no encontrado en tabla drivers, creando registro...');
          
          // Crear registro en drivers si no existe
          const { data: inserted, error: insertError } = await supabase
            .from('drivers')
            .insert({
              user_id: supabaseUserId,
              is_available: false,
              status: 'active',
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('[DriverRequests] ❌ Error creando driver:', insertError);
            return;
          }

          console.log('[DriverRequests] ✅ Driver creado exitosamente');
        }

        const finalDriverId = driverData?.id || supabaseUserId;
        setDriverId(finalDriverId);
        console.log('[DriverRequests] ✅ Driver ID configurado (drivers.id):', finalDriverId);
        
        // Cargar solicitudes iniciales
        fetchRequests(true);
        
      } catch (error) {
        console.error('[DriverRequests] ❌ Error en getDriverId:', error);
      }
    };

    getDriverId();
  }, [firebaseUid]);

  // Configurar suscripción en tiempo real para nuevas solicitudes
  useEffect(() => {
    if (!driverId) return;

    console.log('[DriverRequests] 🔌 Configurando suscripción en tiempo real...');
    
    // Suscribirse a cambios en ride_requests
    const subscription = supabase
      .channel('ride-requests-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_requests',
          filter: `status=eq.requested`
        },
        (payload) => {
          console.log('[DriverRequests] 🔔 Nueva solicitud detectada en tiempo real:', payload);
          
          // Refrescar la lista de solicitudes
          fetchRequests(true);
          
          // Mostrar notificación local si la app está abierta
          if (hasPermission) {
            showLocalNotification(
              '🚗 Nueva Solicitud de Viaje',
              'Se ha recibido una nueva solicitud de viaje',
              { type: 'new_ride_request', rideId: payload.new.id }
            );
          }
          
          // Vibrar para alertar al usuario
          Vibration.vibrate([0, 500, 200, 500]);
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        console.log('[DriverRequests] 🔌 Desuscribiendo de cambios en tiempo real...');
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [driverId, hasPermission]);

  // Configurar polling como respaldo
  useEffect(() => {
    if (!driverId) return;

    console.log('[DriverRequests] ⏰ Configurando polling de respaldo...');
    
    const startPolling = () => {
      pollingIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          console.log('[DriverRequests] 🔄 Polling de respaldo ejecutándose...');
          fetchRequests();
        }
      }, 60000); // Cada 60 segundos (reducido de 30s)
    };

    startPolling();

    return () => {
      if (pollingIntervalRef.current) {
        console.log('[DriverRequests] ⏰ Deteniendo polling de respaldo...');
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [driverId]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleSelectRequest = async (request: RideRequest) => {
    try {
      console.log('[DriverRequests] 🔍 Verificando estado del viaje antes de mostrar detalles:', request.id);
      
      // Verificar que el viaje aún esté disponible antes de mostrar el modal
      const { data: rideData, error: rideError } = await supabase
        .from('ride_requests')
        .select('status, driver_id')
        .eq('id', request.id)
        .single();

      if (rideError) {
        console.error('[DriverRequests] Error verificando viaje:', rideError);
        Alert.alert('Error', 'No se pudo verificar el estado del viaje');
        return;
      }

      if (!rideData) {
        console.error('[DriverRequests] Viaje no encontrado:', request.id);
        Alert.alert('Error', 'El viaje no existe o fue eliminado');
        return;
      }

      // Verificar que el viaje esté disponible para aceptar
      if (rideData.status !== 'requested') {
        console.log('[DriverRequests] Viaje no disponible. Estado:', rideData.status);
        showErrorToast(`El viaje ya no está disponible (estado: ${rideData.status})`);
        
        // Refrescar la lista para remover el viaje no disponible
        setTimeout(() => {
          fetchRequests(true);
        }, 1000);
        return;
      }

      if (rideData.driver_id) {
        console.log('[DriverRequests] Viaje ya tiene conductor:', rideData.driver_id);
        showErrorToast('El viaje ya fue aceptado por otro conductor');
        
        // Refrescar la lista para remover el viaje no disponible
        setTimeout(() => {
          fetchRequests(true);
        }, 1000);
        return;
      }

      console.log('[DriverRequests] ✅ Viaje verificado, mostrando detalles');
      setSelectedRequest(request);
      setModalVisible(true);
      
    } catch (error) {
      console.log('[DriverRequests] Error verificando viaje:', error);
      showErrorToast('No se pudo verificar el estado del viaje');
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedRequest(null);
  };

  const handleAccept = async () => {
    if (!selectedRequest || !driverId) return;
    setLoading(true);
    try {
      console.log('[DriverRequests] 🚕 Aceptando viaje:', selectedRequest.id);
      
      // Calcular precio automático (mín $2 + $0.5/km después de 5km)
      let autoPrice = 2;
      if (selectedRequest.distance) {
        const km = selectedRequest.distance / 1000;
        autoPrice = Math.max(2, Math.round((2 + Math.max(0, km - 5) * 0.5) * 100) / 100);
      }
      // Usar precio estimado directamente (evitar Alert.prompt en Android)
      const price = autoPrice;
      await acceptRide(selectedRequest.id!, driverId, price);
      
      console.log('[DriverRequests] ✅ Viaje aceptado exitosamente');
      handleCloseModal();
      // Guardar rideId (solo respaldo)
      try { await AsyncStorage.setItem('activeRideId', selectedRequest.id!); } catch {}
      // Navegar como antes: querystring + params para asegurar que llegue el id
      const id = selectedRequest.id!;
      router.push(`/driver/driver_ride?rideId=${encodeURIComponent(id)}`);
    } catch (e: any) {
      // Verificar si es un error de negocio (no un error de JavaScript)
      if (e.name === 'RideBusinessError') {
        console.log('[DriverRequests] ❌ Error de negocio al aceptar viaje:', e.message);
        
        // Manejar errores específicos de negocio
        let errorMessage = 'No se pudo aceptar el viaje';
        
        if (e.code === 'RIDE_NOT_AVAILABLE') {
          errorMessage = 'El viaje ya no está disponible. Fue cancelado por el usuario.';
        } else if (e.code === 'RIDE_ALREADY_ACCEPTED') {
          errorMessage = 'El viaje ya fue aceptado por otro conductor.';
        } else {
          errorMessage = e.message;
        }
        
        showErrorToast(errorMessage);
        
        // Cerrar el modal y refrescar la lista para errores de negocio
        handleCloseModal();
        setTimeout(() => {
          fetchRequests(true);
        }, 1000);
      } else {
        // Error de JavaScript real - usar console.error
        console.error('[DriverRequests] ❌ Error de JavaScript al aceptar viaje:', e);
        showErrorToast('Error interno del sistema. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar ${selectedIds.length} solicitud(es)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // En Supabase, podemos marcar como eliminado o usar soft delete
              // Por ahora, solo eliminamos de la vista local
              setAssignedRides(prev => prev.filter(ride => !selectedIds.includes(ride.id!)));
              setSelectedIds([]);
              setSelectMode(false);
            } catch (error) {
              console.error('Error al eliminar solicitudes:', error);
              Alert.alert('Error', 'No se pudieron eliminar las solicitudes seleccionadas');
            }
          }
        }
      ]
    );
  };

  const handleManualRefresh = async () => {
    if (!driverId) return;
    setLoading(true);
    setHasNewRequests(false); // Limpiar notificación al actualizar manualmente
    
    try {
      const { data, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('status', 'requested')
        .is('driver_id', null) // Solo solicitudes sin asignar
        .order('created_at', { ascending: false })
        .limit(MAX_REQUESTS);
      
      if (error) {
        console.error('Error al actualizar:', error);
        Alert.alert('Error', 'No se pudo actualizar la lista de solicitudes');
        return;
      }
      
      setAssignedRides(data);
      setLastRequestCount(data?.length || 0);
      console.log('[DriverRequests] Actualización manual completada:', data.length, 'solicitudes');
    } catch (error) {
      console.error('[DriverRequests] Error en actualización manual:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función de prueba para verificar notificaciones
  const handleTestNotification = async () => {
    console.log('[DriverRequests] 🧪 PRUEBA DE NOTIFICACIÓN INICIADA');
    await showLocalNotification(
      '🚗 Nueva Solicitud de Viaje',
      'Esta es una prueba de notificación local.',
      { type: 'new_ride_request', count: 1 }
    );
  };



  const renderRequestItem = ({ item }: { item: RideRequest }) => (
    <TouchableOpacity
      onLongPress={() => setSelectMode(true)}
      onPress={() => selectMode ? handleSelect(item.id!) : handleSelectRequest(item)}
      style={[
        styles.card, 
        selectMode && selectedIds.includes(item.id!) && styles.cardSelected
      ]}
    >
      {selectMode && (
        <View style={styles.selectionIndicator}>
          <MaterialIcons 
            name={selectedIds.includes(item.id!) ? 'check-circle' : 'radio-button-unchecked'} 
            size={24} 
            color={selectedIds.includes(item.id!) ? '#2563EB' : '#9CA3AF'} 
          />
        </View>
      )}
      
      <View style={styles.cardHeader}>
        <View style={styles.cardIconContainer}>
          <MaterialIcons name="local-taxi" size={24} color="#fff" />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>Solicitud #{item.id?.slice(-6)}</Text>
          <Text style={styles.cardStatus}>Pendiente</Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.locationContainer}>
          <View style={styles.locationRow}>
            <MaterialIcons name="my-location" size={16} color="#2563EB" />
            <Text style={styles.locationLabel}>Origen:</Text>
          </View>
          <Text style={styles.locationText}>{item.origin?.address || 'No disponible'}</Text>
        </View>
        
        <View style={styles.locationContainer}>
          <View style={styles.locationRow}>
            <MaterialIcons name="place" size={16} color="#EF4444" />
            <Text style={styles.locationLabel}>Destino:</Text>
          </View>
          <Text style={styles.locationText}>{item.destination?.address || 'No disponible'}</Text>
        </View>
        
        <View style={styles.dateContainer}>
          <View style={styles.locationRow}>
            <MaterialIcons name="schedule" size={16} color="#6B7280" />
            <Text style={styles.dateLabel}>Fecha:</Text>
          </View>
          <Text style={styles.dateText}>
            {item.createdAt ? new Date(item.createdAt).toLocaleString('es-ES') : 'Fecha no disponible'}
          </Text>
        </View>
      </View>
      
      {!selectMode && (
        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => handleSelectRequest(item)}
        >
          <MaterialIcons name="visibility" size={16} color="#fff" />
          <Text style={styles.viewDetailsText}>Ver detalles</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading && assignedRides.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando solicitudes...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <AppHeader subtitle="Solicitudes de viaje" />
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Indicador de nuevas solicitudes */}
          {hasNewRequests && (
            <View style={styles.newRequestsBanner}>
              <MaterialIcons name="notifications-active" size={20} color="#fff" />
              <Text style={styles.newRequestsText}>
                🚨 ¡Nuevas solicitudes disponibles! Toca para refrescar
              </Text>
              <TouchableOpacity 
                style={styles.refreshNowButton}
                onPress={() => {
                  setHasNewRequests(false);
                  fetchRequests(true);
                }}
              >
                <Text style={styles.refreshNowText}>Refrescar</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Botones de acción */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                loading && styles.actionButtonDisabled,
                hasNewRequests && styles.actionButtonNewRequests
              ]} 
              onPress={handleManualRefresh}
              disabled={loading}
            >
              <MaterialIcons 
                name={loading ? 'hourglass-empty' : hasNewRequests ? 'notifications-active' : 'refresh'} 
                size={20} 
                color={loading ? '#9CA3AF' : hasNewRequests ? '#10B981' : '#2563EB'} 
              />
              <Text style={[
                styles.actionButtonText, 
                loading && styles.actionButtonTextDisabled,
                hasNewRequests && styles.actionButtonTextNewRequests
              ]}>
                {loading ? 'Actualizando...' : hasNewRequests ? '¡Nuevas solicitudes!' : 'Actualizar'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, selectMode && styles.actionButtonActive]} 
              onPress={() => {
                if (selectMode) {
                  setSelectMode(false);
                  setSelectedIds([]);
                } else {
                  setSelectMode(true);
                }
              }}
            >
              <MaterialIcons 
                name={selectMode ? 'close' : 'check-box'} 
                size={20} 
                color={selectMode ? '#fff' : '#2563EB'} 
              />
              <Text style={[styles.actionButtonText, selectMode && styles.actionButtonTextActive]}>
                {selectMode ? "Cancelar" : "Seleccionar"}
              </Text>
            </TouchableOpacity>
            
            {selectMode && selectedIds.length > 0 && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSelected}>
                <MaterialIcons name="delete" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>Borrar ({selectedIds.length})</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Botón de prueba de notificaciones (solo para debug) */}
          <View style={styles.testContainer}>
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={handleTestNotification}
            >
              <MaterialIcons name="notifications" size={16} color="#F59E0B" />
              <Text style={styles.testButtonText}>🧪 Test Notificación</Text>
            </TouchableOpacity>
          </View>
          
          {assignedRides.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons name="local-taxi" size={48} color="#fff" />
              </View>
              <Text style={styles.emptyTitle}>No hay solicitudes disponibles</Text>
              <Text style={styles.emptyDescription}>
                No hay solicitudes de viaje pendientes en este momento. 
                Las nuevas solicitudes aparecerán aquí automáticamente.
              </Text>
            </View>
          ) : (
            <FlatList
              data={assignedRides}
              keyExtractor={(item) => item.id!}
              renderItem={renderRequestItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Detalles del Viaje</Text>
            {selectedRequest && (
              <View style={styles.modalDetails}>
                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Origen: </Text>
                  {selectedRequest.origin?.address}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Destino: </Text>
                  {selectedRequest.destination?.address}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Distancia: </Text>
                  {selectedRequest.distance ? `${(selectedRequest.distance / 1000).toFixed(1)} km` : 'No disponible'}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Duración: </Text>
                  {selectedRequest.duration ? `${Math.round(selectedRequest.duration / 60)} min` : 'No disponible'}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Precio estimado: </Text>
                  {selectedRequest.price ? `$${Number(selectedRequest.price).toFixed(2)}` : 'No disponible'}
                </Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.acceptButton, loading && styles.acceptButtonDisabled]} 
                onPress={handleAccept}
                disabled={loading}
              >
                <Text style={styles.acceptButtonText}>
                  {loading ? 'Aceptando...' : 'Aceptar Viaje'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast de error */}
      {showError && errorMessage && (
        <View style={styles.errorToast}>
          <MaterialIcons name="error" size={20} color="#fff" />
          <Text style={styles.errorToastText}>{errorMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  actionButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  actionButtonTextDisabled: {
    color: '#9CA3AF',
  },
  actionButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  actionButtonTextActive: {
    color: '#fff',
  },
  actionButtonNewRequests: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  actionButtonTextNewRequests: {
    color: '#fff',
  },
  newRequestsBanner: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  newRequestsText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    fontFamily: 'Poppins',
  },
  refreshNowButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginLeft: 10,
  },
  refreshNowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    fontFamily: 'Poppins',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardSelected: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  selectionIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconContainer: {
    backgroundColor: '#2563EB',
    borderRadius: 50,
    padding: 12,
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    fontFamily: 'Poppins',
  },
  cardContent: {
    flex: 1,
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
    fontFamily: 'Poppins',
  },
  locationText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginLeft: 20,
    fontFamily: 'Poppins',
  },
  dateContainer: {
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
    fontFamily: 'Poppins',
  },
  dateText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginLeft: 20,
    fontFamily: 'Poppins',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontFamily: 'Poppins',
  },
  emptyCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    backgroundColor: '#2563EB',
    borderRadius: 50,
    padding: 20,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2937',
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Poppins',
    marginBottom: 24,
  },
  list: {
    paddingBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  modalDetails: {
    marginBottom: 24,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'Poppins',
  },
  modalLabel: {
    fontWeight: '600',
    color: '#6B7280',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  testContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
    justifyContent: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 6,
    fontFamily: 'Poppins',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  errorToast: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
  },
  errorToastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Poppins',
  },
});