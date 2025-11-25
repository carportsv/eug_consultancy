import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ModalVerificacionProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
}

export default function ModalVerificacion({
  visible,
  onClose,
  onVerify,
}: ModalVerificacionProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'El código debe tener 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      await onVerify(code);
      setCode(''); // Limpiar código después de verificación exitosa
    } catch (error: any) {
      console.error('Error verificando código:', error);
      Alert.alert('Error', error.message || 'Código incorrecto o caducado. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode(''); // Limpiar código al cerrar
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Verificación</Text>
          <Text style={styles.subtitle}>
            Ingresa el código de verificación enviado a tu teléfono
          </Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Código de verificación"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]}
            onPress={handleVerifyCode}
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verificar</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 16,
    width: '90%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2563EB',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 22,
    color: '#374151',
    lineHeight: 22,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 18,
    marginBottom: 22,
    fontSize: 20,
    textAlign: 'center',
    color: '#18181B',
    backgroundColor: '#F3F4F6',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#4a4a5e',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
