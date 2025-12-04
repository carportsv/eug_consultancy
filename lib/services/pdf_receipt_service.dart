import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart';

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

    // Cargar el logo
    final logoData = await rootBundle.load('assets/images/logo_21.png');
    final logoImage = pw.MemoryImage(logoData.buffer.asUint8List());

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header con logo
              pw.Container(
                padding: const pw.EdgeInsets.only(bottom: 20),
                decoration: const pw.BoxDecoration(
                  border: pw.Border(bottom: pw.BorderSide(color: PdfColors.blue900, width: 3)),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    // Logo
                    pw.Image(logoImage, width: 120, height: 120),
                    // Info del recibo
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text(
                          translations['receiptNumber'] ?? 'Recibo N°',
                          style: pw.TextStyle(
                            fontSize: 14,
                            color: PdfColors.grey700,
                            fontWeight: pw.FontWeight.normal,
                          ),
                        ),
                        pw.SizedBox(height: 4),
                        pw.Text(
                          receiptNumber,
                          style: pw.TextStyle(
                            fontSize: 20,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.blue900,
                          ),
                        ),
                        pw.SizedBox(height: 12),
                        pw.Text(
                          '${translations['receiptDate'] ?? 'Fecha'}: ${dateFormat.format(receiptDate)}',
                          style: pw.TextStyle(fontSize: 12, color: PdfColors.grey700),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 30),

              // Trip Details Section
              pw.Container(
                padding: const pw.EdgeInsets.all(16),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey100,
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                  border: pw.Border.all(color: PdfColors.blue900, width: 1),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
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
                      _buildInfoRow(
                        translations['flightNumber'] ?? 'Número de vuelo',
                        flightNumber,
                      ),
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
                  ],
                ),
              ),

              pw.SizedBox(height: 20),

              // Client Info Section
              pw.Container(
                padding: const pw.EdgeInsets.all(16),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey100,
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                  border: pw.Border.all(color: PdfColors.blue900, width: 1),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      translations['clientInfo'] ?? 'INFORMACIÓN DEL CLIENTE',
                      style: pw.TextStyle(
                        fontSize: 16,
                        fontWeight: pw.FontWeight.bold,
                        color: PdfColors.blue900,
                      ),
                    ),
                    pw.SizedBox(height: 12),
                    _buildInfoRow(
                      translations['passengerName'] ?? 'Nombre del Pasajero',
                      passengerName,
                    ),
                    if (contactNumber != null && contactNumber.isNotEmpty)
                      _buildInfoRow(
                        translations['contactNumber'] ?? 'Número de Contacto',
                        contactNumber,
                      ),
                    if (email != null && email.isNotEmpty)
                      _buildInfoRow(translations['email'] ?? 'Email', email),
                  ],
                ),
              ),

              pw.SizedBox(height: 20),

              // Payment Summary Section
              pw.Container(
                padding: const pw.EdgeInsets.all(16),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey100,
                  borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                  border: pw.Border.all(color: PdfColors.blue900, width: 1),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
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
                      '${subtotal.toStringAsFixed(2)} EUR',
                    ),
                    pw.SizedBox(height: 12),
                    pw.Container(
                      padding: const pw.EdgeInsets.all(16),
                      decoration: pw.BoxDecoration(
                        color: PdfColors.blue900,
                        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
                      ),
                      child: pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Text(
                            translations['total'] ?? 'TOTAL',
                            style: pw.TextStyle(
                              fontSize: 20,
                              fontWeight: pw.FontWeight.bold,
                              color: PdfColors.white,
                            ),
                          ),
                          pw.Text(
                            '${total.toStringAsFixed(2)} EUR',
                            style: pw.TextStyle(
                              fontSize: 24,
                              fontWeight: pw.FontWeight.bold,
                              color: PdfColors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                    pw.SizedBox(height: 12),
                    _buildInfoRow(
                      translations['status'] ?? 'Estado',
                      translations['paid'] ?? 'Pagado',
                    ),
                  ],
                ),
              ),

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
