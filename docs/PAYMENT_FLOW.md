# Flujo de Pago - Sistema de Transporte

## Resumen

Este documento explica cómo funciona el sistema de pago en la aplicación de transporte, incluyendo los diferentes métodos de pago disponibles y cómo se procesan.

## Métodos de Pago Disponibles

### 1. Tarjeta de Crédito/Débito 💳

**Estado:** ✅ Implementado (simulado)

**Cómo funciona:**
- El usuario ingresa los datos de su tarjeta en el formulario:
  - Número de tarjeta (16 dígitos)
  - Fecha de expiración (MM/YY)
  - CVV (3 dígitos)
  - Nombre del titular

**Procesamiento actual:**
- Los datos se validan localmente
- Se simula un procesamiento de 2 segundos
- Se crea el viaje en Supabase con el método de pago "card"
- **Nota:** Actualmente es una simulación. Para producción, se requiere:
  - Integración con Stripe, PayPal, o otro procesador de pagos
  - Backend seguro para procesar pagos
  - Cumplimiento con PCI DSS (no almacenar datos de tarjeta)

**Datos requeridos:**
- Número de tarjeta: 16 dígitos
- Fecha de expiración: MM/YY
- CVV: 3 dígitos
- Nombre del titular

### 2. PayPal / Wallet 📱

**Estado:** ⚠️ Parcialmente implementado (QR disponible)

**Cómo funciona:**
- El usuario selecciona "PayPal" como método de pago
- Se muestra un código QR que puede escanearse con:
  - Apple Pay
  - Google Pay
  - PayPal
  - Cualquier wallet compatible
- También hay un botón para abrir PayPal directamente en el navegador

**Procesamiento actual:**
- Se genera un código QR con una URL de PayPal
- El usuario escanea el QR con su wallet
- Se redirige a PayPal para completar el pago
- **Nota:** La URL actual es de ejemplo. Para producción se requiere:
  - Cuenta de PayPal Business
  - Client ID y Secret de PayPal
  - Backend que genere URLs de pago reales
  - Webhook para confirmar pagos

**Datos requeridos para implementación completa:**
- PayPal Business Account
- Client ID de PayPal
- Secret Key de PayPal
- Backend endpoint para generar URLs de pago
- Webhook endpoint para recibir confirmaciones

**QR Code:**
- El QR contiene una URL de pago
- Compatible con wallets estándar (Apple Pay, Google Pay, PayPal, etc.)
- Se genera dinámicamente con el monto y número de recibo

### 3. Depósito a Cuenta 🏦

**Estado:** ✅ Implementado

**Cómo funciona:**
- El usuario selecciona "Depósito" como método de pago
- Se muestran los datos bancarios de la empresa:
  - Beneficiario
  - IBAN
  - Banco
  - SWIFT/BIC (si está disponible)
  - Dirección del banco (si está disponible)
- El usuario realiza la transferencia bancaria
- Debe confirmar cuando haya realizado el pago
- El viaje se confirma una vez verificado el depósito

**Datos bancarios:**
- Se cargan desde variables de entorno (`env`)
- Variables requeridas:
  - `BANK_ACCOUNT_NAME`: Nombre del beneficiario
  - `BANK_IBAN`: Número IBAN
  - `BANK_NAME`: Nombre del banco
  - `BANK_SWIFT`: Código SWIFT/BIC (opcional)
  - `BANK_ADDRESS`: Dirección del banco (opcional)

**Procesamiento:**
- No requiere procesamiento automático
- El usuario realiza la transferencia manualmente
- El administrador verifica el depósito
- El viaje se confirma manualmente

## Flujo Completo de Pago

### Paso 1: Selección de Método de Pago
1. El usuario completa el formulario de viaje en `RequestRideScreen`
2. Presiona "Solicitar Viaje"
3. Se valida que todos los campos requeridos estén completos
4. Se navega a `PaymentConfirmationScreen`

