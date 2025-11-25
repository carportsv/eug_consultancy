import { initStripe, createToken, confirmPayment, createPaymentMethod } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG, STRIPE_TEST_CARDS, getStripeErrorMessage } from '../config/stripeConfig';

export interface StripeToken {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface StripePaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

class StripeService {
  private static instance: StripeService;
  private isInitialized = false;

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  // Inicializar Stripe
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('[StripeService] 🔧 Inicializando Stripe...');
      
      await initStripe({
        publishableKey: STRIPE_CONFIG.publishableKey,
        merchantIdentifier: STRIPE_CONFIG.merchantIdentifier,
      });

      this.isInitialized = true;
      console.log('[StripeService] ✅ Stripe inicializado correctamente');
      return true;
    } catch (error) {
      console.error('[StripeService] ❌ Error inicializando Stripe:', error);
      return false;
    }
  }

  // Crear token de tarjeta
  async createCardToken(cardData: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    name?: string;
  }): Promise<StripeToken | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('[StripeService] 💳 Creando token de tarjeta...');
      
      const token = await createToken({
        type: 'Card',
        number: cardData.number.replace(/\s/g, ''),
        expMonth: cardData.expMonth,
        expYear: cardData.expYear,
        cvc: cardData.cvc,
        name: cardData.name,
      });

      if (token.error) {
        console.error('[StripeService] ❌ Error creando token:', token.error);
        throw new Error(getStripeErrorMessage(token.error.code) || token.error.message);
      }

      console.log('[StripeService] ✅ Token creado:', token.id);
      return token;
    } catch (error) {
      console.error('[StripeService] ❌ Excepción creando token:', error);
      throw error;
    }
  }

  // Crear método de pago
  async createPaymentMethod(cardData: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    billingDetails?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
    };
  }): Promise<StripePaymentMethod | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('[StripeService] 💳 Creando método de pago...');
      
      const paymentMethod = await createPaymentMethod({
        type: 'Card',
        billingDetails: paymentMethod.billingDetails,
        card: {
          number: cardData.number.replace(/\s/g, ''),
          expMonth: cardData.expMonth,
          expYear: cardData.expYear,
          cvc: cardData.cvc,
        },
      });

      if (paymentMethod.error) {
        console.error('[StripeService] ❌ Error creando método de pago:', paymentMethod.error);
        throw new Error(getStripeErrorMessage(paymentMethod.error.code) || paymentMethod.error.message);
      }

      console.log('[StripeService] ✅ Método de pago creado:', paymentMethod.id);
      return paymentMethod;
    } catch (error) {
      console.error('[StripeService] ❌ Excepción creando método de pago:', error);
      throw error;
    }
  }

  // Confirmar pago
  async confirmPayment(
    clientSecret: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('[StripeService] 💳 Confirmando pago...');
      
      const result = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          paymentMethodId: paymentMethodId,
        },
      });

      if (result.error) {
        console.error('[StripeService] ❌ Error confirmando pago:', result.error);
        return {
          success: false,
          error: getStripeErrorMessage(result.error.code) || result.error.message,
        };
      }

      console.log('[StripeService] ✅ Pago confirmado exitosamente');
      return { success: true };
    } catch (error) {
      console.error('[StripeService] ❌ Excepción confirmando pago:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  // Validar datos de tarjeta
  validateCardData(cardData: {
    number: string;
    expMonth: string;
    expYear: string;
    cvc: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar número de tarjeta
    const cleanNumber = cardData.number.replace(/\s/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      errors.push('Número de tarjeta inválido');
    }

    // Validar fecha de vencimiento
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const expMonth = parseInt(cardData.expMonth);
    const expYear = parseInt(cardData.expYear);

    if (expMonth < 1 || expMonth > 12) {
      errors.push('Mes de vencimiento inválido');
    }

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      errors.push('Tarjeta expirada');
    }

    // Validar CVV
    if (cardData.cvc.length < 3 || cardData.cvc.length > 4) {
      errors.push('CVV inválido');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Obtener información de tarjeta de prueba
  getTestCardInfo(cardNumber: string) {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    for (const [key, card] of Object.entries(STRIPE_TEST_CARDS)) {
      if (card.number === cleanNumber) {
        return {
          type: key,
          description: card.description,
          isTestCard: true,
        };
      }
    }

    return {
      type: 'real',
      description: 'Tarjeta real',
      isTestCard: false,
    };
  }

  // Formatear número de tarjeta para mostrar
  formatCardNumber(number: string): string {
    const cleaned = number.replace(/\s/g, '').replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  }

  // Obtener marca de tarjeta basada en el número
  getCardBrand(number: string): string {
    const cleanNumber = number.replace(/\s/g, '');
    
    // Visa
    if (/^4/.test(cleanNumber)) return 'visa';
    
    // Mastercard
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return 'mastercard';
    
    // American Express
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    
    // Discover
    if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
    
    // Diners Club
    if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) return 'diners';
    
    return 'unknown';
  }
}

export const stripeService = StripeService.getInstance();
