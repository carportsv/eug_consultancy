import { useAuth } from '@/contexts/AuthContext';
import { DriverService } from '@/services/driverService';
import { supabase } from '@/services/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DriverRegistrationScreen() {
  const router = useRouter();
  const { user, setUserType, refreshAuthState } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Datos del vehículo
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [carPlate, setCarPlate] = useState('');
  
  // Documentos
  const [license, setLicense] = useState('');
  const [insurance, setInsurance] = useState('');
  const [registration, setRegistration] = useState('');

  const handleSubmit = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Debes estar autenticado para registrarte como conductor');
      return;
    }

    // Validaciones
    if (!carModel.trim() || !carYear.trim() || !carPlate.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos del vehículo');
      return;
    }

    if (!license.trim() || !insurance.trim() || !registration.trim()) {
      Alert.alert('Error', 'Por favor completa todos los documentos');
      return;
    }

    setIsLoading(true);
    try {
      // Obtener el ID del usuario desde Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', user.uid)
        .single();

      if (userError || !userData) {
        throw new Error('No se pudo obtener la información del usuario');
      }

      // Asegurar registro en tabla drivers con user_id (sin datos quemados)
      // 1) Verificar si ya existe
      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', userData.id)
        .maybeSingle();

      // 2) Crear si no existe
      if (!existingDriver) {
        await supabase
          .from('drivers')
          .insert({
            user_id: userData.id,
            is_available: false,
            status: 'active',
          });
      }

      // 3) Guardar info REAL del vehículo y documentos en JSONB
      await DriverService.updateDriverCarInfoByUserId(
        userData.id,
        {
          model: carModel.trim(),
          year: Number(carYear),
          plate: carPlate.trim(),
        },
        {
          license: license.trim(),
          insurance: insurance.trim(),
          registration: registration.trim(),
        }
      );

      // Actualizar el rol del usuario a 'driver'
      await supabase
        .from('users')
        .update({ role: 'driver' })
        .eq('firebase_uid', user.uid);

      // Actualizar el tipo de usuario en el contexto de autenticación
      await setUserType('driver');
      
      // Refrescar el estado de autenticación para que el contexto de notificaciones se actualice
      await refreshAuthState();

      Alert.alert('¡Registro exitoso!', 'Tu información de vehículo fue guardada correctamente.', [
        { text: 'OK', onPress: () => router.push('/driver/driver_home') },
      ]);
    } catch (error) {
      console.error('Error registrando conductor:', error);
      Alert.alert(
        'Error',
        'No se pudo completar el registro. Verifica que todos los datos sean correctos e intenta nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registro de Conductor</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="car" size={20} color="#2563EB" /> Información del Vehículo
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Modelo del vehículo (ej: Toyota Corolla)"
            value={carModel}
            onChangeText={setCarModel}
            autoCapitalize="words"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Año del vehículo (ej: 2020)"
            value={carYear}
            onChangeText={setCarYear}
            keyboardType="numeric"
            maxLength={4}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Placa del vehículo (ej: ABC-123)"
            value={carPlate}
            onChangeText={setCarPlate}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="document-text" size={20} color="#2563EB" /> Documentos
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Número de licencia"
            value={license}
            onChangeText={setLicense}
            autoCapitalize="characters"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Número de seguro"
            value={insurance}
            onChangeText={setInsurance}
            autoCapitalize="characters"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Número de registro"
            value={registration}
            onChangeText={setRegistration}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color="#F59E0A" />
          <Text style={styles.infoText}>
            Al registrarte como conductor, podrás recibir solicitudes de viaje de los usuarios. 
            Asegúrate de que toda la información sea correcta y actualizada.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Registrarse como Conductor</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
