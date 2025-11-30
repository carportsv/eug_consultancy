# Flujo Completo de Pago - Explicación Detallada

## Resumen General

Este documento explica en detalle cómo funciona cada método de pago, qué sucede después del pago, y cómo se procesa el viaje.

## Métodos de Pago Disponibles

### 1. 💳 Tarjeta de Crédito/Débito

**Flujo:**
1. Usuario ingresa datos de tarjeta (número, expiración, CVV, nombre)
2. Presiona "Procesar Pago"
3. Se valida la información
4. Se simula el procesamiento (2 segundos)
5. Se crea el viaje en Supabase con `payment_method: 'card'` y `status: 'requested'`
6. Se navega a `ReceiptScreen` mostrando "Ya está listo" ✅

**Estado del viaje:** `requested` (listo para ser aceptado por un conductor)

**Nota:** Actualmente es simulación. Para producción requiere integración con Stripe/PayPal.

---

### 2. 📱 PayPal

**Flujo:**
1. Usuario selecciona "PayPal"
2. Se muestra un QR code con URL de pago
3. Usuario puede:
   - Escanear el QR con su wallet
   - Hacer clic en "Pagar con PayPal" (abre PayPal en navegador)
4. Usuario completa el pago en PayPal
5. **¿Cómo regresa a la app?**
   - PayPal redirige a una URL de retorno configurada (ej: `https://tuapp.com/payment/return?payment_id=xxx`)
   - El backend verifica el pago y actualiza el viaje
   - La app puede usar polling o webhooks para detectar el cambio
6. Se crea el viaje con `payment_method: 'paypal'` y `status: 'requested'`
7. Se muestra mensaje: "Pago procesado, tu viaje está listo" ✅

**Estado del viaje:** `requested` (pero puede estar `payment_pending` hasta confirmación)

**Implementación requerida:**
- Backend que genere URLs de PayPal reales
- URL de retorno configurada en PayPal
- Webhook de PayPal para confirmar pagos
- Sistema de polling o notificaciones push para actualizar la app

---

### 3. 🍎💳 Wallet (Apple Pay, Google Pay, Samsung Pay)

**Flujo:**
1. Usuario selecciona "Wallet"
2. Se muestra un QR code compatible con múltiples wallets
3. Usuario escanea el QR con:
   - **Apple Pay** (iOS)
   - **Google Pay** (Android)
   - **Samsung Pay** (Samsung)
4. Se abre la wallet del usuario
5. Usuario confirma el pago en su wallet
6. **¿Cómo regresa a la app?**
   - La wallet procesa el pago y redirige a una URL de retorno
   - Similar a PayPal, requiere backend y webhooks
   - La app detecta el cambio y muestra confirmación
7. Se crea el viaje con `payment_method: 'wallet'` y `status: 'requested'`
8. Se muestra mensaje: "Pago procesado con [Wallet], tu viaje está listo" ✅

**Estado del viaje:** `requested` (pero puede estar `payment_pending` hasta confirmación)

**Implementación requerida:**
- Backend que soporte múltiples wallets
- URLs de retorno configuradas
- Webhooks de cada wallet
- Sistema de notificaciones para actualizar la app

---

### 4. 🏦 Depósito a Cuenta (Transferencia Bancaria)

**Flujo:**
1. Usuario selecciona "Depósito"
2. Se muestran los datos bancarios:
   - Beneficiario
   - IBAN
   - Banco
   - SWIFT/BIC
3. Se genera un **código de referencia único** (ej: `DEP-ABC12345`)
4. Usuario realiza la transferencia bancaria usando este código como concepto
5. **¿Qué sucede después?**
   - El viaje se crea con `payment_method: 'transfer'` y `status: 'payment_pending'`
   - El viaje **NO se puede aceptar** hasta que se verifique el depósito
   - Se envía el código de referencia por email/SMS al usuario
6. Usuario recibe confirmación: "Viaje creado. Código de referencia: DEP-ABC12345. El viaje se confirmará una vez verificado el depósito." ⏳

**Estado del viaje:** `payment_pending` (pendiente de verificación)

**Proceso de verificación:**
1. Administrador revisa los depósitos recibidos
2. Busca el código de referencia en los depósitos
3. Verifica que el monto coincida
4. Actualiza el viaje: `status: 'requested'` y `payment_verified: true`
5. Usuario recibe notificación: "Depósito verificado. Tu viaje está listo." ✅

