import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { DriverService } from '@/services/driverService';
import { supabase } from '@/services/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RideRequest {
  id: string;
  origin: { address: string };
  destination: { address: string };
  status: string;
  createdAt: string;
  userId?: string;
  driverId?: string;
  passengerName?: string;
}

const DriverHistoryScreen = () => {
  const { userId: firebaseUid } = useAuth();
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchDriverIdAndLoad = async () => {
      console.log('[DriverHistory] useEffect iniciado con firebaseUid:', firebaseUid);
      
      if (!firebaseUid) {
        console.error('[DriverHistory] No hay firebaseUid disponible');
        Alert.alert('Error', 'No se pudo obtener el ID del conductor');
        setLoading(false);
        return;
      }
      
      // Obtener el driver_id de Supabase usando el firebase_uid
      const driverId = await DriverService.getDriverIdByFirebaseUid(firebaseUid);
      console.log('[DriverHistory] Driver ID obtenido:', driverId);
      
      if (!driverId) {
        console.error('[DriverHistory] No se pudo obtener el driver_id de Supabase');
        Alert.alert('Error', 'No se pudo obtener el driver_id de Supabase');
        setLoading(false);
        return;
      }
      
      setDriverId(driverId);
      await loadDriverHistory(driverId);
    };
    fetchDriverIdAndLoad();
  }, [firebaseUid]);

  const loadDriverHistory = async (driverId: string) => {
    try {
      setLoading(true);
      console.log('[DriverHistory] Cargando historial para driver_id:', driverId);
      
      // Primero, vamos a ver todos los viajes en la base de datos para debuggear
      const { data: allRides, error: allRidesError } = await supabase
        .from('ride_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log('[DriverHistory] Todos los viajes en BD (primeros 10):', allRides);
      console.log('[DriverHistory] Error en consulta general:', allRidesError);
      
      // Consultar solo los viajes que realmente pertenecen al conductor
      
      // Consultar solo los viajes que realmente pertenecen al conductor
      const { data: ridesData, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('driver_id', driverId)
        .in('status', ['accepted', 'in_progress', 'completed', 'cancelled'])
        .order('created_at', { ascending: false });
      
      console.log('[DriverHistory] Resultado de la consulta específica:', { ridesData, error });
      
      if (error) {
        console.error('Error al cargar historial:', error);
        Alert.alert('Error', 'No se pudo cargar el historial. Verifica tu conexión o permisos.');
        setLoading(false);
        return;
      }
      
      const formattedRides: RideRequest[] = ridesData.map(ride => ({
        id: ride.id,
        origin: ride.origin,
        destination: ride.destination,
        status: ride.status,
        createdAt: ride.created_at,
        userId: ride.user_id,
        driverId: ride.driver_id,
        passengerName: ride.passenger_name,
      }));
      
      console.log('[DriverHistory] Viajes formateados:', formattedRides);
      setRides(formattedRides);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      Alert.alert('Error', 'No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!driverId) return;
    await loadDriverHistory(driverId);
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar ${selectedIds.length} viaje(s)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              for (const id of selectedIds) {
                const { error } = await supabase
                  .from('ride_requests')
                  .delete()
                  .eq('id', id);
                if (error) {
                  console.error('Error deleting ride:', error);
                  Alert.alert('Error', 'No se pudo eliminar algunos viajes');
                }
              }
              setSelectedIds([]);
              setSelectMode(false);
            } catch (error) {
              console.error('Error deleting rides:', error);
              Alert.alert('Error', 'No se pudieron eliminar algunos viajes');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      case 'in_progress':
        return '#F59E0B';
      case 'accepted':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      case 'in_progress':
        return 'En Progreso';
      case 'accepted':
        return 'Aceptado';
      case 'pending':
        return 'Pendiente';
      default:
        return status;
    }
  };

  const renderItem = ({ item }: { item: RideRequest }) => (
    <TouchableOpacity
      onLongPress={() => setSelectMode(true)}
      onPress={() => selectMode ? handleSelect(item.id) : null}
      style={[
        styles.card, 
        selectMode && selectedIds.includes(item.id) && styles.cardSelected
      ]}
    >
      {selectMode && (
        <View style={styles.selectionIndicator}>
          <MaterialIcons 
            name={selectedIds.includes(item.id) ? 'check-circle' : 'radio-button-unchecked'} 
            size={24} 
            color={selectedIds.includes(item.id) ? '#2563EB' : '#9CA3AF'} 
          />
        </View>
      )}
      
      <View style={styles.cardHeader}>
        <View style={styles.cardIconContainer}>
          <MaterialIcons name="local-taxi" size={24} color="#fff" />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>Viaje #{item.id?.slice(-6)}</Text>
          <Text style={[styles.cardStatus, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        {item.passengerName && (
          <View style={styles.passengerContainer}>
            <View style={styles.locationRow}>
              <MaterialIcons name="person" size={16} color="#8B5CF6" />
              <Text style={styles.passengerLabel}>Pasajero:</Text>
            </View>
            <Text style={styles.passengerText}>{item.passengerName}</Text>
          </View>
        )}
        
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
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString('es-ES')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <AppHeader subtitle="Historial de viajes" />
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, loading && styles.actionButtonDisabled]} 
              onPress={handleManualRefresh}
              disabled={loading}
            >
              <MaterialIcons 
                name={loading ? 'hourglass-empty' : 'refresh'} 
                size={20} 
                color={loading ? '#9CA3AF' : '#2563EB'} 
              />
              <Text style={[styles.actionButtonText, loading && styles.actionButtonTextDisabled]}>
                {loading ? 'Actualizando...' : 'Actualizar'}
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
          
          {rides.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <MaterialIcons name="history" size={48} color="#fff" />
              </View>
              <Text style={styles.emptyTitle}>No hay viajes registrados</Text>
              <Text style={styles.emptyDescription}>
                Aún no tienes viajes en tu historial. 
                Los viajes completados aparecerán aquí automáticamente.
              </Text>
            </View>
          ) : (
            <FlatList
              data={rides}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default DriverHistoryScreen;

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
    fontFamily: 'Poppins',
  },
  cardContent: {
    flex: 1,
  },
  passengerContainer: {
    marginBottom: 12,
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  passengerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
    fontFamily: 'Poppins',
  },
  passengerText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginLeft: 20,
    fontFamily: 'Poppins',
    fontWeight: '500',
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
}); 