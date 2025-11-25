import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export default function TestingSolicitarTaxiSummary(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userId } = useAuth();

  const origin = String(params.origin || '');
  const destination = String(params.destination || '');
  const km = Number(params.km || 0);
  const min = Number(params.min || 0);
  const basePrice = Number(params.price || 0);
  const ox = Number(params.ox || 0);
  const oy = Number(params.oy || 0);
  const dx = Number(params.dx || 0);
  const dy = Number(params.dy || 0);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [tipPct, setTipPct] = useState<number>(0);
  const [promo, setPromo] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const discount = useMemo(() => (promo.trim().toUpperCase() === 'TEST10' ? 0.1 : 0), [promo]);
  const tipAmount = useMemo(() => Math.round(basePrice * tipPct * 100) / 100, [basePrice, tipPct]);
  const discountAmount = useMemo(() => Math.round(basePrice * discount * 100) / 100, [basePrice, discount]);
  const total = useMemo(() => Math.max(0, Math.round((basePrice + tipAmount - discountAmount) * 100) / 100), [basePrice, tipAmount, discountAmount]);

  const confirmRequest = async () => {
    try {
      setLoading(true);
      // Usamos el uid de Firebase provisto por AuthContext (como en el oficial)
      if (!userId) {
        Alert.alert('Sesión requerida', 'Inicia sesión para solicitar un viaje.');
        setLoading(false);
        return;
      }
      // Obtener UUID de Supabase (users.id) a partir del firebase_uid
      let supabaseUserId: string | null = null;
      try {
        const { data: u } = await supabase
          .from('users')
          .select('id')
          .eq('firebase_uid', userId)
          .maybeSingle();
        if (u?.id) supabaseUserId = u.id as string;
        if (!supabaseUserId) {
          // Crear registro mínimo si no existe
          const { data: inserted } = await supabase
            .from('users')
            .insert({ firebase_uid: userId })
            .select('id')
            .single();
          if (inserted?.id) supabaseUserId = inserted.id as string;
        }
      } catch {}
      if (!supabaseUserId) {
        Alert.alert('Sesión inválida', 'No se pudo vincular tu usuario en la base de datos. Intenta cerrar y abrir sesión.');
        setLoading(false);
        return;
      }
      const { createRideRequest } = await import('@/services/rideService');
      const rideId = await createRideRequest({
        userId: supabaseUserId,
        origin: { address: origin, coordinates: { latitude: ox, longitude: oy } },
        destination: { address: destination, coordinates: { latitude: dx, longitude: dy } },
        status: 'requested',
        price: total,
        distance: Number.isFinite(km) ? km * 1000 : undefined,
        duration: Number.isFinite(min) ? min * 60 : undefined,
      } as any);

      // Envío redundante de push directo a drivers activos (solo testing)
      try {
        const { NotificationService } = await import('@/services/notificationService');
        await NotificationService.sendPushToAvailableDrivers({
          title: '🚗 Nueva Solicitud de Viaje',
          body: `${origin} → ${destination}`,
          data: { type: 'new_ride_request', rideId },
        } as any);
      } catch (pushError) {
        // No bloquear el flujo si falla
      }

      router.push({ pathname: '/testing/buscando_conductor', params: { rideId, price: String(total), origin, destination } });
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resumen y pago</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Viaje</Text>
        <View style={styles.row}><Text style={styles.label}>Origen</Text><Text style={styles.value} numberOfLines={1}>{origin}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Destino</Text><Text style={styles.value} numberOfLines={1}>{destination}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Distancia</Text><Text style={styles.value}>{km.toFixed(1)} km</Text></View>
        <View style={styles.row}><Text style={styles.label}>Tiempo</Text><Text style={styles.value}>{min} min</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Pago</Text>
        <View style={styles.methods}>
          <TouchableOpacity onPress={() => setPaymentMethod('cash')} style={[styles.methodBtn, paymentMethod === 'cash' && styles.methodSelected]}>
            <MaterialIcons name="money" size={18} color={paymentMethod === 'cash' ? '#111827' : '#6B7280'} />
            <Text style={[styles.methodText, paymentMethod === 'cash' && styles.methodTextSel]}>Efectivo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPaymentMethod('card')} style={[styles.methodBtn, paymentMethod === 'card' && styles.methodSelected]}>
            <MaterialIcons name="credit-card" size={18} color={paymentMethod === 'card' ? '#111827' : '#6B7280'} />
            <Text style={[styles.methodText, paymentMethod === 'card' && styles.methodTextSel]}>Tarjeta</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Propina</Text>
        <View style={styles.tips}>
          {[0, 0.1, 0.15].map(p => (
            <TouchableOpacity key={p} onPress={() => setTipPct(p)} style={[styles.tipBtn, tipPct === p && styles.tipSelected]}>
              <Text style={[styles.tipText, tipPct === p && styles.tipTextSel]}>{p === 0 ? '0%' : `${Math.round(p*100)}%`}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Código promocional</Text>
        <TextInput
          placeholder="Ingresa código (p. ej., TEST10)"
          value={promo}
          onChangeText={setPromo}
          style={styles.input}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Total</Text>
        <View style={styles.row}><Text style={styles.label}>Tarifa</Text><Text style={styles.value}>${basePrice.toFixed(2)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Propina</Text><Text style={styles.value}>${tipAmount.toFixed(2)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Descuento</Text><Text style={styles.value}>-${discountAmount.toFixed(2)}</Text></View>
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, marginTop: 6 }]}>
          <Text style={[styles.label, { fontWeight: '700' }]}>A pagar</Text>
          <Text style={[styles.value, { fontWeight: '700' }]}>${total.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.cta, loading && { opacity: 0.7 }]} onPress={confirmRequest} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Solicitar ahora</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomColor: '#E5E7EB', borderBottomWidth: 1 },
  backButton: { padding: 6, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  section: { padding: 12, borderBottomColor: '#F3F4F6', borderBottomWidth: 8 },
  title: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  label: { fontSize: 12, color: '#6B7280' },
  value: { fontSize: 12, color: '#111827', marginLeft: 12, flexShrink: 1, textAlign: 'right' },
  methods: { flexDirection: 'row', gap: 8 },
  methodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  methodSelected: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  methodText: { fontSize: 12, color: '#6B7280' },
  methodTextSel: { color: '#111827', fontWeight: '700' },
  tips: { flexDirection: 'row', gap: 8 },
  tipBtn: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  tipSelected: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  tipText: { fontSize: 12, color: '#6B7280' },
  tipTextSel: { color: '#111827', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: '#111827' },
  cta: { margin: 12, backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700' },
});

