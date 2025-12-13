import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../auth/supabase_service.dart';
import 'stripe_config.dart';

// Importación condicional para JS interop (solo disponible en web)
import 'stripe_js_interop_mobile.dart' if (dart.library.html) 'stripe_js_interop_web.dart';

/// Resultado de un Payment Intent
class PaymentIntentResult {
  final String id;
  final String clientSecret;
  final int amount;
  final String currency;
  final String status;

  PaymentIntentResult({
    required this.id,
    required this.clientSecret,
    required this.amount,
    required this.currency,
    required this.status,
  });

  factory PaymentIntentResult.fromMap(Map<String, dynamic> data) {
    return PaymentIntentResult(
      id: data['id'] as String,
      clientSecret: data['client_secret'] as String,
      amount: data['amount'] as int,
      currency: data['currency'] as String? ?? 'usd',
      status: data['status'] as String? ?? 'pending',
    );
  }
}

/// Resultado de una Checkout Session
class CheckoutSessionResult {
  final String sessionId;
  final String checkoutUrl;
  final String? paymentIntentId;

  CheckoutSessionResult({required this.sessionId, required this.checkoutUrl, this.paymentIntentId});

  factory CheckoutSessionResult.fromMap(Map<String, dynamic> data) {
    return CheckoutSessionResult(
      sessionId: data['session_id'] as String,
      checkoutUrl: data['checkout_url'] as String,
      paymentIntentId: data['payment_intent_id'] as String?,
    );
  }
}

/// Servicio para manejar pagos con Stripe usando Supabase Edge Functions
class StripeService {
  static final StripeService _instance = StripeService._internal();
  factory StripeService() => _instance;
  StripeService._internal();

  /// Obtener la clave pública de Stripe
  static String get publishableKey => StripeConfig.publishableKey;

