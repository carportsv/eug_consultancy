import { supabase } from './supabaseClient';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'cash';
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  client_secret: string;
}

export interface PaymentTransaction {
  id: string;
  ride_id: string;
  user_id: string;
  driver_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  stripe_payment_intent_id?: string;
  created_at: string;
  updated_at: string;
}

class PaymentService {
  private static instance: PaymentService;
  private _loggedUsers: Set<string> = new Set();

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  // Helper para obtener el Supabase ID del usuario
  private async getSupabaseUserId(firebaseUid: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', firebaseUid)
        .single();

      if (error || !data) {
        console.error('[PaymentService] ❌ Error obteniendo Supabase ID:', error);
        return null;
      }

      // Solo log la primera vez para evitar spam
      if (!this._loggedUsers.has(firebaseUid)) {
        console.log('[PaymentService] 🔍 Firebase UID:', firebaseUid, '→ Supabase ID:', data.id);
        this._loggedUsers.add(firebaseUid);
      }
      
      return data.id;
    } catch (error) {
      console.error('[PaymentService] ❌ Excepción obteniendo Supabase ID:', error);
      return null;
    }
  }

  // Crear intent de pago con Stripe (HOLD - autorización)
  async createPaymentIntent(
    rideId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<PaymentIntent | null> {
    try {
      console.log('[PaymentService] 💳 Creando payment intent (HOLD) para ride:', rideId, 'amount:', amount);
      
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          ride_id: rideId,
          amount: Math.round(amount * 100), // Stripe usa centavos
          currency: currency.toLowerCase()
        }
      });

      if (error) {
        console.error('[PaymentService] ❌ Error creando payment intent:', error);
        return null;
      }

      console.log('[PaymentService] ✅ Payment intent creado (HOLD):', data.id);
      return data;
    } catch (error) {
      console.error('[PaymentService] ❌ Excepción creando payment intent:', error);
      return null;
    }
  }

  // Confirmar pago (CAPTURE - procesar el pago final)
  async confirmPayment(
    paymentIntentId: string,
    rideId: string,
    userId: string,
    driverId: string,
    amount: number
  ): Promise<boolean> {
    try {
      console.log('[PaymentService] 💳 Confirmando pago (CAPTURE) para ride:', rideId);
      
      const { data, error } = await supabase.functions.invoke('confirm-payment', {
        body: {
          payment_intent_id: paymentIntentId,
          ride_id: rideId,
          user_id: userId,
          driver_id: driverId,
          amount: amount
        }
      });

      if (error) {
        console.error('[PaymentService] ❌ Error confirmando pago:', error);
        return false;
      }

      console.log('[PaymentService] ✅ Pago confirmado (CAPTURE):', paymentIntentId);
      return true;
    } catch (error) {
      console.error('[PaymentService] ❌ Excepción confirmando pago:', error);
      return false;
    }
  }

  // Crear setup intent para agregar métodos de pago
  async createSetupIntent(): Promise<PaymentIntent | null> {
    try {
      console.log('[PaymentService] 💳 Creando setup intent para agregar tarjeta...');
      
      const { data, error } = await supabase.functions.invoke('create-setup-intent', {
        body: {}
      });

      if (error) {
        console.error('[PaymentService] ❌ Error creando setup intent:', error);
        return null;
      }

      console.log('[PaymentService] ✅ Setup intent creado:', data.id);
      return data;
    } catch (error) {
      console.error('[PaymentService] ❌ Excepción creando setup intent:', error);
      return null;
    }
  }



  // Guardar método de pago
  async savePaymentMethod(
    userId: string,
    paymentMethodId: string,
    isDefault: boolean = false,
    cardData?: { last4?: string; brand?: string }
  ): Promise<boolean> {
    try {
      console.log('[PaymentService] 💳 Guardando método de pago para usuario:', userId);
      
      const supabaseUserId = await this.getSupabaseUserId(userId);
      if (!supabaseUserId) return false;
      
      const { error } = await supabase
        .from('payment_methods')
        .upsert({
          user_id: supabaseUserId,
          stripe_payment_method_id: paymentMethodId,
          type: 'card',
          last4: cardData?.last4 || null,
          brand: cardData?.brand || null,
          is_default: isDefault,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('[PaymentService] ❌ Error guardando método de pago:', error);
        return false;
      }

      console.log('[PaymentService] ✅ Método de pago guardado');
      return true;
    } catch (error) {
      console.error('[PaymentService] ❌ Excepción guardando método de pago:', error);
      return false;
    }
  }

  // Obtener métodos de pago del usuario
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const supabaseUserId = await this.getSupabaseUserId(userId);
      if (!supabaseUserId) return [];

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', supabaseUserId)
        .order('is_default', { ascending: false });

      if (error) {
        console.error('[PaymentService] ❌ Error obteniendo métodos de pago:', error);
        return [];
      }

      // Transformar los datos para que coincidan con la interfaz PaymentMethod
      const methods: PaymentMethod[] = (data || []).map(method => ({
        id: method.id,
        type: method.type || 'card',
        last4: method.last4,
        brand: method.brand,
        isDefault: method.is_default || false
      }));

      return methods;
    } catch (error) {
      console.error('[PaymentService] ❌ Excepción obteniendo métodos de pago:', error);
      return [];
    }
  }

  // Crear transacción de pago
  async createPaymentTransaction(
    rideId: string,
    userId: string,
    driverId: string,
    amount: number,
    paymentMethod: string,
    stripePaymentIntentId?: string
  ): Promise<PaymentTransaction | null> {
    try {
      console.log('[PaymentService] 💳 Creando transacción de pago para ride:', rideId);
      
      const supabaseUserId = await this.getSupabaseUserId(userId);
      if (!supabaseUserId) return null;
      
      const { data, error } = await supabase
        .from('payment_transactions')
        .insert({
          ride_id: rideId,
          user_id: supabaseUserId,
          driver_id: driverId,
          amount: amount,
          currency: 'USD',
          status: 'pending',
          payment_method: paymentMethod,
          stripe_payment_intent_id: stripePaymentIntentId
        })
        .select()
        .single();

      if (error) {
        console.error('[PaymentService] ❌ Error creando transacción:', error);
        return null;
      }

      console.log('[PaymentService] ✅ Transacción creada:', data.id);
      return data;
    } catch (error) {
      console.error('[PaymentService] ❌ Excepción creando transacción:', error);
      return null;
    }
  }

  // Actualizar estado de transacción
  async updateTransactionStatus(
    transactionId: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payment_transactions')
        .update({
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (error) {
        console.error('[PaymentService] ❌ Error actualizando transacción:', error);
        return false;
      }

      console.log('[PaymentService] ✅ Transacción actualizada a:', status);
      return true;
    } catch (error) {
      console.error('[PaymentService] ❌ Excepción actualizando transacción:', error);
      return false;
    }
  }

  // Obtener historial de transacciones
  async getTransactionHistory(userId: string): Promise<PaymentTransaction[]> {
    try {
      const supabaseUserId = await this.getSupabaseUserId(userId);
      if (!supabaseUserId) return [];

      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', supabaseUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[PaymentService] ❌ Error obteniendo historial:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[PaymentService] ❌ Excepción obteniendo historial:', error);
      return [];
    }
  }

  // Procesar pago en efectivo
  async processCashPayment(
    rideId: string,
    userId: string,
    driverId: string,
    amount: number
  ): Promise<boolean> {
    try {
      console.log('[PaymentService] 💵 Procesando pago en efectivo para ride:', rideId);
      
      // Crear transacción de pago en efectivo
      const transaction = await this.createPaymentTransaction(
        rideId,
        userId,
        driverId,
        amount,
        'cash'
      );

      if (!transaction) {
        return false;
      }

      // Marcar como completada inmediatamente
      await this.updateTransactionStatus(transaction.id, 'completed');

      console.log('[PaymentService] ✅ Pago en efectivo procesado');
      return true;
    } catch (error) {
      console.error('[PaymentService] ❌ Excepción procesando pago en efectivo:', error);
      return false;
    }
  }

  // Calcular comisión para el conductor
  calculateDriverCommission(amount: number, commissionRate: number = 0.8): number {
    return Math.round(amount * commissionRate * 100) / 100;
  }

  // Calcular comisión para la plataforma
  calculatePlatformCommission(amount: number, commissionRate: number = 0.2): number {
    return Math.round(amount * commissionRate * 100) / 100;
  }
}

export const paymentService = PaymentService.getInstance();
