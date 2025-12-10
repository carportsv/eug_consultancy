# Guía Completa: Configurar Notificaciones Push en Segundo Plano

## ✅ Verificación Inicial

Ya tienes `pg_net` instalado (versión 0.14.0), lo cual es perfecto. Esto te permite usar un trigger directo.

---

## 🎯 OPCIÓN 1: Trigger Directo + Edge Function (RECOMENDADO)

Esta opción es más simple porque no requiere un servidor externo.

### Paso 1: Crear Edge Function en Supabase

1. Ve a **Supabase Dashboard > Edge Functions**
2. Haz clic en **"Create a new function"**
3. Nombre: `send-push-notification`
4. Crea el archivo `index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY') || '';

serve(async (req) => {
  try {
    const { token, title, body, data } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token FCM requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!FCM_SERVER_KEY) {
      return new Response(
        JSON.stringify({ error: 'FCM_SERVER_KEY no configurada' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Enviar notificación push a través de FCM
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: title || '🚗 Nuevo viaje asignado',
          body: body || 'Tienes un nuevo viaje asignado',
          sound: 'default',
        },
        data: data || {},
        priority: 'high',
      }),
    });

    const result = await fcmResponse.json();

    if (!fcmResponse.ok) {
      console.error('Error enviando notificación FCM:', result);
      return new Response(
        JSON.stringify({ error: 'Error enviando notificación', details: result }),
        { status: fcmResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.message_id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en Edge Function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### Paso 2: Configurar Variable de Entorno FCM_SERVER_KEY

1. Ve a **Supabase Dashboard > Project Settings > Edge Functions**
2. En la sección **"Secrets"**, agrega:
   - **Name:** `FCM_SERVER_KEY`
   - **Value:** Tu Server Key de Firebase

**Para obtener el Server Key:**
1. Ve a **Firebase Console** > Tu proyecto > **Project Settings** > **Cloud Messaging**
2. En la sección **"Cloud Messaging API (Legacy)"**, copia el **"Server key"**
3. Si no aparece, haz clic en **"Generate new key"** o usa la nueva API

**Para la nueva API de FCM:**
- Ve a **Firebase Console** > **Project Settings** > **Service Accounts**
- Genera una nueva clave privada (JSON)
- Usa el token de acceso OAuth 2.0 en lugar del Server Key

### Paso 3: Desplegar la Edge Function

```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Iniciar sesión
supabase login

# Vincular proyecto
supabase link --project-ref tu-project-ref

# Desplegar función
supabase functions deploy send-push-notification
```

O usa el botón **"Deploy"** en el Dashboard de Supabase.

### Paso 4: Ejecutar el Trigger SQL

Ejecuta este script en **Supabase Dashboard > SQL Editor**:

```sql
-- Función que llama a la Edge Function para enviar notificación push
CREATE OR REPLACE FUNCTION send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  driver_token TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  response_status INT;
BEGIN
  -- Solo procesar si es un mensaje para un driver
  IF NEW.driver_id IS NOT NULL AND NEW.type = 'ride_request' THEN
    -- Obtener el token FCM del driver
    SELECT notification_token INTO driver_token
    FROM drivers
    WHERE id = NEW.driver_id;
    
    -- Si el driver tiene token FCM, enviar notificación
    IF driver_token IS NOT NULL THEN
      -- Obtener URL de Supabase y Service Role Key
      -- Estos valores están disponibles en el contexto de Supabase
      supabase_url := current_setting('app.settings.supabase_url', true);
      service_role_key := current_setting('app.settings.service_role_key', true);
      
      -- Si no están disponibles, usar valores por defecto
      -- Reemplaza estos con tus valores reales
      IF supabase_url IS NULL THEN
        supabase_url := 'https://tu-proyecto.supabase.co';
      END IF;
      
      IF service_role_key IS NULL THEN
        -- Obtener desde vault o configurar manualmente
        -- Por seguridad, es mejor usar vault
        SELECT decrypted_secret INTO service_role_key
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key';
      END IF;
      
      -- Llamar a la Edge Function usando pg_net
      SELECT status INTO response_status
      FROM net.http_post(
        url := supabase_url || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'token', driver_token,
          'title', COALESCE(NEW.title, '🚗 Nuevo viaje asignado'),
          'body', COALESCE(NEW.message, 'Tienes un nuevo viaje asignado'),
          'data', jsonb_build_object(
            'type', 'ride_request',
            'ride_id', (NEW.data->>'ride_id'),
            'message_id', NEW.id
          )
        )
      );
      
      -- Log del resultado (opcional)
      RAISE NOTICE 'Notificación push enviada. Status: %', response_status;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_send_push_notification ON messages;
CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION send_push_notification();
```

**⚠️ IMPORTANTE:** Reemplaza `'https://tu-proyecto.supabase.co'` con tu URL real de Supabase.

---

## 🎯 OPCIÓN 2: Database Webhook (Requiere Servidor Externo)

Si prefieres usar Database Webhooks, necesitas un servidor que reciba el webhook y envíe notificaciones push.

### Paso 1: Completar el Webhook en Supabase

1. **Name:** `send-push-notification-on-message` (sin espacios)
2. **Table:** `messages` (ya seleccionado)
3. **Events:** Marca `[✓] Insert`
4. **Type:** `HTTP Request` (ya seleccionado)
5. **URL:** `https://tu-servidor.com/api/send-push-notification`
6. **HTTP Method:** `POST`
7. **HTTP Headers:**
   ```
   Content-Type: application/json
   ```
8. **HTTP Request Body (Payload):**
   ```json
   {
     "driver_id": "{{driver_id}}",
     "title": "{{title}}",
     "message": "{{message}}",
     "type": "{{type}}",
     "data": "{{data}}"
   }
   ```

### Paso 2: Crear Servidor que Reciba el Webhook

Tu servidor debe:
1. Recibir el POST del webhook
2. Obtener el `notification_token` del driver desde Supabase
3. Enviar notificación push a través de FCM

**Ejemplo en Node.js/Express:**

```javascript
const express = require('express');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(require('./firebase-service-account.json'))
});

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post('/api/send-push-notification', async (req, res) => {
  try {
    const { driver_id, title, message, data } = req.body;

    // Obtener token FCM del driver
    const { data: driver, error } = await supabase
      .from('drivers')
      .select('notification_token')
      .eq('id', driver_id)
      .single();

    if (error || !driver || !driver.notification_token) {
      return res.status(404).json({ error: 'Driver o token no encontrado' });
    }

    // Enviar notificación push
    const message = {
      notification: {
        title: title || '🚗 Nuevo viaje asignado',
        body: message || 'Tienes un nuevo viaje asignado',
      },
      data: data || {},
      token: driver.notification_token,
    };

    const response = await admin.messaging().send(message);
    
    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Servidor escuchando en puerto 3000');
});
```

---

## ✅ Verificación

Para verificar que funciona:

1. Asigna un viaje a un driver desde el panel de admin
2. Verifica que se inserta un mensaje en la tabla `messages`
3. Verifica que se envía una notificación push al dispositivo del driver
4. Verifica los logs:
   - **Edge Function:** Supabase Dashboard > Edge Functions > send-push-notification > Logs
   - **Database Webhook:** Supabase Dashboard > Database > Webhooks > Ver logs

---

## 🔍 Solución de Problemas

### Error: "FCM_SERVER_KEY no configurada"
- Verifica que agregaste la variable de entorno en Edge Functions
- Verifica que el nombre es exactamente `FCM_SERVER_KEY`

### Error: "Driver o token no encontrado"
- Verifica que el driver tiene un `notification_token` guardado
- Verifica que el `driver_id` en el mensaje es correcto

### Las notificaciones no llegan
- Verifica que el token FCM está guardado correctamente en la tabla `drivers`
- Verifica que el dispositivo tiene conexión a internet
- Verifica que la app tiene permisos de notificaciones

---

## 📝 Recomendación Final

**Usa la OPCIÓN 1 (Trigger + Edge Function)** porque:
- ✅ No requiere servidor externo
- ✅ Más simple de configurar
- ✅ Menos puntos de fallo
- ✅ Ya tienes `pg_net` instalado

