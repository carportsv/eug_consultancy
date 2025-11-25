import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ParticipantInfo {
  name: string;
  phone?: string;
  photo?: string | null;
  rating?: number;
  car?: string;
  plate?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
}

export interface RideInfo {
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  fare: string;
  eta: string;
  etaType?: 'driver_to_user' | 'driver_to_destination' | 'user_waiting_driver';
  etaDescription?: string;
  driverToUserETA?: string;
  userToDestinationETA?: string;
  driverToUserDistance?: string;
  userToDestinationDistance?: string;
}

export interface RideInfoCardProps {
  participant: ParticipantInfo;
  rideInfo: RideInfo;
  status: 'searching' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  isDriver?: boolean;
  roleLabel?: string;
  onCall?: () => void;
  onMessage?: () => void;
  onCancel?: () => void;
  style?: any;
}

export default function RideInfoCard({
  participant,
  rideInfo,
  status,
  isDriver = false,
  roleLabel,
  onCall,
  onMessage,
  onCancel,
  style
}: RideInfoCardProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'searching':
        return {
          title: isDriver ? 'Viaje Asignado' : 'Buscando Conductor',
          color: '#FF9800',
          icon: isDriver ? 'car' : 'search'
        };
      case 'accepted':
        return {
          title: isDriver ? 'Dirigirse al Usuario' : 'Conductor en Camino',
          color: '#2196F3',
          icon: isDriver ? 'navigate' : 'car'
        };
      case 'in_progress':
        return {
          title: 'En Viaje',
          color: '#4CAF50',
          icon: 'time'
        };
      case 'completed':
        return {
          title: 'Viaje Completado',
          color: '#4CAF50',
          icon: 'checkmark-circle'
        };
      case 'cancelled':
        return {
          title: 'Viaje Cancelado',
          color: '#F44336',
          icon: 'close-circle'
        };
      default:
        return {
          title: 'Estado Desconocido',
          color: '#9E9E9E',
          icon: 'help-circle'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const participantType = roleLabel || (isDriver ? 'Conductor' : 'Pasajero');
  
  // Validar que todos los valores sean strings válidos
  const safeParticipant = {
    name: String(participant.name || 'Usuario'),
    phone: String(participant.phone || ''),
    photo: participant.photo || null,
    rating: Number(participant.rating || 0),
    car: String(participant.car || ''),
    plate: String(participant.plate || ''),
    vehicleMake: String(participant.vehicleMake || ''),
    vehicleModel: String(participant.vehicleModel || ''),
    vehicleColor: String(participant.vehicleColor || ''),
  };
  
  const safeRideInfo = {
    origin: String(rideInfo.origin || ''),
    destination: String(rideInfo.destination || ''),
    distance: String(rideInfo.distance || ''),
    duration: String(rideInfo.duration || ''),
    fare: String(rideInfo.fare || ''),
    eta: String(rideInfo.eta || ''),
    etaType: rideInfo.etaType,
    etaDescription: String(rideInfo.etaDescription || ''),
    driverToUserETA: String(rideInfo.driverToUserETA || ''),
    userToDestinationETA: String(rideInfo.userToDestinationETA || ''),
    driverToUserDistance: String(rideInfo.driverToUserDistance || ''),
    userToDestinationDistance: String(rideInfo.userToDestinationDistance || ''),
  };

  // Validación adicional para evitar renderizado con datos inválidos
  if (!participant || !rideInfo) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>Error: Datos no disponibles</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header con estado */}
      <View style={[styles.statusHeader, { backgroundColor: statusInfo.color }]}>
        <Ionicons name={statusInfo.icon as any} size={20} color="white" />
        <Text style={styles.statusTitle}>{statusInfo.title}</Text>
      </View>

      {/* Información del participante */}
      <View style={styles.participantSection}>
        <View style={styles.participantInfo}>
          {safeParticipant.photo ? (
            <Image source={{ uri: safeParticipant.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#666" />
            </View>
          )}
          
          <View style={styles.participantDetails}>
            <Text style={styles.participantName}>{safeParticipant.name}</Text>
            <Text style={styles.participantType}>{participantType}</Text>
            
            {safeParticipant.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{safeParticipant.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Botones de contacto */}
        <View style={styles.contactButtons}>
          {onCall && safeParticipant.phone && (
            <TouchableOpacity style={styles.contactButton} onPress={onCall}>
              <Ionicons name="call" size={20} color="#2196F3" />
            </TouchableOpacity>
          )}
          
          {onMessage && (
            <TouchableOpacity style={styles.contactButton} onPress={onMessage}>
              <Ionicons name="chatbubble" size={20} color="#4CAF50" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Información del vehículo (solo para conductor) */}
      {roleLabel === 'Conductor' && (
        <View style={styles.vehicleSection}>
          <Ionicons name="car" size={16} color="#666" />
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleText}>
              {safeParticipant.vehicleMake && safeParticipant.vehicleModel 
                ? `${safeParticipant.vehicleMake} ${safeParticipant.vehicleModel}`
                : safeParticipant.car || 'Marca y modelo no registrados'
              }
            </Text>
            <Text style={styles.vehicleText}>
              Color: {safeParticipant.vehicleColor || 'No especificado'}
            </Text>
            <Text style={styles.vehicleText}>
              Placa: {safeParticipant.plate || 'No registrada'}
            </Text>
          </View>
        </View>
      )}

      {/* Información del viaje */}
      <View style={styles.rideSection}>
        <View style={styles.rideItem}>
          <Ionicons name="location" size={16} color="#4CAF50" />
          <View style={styles.rideTextContainer}>
            <Text style={styles.rideLabel}>Origen</Text>
            <Text style={styles.rideValue} numberOfLines={2}>{String(safeRideInfo.origin)}</Text>
          </View>
        </View>

        <View style={styles.rideItem}>
          <Ionicons name="location" size={16} color="#F44336" />
          <View style={styles.rideTextContainer}>
            <Text style={styles.rideLabel}>Destino</Text>
            <Text style={styles.rideValue} numberOfLines={2}>{String(safeRideInfo.destination)}</Text>
          </View>
        </View>

        <View style={styles.rideStats}>
          {safeRideInfo.distance && (
            <View style={styles.statItem}>
              <Ionicons name="resize" size={16} color="#666" />
              <Text style={styles.statText}>{String(safeRideInfo.distance)}</Text>
            </View>
          )}
          
          {safeRideInfo.duration && (
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color="#666" />
              <Text style={styles.statText}>{String(safeRideInfo.duration)}</Text>
            </View>
          )}
          
          {safeRideInfo.eta && (
            <View style={styles.statItem}>
              <Ionicons name="navigate" size={16} color="#666" />
              <Text style={styles.statText}>
                {`${String(safeRideInfo.etaDescription || 'ETA')}: ${String(safeRideInfo.eta)}`}
              </Text>
            </View>
          )}
        </View>

        {/* ETAs y distancias en filas separadas */}
        {(safeRideInfo.driverToUserETA || safeRideInfo.userToDestinationETA || safeRideInfo.driverToUserDistance || safeRideInfo.userToDestinationDistance) && (
          <View style={styles.etaSection}>
            {/* ETA y distancia del conductor al usuario */}
            {(safeRideInfo.driverToUserETA || safeRideInfo.driverToUserDistance) && (
              <View style={styles.etaRow}>
                <Ionicons name="car" size={16} color="#2196F3" />
                <Text style={styles.etaText}>
                  {`Al usuario: ${String(safeRideInfo.driverToUserETA) || ''}${safeRideInfo.driverToUserDistance ? ` (${String(safeRideInfo.driverToUserDistance)})` : ''}`}
                </Text>
              </View>
            )}

            {/* ETA y distancia del usuario al destino */}
            {(safeRideInfo.userToDestinationETA || safeRideInfo.userToDestinationDistance) && (
              <View style={styles.etaRow}>
                <Ionicons name="flag" size={16} color="#F44336" />
                <Text style={styles.etaText}>
                  {`Al destino: ${String(safeRideInfo.userToDestinationETA) || ''}${safeRideInfo.userToDestinationDistance ? ` (${String(safeRideInfo.userToDestinationDistance)})` : ''}`}
                </Text>
              </View>
            )}
          </View>
        )}

        {safeRideInfo.fare && (
          <View style={styles.fareSection}>
            <Text style={styles.fareLabel}>Tarifa</Text>
            <Text style={styles.fareValue}>{String(safeRideInfo.fare)}</Text>
          </View>
        )}

        {/* Botón de cancelación para conductor - solo fuera del modal */}
        {isDriver && onCancel && (status === 'accepted' || status === 'in_progress') && !style && (
          <View style={styles.cancelSection}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.cancelButtonText}>Cancelar Viaje</Text>
            </TouchableOpacity>
          </View>
        )}


      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 0, // Sin margen para ocupar todo el ancho
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    padding: 20, // Padding más equilibrado
    paddingHorizontal: 16, // Padding horizontal reducido para más ancho
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 80, // Altura mínima para más espacio
    width: '100%', // Ocupar todo el ancho disponible
  },
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0, // Permite que use todo el espacio disponible
  },
  avatar: {
    width: 50, // Tamaño equilibrado
    height: 50, // Tamaño equilibrado
    borderRadius: 25, // Tamaño equilibrado
    marginRight: 8, // Espaciado reducido para más ancho
  },
  avatarPlaceholder: {
    width: 50, // Tamaño equilibrado
    height: 50, // Tamaño equilibrado
    borderRadius: 25, // Tamaño equilibrado
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8, // Espaciado reducido para más ancho
  },
  participantDetails: {
    flex: 1,
    minWidth: 0, // Evita que el texto se corte
  },
  participantName: {
    fontSize: 18, // Tamaño equilibrado
    fontWeight: '600',
    color: '#333',
  },
  participantType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    flexShrink: 1, // Permite que el texto se ajuste
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
  cancelSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  closeButton: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    padding: 20,
  },
}); 