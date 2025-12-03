import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';

/// Servicio para generar PDFs de recibos
class PdfReceiptService {
  /// Genera un PDF del recibo de pago
  static Future<void> generateAndPrintReceipt({
    required String receiptNumber,
    required DateTime receiptDate,
    required String originAddress,
    required String destinationAddress,
    String? flightNumber,
    double? distanceKm,
    required String vehicleType,
    required int passengers,
    int childSeats = 0,
    int handLuggage = 0,
    int checkInLuggage = 0,
    required String passengerName,
    String? contactNumber,
    String? email,
    required DateTime? scheduledDateTime,
    required String paymentMethod,
    required double subtotal,
    required double total,
    String? notes,
    required Map<String, String> translations,
  }) async {
    final pdf = pw.Document();

    // Formatear fecha y hora
    final dateFormat = DateFormat('dd/MM/yyyy');
    final dateTimeFormat = DateFormat('dd/MM/yyyy HH:mm');

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Eugenia\'s Travel Consultancy',
                        style: pw.TextStyle(
                          fontSize: 24,
                          fontWeight: pw.FontWeight.bold,
                          color: PdfColors.blue900,
                        ),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        'Taxi & Transfer Services',
                        style: pw.TextStyle(fontSize: 14, color: PdfColors.grey700),
                      ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        translations['receiptNumber'] ?? 'Recibo N°',
                        style: pw.TextStyle(fontSize: 12, color: PdfColors.grey700),
                      ),
                      pw.Text(
                        receiptNumber,
                        style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
                      ),
                      pw.SizedBox(height: 8),
                      pw.Text(
                        '${translations['receiptDate'] ?? 'Fecha'}: ${dateFormat.format(receiptDate)}',
                        style: const pw.TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),

              pw.SizedBox(height: 30),
              pw.Divider(thickness: 2),
              pw.SizedBox(height: 20),

              // Trip Details Section
              pw.Text(
                translations['tripDetails'] ?? 'DETALLES DEL VIAJE',
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.blue900,
                ),
              ),
              pw.SizedBox(height: 12),

              _buildInfoRow(translations['origin'] ?? 'Origen', originAddress),
              _buildInfoRow(translations['destination'] ?? 'Destino', destinationAddress),
              if (flightNumber != null && flightNumber.isNotEmpty)
                _buildInfoRow(translations['flightNumber'] ?? 'Número de vuelo', flightNumber),
              if (distanceKm != null)
                _buildInfoRow(
                  translations['distance'] ?? 'Distancia',
                  '${distanceKm.toStringAsFixed(2)} km',
                ),
              _buildInfoRow(translations['vehicleType'] ?? 'Tipo de Vehículo', vehicleType),
              _buildInfoRow(translations['passengers'] ?? 'Pasajeros', passengers.toString()),
              if (childSeats > 0)
                _buildInfoRow(
                  translations['childSeats'] ?? 'Asientos para Niños',
                  childSeats.toString(),
                ),
              if (handLuggage > 0)
                _buildInfoRow(
                  translations['handLuggage'] ?? 'Equipaje de Mano',
                  handLuggage.toString(),
                ),
              if (checkInLuggage > 0)
                _buildInfoRow(
                  translations['checkInLuggage'] ?? 'Equipaje de Bodega',
                  checkInLuggage.toString(),
                ),
              if (scheduledDateTime != null)
                _buildInfoRow(
                  translations['dateTime'] ?? 'Fecha y Hora',
                  dateTimeFormat.format(scheduledDateTime),
                ),

              pw.SizedBox(height: 20),
              pw.Divider(),
              pw.SizedBox(height: 20),

              // Client Info Section
              pw.Text(
                translations['clientInfo'] ?? 'INFORMACIÓN DEL CLIENTE',
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.blue900,
                ),
              ),
              pw.SizedBox(height: 12),

              _buildInfoRow(translations['passengerName'] ?? 'Nombre del Pasajero', passengerName),
              if (contactNumber != null && contactNumber.isNotEmpty)
                _buildInfoRow(translations['contactNumber'] ?? 'Número de Contacto', contactNumber),
              if (email != null && email.isNotEmpty)
                _buildInfoRow(translations['email'] ?? 'Email', email),

              pw.SizedBox(height: 20),
              pw.Divider(),
              pw.SizedBox(height: 20),

              // Payment Summary Section
              pw.Text(
                translations['paymentSummary'] ?? 'RESUMEN DE PAGO',
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.blue900,
                ),
              ),
              pw.SizedBox(height: 12),

              _buildInfoRow(translations['paymentMethod'] ?? 'Método de Pago', paymentMethod),
              _buildInfoRow(
                translations['subtotal'] ?? 'Subtotal',
                '€${subtotal.toStringAsFixed(2)}',
              ),
              pw.SizedBox(height: 8),
              pw.Container(
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: PdfColors.blue50,
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      translations['total'] ?? 'TOTAL',
                      style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
                    ),
                    pw.Text(
                      '€${total.toStringAsFixed(2)}',
                      style: pw.TextStyle(
                        fontSize: 20,
                        fontWeight: pw.FontWeight.bold,
                        color: PdfColors.blue900,
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 12),
              _buildInfoRow(translations['status'] ?? 'Estado', translations['paid'] ?? 'Pagado'),

              if (notes != null && notes.isNotEmpty) ...[
                pw.SizedBox(height: 20),
                pw.Divider(),
                pw.SizedBox(height: 12),
                pw.Text(
                  translations['notes'] ?? 'Notas Adicionales',
                  style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold),
                ),
                pw.SizedBox(height: 8),
                pw.Text(notes, style: const pw.TextStyle(fontSize: 12)),
              ],

              pw.Spacer(),

              // Footer
              pw.Divider(),
              pw.SizedBox(height: 12),
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      translations['thankYou'] ?? '¡Gracias por elegir nuestros servicios!',
                      style: pw.TextStyle(
                        fontSize: 14,
                        fontWeight: pw.FontWeight.bold,
                        color: PdfColors.blue900,
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'www.eugeniastravel.com',
                      style: pw.TextStyle(fontSize: 10, color: PdfColors.grey600),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );

    // Mostrar vista previa y permitir imprimir/descargar
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'recibo_$receiptNumber.pdf',
    );
  }

  /// Construye una fila de información en el PDF
  static pw.Widget _buildInfoRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 8),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.SizedBox(
            width: 180,
            child: pw.Text(
              '$label:',
              style: pw.TextStyle(
                fontSize: 12,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.grey800,
              ),
            ),
          ),
          pw.Expanded(child: pw.Text(value, style: const pw.TextStyle(fontSize: 12))),
        ],
      ),
    );
  }
}
