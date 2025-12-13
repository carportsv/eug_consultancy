import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import '../../../services/stripe_service.dart';
import '../../../services/ride_service.dart';
import '../../../l10n/app_localizations.dart';
import 'receipt_screen.dart';
import '../welcome/welcome_screen.dart';

/// Pantalla que maneja el retorno de Stripe Checkout
class StripeReturnScreen extends StatefulWidget {
  final bool isSuccess;

  const StripeReturnScreen({super.key, required this.isSuccess});

  @override
  State<StripeReturnScreen> createState() => _StripeReturnScreenState();
}

class _StripeReturnScreenState extends State<StripeReturnScreen> {
  bool _isProcessing = true;
  String? _error;
  final RideService _rideService = RideService();

  @override
  void initState() {
    super.initState();
    if (widget.isSuccess) {
      _handleSuccess();
    } else {
      _handleCancel();
    }
  }

  Future<void> _handleSuccess() async {
    try {
      final uri = Uri.base;
      final sessionId = uri.queryParameters['session_id'];

      if (sessionId == null || sessionId.isEmpty) {
        setState(() {
          _isProcessing = false;
          _error = 'No se encontró el ID de sesión';
        });
        _navigateToWelcome();
        return;
      }

      if (kDebugMode) {
        debugPrint('[StripeReturnScreen] 🔍 Verificando pago con session_id: $sessionId');
      }

      // Verificar el pago
      final result = await StripeService.verifyCheckoutSession(sessionId: sessionId);

      if (result['success'] == true && result['payment_status'] == 'paid') {
        final rideId = result['ride_id'] as String?;

        if (rideId != null) {
          // Obtener datos del viaje
          try {
            final ride = await _rideService.getRideById(rideId);
            if (ride != null) {
              setState(() {
                _isProcessing = false;
              });
              _navigateToReceipt(ride);
              return;
            }
          } catch (e) {
            if (kDebugMode) {
              debugPrint('[StripeReturnScreen] ⚠️ Error obteniendo viaje: $e');
            }
          }
        }

        // Si no se puede obtener el viaje, mostrar mensaje de éxito y redirigir
        setState(() {
          _isProcessing = false;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✅ Pago procesado exitosamente'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 3),
            ),
          );
          _navigateToWelcome();
        }
      } else {
        setState(() {
          _isProcessing = false;
          _error = result['error'] as String? ?? 'Error al procesar el pago';
        });
        _navigateToWelcome();
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[StripeReturnScreen] ❌ Error: $e');
      }
      setState(() {
        _isProcessing = false;
        _error = 'Error al verificar el pago: ${e.toString()}';
      });
      _navigateToWelcome();
    }
  }

  void _handleCancel() {
    setState(() {
      _isProcessing = false;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pago cancelado. Puedes intentar nuevamente.'),
          backgroundColor: Colors.orange,
          duration: Duration(seconds: 3),
        ),
      );
      _navigateToWelcome();
    }
  }

  void _navigateToWelcome() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        // Navegar a WelcomeScreen directamente
        Navigator.of(
          context,
        ).pushReplacement(MaterialPageRoute(builder: (context) => const WelcomeScreen()));
      }
    });
  }

  void _navigateToReceipt(Map<String, dynamic> ride) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;

      try {
        final l10n = AppLocalizations.of(context);
        final receiptNumber = 'REC-${DateTime.now().millisecondsSinceEpoch}';
        final now = DateTime.now();

        // Extraer datos del viaje
        final origin = ride['origin'] as Map<String, dynamic>?;
        final destination = ride['destination'] as Map<String, dynamic>?;
        final originAddress = origin?['address'] as String? ?? '';
        final destinationAddress = destination?['address'] as String? ?? '';
        final price = (ride['price'] as num?)?.toDouble() ?? 0.0;
        final distance = (ride['distance'] as num?)?.toDouble() ?? 0.0;
        final distanceKm = distance > 0 ? distance / 1000 : null;
        final vehicleType = ride['vehicle_type'] as String? ?? 'sedan';
        final clientName = ride['client_name'] as String? ?? '';
        final clientEmail = ride['client_email'] as String?;
        final clientPhone = ride['client_phone'] as String?;
        final passengerCount = ride['passenger_count'] as int? ?? 1;
        final childSeats = ride['child_seats'] as int? ?? 0;
        final handLuggage = ride['hand_luggage'] as int? ?? 0;
        final checkInLuggage = ride['check_in_luggage'] as int? ?? 0;
        final scheduledAt = ride['scheduled_at'] as String?;
        final notes = ride['additional_notes'] as String?;

        DateTime? scheduledDateTime;
        String? scheduledTime;
        if (scheduledAt != null) {
          try {
            scheduledDateTime = DateTime.parse(scheduledAt);
            scheduledTime = DateFormat('HH:mm').format(scheduledDateTime);
          } catch (e) {
            if (kDebugMode) {
              debugPrint('[StripeReturnScreen] ⚠️ Error parseando fecha: $e');
            }
          }
        }

        // Generar texto del recibo
        final receiptText = _generateReceiptText(
          l10n,
          receiptNumber,
          originAddress,
          destinationAddress,
          price,
          distanceKm,
          vehicleType,
          clientName,
          clientEmail,
          clientPhone,
          passengerCount,
          childSeats,
          handLuggage,
          checkInLuggage,
          scheduledDateTime,
          notes,
        );

        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => ReceiptScreen(
              receiptText: receiptText,
              receiptNumber: receiptNumber,
              receiptDate: now,
              totalAmount: price,
              originAddress: originAddress,
              destinationAddress: destinationAddress,
              vehicleType: vehicleType,
              clientName: clientName,
              clientEmail: clientEmail,
              clientPhone: clientPhone,
              distanceKm: distanceKm,
              passengerCount: passengerCount,
              childSeats: childSeats,
              handLuggage: handLuggage,
              checkInLuggage: checkInLuggage,
              scheduledDate: scheduledDateTime,
              scheduledTime: scheduledTime,
              paymentMethod: 'card',
              notes: notes,
            ),
          ),
        );
      } catch (e) {
        if (kDebugMode) {
          debugPrint('[StripeReturnScreen] ❌ Error navegando a recibo: $e');
        }
        _navigateToWelcome();
      }
    });
  }

  String _generateReceiptText(
    AppLocalizations? l10n,
    String receiptNumber,
    String originAddress,
    String destinationAddress,
    double price,
    double? distanceKm,
    String vehicleType,
    String clientName,
    String? clientEmail,
    String? clientPhone,
    int passengerCount,
    int childSeats,
    int handLuggage,
    int checkInLuggage,
    DateTime? scheduledDateTime,
    String? notes,
  ) {
    final dateFormat = DateFormat('dd/MM/yyyy HH:mm');
    final now = DateTime.now();

    final buffer = StringBuffer();
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('          ${l10n?.paymentTripSummary ?? 'RECIBO DE PAGO'}');
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('');
    buffer.writeln('${l10n?.receiptNumber ?? 'Número de Recibo'}: $receiptNumber');
    buffer.writeln('${l10n?.receiptDate ?? 'Fecha'}: ${dateFormat.format(now)}');
    buffer.writeln('');
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('          ${l10n?.receiptTripDetails ?? 'DETALLES DEL VIAJE'}');
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('');
    buffer.writeln('${l10n?.summaryOrigin ?? 'Origen'}: $originAddress');
    buffer.writeln('${l10n?.summaryDestination ?? 'Destino'}: $destinationAddress');
    if (distanceKm != null) {
      buffer.writeln(
        '${l10n?.summaryDistance ?? 'Distancia'}: ${distanceKm.toStringAsFixed(2)} km',
      );
    }
    buffer.writeln('${l10n?.formVehicleType ?? 'Tipo de Vehículo'}: $vehicleType');
    buffer.writeln('${l10n?.summaryPassengers ?? 'Pasajeros'}: $passengerCount');
    if (childSeats > 0) {
      buffer.writeln('${l10n?.summaryChildSeats ?? 'Asientos para niños'}: $childSeats');
    }
    buffer.writeln('');
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('          ${l10n?.receiptClientInfo ?? 'INFORMACIÓN DEL CLIENTE'}');
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('');
    buffer.writeln('${l10n?.receiptName ?? 'Nombre'}: $clientName');
    if (clientEmail != null && clientEmail.isNotEmpty) {
      buffer.writeln('${l10n?.receiptEmail ?? 'Email'}: $clientEmail');
    }
    if (clientPhone != null && clientPhone.isNotEmpty) {
      buffer.writeln('${l10n?.receiptPhone ?? 'Teléfono'}: $clientPhone');
    }
    buffer.writeln('');
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('          ${l10n?.receiptPaymentSummary ?? 'RESUMEN DE PAGO'}');
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('');
    buffer.writeln('${l10n?.receiptSubtotal ?? 'Subtotal'}: \$${price.toStringAsFixed(2)}');
    buffer.writeln('${l10n?.receiptTotal ?? 'Total'}: \$${price.toStringAsFixed(2)}');
    buffer.writeln('');
    buffer.writeln(
      '${l10n?.summaryPaymentMethod ?? 'Método de Pago'}: ${l10n?.paymentCard ?? 'Tarjeta'}',
    );
    buffer.writeln('${l10n?.receiptStatus ?? 'Estado'}: ${l10n?.receiptPaid ?? 'Pagado'}');
    buffer.writeln('');
    buffer.writeln('═══════════════════════════════════════');
    buffer.writeln('          ${l10n?.receiptThankYou ?? '¡Gracias por su compra!'}');
    buffer.writeln('═══════════════════════════════════════');

    return buffer.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: _isProcessing
            ? const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Procesando pago...'),
                ],
              )
            : _error != null
            ? Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error, color: Colors.red, size: 48),
                  const SizedBox(height: 16),
                  Text(_error!),
                ],
              )
            : const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle, color: Colors.green, size: 48),
                  SizedBox(height: 16),
                  Text('Pago procesado exitosamente'),
                ],
              ),
      ),
    );
  }
}
