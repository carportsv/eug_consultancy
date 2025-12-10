-- =====================================================
-- TRIGGER PARA ENVIAR NOTIFICACIONES PUSH AUTOMÁTICAS
-- =====================================================
-- Este trigger envía notificaciones push a través de FCM
-- cuando se inserta un mensaje en la tabla 'messages'
--
-- REQUISITOS:
-- 1. Tener pg_net instalado (ya lo tienes ✅)
-- 2. Crear Edge Function 'send-push-notification' en Supabase
-- 3. Configurar FCM_SERVER_KEY en Edge Functions > Secrets
-- 4. Reemplazar 'https://tu-proyecto.supabase.co' con tu URL real
-- 5. Reemplazar 'TU_SERVICE_ROLE_KEY' con tu Service Role Key
--
-- =====================================================

-- Función que llama a la Edge Function para enviar notificación push
CREATE OR REPLACE FUNCTION send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  driver_token TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Solo procesar si es un mensaje para un driver
  IF NEW.driver_id IS NOT NULL AND NEW.type = 'ride_request' THEN
    -- Obtener el token FCM del driver
    SELECT notification_token INTO driver_token
    FROM drivers
    WHERE id = NEW.driver_id;
    
    -- Si el driver tiene token FCM, enviar notificación
    IF driver_token IS NOT NULL THEN
      -- Intentar obtener URL y Service Role Key desde vault (más seguro)
      -- Los secrets de Edge Functions están en vault con estos nombres
      BEGIN
        -- Intentar obtener desde vault con diferentes nombres posibles
        SELECT decrypted_secret INTO supabase_url
        FROM vault.decrypted_secrets
        WHERE name IN ('supabase_url', 'SUPABASE_URL')
        LIMIT 1;
        
        SELECT decrypted_secret INTO service_role_key
        FROM vault.decrypted_secrets
        WHERE name IN ('service_role_key', 'SUPABASE_SERVICE_ROLE_KEY', 'service_role')
        LIMIT 1;
      EXCEPTION
        WHEN OTHERS THEN
          -- Si vault no está disponible o no encuentra los secrets, usar valores por defecto
          NULL; -- Continuar con el siguiente bloque
      END;
      
      -- Si no se obtuvieron desde vault, usar valores por defecto
      IF supabase_url IS NULL THEN
        supabase_url := current_setting('app.settings.supabase_url', true);
        IF supabase_url IS NULL THEN
          supabase_url := 'https://wpecvlperiberbmsndlg.supabase.co'; -- ✅ URL de tu proyecto
        END IF;
      END IF;
      
      IF service_role_key IS NULL THEN
        service_role_key := current_setting('app.settings.service_role_key', true);
        -- Si aún es NULL, el trigger fallará y necesitarás configurar el secret en vault
        -- o reemplazar este valor con tu Service Role Key real
        IF service_role_key IS NULL THEN
          RAISE EXCEPTION 'Service Role Key no encontrada. Configúrala en vault o en el código del trigger.';
        END IF;
      END IF;
      
      -- Llamar a la Edge Function usando pg_net
      -- net.http_post retorna un BIGINT (ID de la solicitud), no una tabla
      SELECT net.http_post(
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
      ) INTO request_id;
      
      -- Log del resultado (opcional, solo en modo debug)
      -- RAISE NOTICE 'Notificación push enviada. Request ID: %', request_id;
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

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Para verificar que el trigger funciona:
-- 1. Inserta un mensaje de prueba:
--    INSERT INTO messages (driver_id, type, title, message, is_read)
--    VALUES ('tu-driver-id', 'ride_request', 'Test', 'Mensaje de prueba', false);
--
-- 2. Verifica los logs de la Edge Function en Supabase Dashboard
-- 3. Verifica que llegó la notificación push al dispositivo
-- =====================================================