### Paso 2: Confirmación de Pago
1. El usuario ve el resumen del viaje
2. Selecciona el método de pago (Tarjeta, PayPal, o Depósito)
3. Completa la información requerida según el método:
   - **Tarjeta:** Datos de la tarjeta
   - **PayPal:** Escanea QR o hace clic en el botón
   - **Depósito:** Copia los datos bancarios

### Paso 3: Procesamiento
1. El usuario presiona "Procesar Pago"
2. Se valida la información (si aplica)
3. Se verifica que el usuario esté autenticado
4. Se procesa el pago según el método:
   - **Tarjeta:** Simulación de procesamiento (2 segundos)
   - **PayPal:** Redirección a PayPal (pendiente de implementación completa)
   - **Depósito:** No requiere procesamiento automático

### Paso 4: Creación del Viaje
1. Se crea el viaje en Supabase usando `RideService`
2. Se incluye el método de pago seleccionado
3. Se genera un número de recibo único

### Paso 5: Recibo
1. Se navega a `ReceiptScreen`
2. Se muestra el recibo completo con:
   - Número de recibo
   - Fecha y hora
   - Detalles del viaje
   - Información del cliente
   - Resumen de pago
   - Método de pago utilizado
3. El usuario puede:
   - Copiar el recibo
   - Imprimir el recibo
   - Enviar el recibo por correo

## Implementación Técnica

### Archivos Principales

1. **`payment_confirmation_screen.dart`**
   - Pantalla de confirmación de pago
   - Selector de método de pago
   - Formularios de entrada según el método
   - Procesamiento de pago

2. **`receipt_screen.dart`**
   - Pantalla de recibo
   - Generación de recibo
   - Funcionalidad de impresión
   - Funcionalidad de envío por correo

3. **`ride_service.dart`**
   - Servicio para crear viajes
   - Integración con Supabase

### Variables de Entorno

Las variables de entorno se cargan desde el archivo `env`:

```env
# Datos bancarios
BANK_ACCOUNT_NAME=Eugenia's Travel - La Sicilia Tour
BANK_IBAN=IT60X0542811101000000123456
BANK_NAME=Banca Popolare di Sicilia
BANK_SWIFT=BPOPITRRXXX
BANK_ADDRESS=Via Roma, 123, Palermo, Italia
```

## Próximos Pasos para Producción

### Tarjeta de Crédito/Débito
- [ ] Integrar Stripe o PayPal Payments
- [ ] Implementar backend seguro para procesar pagos
- [ ] Configurar webhooks para confirmación de pagos
- [ ] Implementar manejo de errores de pago
- [ ] Agregar reembolsos

### PayPal
- [ ] Crear cuenta de PayPal Business
- [ ] Obtener Client ID y Secret
- [ ] Implementar backend para generar URLs de pago
- [ ] Configurar webhooks de PayPal
- [ ] Implementar verificación de pagos

### Depósito a Cuenta
- [ ] Confirmar datos bancarios reales
- [ ] Implementar sistema de verificación de depósitos
- [ ] Agregar notificaciones cuando se reciba un depósito
- [ ] Implementar confirmación automática (si es posible)

## Notas Importantes

1. **Seguridad:** Los datos de tarjeta nunca deben almacenarse en el cliente. Siempre usar un procesador de pagos certificado (Stripe, PayPal, etc.).

2. **PCI DSS:** Si se procesan tarjetas directamente, se debe cumplir con PCI DSS. Es mejor usar un procesador de pagos que maneje esto.

3. **Webhooks:** Los webhooks son esenciales para confirmar pagos de forma segura desde el backend.

4. **QR Codes:** Los QR codes son una excelente opción para pagos móviles, ya que son compatibles con múltiples wallets.

5. **Depósito a Cuenta:** Este método requiere verificación manual, lo cual puede ser lento pero es seguro y no requiere integración con procesadores de pago.

