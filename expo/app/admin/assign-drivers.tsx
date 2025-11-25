import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { AdminService, RideRequest, Driver } from '@/services/adminService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function AssignDriversScreen() {
  const { user } = useAuth();
  const [pendingRides, setPendingRides] = useState<RideRequest[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<RideRequest | null>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rides, drivers, allDriversData, dashboardStats] = await Promise.all([
        AdminService.getPendingRides(),
        AdminService.getAvailableDrivers(),
        AdminService.getAllDrivers(),
        AdminService.getDashboardStats(),
      ]);

      setPendingRides(rides);
      setAvailableDrivers(drivers);
      setAllDrivers(allDriversData);
      setStats(dashboardStats);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAssignDriver = async (rideId: string, driverId: string) => {
    try {
      setAssigning(rideId);
      await AdminService.assignDriverToRide(rideId, driverId);
      
      Alert.alert(
        '✅ Asignación Exitosa',
        'El conductor ha sido asignado al viaje correctamente',
        [{ text: 'OK', onPress: () => loadData() }]
      );
    } catch (error: any) {
      console.error('Error asignando conductor:', error);
      Alert.alert('Error', error.message || 'No se pudo asignar el conductor');
    } finally {
      setAssigning(null);
      setShowDriverModal(false);
      setSelectedRide(null);
    }
  };

  const handleUnassignDriver = async (rideId: string) => {
    Alert.alert(
      'Desasignar Conductor',
      '¿Estás seguro de que quieres desasignar el conductor de este viaje?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desasignar',
          style: 'destructive',
          onPress: async () => {
            try {
              setAssigning(rideId);
              await AdminService.unassignDriverFromRide(rideId);
              
              Alert.alert(
                '✅ Desasignación Exitosa',
                'El conductor ha sido desasignado del viaje',
                [{ text: 'OK', onPress: () => loadData() }]
              );
            } catch (error: any) {
              console.error('Error desasignando conductor:', error);
              Alert.alert('Error', error.message || 'No se pudo desasignar el conductor');
            } finally {
              setAssigning(null);
            }
          },
        },
      ]
    );
  };

  const openDriverSelection = (ride: RideRequest) => {
    setSelectedRide(ride);
    setShowDriverModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return '#FFA500';
      case 'accepted': return '#4CAF50';
      case 'in_progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'requested': return 'Solicitado';
      case 'accepted': return 'Aceptado';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Asignar Conductores</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Dashboard */}
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>📊 Estadísticas (24h)</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.pendingRides}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.activeRides}</Text>
              <Text style={styles.statLabel}>Activos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.availableDrivers}</Text>
              <Text style={styles.statLabel}>Conductores</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.completedRides}</Text>
              <Text style={styles.statLabel}>Completados</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Viajes Pendientes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🚕 Viajes Pendientes ({pendingRides.length})
          </Text>
          
          {pendingRides.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
              <Text style={styles.emptyText}>No hay viajes pendientes</Text>
            </View>
          ) : (
            pendingRides.map((ride) => (
              <View key={ride.id} style={styles.rideCard}>
                <View style={styles.rideHeader}>
                  <View style={styles.rideInfo}>
                    <Text style={styles.rideId}>ID: {ride.id.substring(0, 8)}...</Text>
                    <Text style={styles.rideDate}>
                      {formatDate(ride.created_at)}
                    </Text>
                  </View>
                  <View style={styles.ridePrice}>
                    <Text style={styles.priceText}>${ride.price}</Text>
                  </View>
                </View>

                <View style={styles.rideDetails}>
                  <View style={styles.locationItem}>
                    <Ionicons name="location" size={16} color="#FF6B6B" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {ride.origin.address}
                    </Text>
                  </View>
                  <View style={styles.locationItem}>
                    <Ionicons name="location" size={16} color="#4CAF50" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {ride.destination.address}
                    </Text>
                  </View>
                </View>

                {ride.user && (
                  <View style={styles.userInfo}>
                    <Ionicons name="person" size={16} color="#007AFF" />
                    <Text style={styles.userText}>
                      {ride.user.display_name || ride.user.email}
                    </Text>
                  </View>
                )}

                <View style={styles.rideActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.assignButton]}
                    onPress={() => openDriverSelection(ride)}
                    disabled={assigning === ride.id}
                  >
                    {assigning === ride.id ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="car" size={16} color="white" />
                        <Text style={styles.actionButtonText}>Asignar Conductor</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Conductores Disponibles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            👨‍💼 Conductores Disponibles ({availableDrivers.length})
          </Text>
          
          {availableDrivers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle" size={48} color="#FFA500" />
              <Text style={styles.emptyText}>No hay conductores disponibles</Text>
            </View>
          ) : (
            availableDrivers.map((driver) => (
              <View key={driver.id} style={styles.driverCard}>
                <View style={styles.driverHeader}>
                  <View style={styles.driverInfo}>
                                         <Text style={styles.driverName}>
                       {driver.user?.display_name || driver.user?.email || 'Sin nombre'}
                     </Text>
                    <Text style={styles.driverRating}>
                      ⭐ {driver.rating.toFixed(1)} ({driver.total_rides} viajes)
                    </Text>
                  </View>
                  <View style={styles.driverStatus}>
                    <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                      <Text style={styles.statusText}>Disponible</Text>
                    </View>
                  </View>
                </View>

                {driver.car_info && (
                  <View style={styles.carInfo}>
                    <Ionicons name="car" size={16} color="#666" />
                    <Text style={styles.carText}>
                      {driver.car_info.model} - {driver.car_info.plate}
                    </Text>
                  </View>
                )}

                <View style={styles.driverStats}>
                  <Text style={styles.earningsText}>
                    💰 ${driver.earnings.toFixed(2)} ganados
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal de Selección de Conductor */}
      <Modal
        visible={showDriverModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDriverModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Conductor</Text>
              <TouchableOpacity
                onPress={() => setShowDriverModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedRide && (
              <View style={styles.selectedRideInfo}>
                <Text style={styles.selectedRideTitle}>Viaje Seleccionado:</Text>
                <Text style={styles.selectedRideText}>
                  {selectedRide.origin.address} → {selectedRide.destination.address}
                </Text>
                <Text style={styles.selectedRidePrice}>${selectedRide.price}</Text>
              </View>
            )}

            <ScrollView style={styles.driverList}>
              {availableDrivers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="alert-circle" size={48} color="#FFA500" />
                  <Text style={styles.emptyText}>No hay conductores disponibles</Text>
                </View>
              ) : (
                availableDrivers.map((driver) => (
                  <TouchableOpacity
                    key={driver.id}
                    style={styles.driverOption}
                    onPress={() => {
                      if (selectedRide) {
                        handleAssignDriver(selectedRide.id, driver.id);
                      }
                    }}
                  >
                    <View style={styles.driverOptionInfo}>
                                             <Text style={styles.driverOptionName}>
                         {driver.user?.display_name || driver.user?.email || 'Sin nombre'}
                       </Text>
                      <Text style={styles.driverOptionRating}>
                        ⭐ {driver.rating.toFixed(1)} ({driver.total_rides} viajes)
                      </Text>
                      {driver.car_info && (
                        <Text style={styles.driverOptionCar}>
                          {driver.car_info.model} - {driver.car_info.plate}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 12,
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  rideCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideInfo: {
    flex: 1,
  },
  rideId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  rideDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ridePrice: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rideDetails: {
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
  },
  rideActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  assignButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  driverCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  driverRating: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  driverStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  carInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  carText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  driverStats: {
    alignItems: 'flex-end',
  },
  earningsText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  selectedRideInfo: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedRideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  selectedRideText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  selectedRidePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  driverList: {
    maxHeight: 400,
  },
  driverOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  driverOptionInfo: {
    flex: 1,
  },
  driverOptionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  driverOptionRating: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  driverOptionCar: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});
