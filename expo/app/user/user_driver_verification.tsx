import AppHeader from '@/components/AppHeader';
import { supabase } from '@/services/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DriverVerificationScreen() {
  const router = useRouter();
  const { driverId } = useLocalSearchParams();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadDriverData = async () => {
      if (!driverId) {
        console.log('[DriverVerification] No hay driverId');
        setLoading(false);
        return;
      }

      try {
        console.log('[DriverVerification] Cargando datos del conductor:', driverId);
        
        const { data: driver, error } = await supabase
          .from('drivers')
          .select(`
            *,
            users:user_id (
              display_name,
              photo_url
            )
          `)
          .eq('id', driverId)
          .single();

        if (error) {
          console.error('[DriverVerification] Error al obtener datos del conductor:', error);
          setDriverData({
            name: 'Conductor no encontrado',
            license: 'No disponible',
            carMake: 'No disponible',
            carModel: 'No disponible',
            carColor: 'No disponible',
            carPlate: 'No disponible',
            driverPhoto: null,
            vehiclePhoto: null,
            platePhoto: null,
            rating: 0,
            trips: 0,
          });
          setLoading(false);
          return;
        }

        if (driver) {
          console.log('[DriverVerification] Datos del conductor obtenidos:', driver);
          
          setDriverData({
            name: driver.users?.display_name || 'Conductor',
            license: driver.documents?.license || 'No disponible',
            carMake: driver.car_info?.make || 'No disponible',
            carModel: driver.car_info?.model || 'No disponible',
            carColor: driver.car_info?.color || 'No disponible',
            carPlate: driver.car_info?.plate || 'No disponible',
            driverPhoto: driver.users?.photo_url || null,
            vehiclePhoto: driver.documents?.vehicle_photo || null,
            platePhoto: driver.documents?.plate_photo || null,
            rating: driver.rating || 0,
            trips: driver.total_rides || 0,
          });
        } else {
          console.log('[DriverVerification] No se encontró el conductor');
          setDriverData({
            name: 'Conductor no encontrado',
            license: 'No disponible',
            carMake: 'No disponible',
            carModel: 'No disponible',
            carColor: 'No disponible',
            carPlate: 'No disponible',
            driverPhoto: null,
            vehiclePhoto: null,
            platePhoto: null,
            rating: 0,
            trips: 0,
          });
        }
      } catch (error) {
        console.error('[DriverVerification] Error al cargar datos del conductor:', error);
        setDriverData({
          name: 'Error al cargar datos',
          license: 'No disponible',
          carMake: 'No disponible',
          carModel: 'No disponible',
          carColor: 'No disponible',
          carPlate: 'No disponible',
          driverPhoto: null,
          vehiclePhoto: null,
          platePhoto: null,
          rating: 0,
          trips: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadDriverData();
  }, [driverId]);

  const handleConfirmRide = () => {
    // Aquí iría la lógica para confirmar el viaje
    router.push('/user/user_ride');
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader subtitle="Verificación del conductor" />
        <View style={styles.center}>
          <Text>Cargando datos del conductor...</Text>
        </View>
      </View>
    );
  }

  if (!driverData) {
    return (
      <View style={styles.container}>
        <AppHeader subtitle="Verificación del conductor" />
        <View style={styles.center}>
          <Text>No se pudieron cargar los datos del conductor</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Verificación del conductor" />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.driverInfoCard}>
          <View style={styles.driverHeader}>
            <View style={styles.avatarContainer}>
              {driverData.driverPhoto ? (
                <Image source={{ uri: driverData.driverPhoto }} style={styles.driverAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialIcons name="person" size={32} color="#9CA3AF" />
                </View>
              )}
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{driverData.name}</Text>
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingText}>{driverData.rating}</Text>
                <Text style={styles.tripsText}>• {driverData.trips} viajes</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.verificationSection}>
          <Text style={styles.sectionTitle}>Verificación de Seguridad</Text>
          <Text style={styles.sectionSubtitle}>
            Confirma que la información coincide con tu conductor
          </Text>
        </View>

        <View style={styles.photoCard}>
          <Text style={styles.photoTitle}>Foto del Conductor</Text>
          <View style={styles.photoContainer}>
            {driverData.driverPhoto ? (
              <Image source={{ uri: driverData.driverPhoto }} style={styles.verificationPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialIcons name="person" size={48} color="#9CA3AF" />
                <Text style={styles.photoPlaceholderText}>Foto no disponible</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.photoCard}>
          <Text style={styles.photoTitle}>Foto del Vehículo</Text>
          <View style={styles.photoContainer}>
            {driverData.vehiclePhoto ? (
              <Image source={{ uri: driverData.vehiclePhoto }} style={styles.verificationPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialIcons name="directions-car" size={48} color="#9CA3AF" />
                <Text style={styles.photoPlaceholderText}>Foto no disponible</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.photoCard}>
          <Text style={styles.photoTitle}>Foto de la Placa</Text>
          <View style={styles.photoContainer}>
            {driverData.platePhoto ? (
              <Image source={{ uri: driverData.platePhoto }} style={styles.verificationPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialIcons name="text-fields" size={48} color="#9CA3AF" />
                <Text style={styles.photoPlaceholderText}>Foto no disponible</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.vehicleInfoCard}>
          <Text style={styles.vehicleInfoTitle}>Información del Vehículo</Text>
          <View style={styles.vehicleInfoRow}>
            <Text style={styles.vehicleInfoLabel}>Marca:</Text>
            <Text style={styles.vehicleInfoValue}>{driverData.carMake}</Text>
          </View>
          <View style={styles.vehicleInfoRow}>
            <Text style={styles.vehicleInfoLabel}>Modelo:</Text>
            <Text style={styles.vehicleInfoValue}>{driverData.carModel}</Text>
          </View>
          <View style={styles.vehicleInfoRow}>
            <Text style={styles.vehicleInfoLabel}>Color:</Text>
            <Text style={styles.vehicleInfoValue}>{driverData.carColor}</Text>
          </View>
          <View style={styles.vehicleInfoRow}>
            <Text style={styles.vehicleInfoLabel}>Placa:</Text>
            <Text style={styles.vehicleInfoValue}>{driverData.carPlate}</Text>
          </View>
          <View style={styles.vehicleInfoRow}>
            <Text style={styles.vehicleInfoLabel}>Licencia:</Text>
            <Text style={styles.vehicleInfoValue}>{driverData.license}</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmRide}>
            <MaterialIcons name="check-circle" size={20} color="#fff" />
            <Text style={styles.confirmButtonText}>Confirmar Viaje</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <MaterialIcons name="cancel" size={20} color="#EF4444" />
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  },
  scrollContent: {
    padding: 16,
  },
  driverInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  tripsText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  verificationSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  photoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  photoContainer: {
    alignItems: 'center',
  },
  verificationPhoto: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  vehicleInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  vehicleInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  vehicleInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  vehicleInfoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 