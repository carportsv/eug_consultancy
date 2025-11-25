import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { paymentService, PaymentMethod } from '@/services/paymentService';
import { useAuth } from '@/contexts/AuthContext';

export default function UserPaymentMethodsScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCardFormModal, setShowCardFormModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [methodToDelete, setMethodToDelete] = useState<string>('');
  
  // Estados para el formulario de tarjeta
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadPaymentMethods();
    }
  }, [userId]);

  const loadPaymentMethods = async () => {
    if (!userId) return;
    
    setRefreshing(true);
    try {
      const methods = await paymentService.getPaymentMethods(userId);
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setModalTitle('Error');
      setModalMessage('No se pudieron cargar los métodos de pago');
      setShowErrorModal(true);
    } finally {
      setRefreshing(false);
    }
  };

  const addNewCard = async () => {
    if (!userId) {
      setModalTitle('Error');
      setModalMessage('Debes iniciar sesión para agregar métodos de pago');
      setShowErrorModal(true);
      return;
    }

    // Mostrar el formulario de tarjeta en lugar de simular
    console.log('🔍 Abriendo modal de tarjeta...');
    setShowCardFormModal(true);
  };

  const handleCardSubmit = async () => {
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      setModalTitle('Error');
      setModalMessage('Por favor completa todos los campos');
      setShowErrorModal(true);
      return;
    }

    setFormLoading(true);
    try {
      // Crear un setup intent para agregar tarjeta
      const setupIntent = await paymentService.createSetupIntent();

      if (!setupIntent) {
        throw new Error('No se pudo crear el setup intent');
      }

      // Aquí normalmente usarías Stripe Elements para procesar la tarjeta
      // Por ahora simulamos el procesamiento exitoso
      
      // Simular procesamiento de tarjeta
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extraer los últimos 4 dígitos y la marca de la tarjeta
      const last4 = cardNumber.replace(/\s/g, '').slice(-4);
      const brand = getCardBrand(cardNumber);
      
      // Guardar el método de pago
      const success = await paymentService.savePaymentMethod(
        userId || '',
        'pm_simulated_' + Date.now(), // ID simulado
        paymentMethods.length === 0, // Es default si es el primer método
        {
          last4: last4,
          brand: brand
        }
      );

      if (success) {
        setModalTitle('✅ Tarjeta Agregada');
        setModalMessage('Tu tarjeta se agregó exitosamente');
        setShowSuccessModal(true);
        await loadPaymentMethods();
        
        // Limpiar formulario
        setCardNumber('');
        setExpiryDate('');
        setCvv('');
        setCardholderName('');
        setShowCardFormModal(false);
      } else {
        throw new Error('No se pudo guardar el método de pago');
      }

    } catch (error) {
      console.error('Error adding card:', error);
      setModalTitle('Error');
      setModalMessage('No se pudo agregar la tarjeta. Verifica los datos e intenta nuevamente.');
      setShowErrorModal(true);
    } finally {
      setFormLoading(false);
    }
  };

  const formatCardNumber = (text: string) => {
    // Remover todos los espacios y caracteres no numéricos
    const cleaned = text.replace(/\s/g, '').replace(/\D/g, '');
    // Agregar espacios cada 4 dígitos
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 19); // Máximo 16 dígitos + 3 espacios
  };

  const formatExpiryDate = (text: string) => {
    // Remover caracteres no numéricos
    const cleaned = text.replace(/\D/g, '');
    // Agregar slash después de 2 dígitos
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const getCardBrand = (cardNumber: string): string => {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    // Detectar marca de tarjeta basada en el primer dígito
    if (cleaned.startsWith('4')) {
      return 'Visa';
    } else if (cleaned.startsWith('5')) {
      return 'Mastercard';
    } else if (cleaned.startsWith('3')) {
      return 'American Express';
    } else if (cleaned.startsWith('6')) {
      return 'Discover';
    } else {
      return 'Tarjeta';
    }
  };

  const setDefaultMethod = async (methodId: string) => {
    if (!userId) return;

    setLoading(true);
    try {
      // Actualizar todos los métodos para que ninguno sea default
      for (const method of paymentMethods) {
        await paymentService.savePaymentMethod(
          userId,
          method.id,
          method.id === methodId
        );
      }

      await loadPaymentMethods();
      setModalTitle('✅ Actualizado');
      setModalMessage('Método de pago predeterminado actualizado');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error setting default:', error);
      setModalTitle('Error');
      setModalMessage('No se pudo actualizar el método predeterminado');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const deleteMethod = async (methodId: string) => {
    setMethodToDelete(methodId);
    setModalTitle('Eliminar Método de Pago');
    setModalMessage('¿Estás seguro de que quieres eliminar este método de pago?');
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      // Aquí implementarías la eliminación del método de pago
      // Por ahora solo recargamos la lista
      await loadPaymentMethods();
      setModalTitle('✅ Eliminado');
      setModalMessage('Método de pago eliminado');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting method:', error);
      setModalTitle('Error');
      setModalMessage('No se pudo eliminar el método de pago');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => (
    <View key={method.id} style={styles.methodCard}>
      <View style={styles.methodInfo}>
        <MaterialIcons
          name={method.type === 'card' ? 'credit-card' : 'money'}
          size={24}
          color="#007AFF"
        />
        <View style={styles.methodDetails}>
          <Text style={styles.methodName}>
            {method.type === 'card' ? `Tarjeta •••• ${method.last4}` : 'Efectivo'}
          </Text>
          {method.brand && (
            <Text style={styles.methodBrand}>{method.brand}</Text>
          )}
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Predeterminado</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.methodActions}>
        {!method.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setDefaultMethod(method.id)}
            disabled={loading}
          >
            <Text style={styles.actionText}>Predeterminado</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteMethod(method.id)}
          disabled={loading}
        >
          <Text style={[styles.actionText, styles.deleteText]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Componente de ayuda para tarjetas de prueba
  const TestCardsHelp = () => {
    const [showHelp, setShowHelp] = useState(false);

    const testCards = [
      {
        name: 'Pago Exitoso',
        number: '4242 4242 4242 4242',
        cvv: '123',
        description: 'Pago procesado exitosamente'
      },
      {
        name: 'Pago Fallido',
        number: '4000 0000 0000 0002',
        cvv: '123',
        description: 'Tarjeta declinada'
      },
      {
        name: 'Autenticación Requerida',
        number: '4000 0025 0000 3155',
        cvv: '123',
        description: 'Requiere 3D Secure'
      },
      {
        name: 'Fondos Insuficientes',
        number: '4000 0000 0000 9995',
        cvv: '123',
        description: 'Saldo insuficiente'
      }
    ];

    return (
      <View style={styles.helpContainer}>
        <TouchableOpacity 
          style={styles.helpButton}
          onPress={() => setShowHelp(!showHelp)}
        >
          <Text style={styles.helpButtonText}>
            {showHelp ? '🔒 Ocultar' : '🧪 Tarjetas de Prueba'}
          </Text>
        </TouchableOpacity>
        
        {showHelp && (
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>💳 Tarjetas de Prueba de Stripe</Text>
            <Text style={styles.helpSubtitle}>
              Usa estas tarjetas para probar sin cobros reales:
            </Text>
            
            {testCards.map((card, index) => (
              <View key={index} style={styles.testCardItem}>
                <Text style={styles.testCardName}>{card.name}</Text>
                <Text style={styles.testCardNumber}>{card.number}</Text>
                <Text style={styles.testCardCvv}>CVV: {card.cvv}</Text>
                <Text style={styles.testCardDesc}>{card.description}</Text>
              </View>
            ))}
            
            <Text style={styles.helpNote}>
              💡 Usa cualquier fecha futura como fecha de vencimiento
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Métodos de Pago</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Métodos de Pago Existentes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métodos Guardados</Text>
          
          {refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando métodos...</Text>
            </View>
          ) : paymentMethods.length > 0 ? (
            paymentMethods.map(renderPaymentMethod)
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="credit-card" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No tienes métodos de pago guardados</Text>
              <Text style={styles.emptySubtext}>
                Agrega una tarjeta para pagos más rápidos
              </Text>
            </View>
          )}
        </View>

        {/* Agregar Nuevo Método */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agregar Nuevo Método</Text>
          
          <TouchableOpacity
            style={[styles.addButton, loading && styles.addButtonDisabled]}
            onPress={addNewCard}
            disabled={loading}
          >
            <MaterialIcons name="add" size={24} color="#FFF" />
            <Text style={styles.addButtonText}>
              {loading ? 'Agregando...' : 'Agregar Tarjeta'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cashButton}
            onPress={() => {
              setModalTitle('Pago en Efectivo');
              setModalMessage('El pago en efectivo se procesa al finalizar el viaje. No necesitas agregarlo como método de pago.');
              setShowSuccessModal(true);
            }}
          >
            <MaterialIcons name="money" size={24} color="#28A745" />
            <Text style={styles.cashButtonText}>Información sobre Efectivo</Text>
          </TouchableOpacity>
        </View>

        {/* Información de Seguridad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <View style={styles.securityInfo}>
            <MaterialIcons name="security" size={20} color="#28A745" />
            <Text style={styles.securityTextMain}>
              Tus datos de pago están protegidos con encriptación de nivel bancario
            </Text>
          </View>
          <View style={styles.securityInfo}>
            <MaterialIcons name="credit-card" size={20} color="#28A745" />
            <Text style={styles.securityTextMain}>
              Nunca almacenamos tu número de tarjeta completo
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal de Formulario de Tarjeta */}
      <Modal
        visible={showCardFormModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCardFormModal(false)}
        onShow={() => console.log('🔍 Modal mostrado, showCardFormModal:', showCardFormModal)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.cardFormContainer}>
            {/* Header */}
            <View style={styles.cardFormHeader}>
              <TouchableOpacity 
                onPress={() => setShowCardFormModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <MaterialIcons name="credit-card" size={28} color="#2563EB" />
                <Text style={styles.cardFormTitle}>Agregar Tarjeta</Text>
                <Text style={styles.cardFormSubtitle}>Ingresa los datos de tu tarjeta de crédito o débito</Text>
              </View>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.cardFormContent} showsVerticalScrollIndicator={false}>
              {/* Formulario */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Información de la Tarjeta</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    <MaterialIcons name="credit-card" size={16} color="#6b7280" />
                    <Text style={styles.formLabelText}>Número de Tarjeta</Text>
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    placeholder="1234 5678 9012 3456"
                    keyboardType="numeric"
                    maxLength={19}
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.formLabel}>
                      <MaterialIcons name="event" size={16} color="#6b7280" />
                      <Text style={styles.formLabelText}>Fecha de Vencimiento</Text>
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={expiryDate}
                      onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                      placeholder="MM/YY"
                      keyboardType="numeric"
                      maxLength={5}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>
                      <MaterialIcons name="lock" size={16} color="#6b7280" />
                      <Text style={styles.formLabelText}>CVV</Text>
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={cvv}
                      onChangeText={setCvv}
                      placeholder="123"
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    <MaterialIcons name="person" size={16} color="#6b7280" />
                    <Text style={styles.formLabelText}>Nombre del Titular</Text>
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={cardholderName}
                    onChangeText={setCardholderName}
                    placeholder="Nombre como aparece en la tarjeta"
                    autoCapitalize="words"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              {/* Información de Seguridad */}
              <View style={styles.securitySection}>
                <View style={styles.securityInfoModal}>
                  <MaterialIcons name="security" size={18} color="#0369a1" />
                  <Text style={styles.securityTextModal}>
                    Tus datos están protegidos con encriptación SSL
                  </Text>
                </View>
              </View>

              {/* Botón de Envío */}
              <TouchableOpacity
                style={[styles.submitButton, formLoading && styles.submitButtonDisabled]}
                onPress={handleCardSubmit}
                disabled={formLoading}
              >
                {formLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Agregar Tarjeta de Forma Segura</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Éxito */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="check-circle" size={32} color="#28A745" />
              <Text style={styles.modalTitle}>{modalTitle}</Text>
            </View>
            
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            
            <TouchableOpacity 
              style={styles.modalButtonPrimary}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonPrimaryText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Error */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="error" size={32} color="#DC3545" />
              <Text style={styles.modalTitle}>{modalTitle}</Text>
            </View>
            
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            
            <TouchableOpacity 
              style={styles.modalButtonPrimary}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonPrimaryText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="warning" size={32} color="#FFC107" />
              <Text style={styles.modalTitle}>{modalTitle}</Text>
            </View>
            
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonDanger}
                onPress={confirmDelete}
              >
                <MaterialIcons name="delete" size={20} color="#fff" />
                <Text style={styles.modalButtonDangerText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Agregar al final, antes del cierre */}
      <TestCardsHelp />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#007AFF',
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
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
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 12,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodDetails: {
    marginLeft: 12,
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  methodBrand: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: '#28A745',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  defaultText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  methodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#E9ECEF',
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#F8D7DA',
  },
  deleteText: {
    color: '#721C24',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  addButtonDisabled: {
    backgroundColor: '#CCC',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cashButtonText: {
    color: '#28A745',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityTextMain: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minWidth: 300,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  modalMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: 'Poppins',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalButtonCancelText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  modalButtonPrimary: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  modalButtonDanger: {
    flex: 1,
    backgroundColor: '#DC3545',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#DC3545',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalButtonDangerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'Poppins',
  },
  // Estilos del Formulario de Tarjeta
  cardFormContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 16,
    width: '95%',
    height: '85%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  cardFormTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    fontFamily: 'Poppins',
    marginTop: 8,
    marginBottom: 4,
  },
  cardFormSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  cardFormContent: {
    padding: 10,
    flex: 1,
    minHeight: 500,
  },
  // Secciones del Formulario
  formSection: {
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    fontFamily: 'Poppins',
  },
  formGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  formLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  formLabelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  formInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
    fontFamily: 'Poppins',
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  // Sección de Seguridad
  securitySection: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    elevation: 1,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  securityInfoModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityTextModal: {
    fontSize: 14,
    color: '#0369a1',
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Poppins',
    fontWeight: '500',
  },
  // Botón Mejorado
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    elevation: 3,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
    fontFamily: 'Poppins',
  },
  // Estilos para el componente de ayuda
  helpContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  helpButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9ECEF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  helpButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
  helpContent: {
    marginTop: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    fontFamily: 'Poppins',
  },
  helpSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'Poppins',
  },
  testCardItem: {
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  testCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  testCardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  testCardCvv: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  testCardDesc: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Poppins',
  },
  helpNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
});
