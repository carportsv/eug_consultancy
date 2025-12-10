# Configuración de Notificaciones Push en Segundo Plano

## Problema
Las notificaciones no llegan cuando la app está en segundo plano porque el servidor no está enviando notificaciones push a través de FCM.

## Solución
Configurar un trigger de base de datos que envíe notificaciones push automáticamente cuando se inserta un mensaje.

## Opción 1: Edge Function de Supabase (Recomendado)

### Paso 1: Crear Edge Function

1. Ve a Supabase Dashboard > Edge Functions
2. Crea una nueva función llamada `send-push-notification`
3. Crea el archivo `index.ts`:

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

### Paso 2: Configurar Variable de Entorno

1. Ve a Supabase Dashboard > Project Settings > Edge Functions
2. Agrega la variable de entorno:
   - Nombre: `FCM_SERVER_KEY`
   - Valor: Tu Server Key de Firebase Cloud Messaging

Para obtener el Server Key:
1. Ve a Firebase Console > Project Settings > Cloud Messaging
2. Copia el "Server key" (legacy) o crea una nueva clave de servidor

### Paso 3: Desplegar la Edge Function

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Iniciar sesión
supabase login

# Vincular proyecto
supabase link --project-ref tu-project-ref

# Desplegar función
supabase functions deploy send-push-notification
```

### Paso 4: Ejecutar Script SQL

Ejecuta el script `database/send-push-notification-on-message.sql` en el SQL Editor de Supabase.

## Opción 2: Database Webhook (Alternativa)

Si no puedes usar Edge Functions, puedes configurar un Database Webhook:

1. Ve a Supabase Dashboard > Database > Webhooks
2. Crea un nuevo webhook:
   - Event: `INSERT` en tabla `messages`
   - URL: Tu endpoint que envíe notificaciones push
   - HTTP Method: POST
   - HTTP Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`

## Opción 3: Servicio Externo

Puedes crear un servicio externo que:
1. Escuche cambios en la tabla `messages` usando Supabase Realtime
2. Cuando detecte un INSERT, envíe una notificación push a través de FCM

## Verificación

Para verificar que funciona:

1. Asigna un viaje a un driver desde el panel de admin
2. Verifica que se inserta un mensaje en la tabla `messages`
3. Verifica que se envía una notificación push al dispositivo del driver
4. Verifica los logs de la Edge Function en Supabase Dashboard

## Notas Importantes

- El token FCM del driver debe estar guardado en la columna `notification_token` de la tabla `drivers`
- El handler de segundo plano en la app está configurado correctamente
- Las notificaciones push solo funcionan cuando la app está en segundo plano o cerrada
- En primer plano, las notificaciones se muestran a través de la suscripción en tiempo real

