# ✅ Pasos Finales para Completar la Configuración

## Estado Actual
- ✅ Edge Function `send-push-notification` desplegada exitosamente
- ✅ Trigger SQL creado
- ✅ URL del endpoint: `https://wpecvlperiberbmsndlg.supabase.co/functions/v1/send-push-notification`

## Pasos Restantes

### 1. Configurar FCM_SERVER_KEY en Supabase Secrets

1. Ve a **Supabase Dashboard > Project Settings > Edge Functions**
2. En la sección **"Secrets"**, haz clic en **"Add new secret"**
3. Completa:
   - **Name:** `FCM_SERVER_KEY`
   - **Value:** Tu Server Key de Firebase

**Para obtener el FCM Server Key:**

#### Opción A: Server Key Legacy (Más Simple)
1. Ve a **Firebase Console** > Tu proyecto
2. **Project Settings** > **Cloud Messaging**
3. En la sección **"Cloud Messaging API (Legacy)"**, copia el **"Server key"**
4. Si no aparece, haz clic en **"Generate new key"**

#### Opción B: Nueva API de FCM (Recomendado)
1. Ve a **Firebase Console** > **Project Settings** > **Service Accounts**
2. Haz clic en **"Generate new private key"**
3. Descarga el archivo JSON
4. Usa el token de acceso OAuth 2.0 (requiere código adicional)

**Para esta implementación, usa la Opción A (Server Key Legacy).**

### 2. Actualizar el Trigger SQL con tu Service Role Key

1. Ve a **Supabase Dashboard > Project Settings > API**
2. Copia tu **"service_role" key** (⚠️ NO la anon key, debe ser la service_role)
3. Abre `database/trigger-push-notification.sql`
4. Reemplaza `'TU_SERVICE_ROLE_KEY'` con tu Service Role Key real
5. Ejecuta el script actualizado en **SQL Editor**

**⚠️ IMPORTANTE:** 
- La Service Role Key tiene permisos completos, mantenla segura
- No la compartas ni la subas a git
- Solo úsala en el trigger de base de datos

### 3. Verificar que el Trigger Funciona

Ejecuta este SQL de prueba en **Supabase Dashboard > SQL Editor**:

**Opción A: Script Automático (Recomendado)**

Usa el script completo de `database/test-push-notification.sql` que automáticamente:
1. Busca un driver con `notification_token`
2. Inserta el mensaje de prueba usando ese driver

**Opción B: Script Manual**

Primero, obtén un driver_id real:

```sql
-- Paso 1: Ver drivers disponibles con tokens FCM
SELECT 
  id as driver_id,
  notification_token,
  CASE 
    WHEN notification_token IS NOT NULL THEN '✅ Tiene token'
    ELSE '❌ Sin token'
  END as estado_token
FROM drivers
WHERE notification_token IS NOT NULL
LIMIT 5;
```

Luego, usa uno de los `driver_id` del resultado:

```sql
-- Paso 2: Insertar mensaje de prueba (reemplaza DRIVER_ID_AQUI con un ID real)
INSERT INTO messages (
  driver_id, 
  type, 
  title, 
  message, 
  is_read,
  data
) VALUES (
  'DRIVER_ID_AQUI',  -- ⚠️ REEMPLAZA con un driver_id real del SELECT anterior
  'ride_request',
  '🚗 Test: Nuevo viaje asignado',
  'Este es un mensaje de prueba para verificar las notificaciones push',
  false,
  '{"ride_id": "test-ride-123", "action": "driver_accept_reject"}'::jsonb
);
```

**Después de ejecutar:**
1. Verifica los logs de la Edge Function:
   - **Supabase Dashboard > Edge Functions > send-push-notification > Logs**
   - Debe aparecer un log indicando que se envió la notificación

2. Verifica en el dispositivo:
   - Debe llegar una notificación push al dispositivo del driver
   - La notificación debe aparecer incluso si la app está en segundo plano

### 4. Verificar que el Driver tiene Token FCM

Antes de probar, asegúrate de que el driver tiene un `notification_token` guardado:

```sql
-- Verificar tokens FCM de drivers
SELECT id, notification_token 
FROM drivers 
WHERE notification_token IS NOT NULL;
```

Si no hay tokens, la app los guarda automáticamente cuando el driver inicia sesión.

## Solución de Problemas

### Error: "FCM_SERVER_KEY no configurada"
- Verifica que agregaste el secret en Edge Functions > Secrets
- Verifica que el nombre es exactamente `FCM_SERVER_KEY` (case-sensitive)

### Error: "Unauthorized" al llamar a la Edge Function
- Verifica que estás usando la **Service Role Key** (no la anon key)
- Verifica que el trigger tiene permisos para llamar a la Edge Function

### Las notificaciones no llegan
- Verifica que el driver tiene un `notification_token` guardado
- Verifica los logs de la Edge Function para ver errores
- Verifica que el dispositivo tiene conexión a internet
- Verifica que la app tiene permisos de notificaciones

### El trigger no se ejecuta
- Verifica que el trigger existe:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'trigger_send_push_notification';
  ```
- Verifica que la función existe:
  ```sql
  SELECT * FROM pg_proc WHERE proname = 'send_push_notification';
  ```

## Próximos Pasos

Una vez que todo esté configurado:

1. ✅ Asigna un viaje a un driver desde el panel de admin
2. ✅ Verifica que se inserta un mensaje en la tabla `messages`
3. ✅ Verifica que se envía una notificación push al dispositivo
4. ✅ Verifica que la notificación llega incluso con la app en segundo plano

## Resumen de URLs y Keys Necesarias

- **Edge Function URL:** `https://wpecvlperiberbmsndlg.supabase.co/functions/v1/send-push-notification`
- **FCM Server Key:** Obtener de Firebase Console > Cloud Messaging
- **Service Role Key:** Obtener de Supabase Dashboard > Project Settings > API

¡Todo listo! 🎉

