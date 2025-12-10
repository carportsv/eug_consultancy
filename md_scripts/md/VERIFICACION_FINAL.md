# ✅ Verificación Final de Configuración

## Estado de los Secrets ✅

Veo que ya tienes configurados todos los secrets necesarios en Supabase:

- ✅ `FIREBASE_PROJECT_ID` - Configurado
- ✅ `FIREBASE_PRIVATE_KEY` - Configurado  
- ✅ `FIREBASE_CLIENT_EMAIL` - Configurado
- ✅ `SUPABASE_URL` - Configurado
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Configurado

## Pasos Finales

### 1. Obtener Service Role Key para el Trigger SQL

Los secrets de Edge Functions no están disponibles directamente en los triggers de PostgreSQL. Necesitas:

1. Ve a **Supabase Dashboard > Project Settings > API**
2. Copia tu **"service_role" key** (la que dice "service_role", NO la "anon" key)
3. Abre `database/trigger-push-notification.sql`
4. En la línea 59, reemplaza `'TU_SERVICE_ROLE_KEY_AQUI'` con tu Service Role Key real
5. Ejecuta el script completo en **SQL Editor**

### 2. Verificar que la Edge Function esté Actualizada

1. Ve a **Supabase Dashboard > Edge Functions > send-push-notification**
2. Verifica que el código sea el de `database/edge-function-index.ts` (API v1 de FCM)
3. Si no está actualizado, copia el código y haz clic en **"Deploy function"**

### 3. Verificar que el Trigger esté Creado

Ejecuta este SQL para verificar:

```sql
-- Verificar que el trigger existe
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_send_push_notification';
```

Deberías ver una fila con el trigger.

### 4. Verificar que la Función Existe

```sql
-- Verificar que la función existe
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'send_push_notification';
```

### 5. Probar el Sistema Completo

Ejecuta el script de prueba de `database/test-push-notification.sql`:

```sql
DO $$
DECLARE
  test_driver_id UUID;
  test_driver_token TEXT;
BEGIN
  -- Obtener el primer driver que tenga token FCM
  SELECT id, notification_token 
  INTO test_driver_id, test_driver_token
  FROM drivers
  WHERE notification_token IS NOT NULL
  LIMIT 1;
  
  IF test_driver_id IS NOT NULL THEN
    INSERT INTO messages (
      driver_id, 
      type, 
      title, 
      message, 
      is_read,
      data
    ) VALUES (
      test_driver_id,
      'ride_request',
      '🚗 Test: Nuevo viaje asignado',
      'Este es un mensaje de prueba para verificar las notificaciones push',
      false,
      '{"ride_id": "test-ride-123", "action": "driver_accept_reject"}'::jsonb
    );
    
    RAISE NOTICE '✅ Mensaje de prueba insertado para driver: %', test_driver_id;
  ELSE
    RAISE NOTICE '❌ No se encontró ningún driver con notification_token';
  END IF;
END $$;
```

### 6. Verificar Logs

Después de ejecutar la prueba:

1. **Logs del Trigger:**
   - No hay logs directos del trigger, pero puedes verificar en los logs de PostgreSQL si hay errores

2. **Logs de la Edge Function:**
   - Ve a **Supabase Dashboard > Edge Functions > send-push-notification > Logs**
   - Debe aparecer un log indicando que se recibió la solicitud y se envió la notificación

3. **Verificar en el Dispositivo:**
   - Debe llegar una notificación push al dispositivo del driver
   - La notificación debe aparecer incluso si la app está en segundo plano

## Checklist Final

- [ ] Service Role Key configurada en el trigger SQL (línea 59)
- [ ] Trigger SQL ejecutado y creado correctamente
- [ ] Edge Function actualizada con código de API v1
- [ ] Edge Function desplegada
- [ ] Secrets de Firebase configurados (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
- [ ] Al menos un driver tiene `notification_token` en la tabla `drivers`
- [ ] Script de prueba ejecutado sin errores
- [ ] Logs de Edge Function muestran actividad
- [ ] Notificación push llega al dispositivo

## Solución de Problemas

### Si el trigger no se ejecuta:
- Verifica que el trigger existe: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_send_push_notification';`
- Verifica que la función existe: `SELECT * FROM pg_proc WHERE proname = 'send_push_notification';`

### Si la Edge Function no recibe la solicitud:
- Verifica que el Service Role Key en el trigger sea correcto
- Verifica que la URL de Supabase sea correcta
- Verifica los logs de la Edge Function para ver errores

### Si la notificación no llega:
- Verifica que el driver tenga `notification_token` guardado
- Verifica los logs de la Edge Function para ver si hay errores de FCM
- Verifica que los secrets de Firebase estén correctos
- Verifica que el dispositivo tenga conexión a internet

¡Todo listo para probar! 🚀