  /// Confirmar Payment Intent usando Payment Sheet (móvil) o confirmPayment (web)
  ///
  /// En móvil: usa Payment Sheet para manejar la entrada de datos de tarjeta
  /// En web: usa confirmPayment directamente con los datos de tarjeta
  /// Maneja automáticamente 3D Secure si es requerido.
  ///
  /// Retorna un Map con:
  /// - 'success': bool - Si el pago fue exitoso
  /// - 'status': String - Estado final del Payment Intent
  /// - 'error': String? - Mensaje de error si hubo alguno
  static Future<Map<String, dynamic>> confirmPaymentIntentWithCard({
    required String clientSecret,
    required String currency,
    String? cardholderName,
    // Parámetros opcionales para web (cuando no se usa Payment Sheet)
    String? cardNumber,
    String? expMonth,
    String? expYear,
    String? cvc,
  }) async {
    try {
      if (kDebugMode) {
        debugPrint('[StripeService] 💳 Inicializando Payment Sheet...');
      }

      // 1. Detectar plataforma y usar el método apropiado
      if (kIsWeb) {
        // En web, usar confirmPayment directamente con datos de tarjeta
        if (kDebugMode) {
          debugPrint('[StripeService] 🌐 Detectado web - usando confirmPayment directamente');
        }

        // Verificar que tengamos los datos de tarjeta necesarios
        if (cardNumber == null || expMonth == null || expYear == null || cvc == null) {
          if (kDebugMode) {
            debugPrint('[StripeService] ❌ Datos de tarjeta incompletos para web');
          }
          return {
            'success': false,
            'status': 'failed',
            'error': 'Datos de tarjeta incompletos. Por favor, completa todos los campos.',
          };
        }

        // En web, usar Stripe.js a través de JS interop
        try {
          // 1. Verificar y obtener la clave pública
          final publishableKey = StripeConfig.publishableKey;
          if (kDebugMode) {
            debugPrint(
              '[StripeService] 🔑 Clave pública de Stripe: ${publishableKey.substring(0, publishableKey.length > 20 ? 20 : publishableKey.length)}... (longitud: ${publishableKey.length})',
            );
            // Log completo de la clave para debugging (solo en desarrollo)
            if (publishableKey.length < 100) {
              debugPrint(
                '[StripeService] ⚠️ ADVERTENCIA: La clave parece estar truncada. Longitud esperada: ~100+ caracteres',
              );
              debugPrint('[StripeService] 🔍 Clave completa: $publishableKey');
            }
          }
          if (publishableKey.isEmpty) {
            if (kDebugMode) {
              debugPrint('[StripeService] ❌ Stripe publishable key vacía');
            }
            return {
              'success': false,
              'status': 'failed',
              'error': 'Stripe no está configurado correctamente. Contacta al soporte.',
            };
          }

          // Verificar que la clave tenga el formato correcto
          if (!publishableKey.startsWith('pk_test_') && !publishableKey.startsWith('pk_live_')) {
            if (kDebugMode) {
              debugPrint(
                '[StripeService] ❌ Formato de clave inválido. Debe comenzar con pk_test_ o pk_live_',
              );
            }
            return {
              'success': false,
              'status': 'failed',
              'error': 'Clave de API de Stripe con formato inválido. Contacta al soporte técnico.',
            };
          }

          // 2. Inicializar Stripe directamente (esto es idempotente, puede llamarse múltiples veces)
          // Si las funciones no están disponibles, el error será capturado más abajo
          try {
            // Limpiar la clave de espacios en blanco
            final cleanKey = publishableKey.trim();
            if (kDebugMode) {
              debugPrint(
                '[StripeService] 🔑 Clave limpia (sin espacios): ${cleanKey.substring(0, cleanKey.length > 20 ? 20 : cleanKey.length)}... (longitud: ${cleanKey.length})',
              );
            }

            // Inicializar Stripe de forma asíncrona sin bloquear
            // Usar unawaited para evitar que bloquee el hot restart
            // El resultado es un bool, no necesitamos manejarlo
            unawaited(
              stripeInitializeJS(cleanKey).toDart
                  .then((result) {
                    if (kDebugMode) {
                      debugPrint(
                        '[StripeService] ✅ Stripe inicializado en web (resultado: $result)',
                      );
                    }
                  })
                  .catchError((e) {
                    if (kDebugMode) {
                      debugPrint(
                        '[StripeService] ⚠️ Error en inicialización asíncrona de Stripe: $e',
                      );
                    }
                  }),
            );

            if (kDebugMode) {
              debugPrint('[StripeService] ⏳ Inicializando Stripe en segundo plano...');
            }
          } catch (e) {
            if (kDebugMode) {
              debugPrint('[StripeService] ⚠️ Error inicializando Stripe: $e');
              debugPrint(
                '[StripeService] Continuando de todas formas (puede que ya esté inicializado)...',
              );
            }
            // Continuar aunque falle la inicialización (puede que ya esté inicializado)
          }

          // 2. Confirmar Payment Intent directamente con datos de tarjeta
          // Esto evita el error "Please use Stripe Elements" al usar confirmCardPayment
          // con payment_method_data directamente
          if (kDebugMode) {
            debugPrint(
              '[StripeService] 💳 Confirmando Payment Intent directamente con datos de tarjeta...',
            );
          }

          // Obtener URL y API key de Supabase para llamar al backend
          // Obtener desde las variables de entorno (mismo método que usa SupabaseService)
          final supabaseUrl = dotenv.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
          final supabaseAnonKey = dotenv.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';

          if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
            if (kDebugMode) {
              debugPrint('[StripeService] ❌ Supabase URL o API key no encontrados');
            }
            return {
              'success': false,
              'status': 'failed',
              'error': 'Error de configuración. Contacta al soporte técnico.',
            };
          }

          final cardDataMap = <String, dynamic>{
            'number': cardNumber.replaceAll(RegExp(r'\s'), ''),
            'expMonth': expMonth,
            'expYear': expYear,
            'cvc': cvc,
            if (cardholderName != null && cardholderName.isNotEmpty) 'name': cardholderName,
          };
          final cardData = jsify(cardDataMap);

          Map<String, dynamic>? confirmData;
          try {
            if (kDebugMode) {
              debugPrint(
                '[StripeService] 📤 Creando Payment Method en backend y confirmando Payment Intent...',
              );
            }
            final confirmPromise = stripeConfirmPaymentWithCardDataJS(
              clientSecret,
              cardData,
              supabaseUrl,
              supabaseAnonKey,
            );
            final confirmResult = await confirmPromise.toDart;
            confirmData = confirmResult != null
                ? dartify(confirmResult) as Map<String, dynamic>?
                : null;
          } catch (e) {
            if (kDebugMode) {
              debugPrint('[StripeService] ❌ Error confirmando Payment Intent: $e');
            }

            String errorMessage =
                'Error al procesar los datos de la tarjeta. Verifica la información e intenta nuevamente.';
            final errorString = e.toString();

            // Intentar extraer código de error desde el objeto JS
            try {
              // Detectar errores específicos de Stripe
              if (errorString.contains('Invalid API Key') ||
                  errorString.contains('invalid_request_error')) {
                // Si el error menciona Elements, es porque Stripe requiere Elements
                if (errorString.contains('Elements') || errorString.contains('Stripe Elements')) {
                  errorMessage =
                      'Stripe requiere usar Stripe Elements para recopilar datos de tarjeta de forma segura. Contacta al soporte técnico.';
                } else {
                  errorMessage = 'Clave de API de Stripe inválida. Contacta al soporte técnico.';
                }
              } else if (errorString.contains('code:') || errorString.contains('"code"')) {
                // Si el error viene como objeto JS con código
                final codeMatch = RegExp(
                  r'code[:\s]+([a-z_]+)',
                  caseSensitive: false,
                ).firstMatch(errorString);
                if (codeMatch != null) {
                  final errorCode = codeMatch.group(1);
                  if (errorCode != null) {
                    errorMessage = StripeErrorMessages.getErrorMessage(errorCode);
                    if (kDebugMode) {
                      debugPrint('[StripeService] 📝 Error code extraído: $errorCode');
                    }
                  }
                }
              } else {
                // Fallback a detección por texto
                if (errorString.contains('invalid_number')) {
                  errorMessage = StripeErrorMessages.getErrorMessage('invalid_number');
                } else if (errorString.contains('incorrect_cvc') ||
                    errorString.contains('cvc') ||
                    errorString.contains('cvv')) {
                  errorMessage = StripeErrorMessages.getErrorMessage('incorrect_cvc');
                } else if (errorString.contains('expired')) {
                  errorMessage = StripeErrorMessages.getErrorMessage('expired_card');
                } else if (errorString.contains('Elements') ||
                    errorString.contains('Stripe Elements')) {
                  errorMessage =
                      'Stripe requiere usar Stripe Elements para recopilar datos de tarjeta de forma segura. Contacta al soporte técnico.';
                }
              }
            } catch (parseError) {
              if (kDebugMode) {
                debugPrint('[StripeService] ⚠️ Error parseando código de error: $parseError');
              }
            }

            return {'success': false, 'status': 'failed', 'error': errorMessage};
          }

          if (confirmData == null) {
            if (kDebugMode) {
              debugPrint('[StripeService] ❌ No se pudo confirmar Payment Intent');
            }
            return {
              'success': false,
              'status': 'failed',
              'error': 'Error al confirmar el pago. Intenta nuevamente.',
            };
          }

          final paymentStatus = confirmData['status'] as String?;
          if (kDebugMode) {
            debugPrint('[StripeService] 📊 Estado del Payment Intent: $paymentStatus');
          }

          // 3. Verificar estado final
          if (paymentStatus == 'succeeded') {
            if (kDebugMode) {
              debugPrint('[StripeService] ✅ Pago confirmado exitosamente en web');
            }
            return {'success': true, 'status': 'succeeded', 'error': null};
          } else if (paymentStatus == 'requires_capture') {
            if (kDebugMode) {
              debugPrint('[StripeService] ✅ Pago autorizado (HOLD) en web. Listo para capturar.');
            }
            return {'success': true, 'status': 'requires_capture', 'error': null};
          } else if (paymentStatus == 'requires_action') {
            if (kDebugMode) {
              debugPrint('[StripeService] 🔐 Requiere autenticación 3D Secure en web');
            }
            return {'success': true, 'status': 'requires_action', 'error': null};
          } else {
            // Obtener mensaje de error si está disponible
            String errorMessage = 'El pago no pudo ser procesado. Intenta nuevamente.';
            if (confirmData['error'] != null) {
              final errorData = confirmData['error'] as Map<String, dynamic>?;
              if (errorData != null) {
                errorMessage = errorData['message'] as String? ?? errorMessage;
                final errorCode = errorData['code'] as String?;
                if (errorCode != null) {
                  errorMessage = StripeErrorMessages.getErrorMessage(errorCode);
                }
              }
            }

            return {'success': false, 'status': paymentStatus ?? 'failed', 'error': errorMessage};
          }
        } catch (e, stackTrace) {
          if (kDebugMode) {
            debugPrint('[StripeService] ❌ Excepción procesando pago en web: $e');
            debugPrint('[StripeService] 📚 Stack trace: $stackTrace');
          }

          // Intentar extraer información del error de Stripe.js
          String errorMessage = 'Error al procesar el pago. Intenta nuevamente.';

          // Intentar extraer código de error si viene en el formato de Stripe.js
          try {
            final errorString = e.toString();
            // Si el error viene como objeto con código (desde stripe_helper.js)
            if (errorString.contains('code:') || errorString.contains('"code"')) {
              // Intentar extraer el código del error
              final codeMatch = RegExp(
                r'code[:\s]+([a-z_]+)',
                caseSensitive: false,
              ).firstMatch(errorString);
              if (codeMatch != null) {
                final errorCode = codeMatch.group(1);
                if (errorCode != null) {
                  errorMessage = StripeErrorMessages.getErrorMessage(errorCode);
                  if (kDebugMode) {
                    debugPrint('[StripeService] 📝 Error code extraído: $errorCode');
                  }
                }
              }
            }

            // Fallback a detección por texto si no se encontró código
            if (errorMessage == 'Error al procesar el pago. Intenta nuevamente.') {
              if (errorString.contains('card_error') || errorString.contains('declined')) {
                errorMessage = StripeErrorMessages.getErrorMessage('card_declined');
              } else if (errorString.contains('expired')) {
                errorMessage = StripeErrorMessages.getErrorMessage('expired_card');
              } else if (errorString.contains('cvc') ||
                  errorString.contains('cvv') ||
                  errorString.contains('incorrect_cvc')) {
                errorMessage = StripeErrorMessages.getErrorMessage('incorrect_cvc');
              } else if (errorString.contains('insufficient')) {
                errorMessage = StripeErrorMessages.getErrorMessage('insufficient_funds');
              } else if (errorString.contains('invalid_number')) {
                errorMessage = StripeErrorMessages.getErrorMessage('invalid_number');
              } else if (errorString.contains('processing_error')) {
                errorMessage = StripeErrorMessages.getErrorMessage('processing_error');
              }
            }
          } catch (parseError) {
            if (kDebugMode) {
              debugPrint('[StripeService] ⚠️ Error parseando mensaje de error: $parseError');
            }
          }

          return {'success': false, 'status': 'failed', 'error': errorMessage};
        }
      } else {
        // En móvil, usar Payment Sheet
        // 1. Verificar que Stripe esté inicializado (solo en móvil)
        if (Stripe.publishableKey.isEmpty) {
          if (kDebugMode) {
            debugPrint('[StripeService] ❌ Stripe no está inicializado. Clave pública vacía.');
          }
          return {
            'success': false,
            'status': 'failed',
            'error': 'Stripe no está configurado correctamente. Contacta al soporte.',
          };
        }

        if (kDebugMode) {
          debugPrint('[StripeService] 📱 Detectado móvil - usando Payment Sheet');
        }

        // 3. Inicializar Payment Sheet
        try {
          await Stripe.instance.initPaymentSheet(
            paymentSheetParameters: SetupPaymentSheetParameters(
              merchantDisplayName: 'ZKT Taxi',
              paymentIntentClientSecret: clientSecret,
              customerId: null, // Opcional: ID del cliente en Stripe
              allowsDelayedPaymentMethods: true, // Permite métodos de pago con captura diferida
              billingDetails: cardholderName != null ? BillingDetails(name: cardholderName) : null,
            ),
          );
        } catch (e) {
          if (kDebugMode) {
            debugPrint('[StripeService] ❌ Error inicializando Payment Sheet: $e');
          }
          return {
            'success': false,
            'status': 'failed',
            'error':
                'Error al inicializar el formulario de pago. Verifica tu conexión e intenta nuevamente.',
          };
        }

        if (kDebugMode) {
          debugPrint('[StripeService] ✅ Payment Sheet inicializado');
          debugPrint('[StripeService] 💳 Presentando Payment Sheet al usuario...');
        }

        // 4. Presentar Payment Sheet al usuario
        try {
          await Stripe.instance.presentPaymentSheet();
        } on StripeException catch (e) {
          return _handleStripeException(e);
        } catch (e) {
          if (kDebugMode) {
            debugPrint('[StripeService] ❌ Error presentando Payment Sheet: $e');
          }
          return {
            'success': false,
            'status': 'failed',
            'error': 'Error al procesar el pago. Intenta nuevamente.',
          };
        }
      }

      // 5. Obtener el Payment Intent actualizado para verificar estado (después de éxito)
      final paymentIntent = await Stripe.instance.retrievePaymentIntent(clientSecret);

      if (kDebugMode) {
        debugPrint('[StripeService] 📊 Estado del Payment Intent: ${paymentIntent.status}');
      }

      // 5. Verificar estado final
      final status = paymentIntent.status.toString().toLowerCase();
      if (status == 'succeeded') {
        if (kDebugMode) {
          debugPrint('[StripeService] ✅ Pago confirmado exitosamente');
        }
        return {'success': true, 'status': 'succeeded', 'error': null};
      } else if (status == 'requires_capture') {
        // Con capture_method: 'manual', el pago se autoriza pero no se cobra
        // El estado será 'requires_capture' hasta que se capture
        if (kDebugMode) {
          debugPrint('[StripeService] ✅ Pago autorizado (HOLD). Listo para capturar.');
        }
        return {'success': true, 'status': 'requires_capture', 'error': null};
      } else if (status == 'requires_action') {
        // Esto no debería pasar porque Payment Sheet maneja 3D Secure automáticamente
        if (kDebugMode) {
          debugPrint('[StripeService] 🔐 Requiere autenticación 3D Secure');
        }
        return {'success': true, 'status': 'requires_action', 'error': null};
      } else if (status == 'requires_payment_method') {
        // Obtener el error específico del Payment Intent
        String errorMessage = 'El método de pago fue rechazado. Intenta con otra tarjeta.';

        // Intentar obtener el error específico del Payment Intent
        try {
          // El PaymentIntent puede tener un lastPaymentError con el código de error
          // En flutter_stripe, necesitamos acceder a través de la respuesta del servidor
          // Por ahora, usamos el mensaje genérico pero mejorado
          if (kDebugMode) {
            debugPrint('[StripeService] ⚠️ Payment Intent requiere nuevo método de pago');
          }

          // Intentar obtener el error desde el PaymentIntent
          // Nota: flutter_stripe puede no exponer directamente lastPaymentError,
          // pero podemos intentar obtenerlo desde el error del Payment Sheet
          errorMessage =
              'El método de pago fue rechazado. Verifica los datos de tu tarjeta e intenta nuevamente.';
        } catch (e) {
          if (kDebugMode) {
            debugPrint('[StripeService] ⚠️ No se pudo obtener error específico: $e');
          }
        }

        return {'success': false, 'status': 'requires_payment_method', 'error': errorMessage};
      } else if (status == 'requires_confirmation') {
        return {
          'success': false,
          'status': 'requires_confirmation',
          'error': 'El pago requiere confirmación adicional.',
        };
      } else if (status == 'processing') {
        return {
          'success': false,
          'status': 'processing',
          'error': 'El pago está siendo procesado. Por favor espera.',
        };
      } else if (status == 'canceled') {
        return {'success': false, 'status': 'canceled', 'error': 'El pago fue cancelado.'};
      } else {
        return {'success': false, 'status': status, 'error': 'Estado de pago desconocido: $status'};
      }
    } on StripeException catch (e) {
      if (kDebugMode) {
        debugPrint('[StripeService] ❌ Error de Stripe: ${e.error.code} - ${e.error.message}');
      }
      final errorCode = e.error.code.toString();
      return {
        'success': false,
        'status': 'failed',
        'error': StripeErrorMessages.getErrorMessage(errorCode),
      };
    } catch (e, stackTrace) {
      if (kDebugMode) {
        debugPrint('[StripeService] ❌ Excepción confirmando pago: $e');
        debugPrint('[StripeService] 📚 Stack trace: $stackTrace');
      }

      // Intentar extraer información del error
      String errorMessage = 'Error al procesar el pago. Intenta nuevamente.';

      if (e.toString().contains('StripeException') || e.toString().contains('Stripe')) {
        errorMessage = 'Error de Stripe. Verifica tu conexión e intenta nuevamente.';
      } else if (e.toString().contains('Network') || e.toString().contains('network')) {
        errorMessage = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
      } else if (e.toString().contains('timeout') || e.toString().contains('Timeout')) {
        errorMessage = 'Tiempo de espera agotado. Intenta nuevamente.';
      }

      return {'success': false, 'status': 'failed', 'error': errorMessage};
    }
  }

  /// Crear un Payment Intent (HOLD - autorización)
  ///
  /// Este método crea un Payment Intent que reserva el monto pero no lo cobra.
  /// El pago se procesará (CAPTURE) cuando se confirme al finalizar el viaje.
  static Future<PaymentIntentResult?> createPaymentIntent({
    required String rideId,
    required double amount,
    String currency = 'usd',
  }) async {
    try {
      if (kDebugMode) {
        debugPrint(
          '[StripeService] 💳 Creando payment intent (HOLD) para ride: $rideId, amount: $amount',
        );
      }

      final supabaseService = SupabaseService();
      final supabaseClient = supabaseService.client;

      // Llamar a la Edge Function de Supabase
      final response = await supabaseClient.functions.invoke(
        'create-payment-intent',
        body: {
          'ride_id': rideId,
          'amount': (amount * 100).round(), // Stripe usa centavos
          'currency': currency.toLowerCase(),
        },
      );

      if (response.status == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (kDebugMode) {
          debugPrint('[StripeService] ✅ Payment intent creado (HOLD): ${data['id']}');
        }
        return PaymentIntentResult.fromMap(data);
      } else {
        if (kDebugMode) {
          debugPrint(
            '[StripeService] ❌ Error creando payment intent: ${response.status} - ${response.data}',
          );
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[StripeService] ❌ Excepción creando payment intent: $e');
      }
      return null;
    }
  }

  /// Confirmar pago (CAPTURE - procesar el pago final)
  ///
  /// Este método procesa el pago que fue autorizado previamente con createPaymentIntent.
  static Future<bool> confirmPayment({
    required String paymentIntentId,
    required String rideId,
    required String userId,
    required String driverId,
    required double amount,
  }) async {
    try {
      if (kDebugMode) {
        debugPrint('[StripeService] 💳 Confirmando pago (CAPTURE) para ride: $rideId');
      }

      final supabaseService = SupabaseService();
      final supabaseClient = supabaseService.client;

      // Llamar a la Edge Function de Supabase
      final response = await supabaseClient.functions.invoke(
        'confirm-payment',
        body: {
          'payment_intent_id': paymentIntentId,
          'ride_id': rideId,
          'user_id': userId,
          'driver_id': driverId,
          'amount': amount,
        },
      );

      if (response.status == 200) {
        if (kDebugMode) {
          debugPrint('[StripeService] ✅ Pago confirmado (CAPTURE): $paymentIntentId');
        }
        return true;
      } else {
        if (kDebugMode) {
          debugPrint(
            '[StripeService] ❌ Error confirmando pago: ${response.status} - ${response.data}',
          );
        }
        return false;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[StripeService] ❌ Excepción confirmando pago: $e');
      }
      return false;
    }
  }

  /// Crear Setup Intent para agregar métodos de pago
  ///
  /// Permite guardar tarjetas para pagos futuros sin procesar un pago inmediato.
  static Future<PaymentIntentResult?> createSetupIntent() async {
    try {
      if (kDebugMode) {
        debugPrint('[StripeService] 💳 Creando setup intent para agregar tarjeta...');
      }

      final supabaseService = SupabaseService();
      final supabaseClient = supabaseService.client;

      // Llamar a la Edge Function de Supabase
      final response = await supabaseClient.functions.invoke('create-setup-intent', body: {});

      if (response.status == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (kDebugMode) {
          debugPrint('[StripeService] ✅ Setup intent creado: ${data['id']}');
        }
        return PaymentIntentResult.fromMap(data);
      } else {
        if (kDebugMode) {
          debugPrint(
            '[StripeService] ❌ Error creando setup intent: ${response.status} - ${response.data}',
          );
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[StripeService] ❌ Excepción creando setup intent: $e');
      }
      return null;
    }
  }

  /// Validar datos de tarjeta
  static Map<String, dynamic> validateCardData({
    required String number,
    required String expMonth,
    required String expYear,
    required String cvc,
  }) {
    final errors = <String>[];
    final cleanNumber = number.replaceAll(RegExp(r'\s'), '');

    // Validar número de tarjeta
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      errors.add('Número de tarjeta inválido');
    }

    // Validar fecha de vencimiento
    final currentYear = DateTime.now().year;
    final currentMonth = DateTime.now().month;

    final expMonthInt = int.tryParse(expMonth);
    final expYearInt = int.tryParse(expYear);

    if (expMonthInt == null || expMonthInt < 1 || expMonthInt > 12) {
      errors.add('Mes de vencimiento inválido');
    }

    if (expYearInt == null ||
        expYearInt < currentYear ||
        (expYearInt == currentYear && (expMonthInt ?? 0) < currentMonth)) {
      errors.add('Tarjeta expirada');
    }

    // Validar CVV
    if (cvc.length < 3 || cvc.length > 4) {
      errors.add('CVV inválido');
    }

    return {'isValid': errors.isEmpty, 'errors': errors};
  }

  /// Obtener marca de tarjeta basada en el número
  static String getCardBrand(String number) {
    final cleanNumber = number.replaceAll(RegExp(r'\s'), '');

    // Visa
    if (RegExp(r'^4').hasMatch(cleanNumber)) return 'visa';

    // Mastercard
    if (RegExp(r'^5[1-5]').hasMatch(cleanNumber) || RegExp(r'^2[2-7]').hasMatch(cleanNumber)) {
      return 'mastercard';
    }

    // American Express
    if (RegExp(r'^3[47]').hasMatch(cleanNumber)) return 'amex';

    // Discover
    if (RegExp(r'^6(?:011|5)').hasMatch(cleanNumber)) return 'discover';

    // Diners Club
    if (RegExp(r'^3(?:0[0-5]|[68])').hasMatch(cleanNumber)) return 'diners';

    return 'unknown';
  }

  /// Formatear número de tarjeta para mostrar
  static String formatCardNumber(String number) {
    final cleaned = number.replaceAll(RegExp(r'\s|\D'), '');
    final groups = <String>[];
    for (int i = 0; i < cleaned.length; i += 4) {
      if (i + 4 <= cleaned.length) {
        groups.add(cleaned.substring(i, i + 4));
      } else {
        groups.add(cleaned.substring(i));
      }
    }
    return groups.join(' ');
  }

  /// Manejar excepciones de Stripe de forma centralizada
  static Map<String, dynamic> _handleStripeException(StripeException e) {
    String errorCode = '';
    String errorMessage = '';

    // Obtener el código de error
    errorCode = e.error.code.toString();

    // Obtener el mensaje de error
    errorMessage = e.error.message.toString();

    // Verificar si fue cancelado por el usuario
    if (errorCode.contains('Canceled') ||
        errorCode.contains('canceled') ||
        errorMessage.toLowerCase().contains('canceled') ||
        errorMessage.toLowerCase().contains('cancelado')) {
      if (kDebugMode) {
        debugPrint('[StripeService] ⚠️ Pago cancelado por el usuario');
      }
      return {'success': false, 'status': 'canceled', 'error': 'Pago cancelado por el usuario.'};
    }

    // Extraer el error desde el código y mensaje
    final specificError = _extractErrorFromPaymentIntent(
      errorCode: errorCode,
      errorMessage: errorMessage,
    );

    if (kDebugMode) {
      debugPrint('[StripeService] ❌ Error de Stripe:');
      debugPrint('  - Código: $errorCode');
      debugPrint('  - Mensaje: $errorMessage');
      debugPrint('  - Error final: $specificError');
    }

    return {'success': false, 'status': 'failed', 'error': specificError};
  }

  /// Extraer el error específico del Payment Intent desde el código y mensaje
  static String _extractErrorFromPaymentIntent({
    required String errorCode,
    required String errorMessage,
  }) {
    // Primero intentar con el código de error
    if (errorCode.isNotEmpty) {
      // Normalizar el código de error
      final normalizedCode = errorCode.toLowerCase().replaceAll('_', '').replaceAll('-', '');

      // Mapear códigos comunes
      if (normalizedCode.contains('carddeclined') || normalizedCode.contains('declined')) {
        return StripeErrorMessages.getErrorMessage('card_declined');
      } else if (normalizedCode.contains('expiredcard') || normalizedCode.contains('expired')) {
        return StripeErrorMessages.getErrorMessage('expired_card');
      } else if (normalizedCode.contains('insufficientfunds') ||
          normalizedCode.contains('insufficient')) {
        return StripeErrorMessages.getErrorMessage('insufficient_funds');
      } else if (normalizedCode.contains('incorrectcvc') ||
          normalizedCode.contains('cvc') ||
          normalizedCode.contains('cvv')) {
        return StripeErrorMessages.getErrorMessage('incorrect_cvc');
      } else if (normalizedCode.contains('stolencard') || normalizedCode.contains('stolen')) {
        return StripeErrorMessages.getErrorMessage('stolen_card');
      } else if (normalizedCode.contains('lostcard') || normalizedCode.contains('lost')) {
        return StripeErrorMessages.getErrorMessage('lost_card');
      } else if (normalizedCode.contains('invalidnumber') ||
          normalizedCode.contains('invalidnumber')) {
        return StripeErrorMessages.getErrorMessage('invalid_number');
      } else if (normalizedCode.contains('processingerror') ||
          normalizedCode.contains('processing')) {
        return StripeErrorMessages.getErrorMessage('processing_error');
      } else if (normalizedCode.contains('genericdecline') || normalizedCode.contains('generic')) {
        return StripeErrorMessages.getErrorMessage('generic_decline');
      } else {
        // Intentar obtener el mensaje usando el código directamente
        final message = StripeErrorMessages.getErrorMessage(errorCode);
        if (message != 'Error de pago. Intenta nuevamente.') {
          return message;
        }
      }
    }

    // Si no encontramos nada en el código, buscar en el mensaje
    if (errorMessage.isNotEmpty) {
      final lowerMessage = errorMessage.toLowerCase();

      if (lowerMessage.contains('declined') ||
          lowerMessage.contains('declinada') ||
          lowerMessage.contains('rechazada')) {
        return StripeErrorMessages.getErrorMessage('card_declined');
      } else if (lowerMessage.contains('expired') || lowerMessage.contains('expirada')) {
        return StripeErrorMessages.getErrorMessage('expired_card');
      } else if (lowerMessage.contains('insufficient') || lowerMessage.contains('fondos')) {
        return StripeErrorMessages.getErrorMessage('insufficient_funds');
      } else if (lowerMessage.contains('cvc') ||
          lowerMessage.contains('cvv') ||
          lowerMessage.contains('código de seguridad')) {
        return StripeErrorMessages.getErrorMessage('incorrect_cvc');
      } else if (lowerMessage.contains('stolen') || lowerMessage.contains('robada')) {
        return StripeErrorMessages.getErrorMessage('stolen_card');
      } else if (lowerMessage.contains('lost') || lowerMessage.contains('perdida')) {
        return StripeErrorMessages.getErrorMessage('lost_card');
      } else if (lowerMessage.contains('invalid number') ||
          lowerMessage.contains('número inválido')) {
        return StripeErrorMessages.getErrorMessage('invalid_number');
      } else if (lowerMessage.contains('processing error') ||
          lowerMessage.contains('error procesando')) {
        return StripeErrorMessages.getErrorMessage('processing_error');
      } else if (lowerMessage.contains('generic') || lowerMessage.contains('genérico')) {
        return StripeErrorMessages.getErrorMessage('generic_decline');
      }
    }

    // Si no encontramos nada específico, devolver mensaje genérico pero útil
    return 'El método de pago fue rechazado. Verifica los datos de tu tarjeta e intenta nuevamente.';
  }

  /// Obtener mensaje de error amigable
  static String getErrorMessage(String errorCode) {
    return StripeErrorMessages.getErrorMessage(errorCode);
  }

  /// Crear una Checkout Session en Stripe
  ///
  /// Este método crea una sesión de Checkout que redirige al usuario a Stripe
  /// para completar el pago. NO requiere "Raw Card Data APIs".
  ///
  /// Retorna la URL de Checkout a la que se debe redirigir al usuario.
  static Future<CheckoutSessionResult?> createCheckoutSession({
    required String rideId,
    required double amount,
    String currency = 'usd',
    String? originAddress,
    String? destinationAddress,
    String? clientEmail,
    String? clientName,
    required String successUrl,
    required String cancelUrl,
  }) async {
    try {
      if (kDebugMode) {
        debugPrint(
          '[StripeService] 🛒 Creando Checkout Session para ride: $rideId, amount: $amount',
        );
      }

      final supabaseService = SupabaseService();
      final supabaseClient = supabaseService.client;

      // Llamar a la Edge Function de Supabase
      final response = await supabaseClient.functions.invoke(
        'create-checkout-session',
        body: {
          'ride_id': rideId,
          'amount': amount, // La Edge Function convierte a centavos
          'currency': currency.toLowerCase(),
          if (originAddress != null) 'origin_address': originAddress,
          if (destinationAddress != null) 'destination_address': destinationAddress,
          if (clientEmail != null) 'client_email': clientEmail,
          if (clientName != null) 'client_name': clientName,
          'success_url': successUrl,
          'cancel_url': cancelUrl,
        },
      );

      if (response.status == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (kDebugMode) {
          debugPrint('[StripeService] ✅ Checkout Session creada: ${data['session_id']}');
          debugPrint('[StripeService] 🔗 URL: ${data['checkout_url']}');
        }
        return CheckoutSessionResult.fromMap(data);
      } else {
        if (kDebugMode) {
          debugPrint(
            '[StripeService] ❌ Error creando Checkout Session: ${response.status} - ${response.data}',
          );
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[StripeService] ❌ Excepción creando Checkout Session: $e');
      }
      return null;
    }
  }

  /// Verificar el estado de una Checkout Session
  ///
  /// Este método verifica si el pago fue exitoso después de que el usuario
  /// regresa de Stripe Checkout.
  ///
  /// Retorna un Map con:
  /// - 'success': bool - Si el pago fue exitoso
  /// - 'payment_status': String - Estado del pago ('paid', 'unpaid', etc.)
  /// - 'payment_intent_id': String? - ID del Payment Intent si fue exitoso
  /// - 'ride_id': String? - ID del viaje
  static Future<Map<String, dynamic>> verifyCheckoutSession({required String sessionId}) async {
    try {
      if (kDebugMode) {
        debugPrint('[StripeService] 🔍 Verificando Checkout Session: $sessionId');
      }

      final supabaseService = SupabaseService();
      final supabaseClient = supabaseService.client;

      // Llamar a la Edge Function de Supabase
      final response = await supabaseClient.functions.invoke(
        'verify-checkout-session',
        body: {'session_id': sessionId},
      );

      if (response.status == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (kDebugMode) {
          debugPrint('[StripeService] ✅ Verificación completada');
          debugPrint('[StripeService] Estado: ${data['payment_status']}');
        }
        return {
          'success': data['success'] as bool? ?? false,
          'payment_status': data['payment_status'] as String? ?? 'unknown',
          'payment_intent_id': data['payment_intent_id'] as String?,
          'ride_id': data['ride_id'] as String?,
          'amount': data['amount'] as int?,
          'currency': data['currency'] as String?,
        };
      } else {
        if (kDebugMode) {
          debugPrint(
            '[StripeService] ❌ Error verificando Checkout Session: ${response.status} - ${response.data}',
          );
        }
        return {
          'success': false,
          'payment_status': 'error',
          'error': 'Error al verificar la sesión de pago',
        };
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[StripeService] ❌ Excepción verificando Checkout Session: $e');
      }
      return {
        'success': false,
        'payment_status': 'error',
        'error': 'Error al verificar la sesión de pago: ${e.toString()}',
      };
    }
  }
}
