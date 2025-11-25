import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { paymentService, PaymentMethod } from '@/services/paymentService';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentScreenProps {
  rideId: string;
  amount: number;
  onPaymentSuccess: () => void;
  onPaymentCancel: () => void;
}

export default function PaymentScreen({
  rideId,
  amount,
  onPaymentSuccess,
  onPaymentCancel,
}: PaymentScreenProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { userId } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'cash'>('card');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);

  const tipOptions = [0, 0.1, 0.15, 0.2];
  const tipAmounts = tipOptions.map(tip => Math.round(amount * tip * 100) / 100);
  const totalAmount = amount + tipAmounts[tipOptions.indexOf(tipAmount)] - discount;

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    if (!userId) return;
    
    try {
      console.log('[PaymentScreen] 🔍 Cargando métodos de pago para usuario:', userId);
      const methods = await paymentService.getPaymentMethods(userId);
      console.log('[PaymentScreen] 📋 Métodos cargados:', methods);
      setPaymentMethods(methods);
      
      // Seleccionar la tarjeta por defecto si existe
      const defaultCard = methods.find(method => method.isDefault);
      if (defaultCard) {
        console.log('[PaymentScreen] ✅ Tarjeta predeterminada seleccionada:', defaultCard.brand, '••••', defaultCard.last4);
        setSelectedCard(defaultCard.id);
      } else if (methods.length > 0) {
        console.log('[PaymentScreen] ✅ Primera tarjeta seleccionada:', methods[0].brand, '••••', methods[0].last4);
        setSelectedCard(methods[0].id);
      } else {
        console.log('[PaymentScreen] ⚠️ No se encontraron tarjetas guardadas');
      }
    } catch (error) {
      console.error('[PaymentScreen] ❌ Error loading payment methods:', error);
    }
  };

  const handlePromoCode = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'TEST10') {
      setDiscount(Math.round(amount * 0.1 * 100) / 100);
      Alert.alert('¡Código válido!', 'Se aplicó un descuento del 10%');
    } else if (code) {
      Alert.alert('Código inválido', 'El código promocional no es válido');
    }
  };

  const processCashPayment = async () => {
    setLoading(true);
    try {
      // Crear transacción de pago en efectivo inmediatamente
      const success = await paymentService.processCashPayment(
        rideId,
        userId!,
        'driver-id-placeholder', // Esto debería venir del viaje
        totalAmount
      );

      if (success) {
        Alert.alert(
          'Pago en efectivo',
          'Pago procesado correctamente. El conductor recibirá el pago al finalizar el viaje.',
          [{ text: 'OK', onPress: onPaymentSuccess }]
        );
      } else {
        Alert.alert('Error', 'No se pudo procesar el pago en efectivo');
      }
    } catch (error) {
      Alert.alert('Error', 'Error procesando el pago');
    } finally {
      setLoading(false);
    }
  };

  const processCardPayment = async () => {
    setLoading(true);
    try {
      // 1. Crear payment intent
      const paymentIntent = await paymentService.createPaymentIntent(
        rideId,
        totalAmount
      );

      if (!paymentIntent) {
        throw new Error('No se pudo crear el payment intent');
      }

      // 2. Inicializar payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'ZKT Taxi',
        paymentIntentClientSecret: paymentIntent.client_secret,
        defaultBillingDetails: {
          name: 'Usuario ZKT',
        },
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // 3. Presentar payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          // Usuario canceló el pago
          return;
        }
        throw new Error(presentError.message);
      }

             // 4. Pago exitoso - Solo HOLD (autorización)
       // Guardar payment_intent_id en el viaje para confirmarlo después
       try {
         const { supabase } = await import('@/services/supabaseClient');
         await supabase
           .from('ride_requests')
           .update({
             payment_intent_id: paymentIntent.id,
             payment_status: 'authorized'
           })
           .eq('id', rideId);
         
         console.log('[PaymentScreen] ✅ HOLD realizado exitosamente:', paymentIntent.id);
         console.log('[PaymentScreen] 💡 El pago se procesará al finalizar el viaje');
       } catch (updateError) {
         console.error('[PaymentScreen] ❌ Error guardando payment_intent_id:', updateError);
         // No bloquear el flujo por errores de actualización
       }

      Alert.alert(
        '¡Pago exitoso!',
        'Tu pago ha sido procesado correctamente',
        [{ text: 'OK', onPress: onPaymentSuccess }]
      );

    } catch (error) {
      console.error('Error processing card payment:', error);
      Alert.alert('Error', 'No se pudo procesar el pago con tarjeta');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (selectedMethod === 'cash') {
      processCashPayment();
    } else {
      processCardPayment();
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Método de Pago</Text>
        <Text style={styles.headerSubtitle}>Total: ${totalAmount.toFixed(2)}</Text>
      </View>

      {/* Método de Pago */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Método de Pago</Text>
        <View style={styles.methodContainer}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              selectedMethod === 'card' && styles.methodSelected,
            ]}
            onPress={() => setSelectedMethod('card')}
          >
            <MaterialIcons
              name="credit-card"
              size={20}
              color={selectedMethod === 'card' ? '#2563EB' : '#6b7280'}
            />
            <Text style={[
              styles.methodText,
              selectedMethod === 'card' && styles.methodTextSelected,
            ]}>
              Tarjeta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton,
              selectedMethod === 'cash' && styles.methodSelected,
            ]}
            onPress={() => setSelectedMethod('cash')}
          >
            <MaterialIcons
              name="money"
              size={20}
              color={selectedMethod === 'cash' ? '#2563EB' : '#6b7280'}
            />
            <Text style={[
              styles.methodText,
              selectedMethod === 'cash' && styles.methodTextSelected,
            ]}>
              Efectivo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tarjetas Guardadas */}
      {selectedMethod === 'card' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarjeta de Pago</Text>
          {paymentMethods.length > 0 ? (
            <View style={styles.cardsContainer}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.cardButton,
                    selectedCard === method.id && styles.cardSelected,
                  ]}
                  onPress={() => setSelectedCard(method.id)}
                >
                  <View style={styles.cardInfo}>
                    <MaterialIcons
                      name="credit-card"
                      size={20}
                      color={selectedCard === method.id ? '#2563EB' : '#6b7280'}
                    />
                    <View style={styles.cardDetails}>
                      <Text style={[
                        styles.cardText,
                        selectedCard === method.id && styles.cardTextSelected,
                      ]}>
                        {method.brand} •••• {method.last4}
                      </Text>
                      {method.isDefault && (
                        <Text style={styles.defaultBadge}>Predeterminada</Text>
                      )}
                    </View>
                  </View>
                  {selectedCard === method.id && (
                    <MaterialIcons name="check-circle" size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noCardsContainer}>
              <MaterialIcons name="credit-card" size={24} color="#9ca3af" />
              <Text style={styles.noCardsText}>
                No tienes tarjetas guardadas
              </Text>
              <Text style={styles.noCardsSubtext}>
                Se te pedirá ingresar los datos de tu tarjeta
              </Text>
            </View>
          )}
          
          {/* Botón para agregar nueva tarjeta */}
          <TouchableOpacity
            style={styles.addCardButton}
            onPress={() => {
              // Navegar a la pantalla de métodos de pago
              Alert.alert(
                'Agregar Tarjeta',
                'Para agregar una nueva tarjeta, ve a "Métodos de Pago" en tu perfil.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Ir a Métodos de Pago', onPress: () => {
                    // Aquí podrías navegar a la pantalla de métodos de pago
                    console.log('[PaymentScreen] 🚀 Navegando a métodos de pago');
                  }}
                ]
              );
            }}
          >
            <MaterialIcons name="add" size={20} color="#2563EB" />
            <Text style={styles.addCardButtonText}>Agregar Nueva Tarjeta</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Propina */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Propina</Text>
        <View style={styles.tipContainer}>
          {tipOptions.map((tip, index) => (
            <TouchableOpacity
              key={tip}
              style={[
                styles.tipButton,
                tipAmount === tip && styles.tipSelected,
              ]}
              onPress={() => setTipAmount(tip)}
            >
              <Text style={[
                styles.tipText,
                tipAmount === tip && styles.tipTextSelected,
              ]}>
                {tip === 0 ? 'Sin propina' : `${tip * 100}%`}
              </Text>
              {tip > 0 && (
                <Text style={[
                  styles.tipAmount,
                  tipAmount === tip && styles.tipAmountSelected,
                ]}>
                  ${tipAmounts[index].toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Código Promocional */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Código Promocional</Text>
        <View style={styles.promoContainer}>
          <TextInput
            style={styles.promoInput}
            placeholder="Ingresa código promocional"
            placeholderTextColor="#9ca3af"
            value={promoCode}
            onChangeText={setPromoCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={styles.promoButton}
            onPress={handlePromoCode}
          >
            <Text style={styles.promoButtonText}>Aplicar</Text>
          </TouchableOpacity>
        </View>
        {discount > 0 && (
          <View style={styles.discountContainer}>
            <MaterialIcons name="check-circle" size={16} color="#10b981" />
            <Text style={styles.discountText}>
              Descuento aplicado: -${discount.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Resumen */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumen del Pago</Text>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tarifa base</Text>
            <Text style={styles.summaryValue}>${amount.toFixed(2)}</Text>
          </View>
          {tipAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Propina</Text>
              <Text style={styles.summaryValue}>
                ${tipAmounts[tipOptions.indexOf(tipAmount)].toFixed(2)}
              </Text>
            </View>
          )}
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Descuento</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -${discount.toFixed(2)}
              </Text>
            </View>
          )}
          
          {/* Método de pago seleccionado */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Método de pago</Text>
            <View style={styles.paymentMethodInfo}>
              {selectedMethod === 'cash' ? (
                <View style={styles.cashMethod}>
                  <MaterialIcons name="money" size={16} color="#10b981" />
                  <Text style={styles.paymentMethodText}>Efectivo</Text>
                </View>
              ) : (
                <View style={styles.cardMethod}>
                  <MaterialIcons name="credit-card" size={16} color="#2563EB" />
                  {selectedCard && paymentMethods.length > 0 ? (
                    (() => {
                      const selectedMethod = paymentMethods.find(m => m.id === selectedCard);
                      return (
                        <Text style={styles.paymentMethodText}>
                          {selectedMethod?.brand} •••• {selectedMethod?.last4}
                        </Text>
                      );
                    })()
                  ) : (
                    <Text style={styles.paymentMethodText}>Nueva tarjeta</Text>
                  )}
                </View>
              )}
            </View>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total a pagar</Text>
            <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Información de Seguridad */}
      <View style={styles.section}>
        <View style={styles.securityContainer}>
          <MaterialIcons name="security" size={20} color="#10b981" />
          <Text style={styles.securityText}>
            Tus datos de pago están protegidos con encriptación de nivel bancario
          </Text>
        </View>
      </View>

      {/* Botones */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onPaymentCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="payment" size={20} color="#FFF" style={styles.payButtonIcon} />
              <Text style={styles.payButtonText}>
                Pagar ${totalAmount.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    fontFamily: 'Poppins',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    fontFamily: 'Poppins',
  },
  methodContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  methodSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#eff6ff',
  },
  methodText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins',
  },
  methodTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  tipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipButton: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#eff6ff',
  },
  tipText: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins',
  },
  tipTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  tipAmount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
    fontFamily: 'Poppins',
  },
  tipAmountSelected: {
    color: '#2563EB',
  },
  promoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  promoInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontSize: 14,
    color: '#1f2937',
    fontFamily: 'Poppins',
  },
  promoButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    justifyContent: 'center',
  },
  promoButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Poppins',
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  discountText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  summaryContainer: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
  discountValue: {
    color: '#10b981',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'Poppins',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    fontFamily: 'Poppins',
  },
  securityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Poppins',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  payButton: {
    flex: 2,
    padding: 16,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  payButtonIcon: {
    marginRight: 8,
  },
  payButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
    fontFamily: 'Poppins',
  },
  // Estilos para tarjetas guardadas
  cardsContainer: {
    gap: 8,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  cardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#eff6ff',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardDetails: {
    marginLeft: 12,
    flex: 1,
  },
  cardText: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins',
  },
  cardTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  defaultBadge: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginTop: 2,
  },
  noCardsContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  noCardsText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginTop: 8,
  },
  noCardsSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'Poppins',
    marginTop: 4,
    textAlign: 'center',
  },
  // Estilos para el resumen de método de pago
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cashMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
  // Estilos para botón de agregar tarjeta
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  addCardButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginLeft: 8,
  },
});
