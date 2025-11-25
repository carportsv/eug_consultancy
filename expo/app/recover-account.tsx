import { AuthService } from '@/services/authService';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function RecoverAccount() {
  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailRecovery = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido.');
      return;
    }

    try {
      setLoading(true);
      
      // Verificar si el email existe
      const emailExists = await AuthService.checkEmailExists(email);
      if (!emailExists) {
        Alert.alert('Error', 'No se encontró una cuenta con este email.');
        return;
      }

      // Enviar email de recuperación
      await AuthService.recoverAccountByEmail(email);
      
      Alert.alert(
        'Email Enviado',
        'Se ha enviado un enlace de recuperación a tu email. Revisa tu bandeja de entrada.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      console.error('Error en recuperación por email:', error);
      Alert.alert('Error', 'No se pudo enviar el email de recuperación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneRecovery = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      Alert.alert('Error', 'Por favor ingresa un número de teléfono válido.');
      return;
    }

    try {
      setLoading(true);
      
      // Enviar código SMS para recuperación
      const confirmation = await AuthService.sendVerificationCode(phoneNumber);
      
      Alert.alert(
        'Código Enviado',
        'Se ha enviado un código SMS a tu teléfono. Úsalo para acceder a tu cuenta.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      console.error('Error en recuperación por teléfono:', error);
      Alert.alert('Error', 'No se pudo enviar el código SMS. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Recuperar Cuenta</Text>
          <Text style={styles.subtitle}>
            Elige cómo quieres recuperar el acceso a tu cuenta
          </Text>
        </View>

        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              recoveryMethod === 'email' && styles.methodButtonActive
            ]}
            onPress={() => setRecoveryMethod('email')}
          >
            <Text style={[
              styles.methodButtonText,
              recoveryMethod === 'email' && styles.methodButtonTextActive
            ]}>
              📧 Email
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.methodButton,
              recoveryMethod === 'phone' && styles.methodButtonActive
            ]}
            onPress={() => setRecoveryMethod('phone')}
          >
            <Text style={[
              styles.methodButtonText,
              recoveryMethod === 'phone' && styles.methodButtonTextActive
            ]}>
              📱 Teléfono
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {recoveryMethod === 'email' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>
                Te enviaremos un enlace para restablecer tu contraseña
              </Text>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de Teléfono</Text>
              <TextInput
                style={styles.input}
                placeholder="+503 1234 5678"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
              <Text style={styles.helperText}>
                Te enviaremos un código SMS para acceder a tu cuenta
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.recoverButton, loading && styles.recoverButtonDisabled]}
            onPress={recoveryMethod === 'email' ? handleEmailRecovery : handlePhoneRecovery}
            disabled={loading}
          >
            <Text style={styles.recoverButtonText}>
              {loading ? 'Enviando...' : 'Recuperar Cuenta'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Volver al Login</Text>
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
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#11181C',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  methodSelector: {
    flexDirection: 'row',
    marginBottom: 30,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  methodButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  methodButtonTextActive: {
    color: '#2563EB',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#11181C',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helperText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 5,
  },
  recoverButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  recoverButtonDisabled: {
    backgroundColor: '#4a4a5e',
  },
  recoverButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 