**Código de referencia:**
- Formato: `DEP-{8 caracteres del ID del viaje}`
- Ejemplo: `DEP-ABC12345`
- Se incluye en el recibo
- Se envía por email/SMS

**¿Cómo se continúa?**
- El viaje queda en estado `payment_pending`
- No aparece en la lista de viajes disponibles para conductores
- Una vez verificado, cambia a `requested` y aparece disponible
- El usuario puede ver el estado en "Mis Viajes"

---

## Flujo Técnico Detallado

### Creación del Viaje

```dart
// En payment_confirmation_screen.dart
final rideData = CreateRideData(
  // ... datos del viaje ...
  paymentMethod: _selectedPaymentMethod, // 'card', 'paypal', 'wallet', 'transfer'
  // ...
);

// Crear viaje
final rideId = await _rideService.createRideRequest(rideData);

// Si es depósito, generar código de referencia
String? depositReferenceCode;
if (_selectedPaymentMethod == 'transfer') {
  depositReferenceCode = 'DEP-${rideId.substring(0, 8).toUpperCase()}';
  // todo: Enviar código por email/SMS
}
```

### Estados del Viaje

| Método de Pago | Estado Inicial | Estado Final (después de pago) |
|----------------|----------------|--------------------------------|
| Tarjeta        | `requested`    | `requested` (listo)            |
| PayPal         | `requested`     | `requested` (después de webhook) |
| Wallet         | `requested`     | `requested` (después de webhook) |
| Depósito       | `payment_pending` | `requested` (después de verificación) |

### Retorno después del Pago (PayPal/Wallet)

**Opción 1: Polling (Simple pero menos eficiente)**
```dart
// En la app, después de redirigir a PayPal
Timer.periodic(Duration(seconds: 5), (timer) async {
  final ride = await checkRideStatus(rideId);
  if (ride['payment_status'] == 'confirmed') {
    timer.cancel();
    showSuccessMessage('Pago confirmado');
    // Actualizar UI
  }
});
```

**Opción 2: Webhooks (Recomendado)**
```dart
// Backend recibe webhook de PayPal
app.post('/webhooks/paypal', (req, res) => {
  const paymentId = req.body.payment_id;
  const rideId = req.body.ride_id;
  
  // Verificar pago con PayPal API
  verifyPayment(paymentId).then(verified => {
    if (verified) {
      // Actualizar viaje en Supabase
      updateRide(rideId, {
        payment_status: 'confirmed',
        status: 'requested'
      });
      
      // Enviar notificación push al usuario
      sendPushNotification(userId, 'Pago confirmado');
    }
  });
});
```

**Opción 3: Deep Links (Mejor UX)**
```dart
// PayPal redirige a: tuapp://payment/return?payment_id=xxx&ride_id=yyy
// La app detecta el deep link y verifica el pago
void handlePaymentReturn(String paymentId, String rideId) {
  verifyPayment(paymentId).then((verified) {
    if (verified) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => ReceiptScreen(/* ... */),
        ),
      );
    }
  });
}
```

---

## Implementación de Depósito

### Generación de Código de Referencia

```dart
String generateDepositReferenceCode(String rideId) {
  // Tomar primeros 8 caracteres del UUID y convertir a mayúsculas
  final shortId = rideId.substring(0, 8).toUpperCase();
  return 'DEP-$shortId';
}
```

### Envío de Código

```dart
// En payment_confirmation_screen.dart
if (_selectedPaymentMethod == 'transfer') {
  final depositCode = generateDepositReferenceCode(rideId);
  
  // Enviar por email
  await sendEmail(
    to: widget.clientEmail,
    subject: 'Código de referencia para depósito',
    body: 'Tu código de referencia es: $depositCode. Úsalo como concepto en la transferencia.',
  );
  
  // Enviar por SMS (si hay teléfono)
  if (widget.clientPhone != null) {
    await sendSMS(
      to: widget.clientPhone!,
      message: 'Código de referencia: $depositCode',
    );
  }
}
```

### Verificación Manual

```sql
-- El administrador busca depósitos con el código
SELECT * FROM bank_deposits 
WHERE reference_code = 'DEP-ABC12345';

-- Una vez verificado, actualiza el viaje
UPDATE ride_requests 
SET 
  status = 'requested',
  payment_verified = true,
  payment_verified_at = NOW()
WHERE id = 'ride-id-here';
```

---

## Resumen de Preguntas Frecuentes

### ¿Cómo regresa a la app después de pagar con PayPal/Wallet?

