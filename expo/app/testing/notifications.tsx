import { useAuth } from '@/contexts/AuthContext';
import { NotificationService } from '@/services/notificationService';
import { supabase } from '@/services/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Vibration } from 'react-native';

export default function TestingNotifications(): React.JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const testLocalNotification = async () => {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      if (permissions.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        if (req.status !== 'granted') {
          Alert.alert('Permisos denegados', 'Habilita las notificaciones en ajustes.');
          return;
        }
      }

      Vibration.vibrate([0, 250, 100, 250]);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test - Notificación local',
          body: 'Este es un mensaje de prueba',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });

      Alert.alert('Listo', 'Notificación local enviada.');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const simulateRideRequest = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'No hay usuario autenticado');
      return;
    }
    setIsLoading(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', user.uid)
        .single();

      if (!userData?.id) {
        Alert.alert('Error', 'No se pudo obtener el user_id');
        setIsLoading(false);
        return;
      }

      const testRequest = {
        user_id: userData.id,
        origin: { address: 'Centro Comercial Metrocentro', coordinates: { latitude: 13.7942, longitude: -88.8965 } },
        destination: { address: 'Universidad de El Salvador', coordinates: { latitude: 13.7, longitude: -89.2 } },
        status: 'requested',
        created_at: new Date().toISOString(),
        distance: 8500,
        duration: 900,
        price: 15.0,
      };

      const { data, error } = await supabase.from('ride_requests').insert([testRequest]).select();
      if (error) throw error;

      try {
        await NotificationService.sendPushToAvailableDrivers({
          title: '🚕 Nueva Solicitud de Viaje!',
          body: 'Hay una nueva solicitud disponible.',
          data: { rideRequestId: data?.[0]?.id, type: 'new_ride_request' },
          sound: true,
        });
      } catch {}

      Alert.alert('Éxito', 'Solicitud creada y push enviado');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkSupabaseConnection = async () => {
    try {
      const { error } = await supabase.from('ride_requests').select('id').limit(1);
      if (error) throw error;
      Alert.alert('Conexión OK', 'Supabase responde correctamente.');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🔔 Testing de Notificaciones</Text>

        <TouchableOpacity style={styles.button} onPress={testLocalNotification}>
          <MaterialIcons name="notifications" size={22} color="#fff" />
          <Text style={styles.buttonText}>Probar notificación local</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={checkSupabaseConnection}>
          <MaterialIcons name="cloud" size={22} color="#2563EB" />
          <Text style={[styles.buttonText, { color: '#2563EB' }]}>Verificar conexión</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.primary]} onPress={simulateRideRequest} disabled={isLoading}>
          <MaterialIcons name="local-taxi" size={22} color="#fff" />
          <Text style={styles.buttonText}>{isLoading ? 'Creando...' : 'Simular solicitud de viaje'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: '#111827' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#111827',
    marginBottom: 12,
  },
  primary: { backgroundColor: '#2563EB' },
  secondary: { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE', borderWidth: 1 },
  buttonText: { color: '#fff', fontWeight: '700' },
  back: { flexDirection: 'row', gap: 8, justifyContent: 'center', padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8, marginTop: 16 },
  backText: { color: '#6B7280', fontWeight: '600' },
});


