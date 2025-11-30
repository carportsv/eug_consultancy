# Implementación de Envío de Recibo por Correo Electrónico

## Opciones de Implementación

### Opción 1: Backend con Servicio de Email (Recomendado)

Esta es la opción más profesional y segura. Requiere un backend que maneje el envío de emails.

#### Pasos:

1. **Crear un endpoint en el backend** (Node.js, Python, etc.):

```javascript
// Ejemplo con Node.js + Express + Nodemailer
app.post('/api/send-receipt', async (req, res) => {
  const { email, receiptData } = req.body;
  
  // Generar PDF del recibo (usando pdfkit, puppeteer, etc.)
  const pdfBuffer = await generateReceiptPDF(receiptData);
  
  // Enviar email con el PDF adjunto
  await transporter.sendMail({
    from: 'noreply@tuempresa.com',
    to: email,
    subject: 'Recibo de Pago - Servicio de Transporte',
    html: `
      <h2>Gracias por su compra</h2>
      <p>Adjunto encontrará el recibo de su pago.</p>
    `,
    attachments: [{
      filename: 'recibo.pdf',
      content: pdfBuffer
    }]
  });
  
  res.json({ success: true });
});
```

2. **En Flutter, llamar al endpoint**:

```dart
Future<void> _handleEmail() async {
  try {
    // Mostrar loading
    showDialog(context: context, builder: (_) => CircularProgressIndicator());
    
    final response = await http.post(
      Uri.parse('https://tu-backend.com/api/send-receipt'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': clientEmail,
        'receiptData': {
          'receiptNumber': receiptNumber,
          'receiptDate': receiptDate.toIso8601String(),
          'totalAmount': totalAmount,
          'originAddress': originAddress,
          'destinationAddress': destinationAddress,
          // ... otros datos
        }
      }),
    );
    
    Navigator.pop(context); // Cerrar loading
    
    if (response.statusCode == 200) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Recibo enviado por correo exitosamente')),
      );
    }
  } catch (e) {
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Error al enviar el recibo: $e')),
    );
  }
}
```

#### Servicios de Email Recomendados:

- **SendGrid**: Fácil de usar, 100 emails gratis/día
- **Mailgun**: 5,000 emails gratis/mes
- **AWS SES**: Muy económico, requiere configuración
- **Nodemailer** (Node.js): Para servidores propios con SMTP

---

### Opción 2: mailto: (Simple pero limitado)

Esta opción abre el cliente de correo del usuario con el recibo como texto plano.

```dart
void _handleEmail() {
  final subject = Uri.encodeComponent('Recibo de Pago - $receiptNumber');
  final body = Uri.encodeComponent(receiptText);
  final email = clientEmail ?? '';
  
  final mailtoLink = 'mailto:$email?subject=$subject&body=$body';
  
  if (kIsWeb) {
    html.window.open(mailtoLink, '_blank');
  } else {
    // Para móvil, usar url_launcher
    launchUrl(Uri.parse(mailtoLink));
  }
}
```

**Limitaciones:**
- No permite adjuntar PDF
- Depende del cliente de correo del usuario
- No funciona bien en todos los dispositivos

---

### Opción 3: Generar PDF y Compartir (Móvil)

Para aplicaciones móviles, generar un PDF y usar el sistema de compartir nativo.

```dart
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

Future<void> _handleEmail() async {
  // Generar PDF
  final pdf = await _generatePDF();
  
  // Guardar temporalmente
  final file = await _savePDFToFile(pdf);
  
  // Compartir (abre opciones: email, WhatsApp, etc.)
  await Share.shareXFiles(
    [XFile(file.path)],
    subject: 'Recibo de Pago - $receiptNumber',
    text: 'Adjunto encontrará el recibo de su pago.',
  );
}
```

---

## Recomendación Final

**Para producción, usar Opción 1 (Backend)** porque:
- ✅ Control total sobre el formato del email
- ✅ Puede adjuntar PDFs profesionales
- ✅ No depende del cliente de correo del usuario
- ✅ Permite tracking de emails enviados
- ✅ Más profesional y confiable

**Para desarrollo rápido o MVP, usar Opción 2 (mailto:)** porque:
- ✅ No requiere backend
- ✅ Implementación inmediata
- ✅ Funciona en web y móvil

---

## Dependencias Necesarias

Si decides usar la Opción 3 (PDF + Compartir):

```yaml
dependencies:
  pdf: ^3.10.0
  printing: ^5.12.0
  share_plus: ^7.0.0
  path_provider: ^2.1.0
```

---

## Ejemplo Completo: Backend con Supabase Edge Functions

Si usas Supabase, puedes crear una Edge Function:

```typescript
// supabase/functions/send-receipt/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { email, receiptData } = await req.json()
  
  // Usar servicio de email (SendGrid, Mailgun, etc.)
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email }],
        subject: 'Recibo de Pago'
      }],
      from: { email: 'noreply@tuempresa.com' },
      content: [{
        type: 'text/html',
        value: `<h2>Recibo de Pago</h2><p>${receiptData}</p>`
      }]
    })
  })
  
  return new Response(JSON.stringify({ success: response.ok }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Luego en Flutter:

```dart
final response = await supabase.functions.invoke(
  'send-receipt',
  body: {
    'email': clientEmail,
    'receiptData': receiptText,
  },
);
```

