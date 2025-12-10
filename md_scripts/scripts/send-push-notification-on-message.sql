-- =====================================================
-- NOTA IMPORTANTE: Este script NO funciona directamente
-- =====================================================
-- Supabase no permite hacer llamadas HTTP desde triggers de base de datos
-- por defecto. Necesitas usar una de estas opciones:
--
-- OPCIÓN 1: Database Webhooks (MÁS SIMPLE)
-- 1. Ve a Supabase Dashboard > Database > Webhooks
-- 2. Crea un webhook que se active en INSERT de la tabla 'messages'
-- 3. El webhook debe llamar a tu servidor que envíe notificaciones push
--
-- OPCIÓN 2: Edge Function + pg_net (RECOMENDADO)
-- 1. Crea una Edge Function en Supabase (ver EDGE_FUNCTION_SETUP.md)
-- 2. Usa pg_net extension para llamar a la Edge Function desde el trigger
-- 3. Ejecuta este script después de crear la Edge Function
--
-- OPCIÓN 3: Servicio Externo
-- 1. Crea un servicio que escuche cambios en 'messages' usando Supabase Realtime
-- 2. Cuando detecte un INSERT, envíe notificación push a través de FCM
--
-- =====================================================
-- Este script es solo un ejemplo de cómo sería el trigger
-- NO lo ejecutes directamente sin configurar primero la Edge Function
-- =====================================================

-- Verificar si pg_net está disponible
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Si pg_net está disponible, puedes usar este trigger:
-- (Descomenta después de crear la Edge Function)

/*
CREATE OR REPLACE FUNCTION send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  driver_token TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Solo procesar si es un mensaje para un driver
  IF NEW.driver_id IS NOT NULL AND NEW.type = 'ride_request' THEN
    -- Obtener el token FCM del driver
    SELECT notification_token INTO driver_token
    FROM drivers
    WHERE id = NEW.driver_id;
    
    -- Si el driver tiene token FCM, enviar notificación
    IF driver_token IS NOT NULL THEN
      -- Obtener configuración de Supabase (debes configurar esto)
      supabase_url := current_setting('app.supabase_url', true);
      service_role_key := current_setting('app.service_role_key', true);
      
      -- Llamar a la Edge Function usando pg_net
      PERFORM
        net.http_post(
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
*/

-- =====================================================
-- SOLUCIÓN RECOMENDADA: Database Webhook
-- =====================================================
-- Ve a Supabase Dashboard > Database > Webhooks
-- Crea un webhook con:
-- - Table: messages
-- - Events: INSERT
-- - HTTP Request
-- - URL: https://tu-servidor.com/api/send-push-notification
-- - HTTP Method: POST
-- - HTTP Headers: Content-Type: application/json
-- - Payload: 
--   {
--     "driver_id": "{{driver_id}}",
--     "title": "{{title}}",
--     "message": "{{message}}",
--     "data": "{{data}}"
--   }
-- =====================================================

