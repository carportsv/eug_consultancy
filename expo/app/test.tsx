import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TestHub(): React.JSX.Element {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🧪 Centro de Testing</Text>
        <Text style={styles.subtitle}>Elige una prueba</Text>

        {/* Botón 1: Notificaciones */}
        <TouchableOpacity style={[styles.card, styles.cardNotifications]} onPress={() => router.push('/testing/notifications')}>
          <MaterialIcons name="notifications" size={28} color="#F59E0B" />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Notificaciones</Text>
            <Text style={styles.cardSubtitle}>Probar push/local y conexión</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Botón 2: Solicitar Taxi (Testing) */}
        <TouchableOpacity style={[styles.card, styles.cardTesting]} onPress={() => router.push('/testing/solicitar_taxi')}>
          <MaterialIcons name="local-taxi" size={28} color="#DC2626" />
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: '#DC2626' }]}>Solicitar Taxi (Testing)</Text>
            <Text style={[styles.cardSubtitle, { color: '#9CA3AF' }]}>Versión de prueba</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Botón 3: Solicitar Taxi (Oficial) */}
        <TouchableOpacity style={[styles.card, styles.cardPrimary]} onPress={() => router.push('/user/user_ride')}>
          <MaterialIcons name="local-taxi" size={28} color="#fff" />
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: '#fff' }]}>Solicitar Taxi (Oficial)</Text>
            <Text style={[styles.cardSubtitle, { color: '#E5E7EB' }]}>Versión oficial migrada</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#E5E7EB" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardNotifications: {},
  cardTesting: { backgroundColor: '#FEF2F2', borderColor: '#DC2626' },
  cardPrimary: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardSubtitle: { fontSize: 14, color: '#6B7280' },
});


