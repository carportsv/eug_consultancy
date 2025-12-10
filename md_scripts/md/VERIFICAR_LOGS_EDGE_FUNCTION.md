# 🔍 Verificar Logs de la Edge Function

## Pasos para Verificar

### 1. Ir a los Logs de la Edge Function

1. Ve a **Supabase Dashboard**
2. Haz clic en **"Edge Functions"** en el menú lateral
3. Busca y haz clic en **"send-push-notification"**
4. Haz clic en la pestaña **"Logs"**

### 2. Qué Buscar en los Logs

**Si el trigger está funcionando correctamente, deberías ver:**

```
✅ Solicitud recibida
✅ Token de acceso OAuth obtenido
✅ Notificación enviada a FCM
✅ Respuesta exitosa (200 OK)
```

**Si hay errores, verás:**

- **Error 401/403**: Los secrets de Firebase están incorrectos
- **Error 400**: El token FCM es inválido o el payload está mal formado
- **Error 500**: Error interno en la Edge Function

### 3. Si NO hay Logs

Si no ves ningún log después de insertar un mensaje, significa que:
- El trigger NO está llamando a la Edge Function
- O hay un error en el trigger que impide que se ejecute

### 4. Verificar que el Trigger Llama a la Edge Function

Ejecuta este script para verificar que el trigger está configurado correctamente:

```sql
-- Verificar que el trigger existe y está habilitado
SELECT 
  tgname as trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Habilitado'
    ELSE '⚠️ Deshabilitado'
  END as estado,
  pg_get_triggerdef(oid) as definicion
FROM pg_trigger
WHERE tgname = 'trigger_send_push_notification';
```

### 5. Probar Manualmente la Edge Function

Para verificar que la Edge Function funciona, puedes probarla manualmente:

1. Ve a **Supabase Dashboard > Edge Functions > send-push-notification**
2. Haz clic en **"Invoke"** o **"Test"**
3. Usa este payload:

```json
{
  "token": "TU_TOKEN_FCM_AQUI",
  "title": "Test Manual",
  "body": "Esta es una prueba manual de la Edge Function",
  "data": {
    "type": "test"
  }
}
```

**Reemplaza `TU_TOKEN_FCM_AQUI` con un token FCM real de un driver.**

### 6. Verificar que los Secrets Están Configurados

1. Ve a **Supabase Dashboard > Edge Functions > send-push-notification**
2. Haz clic en **"Secrets"**
3. Debe tener estos secrets:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`

## Próximos Pasos

1. **Verifica los logs de la Edge Function** y comparte lo que ves
2. **Si no hay logs**, ejecuta el script de verificación del trigger
3. **Si hay errores en los logs**, comparte el mensaje de error exacto

