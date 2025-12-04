import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/foundation.dart';

/// Servicio para manejar pagos con PayPal usando la API REST
class PayPalService {
  static String get _clientId => dotenv.env['PAYPAL_CLIENT_ID'] ?? '';
  static String get _secret => dotenv.env['PAYPAL_SECRET'] ?? '';
  static String get _mode => dotenv.env['PAYPAL_MODE'] ?? 'sandbox';

  // URLs base según el modo
  static String get _baseUrl =>
      _mode == 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

  /// Obtiene el token de acceso de PayPal
  static Future<String?> _getAccessToken() async {
    try {
      final credentials = base64.encode(utf8.encode('$_clientId:$_secret'));
      final url = Uri.parse('$_baseUrl/v1/oauth2/token');

      final response = await http.post(
        url,
        headers: {
          'Authorization': 'Basic $credentials',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (kDebugMode) {
          debugPrint('✅ PayPal access token obtenido');
        }
        return data['access_token'];
      } else {
        if (kDebugMode) {
          debugPrint('❌ Error obteniendo token: ${response.statusCode} - ${response.body}');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Excepción al obtener token de PayPal: $e');
      }
      return null;
    }
  }

  /// Crea una orden de pago en PayPal
  ///
  /// Retorna un Map con:
  /// - 'id': ID de la orden
  /// - 'approval_url': URL para que el usuario apruebe el pago
  static Future<Map<String, dynamic>?> createOrder({
    required double amount,
    required String currency,
    required String description,
    required String returnUrl,
    required String cancelUrl,
  }) async {
    try {
      final accessToken = await _getAccessToken();
      if (accessToken == null) {
        if (kDebugMode) {
          debugPrint('❌ No se pudo obtener el access token');
        }
        return null;
      }

      final url = Uri.parse('$_baseUrl/v2/checkout/orders');
      final orderData = {
        'intent': 'CAPTURE',
        'purchase_units': [
          {
            'amount': {'currency_code': currency, 'value': amount.toStringAsFixed(2)},
            'description': description,
          },
        ],
        'application_context': {
          'return_url': returnUrl,
          'cancel_url': cancelUrl,
          'brand_name': 'Taxi Service',
          'landing_page': 'BILLING',
          'user_action': 'PAY_NOW',
        },
      };

      final response = await http.post(
        url,
        headers: {'Authorization': 'Bearer $accessToken', 'Content-Type': 'application/json'},
        body: json.encode(orderData),
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        final orderId = data['id'];

        // Buscar el approval_url en los links
        String? approvalUrl;
        for (var link in data['links']) {
          if (link['rel'] == 'approve') {
            approvalUrl = link['href'];
            break;
          }
        }

        if (kDebugMode) {
          debugPrint('✅ Orden de PayPal creada: $orderId');
          debugPrint('🔗 Approval URL: $approvalUrl');
        }

        return {'id': orderId, 'approval_url': approvalUrl, 'status': data['status']};
      } else {
        if (kDebugMode) {
          debugPrint('❌ Error creando orden: ${response.statusCode} - ${response.body}');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Excepción al crear orden de PayPal: $e');
      }
      return null;
    }
  }

  /// Captura el pago de una orden aprobada
  static Future<Map<String, dynamic>?> captureOrder(String orderId) async {
    try {
      final accessToken = await _getAccessToken();
      if (accessToken == null) return null;

      final url = Uri.parse('$_baseUrl/v2/checkout/orders/$orderId/capture');

      final response = await http.post(
        url,
        headers: {'Authorization': 'Bearer $accessToken', 'Content-Type': 'application/json'},
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        if (kDebugMode) {
          debugPrint('✅ Pago capturado exitosamente: $orderId');
        }
        return data;
      } else {
        if (kDebugMode) {
          debugPrint('❌ Error capturando pago: ${response.statusCode} - ${response.body}');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Excepción al capturar orden: $e');
      }
      return null;
    }
  }

  /// Obtiene los detalles de una orden
  static Future<Map<String, dynamic>?> getOrderDetails(String orderId) async {
    try {
      final accessToken = await _getAccessToken();
      if (accessToken == null) return null;

      final url = Uri.parse('$_baseUrl/v2/checkout/orders/$orderId');

      final response = await http.get(
        url,
        headers: {'Authorization': 'Bearer $accessToken', 'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        if (kDebugMode) {
          debugPrint('❌ Error obteniendo detalles: ${response.statusCode}');
        }
        return null;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Excepción al obtener detalles: $e');
      }
      return null;
    }
  }
}
