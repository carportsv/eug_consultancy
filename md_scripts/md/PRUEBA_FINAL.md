# 🧪 Prueba Final del Sistema de Notificaciones Push

## Pasos para Probar

### 1. Esperar a que el Driver Inicie Sesión

Mientras la app se ejecuta en la tablet/móvil:
- El driver debe iniciar sesión
- La app guardará automáticamente el `notification_token` en la tabla `drivers`
- Esto puede tardar unos segundos después del login

### 2. Verificar que el Token se Guardó

Ejecuta esta consulta en SQL Editor para verificar:

```sql
SELECT 
  id,
  notification_token,
  CASE 
    WHEN notification_token IS NOT NULL THEN '✅ Tiene token'
    ELSE '❌ Sin token'
  END as estado
FROM drivers
WHERE notification_token IS NOT NULL;
```

Si ves al menos un driver con token, puedes continuar.

### 3. Ejecutar Prueba de Notificación

Ejecuta el script `database/test-push-notification.sql` completo. Este script:
- Busca automáticamente un driver con `notification_token`
- Inserta un mensaje de prueba
- Activa el trigger
- Envía notificación push

### 4. Verificar Logs de la Edge Function

1. Ve a **Supabase Dashboard > Edge Functions > send-push-notification**
2. Haz clic en la pestaña **"Logs"**
3. Debes ver logs indicando:
   - Que se recibió la solicitud
   - Que se obtuvo el token de acceso OAuth 2.0
   - Que se envió la notificación a FCM
   - El resultado (éxito o error)

### 5. Verificar en el Dispositivo

- Debe llegar una notificación push al dispositivo
- La notificación debe aparecer incluso si la app está en segundo plano
- Debe mostrar el título y mensaje del mensaje de prueba

## Si No Funciona

### No hay drivers con token:
- Espera a que el driver complete el login
- Verifica que la app tenga permisos de notificaciones
- Revisa los logs de la app para ver si hay errores al guardar el token

### El trigger no se ejecuta:
- Verifica que el trigger existe: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_send_push_notification';`
- Verifica que la función existe: `SELECT * FROM pg_proc WHERE proname = 'send_push_notification';`

### La Edge Function no recibe la solicitud:
- Verifica los logs de la Edge Function
- Verifica que el Service Role Key en Vault sea correcto
- Verifica que la URL de Supabase sea correcta

### La notificación no llega:
- Verifica los logs de la Edge Function para errores de FCM
- Verifica que los secrets de Firebase estén correctos
- Verifica que el dispositivo tenga conexión a internet
- Verifica que la app tenga permisos de notificaciones

## Estado Actual

- ✅ pg_net instalado
- ✅ Secrets en Vault
- ✅ Edge Function desplegada
- ✅ Secrets de Firebase configurados
- ⏳ Esperando que el driver inicie sesión para guardar el token

¡Espera a que el driver inicie sesión y luego ejecuta la prueba! 🚀