**Respuesta:** 
- PayPal/Wallet redirige a una URL de retorno configurada
- El backend verifica el pago y actualiza el viaje
- La app puede usar:
  - **Polling:** Verificar periódicamente el estado
  - **Webhooks:** Backend notifica cuando el pago se confirma
  - **Deep Links:** PayPal redirige directamente a la app

### ¿Qué sucede con el depósito?

**Respuesta:**
1. Se crea el viaje con estado `payment_pending`
2. Se genera un código de referencia único
3. Se envía el código por email/SMS
4. El viaje queda pendiente hasta verificación
5. Administrador verifica el depósito
6. Viaje cambia a `requested` y está disponible

### ¿Se queda pendiente el viaje con depósito?

**Respuesta:** Sí, el viaje se queda en estado `payment_pending` hasta que se verifique el depósito. No aparece disponible para conductores hasta entonces.

### ¿Se envía algún código con el depósito?

**Respuesta:** Sí, se genera y envía un código de referencia único (ej: `DEP-ABC12345`) que el usuario debe usar como concepto en la transferencia.

### ¿Cómo se continúa después del depósito?

**Respuesta:**
- El usuario recibe el código de referencia
- Realiza la transferencia
- Espera verificación (puede tomar horas/días)
- Recibe notificación cuando se verifica
- El viaje aparece disponible para conductores

---

## Próximos Pasos para Producción

1. **Integrar Stripe** para pagos con tarjeta
2. **Configurar PayPal Business** y webhooks
3. **Implementar soporte para wallets** (Apple Pay, Google Pay, Samsung Pay)
4. **Crear sistema de verificación de depósitos** (manual o automático)
5. **Implementar notificaciones push** para actualizaciones de estado
6. **Configurar deep links** para retorno después de pago
7. **Crear panel de administración** para verificar depósitos

Respuestas a tus preguntas
1. ¿Cómo regresa a la app después de pagar con PayPal/Wallet?
Opciones:
Opción A: Webhooks (recomendado)
PayPal/Wallet envía webhook al backend
Backend actualiza el viaje en Supabase
App recibe notificación push o polling detecta el cambio
Opción B: Deep links
PayPal redirige a tuapp://payment/return?payment_id=xxx
App detecta el deep link y verifica el pago
Opción C: Polling
App verifica periódicamente el estado del viaje
Menos eficiente, pero simple
2. ¿Qué pasa con Samsung/Google/Apple Pay?
Implementado:
Botón "Wallet" agregado
QR code compatible con Apple Pay, Google Pay, Samsung Pay
El QR contiene una URL que cada wallet puede procesar
Para producción:
Backend que genere URLs de pago para cada wallet
Configurar cada wallet en sus respectivas plataformas
Webhooks para confirmar pagos
3. ¿Cómo funciona el depósito?
Flujo:
Usuario selecciona "Depósito"
Se muestran datos bancarios
Se genera código de referencia único (ej: DEP-ABC12345)
Se crea el viaje con status: 'payment_pending'
Se envía el código por email/SMS (pendiente de implementar)
Usuario realiza transferencia usando el código como concepto
Viaje queda pendiente hasta verificación
Administrador verifica el depósito
Viaje cambia a status: 'requested' y está disponible
Código de referencia:
Formato: DEP-{8 caracteres del ID del viaje}
Se incluye en el recibo
Se envía por email/SMS (pendiente)
4. ¿Se queda pendiente y se envía algún código?
Sí:
El viaje queda en estado payment_pending
No aparece disponible para conductores hasta verificación
Se genera y envía un código de referencia único
El usuario debe usar este código como concepto en la transferencia
5. ¿Cómo se continúa?
Después del depósito:
Usuario recibe código de referencia
Realiza la transferencia con ese código
Espera verificación (puede tomar horas/días)
Administrador verifica el depósito
Usuario recibe notificación: "Depósito verificado. Tu viaje está listo"
Viaje cambia a requested y aparece disponible
Próximos pasos
Ejecutar el script SQL en Supabase:
   -- Ejecutar: expo/database/fix-payment-method-constraint.sql
Implementar envío de código de referencia:
Email con el código
SMS con el código (opcional)
Crear panel de administración:
Ver viajes pendientes de depósito
Verificar depósitos
Actualizar estado del viaje
Configurar webhooks para PayPal/Wallet:
Backend que reciba webhooks
Actualizar estado del viaje automáticamente