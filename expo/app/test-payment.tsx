import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { paymentService } from '@/services/paymentService';

export default function TestPaymentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const testPaymentIntent = async () => {
    setLoading(true);
    try {
      console.log('🧪 Probando creación de payment intent...');
      
      const paymentIntent = await paymentService.createPaymentIntent(
        'test-ride-123',
        25.50
      );

      if (paymentIntent) {
        Alert.alert(
          '✅ Payment Intent Creado',
          `ID: ${paymentIntent.id}\nMonto: $${paymentIntent.amount}\nEstado: ${paymentIntent.status}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('❌ Error', 'No se pudo crear el payment intent');
      }
    } catch (error) {
      console.error('Error en test:', error);
      Alert.alert('❌ Error', 'Error probando payment intent');
    } finally {
      setLoading(false);
    }
  };

  const testCashPayment = async () => {
    setLoading(true);
    try {
      console.log('🧪 Probando pago en efectivo...');
      
      const success = await paymentService.processCashPayment(
        'test-ride-123',
        'test-user-id',
        'test-driver-id',
        25.50
      );

      if (success) {
        Alert.alert('✅ Pago en Efectivo', 'Pago procesado correctamente');
      } else {
        Alert.alert('❌ Error', 'No se pudo procesar el pago en efectivo');
      }
    } catch (error) {
      console.error('Error en test:', error);
      Alert.alert('❌ Error', 'Error procesando pago en efectivo');
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseConnection = async () => {
    setLoading(true);
    try {
      console.log('🧪 Probando conexión a base de datos...');
      
      const methods = await paymentService.getPaymentMethods('test-user-id');
      
      Alert.alert(
        '✅ Conexión Exitosa',
        `Métodos de pago encontrados: ${methods.length}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error en test:', error);
      Alert.alert('❌ Error', 'Error conectando a la base de datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Pruebas de Sistema de Pagos</Text>
        <Text style={styles.subtitle}>Stripe + Supabase</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pruebas Disponibles</Text>
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testPaymentIntent}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳ Probando...' : '💳 Probar Payment Intent'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testCashPayment}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳ Probando...' : '💵 Probar Pago en Efectivo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testDatabaseConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '⏳ Probando...' : '🗄️ Probar Conexión BD'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información del Sistema</Text>
        <Text style={styles.infoText}>✅ Stripe configurado</Text>
        <Text style={styles.infoText}>✅ Edge Functions desplegadas</Text>
        <Text style={styles.infoText}>✅ Base de datos configurada</Text>
        <Text style={styles.infoText}>✅ Componentes creados</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Próximos Pasos</Text>
        <Text style={styles.infoText}>1. Probar las funciones básicas</Text>
        <Text style={styles.infoText}>2. Integrar en flujo de viajes</Text>
        <Text style={styles.infoText}>3. Configurar webhooks</Text>
        <Text style={styles.infoText}>4. Probar con tarjetas reales</Text>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
  },
  section: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  backButton: {
    backgroundColor: '#6C757D',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
