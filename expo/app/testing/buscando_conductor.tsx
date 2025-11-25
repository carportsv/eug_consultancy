import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, BackHandler, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/services/supabaseClient';
import ChatModal from '@/components/ChatModal';

export default function TestingBuscandoConductor(): React.JSX.Element {
  const router = useRouter();
  const { rideId, price, origin, destination } = useLocalSearchParams();
  const [status, setStatus] = useState<string>('requested');
  const [driver, setDriver] = useState<any>(null);
  const [etaToUser, setEtaToUser] = useState<string>('');
  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [driverCoords, setDriverCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showChat, setShowChat] = useState(false);

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

    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  // Suscribirse a cambios del driver para actualizar car_info en vivo
  useEffect(() => {
    if (!driver?.id) return;
    const ch = supabase
      .channel(`driver_${driver.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers', filter: `id=eq.${driver.id}` }, async (payload: any) => {
        try {
          const row = (payload as any).new || (payload as any).old;
          if (!row) return;
          const { data } = await supabase
            .from('drivers')
            .select('*, users:user_id!inner(display_name, phone_number, photo_url)')
            .eq('id', row.id)
            .single();
          if (!data) return;
          const userInfo: any = (data as any).users || {};
          const carInfo: any = (data as any).car_info || {};
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
        } catch {}
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [driver?.id]);

  // Bloquear botón atrás (hardware) cuando ya hay un viaje aceptado
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'accepted') {
        Alert.alert('Viaje en curso', 'No puedes regresar al resumen. Usa "Ir a Viaje Activo".');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [status]);

  const cancelRequest = async () => {
    try {
      await supabase.from('ride_requests').update({ status: 'cancelled', updated_at: new Date() }).eq('id', rideId);
      Alert.alert('Cancelado', 'Tu solicitud fue cancelada.');
      router.back();
    } catch (e) {
      Alert.alert('Error', 'No se pudo cancelar.');
    }
  };

  useEffect(() => {
    if (status === 'accepted' && driver) {
      // Mantenerse en esta pantalla y permitir que el usuario toque el botón para ir a Viaje Activo
      // (sin navegación automática)
    }
  }, [status, driver]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (status === 'accepted') {
              Alert.alert('Viaje en curso', 'No puedes regresar al resumen. Usa "Ir a Viaje Activo".');
            } else {
              router.back();
            }
          }}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buscando conductor…</Text>
      </View>

      <View style={styles.content}>
        {status !== 'accepted' ? (
          <>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.text}>Buscando un conductor cercano…</Text>
          </>
        ) : (
          <View style={styles.driverBox}>
            <Text style={styles.driverTitle}>Conductor asignado</Text>
            <View style={styles.driverRow}>
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={36} color="#666" />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.driverName}>{driver?.name || 'Conductor'}</Text>
                {driver?.car && <Text style={styles.driverMeta}>{driver.car}</Text>}
                {driver?.plate && <Text style={styles.driverMeta}>Placa: {driver.plate}</Text>}
              </View>
            </View>
            
            {/* Foto del vehículo */}
            {driver?.vehiclePhoto && (
              <View style={styles.vehiclePhotoContainer}>
                <Text style={styles.vehiclePhotoLabel}>Vehículo:</Text>
                <Image source={{ uri: driver.vehiclePhoto }} style={styles.vehiclePhoto} />
              </View>
            )}
            {!!etaToUser && (
              <Text style={[styles.driverText, { marginTop: 8 }]}>ETA real: {etaToUser}</Text>
            )}
            {driver?.phone ? (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${driver.phone}`)}
                >
                  <MaterialIcons name="call" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chatBtn}
                  onPress={() => {
                    // Solo mostrar chat si el viaje está aceptado (conductor en camino)
                    if (status === 'accepted') {
                      setShowChat(true);
                    } else {
                      Alert.alert('Chat', 'El chat estará disponible cuando el conductor esté en camino');
                    }
                  }}
                >
                  <MaterialIcons name="chat" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {status === 'requested' && (
        <TouchableOpacity style={styles.cancelBtn} onPress={cancelRequest}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      )}

      {status === 'accepted' && (
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace({ pathname: '/user/user_active_ride', params: { rideId: String(rideId || '') } })}>
          <Text style={styles.homeText}>Ir a Viaje Activo</Text>
        </TouchableOpacity>
      )}

      {/* Chat Modal */}
      <ChatModal
        visible={showChat}
        onClose={() => setShowChat(false)}
        rideId={rideId as string || ''}
        userType="user"
        otherParticipantName={driver?.name || 'Conductor'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomColor: '#E5E7EB', borderBottomWidth: 1 },
  backButton: { padding: 6, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 12 },
  text: { color: '#374151', fontSize: 13 },
  driverBox: { marginTop: 18, padding: 18, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', width: '92%', alignSelf: 'center', alignItems: 'center' },
  driverTitle: { fontWeight: '700', color: '#111827', marginBottom: 10, fontSize: 18, textAlign: 'center' },
  driverRow: { flexDirection: 'column', alignItems: 'center', gap: 14 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  driverName: { color: '#111827', fontWeight: '700', fontSize: 20, textAlign: 'center', marginTop: 6 },
  driverMeta: { color: '#6B7280', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  driverText: { color: '#374151', fontSize: 14, textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  callBtn: { backgroundColor: '#10B981', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  chatBtn: { backgroundColor: '#2563EB', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  vehiclePhotoContainer: { marginTop: 16, alignItems: 'center' },
  vehiclePhotoLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  vehiclePhoto: { width: 200, height: 120, borderRadius: 12, backgroundColor: '#F3F4F6' },
  cancelBtn: { margin: 12, backgroundColor: '#EF4444', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#fff', fontWeight: '700' },
  homeBtn: { margin: 12, backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  homeText: { color: '#fff', fontWeight: '700' },
});


