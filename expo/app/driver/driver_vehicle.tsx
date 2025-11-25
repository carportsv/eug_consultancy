import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SimpleImageUpload from '@/components/SimpleImageUpload';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseClient';
import { DriverService } from '@/services/driverService';

export default function DriverVehicle(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!user?.uid) return;
      const { data: u } = await supabase.from('users').select('id').eq('firebase_uid', user.uid).maybeSingle();
      if (!u?.id) return;
      setUserId(u.id);
      const { data: d } = await supabase.from('drivers').select('car_info').eq('user_id', u.id).maybeSingle();
      const car = (d as any)?.car_info || {};
      setMake(car.make || '');
      setModel(car.model || '');
      setYear(car.year ? String(car.year) : '');
      setPlate(car.plate || '');
      setColor(car.color || '');
      setVehiclePhoto(car.photo || null);
    };
    init();
  }, [user?.uid]);

  const handleSave = async () => {
    if (!userId) return;
    if (!model.trim() || !plate.trim()) {
      Alert.alert('Faltan datos', 'Modelo y placa son obligatorios');
      return;
    }
    setLoading(true);
    try {
      const carInfoData = {
        make: make.trim() || undefined,
        model: model.trim(),
        year: year ? Number(year) : undefined,
        plate: plate.trim(),
        color: color.trim() || undefined,
        photo: vehiclePhoto ?? undefined,
      };
      console.log('[DriverVehicle] Guardando datos del vehículo:', carInfoData);
      console.log('[DriverVehicle] vehiclePhoto actual:', vehiclePhoto);
      
      const ok = await DriverService.updateDriverCarInfoByUserId(userId, carInfoData);
      if (!ok) throw new Error('No se pudo guardar');
      Alert.alert('Guardado', 'Información del vehículo actualizada', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar la información');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Información del Vehículo</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TextInput style={styles.input} placeholder="Marca (opcional)" value={make} onChangeText={setMake} />
        <TextInput style={styles.input} placeholder="Modelo (obligatorio)" value={model} onChangeText={setModel} />
        <TextInput style={styles.input} placeholder="Año (opcional)" keyboardType="numeric" maxLength={4} value={year} onChangeText={setYear} />
        <TextInput style={styles.input} placeholder="Placa (obligatorio)" autoCapitalize="characters" value={plate} onChangeText={setPlate} />
        <TextInput style={styles.input} placeholder="Color (opcional)" value={color} onChangeText={setColor} />

        <View style={styles.photoSection}>
          <Text style={styles.photoLabel}>Foto del vehículo (opcional)</Text>
          <SimpleImageUpload
            currentImage={vehiclePhoto}
            onImageSelected={(uri) => {
              console.log('[DriverVehicle] Foto seleccionada:', uri);
              setVehiclePhoto(uri);
            }}
            placeholder="Seleccionar foto del vehículo"
            style={styles.vehicleImageUpload}
          />
        </View>

        <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]} disabled={loading} onPress={handleSave}>
          <Text style={styles.saveText}>{loading ? 'Guardando…' : 'Guardar'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  content: { flex: 1, padding: 16 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, marginBottom: 12 },
  photoSection: { marginBottom: 16 },
  photoLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  vehicleImageUpload: { minHeight: 120 },
  saveButton: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#9CA3AF' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});