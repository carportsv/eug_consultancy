# 🐛 Guía de Debug: Notificaciones Push en Segundo Plano

## Problema Reportado
Las notificaciones push no llegan cuando la app está en segundo plano.

## Flujo del Sistema

```
1. Servidor inserta mensaje en tabla `messages`
   ↓
2. Trigger `trigger_send_push_notification` se activa
   ↓
3. Trigger llama a Edge Function `/functions/v1/send-push-notification`
   ↓
4. Edge Function obtiene token OAuth 2.0 de Firebase
   ↓
5. Edge Function envía notificación a FCM v1 API
   ↓
6. FCM envía notificación push al dispositivo
   ↓
7. Dispositivo muestra notificación (incluso en segundo plano)
```

## Verificaciones Paso a Paso

### ✅ 1. Verificar que el Trigger está Ejecutado

Ejecuta en SQL Editor:
```sql
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Habilitado'
    ELSE '⚠️ Deshabilitado'
  END as estado
FROM pg_trigger
WHERE tgname = 'trigger_send_push_notification';
```

**Si no existe el trigger:**
- Ejecuta `database/trigger-push-notification.sql` completo

### ✅ 2. Verificar que hay Drivers con Tokens FCM

Ejecuta en SQL Editor:
```sql
SELECT 
  id,
  notification_token,
  '✅ Tiene token' as estado
FROM drivers
WHERE notification_token IS NOT NULL
LIMIT 5;
```

**Si no hay drivers con tokens:**
- Asegúrate de que el driver haya iniciado sesión en la app
- La app guarda automáticamente el token cuando el driver inicia sesión
- Verifica los logs de la app: debe aparecer `✅ Token FCM guardado para driver`

### ✅ 3. Verificar que la Edge Function está Desplegada

1. Ve a **Supabase Dashboard > Edge Functions**
2. Busca `send-push-notification`
3. Debe estar en estado "Active" o "Deployed"

**Si no está desplegada:**
- Despliega la Edge Function usando el código en `database/edge-function-index.ts`

### ✅ 4. Verificar que los Secrets están Configurados

1. Ve a **Supabase Dashboard > Edge Functions > send-push-notification**
2. Haz clic en **"Secrets"**
3. Debe tener estos secrets configurados:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`

**Si faltan secrets:**
- Sigue la guía en `database/FCM_V1_SETUP.md`
- Obtén el Service Account JSON de Firebase Console
- Configura los secrets en Supabase

### ✅ 5. Probar el Sistema Completo

Ejecuta `database/PRUEBA_NOTIFICACIONES_SEGUNDO_PLANO.sql` completo.

**Antes de ejecutar:**
1. Asegúrate de que la app esté ejecutándose en el dispositivo
2. El driver debe haber iniciado sesión
3. **Pon la app en segundo plano** (minimiza la app)

**Después de ejecutar:**
1. Espera 5-10 segundos
2. Debe llegar una notificación push al dispositivo
3. Verifica los logs de la Edge Function

### ✅ 6. Verificar Logs de la Edge Function

1. Ve a **Supabase Dashboard > Edge Functions > send-push-notification**
2. Haz clic en **"Logs"**
3. Debes ver logs recientes indicando:
   - ✅ Solicitud recibida
   - ✅ Token de acceso OAuth obtenido
   - ✅ Notificación enviada a FCM
   - ✅ Respuesta exitosa (200 OK)

**Si ves errores en los logs:**
- **Error 401/403**: Los secrets de Firebase están incorrectos
- **Error 400**: El token FCM es inválido o el payload está mal formado
- **Error 500**: Error interno en la Edge Function (revisa el código)

### ✅ 7. Verificar que el Dispositivo Recibe Notificaciones

**En Android:**
- Verifica que la app tiene permisos de notificaciones
- Configuración > Apps > Eugenias Travel > Notificaciones > Permitir
- Verifica que el dispositivo tiene conexión a internet
- Verifica que el dispositivo no está en modo "No molestar"

**En iOS:**
- Verifica que la app tiene permisos de notificaciones
- Configuración > Notificaciones > Eugenias Travel > Permitir
- Verifica que el dispositivo tiene conexión a internet

## Problemas Comunes y Soluciones

### ❌ Problema: El trigger no se ejecuta

**Solución:**
```sql
-- Verificar que el trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'trigger_send_push_notification';

-- Si no existe, ejecutar:
\i database/trigger-push-notification.sql
```

### ❌ Problema: La Edge Function no recibe la solicitud

**Solución:**
1. Verifica que el `service_role_key` está en Vault
2. Verifica que la URL de Supabase es correcta
3. Verifica los logs de la Edge Function

### ❌ Problema: Error 401/403 en los logs de la Edge Function

**Solución:**
1. Verifica que los secrets de Firebase están correctos
2. Verifica que el Service Account JSON es válido
3. Regenera el Service Account JSON si es necesario

### ❌ Problema: La notificación no llega al dispositivo

**Solución:**
1. Verifica que el token FCM es válido
2. Verifica que el dispositivo tiene conexión a internet
3. Verifica que la app tiene permisos de notificaciones
4. Verifica que el dispositivo no está en modo "No molestar"

### ❌ Problema: La notificación llega solo en primer plano

**Solución:**
1. Verifica que el handler de segundo plano está configurado en `main.dart`
2. Verifica que `firebaseMessagingBackgroundHandler` está implementado
3. Verifica que `FirebaseMessaging.onBackgroundMessage` está registrado

## Scripts de Verificación

- `database/VERIFICAR_TRIGGER_Y_EDGE_FUNCTION.sql` - Verifica trigger y Edge Function
- `database/PRUEBA_NOTIFICACIONES_SEGUNDO_PLANO.sql` - Prueba completa del sistema
- `database/VERIFICAR_CONFIGURACION.sql` - Verificación general del sistema

## Próximos Pasos

1. Ejecuta `database/PRUEBA_NOTIFICACIONES_SEGUNDO_PLANO.sql`
2. Verifica los logs de la Edge Function
3. Verifica que la notificación llega al dispositivo
4. Si no funciona, revisa cada paso de esta guía

