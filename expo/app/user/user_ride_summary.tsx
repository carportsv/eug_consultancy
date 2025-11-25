import React, { useMemo, useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Dimensions, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService, PaymentMethod } from '@/services/paymentService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function UserRideSummaryScreen(): React.JSX.Element {
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showCardDropdown, setShowCardDropdown] = useState(false);
  const [showInvalidCardModal, setShowInvalidCardModal] = useState(false);
  const [invalidCardInfo, setInvalidCardInfo] = useState<{brand: string, last4: string} | null>(null);

  const discount = useMemo(() => (promo.trim().toUpperCase() === 'TEST10' ? 0.1 : 0), [promo]);
  const tipAmount = useMemo(() => Math.round(basePrice * tipPct * 100) / 100, [basePrice, tipPct]);
  const discountAmount = useMemo(() => Math.round(basePrice * discount * 100) / 100, [basePrice, discount]);
  const total = useMemo(() => Math.max(0, Math.round((basePrice + tipAmount - discountAmount) * 100) / 100), [basePrice, tipAmount, discountAmount]);

  // Cargar métodos de pago guardados
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!userId) return;
      
      try {
        console.log('[UserRideSummary] 🔍 Cargando métodos de pago para usuario:', userId);
        const methods = await paymentService.getPaymentMethods(userId);
        console.log('[UserRideSummary] 📋 Métodos cargados:', methods);
        setPaymentMethods(methods);
        
        // Seleccionar la tarjeta por defecto si existe
        const defaultCard = methods.find(method => method.isDefault);
        if (defaultCard) {
          console.log('[UserRideSummary] ✅ Tarjeta predeterminada seleccionada:', defaultCard.brand, '••••', defaultCard.last4);
          setSelectedCard(defaultCard.id);
        } else if (methods.length > 0) {
          console.log('[UserRideSummary] ✅ Primera tarjeta seleccionada:', methods[0].brand, '••••', methods[0].last4);
          setSelectedCard(methods[0].id);
        } else {
          console.log('[UserRideSummary] ⚠️ No se encontraron tarjetas guardadas');
        }
      } catch (error) {
        console.error('[UserRideSummary] ❌ Error loading payment methods:', error);
      }
    };

    loadPaymentMethods();
  }, [userId]);

  // Función para cerrar dropdown cuando se toque fuera
  const closeDropdown = () => {
    setShowCardDropdown(false);
  };

  // Función para validar si una tarjeta es válida para pagos
  const isCardValidForPayment = (last4: string): boolean => {
    // Tarjetas que fallan según Stripe
    const failingCards = ['0002', '9995', '9987', '9979', '0069', '0127', '0119'];
    return !failingCards.includes(last4);
  };

  const confirmRequest = async () => {
    try {
      setLoading(true);
      
      // Verificar sesión
      if (!userId) {
        Alert.alert('Sesión requerida', 'Inicia sesión para solicitar un viaje.');
        setLoading(false);
      return;
    }

      // Si el método de pago es tarjeta, verificar que tenga métodos de pago guardados y que la tarjeta sea válida
      if (paymentMethod === 'card') {
        try {
          const { paymentService } = await import('@/services/paymentService');
          const paymentMethods = await paymentService.getPaymentMethods(userId);

          if (!paymentMethods || paymentMethods.length === 0) {
            setShowPaymentModal(true);
            setLoading(false);
            return;
          }

          // Verificar que la tarjeta seleccionada sea válida para pagos
          if (selectedCard) {
            const selectedMethod = paymentMethods.find(method => method.id === selectedCard);
            if (selectedMethod && selectedMethod.last4 && !isCardValidForPayment(selectedMethod.last4)) {
              setInvalidCardInfo({
                brand: selectedMethod.brand || 'Tarjeta',
                last4: selectedMethod.last4
              });
              setShowInvalidCardModal(true);
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error verificando métodos de pago:', error);
          Alert.alert('Error', 'No se pudo verificar tus métodos de pago. Intenta nuevamente.');
          setLoading(false);
          return;
        }
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

      // Crear la solicitud de viaje con información del método de pago
      const { createRideRequest } = await import('@/services/rideService');
      const rideId = await createRideRequest({
        userId: supabaseUserId,
        origin: { address: origin, coordinates: { latitude: ox, longitude: oy } },
        destination: { address: destination, coordinates: { latitude: dx, longitude: dy } },
        status: 'requested',
        price: total,
        distance: Number.isFinite(km) ? km * 1000 : undefined,
        duration: Number.isFinite(min) ? min * 60 : undefined,
        paymentMethod: paymentMethod, // Agregar método de pago
        tipAmount: tipAmount, // Agregar propina
        discountAmount: discountAmount, // Agregar descuento
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

      router.push({ 
        pathname: '/user/buscando_conductor', 
        params: { 
          rideId, 
          price: String(total), 
          origin, 
          destination,
          paymentMethod: paymentMethod // Pasar método de pago
        } 
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resumen y Pago</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Contenido Scrolleable */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Información del Viaje */}
      <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del Viaje</Text>
          <View style={styles.rideInfo}>
            <View style={styles.rideInfoRow}>
              <View style={styles.rideInfoIcon}>
                <MaterialIcons name="my-location" size={16} color="#2563EB" />
              </View>
              <Text style={styles.rideInfoLabel}>Origen</Text>
              <Text style={styles.rideInfoValue} numberOfLines={2}>{origin}</Text>
            </View>
            <View style={styles.rideInfoRow}>
              <View style={styles.rideInfoIcon}>
                <MaterialIcons name="location-on" size={16} color="#DC2626" />
              </View>
              <Text style={styles.rideInfoLabel}>Destino</Text>
              <Text style={styles.rideInfoValue} numberOfLines={2}>{destination}</Text>
            </View>
            <View style={styles.rideInfoRow}>
              <View style={styles.rideInfoIcon}>
                <MaterialIcons name="straighten" size={16} color="#10B981" />
              </View>
              <Text style={styles.rideInfoLabel}>Distancia</Text>
              <Text style={styles.rideInfoValue}>{km.toFixed(1)} km</Text>
            </View>
            <View style={styles.rideInfoRow}>
              <View style={styles.rideInfoIcon}>
                <MaterialIcons name="access-time" size={16} color="#F59E0B" />
              </View>
              <Text style={styles.rideInfoLabel}>Tiempo</Text>
              <Text style={styles.rideInfoValue}>{min} min</Text>
            </View>
          </View>
      </View>

        {/* Método de Pago */}
      <View style={styles.section}>
          <Text style={styles.sectionTitle}>Método de Pago</Text>
        <View style={styles.methods}>
            <TouchableOpacity 
              onPress={() => {
                setPaymentMethod('cash');
                setShowCardDropdown(false);
              }} 
              style={[styles.methodBtn, paymentMethod === 'cash' && styles.methodSelected]}
            >
              <MaterialIcons 
                name="money" 
                size={20} 
                color={paymentMethod === 'cash' ? '#2563EB' : '#6b7280'} 
              />
              <Text style={[styles.methodText, paymentMethod === 'cash' && styles.methodTextSel]}>
                Efectivo
              </Text>
              </TouchableOpacity>
            
            {/* Botón de Tarjeta */}
            <TouchableOpacity 
              onPress={() => {
                setPaymentMethod('card');
                setShowCardDropdown(true);
              }} 
              style={[styles.methodBtn, paymentMethod === 'card' && styles.methodSelected]}
            >
              <MaterialIcons 
                name="credit-card" 
                size={20} 
                color={paymentMethod === 'card' ? '#2563EB' : '#6b7280'} 
              />
              <Text style={[styles.methodText, paymentMethod === 'card' && styles.methodTextSel]}>
                Tarjeta
              </Text>
              <MaterialIcons 
                name="keyboard-arrow-down" 
                size={20} 
                color={paymentMethod === 'card' ? '#2563EB' : '#6b7280'} 
              />
              </TouchableOpacity>
          </View>
        </View>

        {/* Propina */}
      <View style={styles.section}>
          <Text style={styles.sectionTitle}>Propina</Text>
        <View style={styles.tips}>
          {[0, 0.1, 0.15].map(p => (
              <TouchableOpacity 
                key={p} 
                onPress={() => setTipPct(p)} 
                style={[styles.tipBtn, tipPct === p && styles.tipSelected]}
              >
                <Text style={[styles.tipText, tipPct === p && styles.tipTextSel]}>
                  {p === 0 ? 'Sin propina' : `${Math.round(p*100)}%`}
                </Text>
                {p > 0 && (
                  <Text style={[styles.tipAmount, tipPct === p && styles.tipAmountSelected]}>
                    ${(basePrice * p).toFixed(2)}
                  </Text>
                )}
            </TouchableOpacity>
          ))}
          </View>
        </View>

        {/* Código Promocional */}
      <View style={styles.section}>
          <Text style={styles.sectionTitle}>Código Promocional</Text>
        <TextInput
          placeholder="Ingresa código (p. ej., TEST10)"
            placeholderTextColor="#9ca3af"
          value={promo}
          onChangeText={setPromo}
          style={styles.input}
            autoCapitalize="characters"
          />
          {discount > 0 && (
            <View style={styles.discountContainer}>
              <MaterialIcons name="check-circle" size={16} color="#10b981" />
              <Text style={styles.discountText}>
                ¡Descuento del 10% aplicado!
              </Text>
            </View>
          )}
          </View>

        {/* Resumen de Costos */}
      <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen de Costos</Text>
          <View style={styles.costSummary}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Tarifa base</Text>
              <Text style={styles.costValue}>${basePrice.toFixed(2)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Propina</Text>
              <Text style={styles.costValue}>${tipAmount.toFixed(2)}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Descuento</Text>
                <Text style={[styles.costValue, styles.discountValue]}>
                  -${discountAmount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={[styles.costRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total a pagar</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Método de pago</Text>
              <View style={styles.paymentMethodInfo}>
                {paymentMethod === 'cash' ? (
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
          </View>
        </View>

        {/* Espacio extra para evitar que el botón tape contenido */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Botón de Confirmación - Fijo en la parte inferior */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.cta, loading && styles.ctaDisabled]} 
          onPress={confirmRequest} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons name="directions-car" size={20} color="#fff" style={styles.ctaIcon} />
              <Text style={styles.ctaText}>Solicitar Viaje</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de Método de Pago Requerido */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="credit-card" size={32} color="#2563EB" />
              <Text style={styles.modalTitle}>Método de Pago Requerido</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Para pagar con tarjeta, primero debes agregar una tarjeta de crédito o débito.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={() => {
                  setShowPaymentModal(false);
                  router.push('/user/user_payment_methods');
                }}
              >
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.modalButtonPrimaryText}>Agregar Tarjeta</Text>
          </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Selección de Tarjetas */}
      <Modal
        visible={showCardDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCardDropdown(false)}
      >
        <TouchableOpacity
          style={styles.cardModalOverlay}
          activeOpacity={1}
          onPress={() => setShowCardDropdown(false)}
        >
          <View style={styles.cardModalContainer}>
            <View style={styles.cardModalHeader}>
              <Text style={styles.cardModalTitle}>Seleccionar Tarjeta</Text>
              <TouchableOpacity onPress={() => setShowCardDropdown(false)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            {paymentMethods.length > 0 ? (
              paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.cardModalItem,
                    selectedCard === method.id && styles.cardModalItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCard(method.id);
                    setShowCardDropdown(false);
                  }}
                >
                  <View style={styles.cardModalItemContent}>
                    <MaterialIcons
                      name="credit-card"
                      size={20}
                      color={selectedCard === method.id ? '#2563EB' : '#6b7280'}
                    />
                    <View style={styles.cardModalItemText}>
                      <Text style={[
                        styles.cardModalItemTitle,
                        selectedCard === method.id && styles.cardModalItemTitleSelected,
                      ]}>
                        {method.brand} •••• {method.last4}
                      </Text>
                      {method.isDefault && (
                        <Text style={styles.cardModalDefaultBadge}>Predeterminada</Text>
                      )}
                    </View>
                  </View>
                  {selectedCard === method.id && (
                    <MaterialIcons name="check-circle" size={20} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.cardModalNoCards}>
                <MaterialIcons name="credit-card" size={48} color="#9ca3af" />
                <Text style={styles.cardModalNoCardsTitle}>
                  No tienes tarjetas guardadas
                </Text>
                <Text style={styles.cardModalNoCardsSubtitle}>
                  Agrega una tarjeta para poder pagar con tarjeta
                </Text>
                <TouchableOpacity
                  style={styles.cardModalAddButton}
                  onPress={() => {
                    setShowCardDropdown(false);
                    router.push('/user/user_payment_methods');
                  }}
                >
                  <MaterialIcons name="add" size={20} color="#fff" />
                  <Text style={styles.cardModalAddButtonText}>Agregar Tarjeta</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Tarjeta No Válida */}
      <Modal
        visible={showInvalidCardModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInvalidCardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.invalidCardModalContainer}>
            <View style={styles.invalidCardModalHeader}>
              <MaterialIcons name="error-outline" size={32} color="#DC2626" />
              <Text style={styles.invalidCardModalTitle}>Tarjeta No Válida</Text>
            </View>
            
            <View style={styles.invalidCardModalContent}>
              <MaterialIcons name="credit-card" size={48} color="#9ca3af" />
              <Text style={styles.invalidCardModalMessage}>
                La tarjeta {invalidCardInfo?.brand} •••• {invalidCardInfo?.last4} no puede procesar pagos.
              </Text>
              <Text style={styles.invalidCardModalSubmessage}>
                Selecciona otra tarjeta o usa efectivo como método de pago.
              </Text>
            </View>
            
            <View style={styles.invalidCardModalButtons}>
              <TouchableOpacity 
                style={styles.invalidCardModalButtonSecondary}
                onPress={() => {
                  setShowInvalidCardModal(false);
                  setPaymentMethod('cash');
                }}
              >
                <MaterialIcons name="money" size={20} color="#6b7280" />
                <Text style={styles.invalidCardModalButtonSecondaryText}>Usar Efectivo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.invalidCardModalButtonPrimary}
                onPress={() => setShowInvalidCardModal(false)}
              >
                <MaterialIcons name="credit-card" size={20} color="#fff" />
                <Text style={styles.invalidCardModalButtonPrimaryText}>Cambiar Tarjeta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 16,
    backgroundColor: '#2563EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Poppins',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 0,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  rideInfo: {
    gap: 12,
  },
  rideInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rideInfoIcon: {
    width: 24,
    alignItems: 'center',
    marginTop: 2,
  },
  rideInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 80,
    fontFamily: 'Poppins',
  },
  rideInfoValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
    fontFamily: 'Poppins',
    fontWeight: '500',
    marginLeft: 12,
  },
  methods: {
    flexDirection: 'row',
    gap: 12,
  },
  methodBtn: {
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
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  methodTextSel: {
    color: '#2563EB',
    fontWeight: '600',
  },
  tips: {
    flexDirection: 'row',
    gap: 8,
  },
  tipBtn: {
    flex: 1,
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
  tipTextSel: {
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
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
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
  costSummary: {
    gap: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins',
  },
  costValue: {
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
  bottomSpacer: {
    height: 20,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cta: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ctaDisabled: {
    backgroundColor: '#9ca3af',
  },
  ctaIcon: {
    marginRight: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
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
  // Estilos para dropdown de tarjetas
  cardDropdownContainer: {
    position: 'relative',
    zIndex: 9998,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: -220,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
    marginTop: 4,
    minHeight: 160,
    maxHeight: 240,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minHeight: 70,
  },
  dropdownItemSelected: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#374151',
    fontFamily: 'Poppins',
    marginLeft: 18,
    fontWeight: '500',
  },
  dropdownItemTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  dropdownDefaultBadge: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginLeft: 14,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  dropdownNoCards: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    justifyContent: 'center',
    minHeight: 80,
  },
  dropdownNoCardsText: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'Poppins',
    marginLeft: 8,
    textAlign: 'center',
  },
  // Overlay para cerrar dropdown
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 1999,
  },
  // Estilos para método de pago en resumen
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cashMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    fontFamily: 'Poppins',
    marginLeft: 4,
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
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginLeft: 6,
    fontFamily: 'Poppins',
  },
  // Estilos para Modal de Selección de Tarjetas
  cardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minWidth: 320,
    maxWidth: 400,
  },
  cardModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cardModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'Poppins',
  },
  cardModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardModalItemSelected: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  cardModalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardModalItemText: {
    marginLeft: 16,
    flex: 1,
  },
  cardModalItemTitle: {
    fontSize: 16,
    color: '#374151',
    fontFamily: 'Poppins',
    fontWeight: '500',
  },
  cardModalItemTitleSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  cardModalDefaultBadge: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginTop: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  cardModalNoCards: {
    alignItems: 'center',
    padding: 40,
  },
  cardModalNoCardsTitle: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginTop: 16,
    marginBottom: 8,
  },
  cardModalNoCardsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 24,
  },
  cardModalAddButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardModalAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  // Estilos para Modal de Tarjeta No Válida
  invalidCardModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minWidth: 320,
    maxWidth: 400,
  },
  invalidCardModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 24,
  },
  invalidCardModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Poppins',
  },
  invalidCardModalContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  invalidCardModalMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Poppins',
    fontWeight: '500',
  },
  invalidCardModalSubmessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Poppins',
  },
  invalidCardModalButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  invalidCardModalButtonSecondary: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  invalidCardModalButtonSecondaryText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'Poppins',
  },
  invalidCardModalButtonPrimary: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  invalidCardModalButtonPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'Poppins',
  },
});
