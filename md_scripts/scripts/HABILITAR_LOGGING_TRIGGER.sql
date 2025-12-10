-- =====================================================
-- HABILITAR LOGGING EN EL TRIGGER
-- =====================================================
-- Este script modifica el trigger para que muestre logs
-- y podamos ver qué está pasando cuando se ejecuta
-- =====================================================

-- Reemplazar la función con logging habilitado
CREATE OR REPLACE FUNCTION send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  driver_token TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
  error_message TEXT;
BEGIN
  -- Solo procesar si es un mensaje para un driver
  IF NEW.driver_id IS NOT NULL AND NEW.type = 'ride_request' THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔔 TRIGGER ACTIVADO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Driver ID: %', NEW.driver_id;
    RAISE NOTICE 'Message ID: %', NEW.id;
    RAISE NOTICE 'Title: %', NEW.title;
    
    -- Obtener el token FCM del driver
    SELECT notification_token INTO driver_token
    FROM drivers
    WHERE id = NEW.driver_id;
    
    IF driver_token IS NOT NULL THEN
      RAISE NOTICE '✅ Token FCM encontrado: %', substring(driver_token, 1, 50) || '...';
    ELSE
      RAISE NOTICE '❌ No se encontró token FCM para el driver';
      RETURN NEW;
    END IF;
    
    -- Intentar obtener URL y Service Role Key desde vault
    BEGIN
      SELECT decrypted_secret INTO supabase_url
      FROM vault.decrypted_secrets
      WHERE name IN ('supabase_url', 'SUPABASE_URL')
      LIMIT 1;
      
      IF supabase_url IS NOT NULL THEN
        RAISE NOTICE '✅ Supabase URL obtenida desde Vault';
      ELSE
        RAISE NOTICE '⚠️ Supabase URL NO encontrada en Vault';
      END IF;
      
      SELECT decrypted_secret INTO service_role_key
      FROM vault.decrypted_secrets
      WHERE name IN ('service_role_key', 'SUPABASE_SERVICE_ROLE_KEY', 'service_role')
      LIMIT 1;
      
      IF service_role_key IS NOT NULL THEN
        RAISE NOTICE '✅ Service Role Key obtenida desde Vault';
      ELSE
        RAISE NOTICE '⚠️ Service Role Key NO encontrada en Vault';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Error accediendo a Vault: %', SQLERRM;
    END;
    
    -- Si no se obtuvieron desde vault, usar valores por defecto
    IF supabase_url IS NULL THEN
      supabase_url := current_setting('app.settings.supabase_url', true);
      IF supabase_url IS NULL THEN
        supabase_url := 'https://wpecvlperiberbmsndlg.supabase.co';
        RAISE NOTICE '⚠️ Usando URL por defecto: %', supabase_url;
      END IF;
    END IF;
    
    IF service_role_key IS NULL THEN
      service_role_key := current_setting('app.settings.service_role_key', true);
      IF service_role_key IS NULL THEN
        RAISE EXCEPTION '❌ Service Role Key no encontrada. Configúrala en vault ejecutando: database/AGREGAR_SECRETS_VAULT.sql';
      END IF;
    END IF;
    
    -- Llamar a la Edge Function usando pg_net
    BEGIN
      RAISE NOTICE '📡 Llamando a Edge Function: %', supabase_url || '/functions/v1/send-push-notification';
      
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
      
      RAISE NOTICE '✅ Solicitud HTTP enviada. Request ID: %', request_id;
      RAISE NOTICE '💡 Verifica los logs de la Edge Function en Supabase Dashboard';
      RAISE NOTICE '========================================';
    EXCEPTION
      WHEN OTHERS THEN
        error_message := SQLERRM;
        RAISE NOTICE '❌ ERROR al llamar a la Edge Function: %', error_message;
        RAISE NOTICE '💡 Verifica que:';
        RAISE NOTICE '   1. pg_net está instalado';
        RAISE NOTICE '   2. La Edge Function está desplegada';
        RAISE NOTICE '   3. Los secrets están configurados';
        -- No lanzar excepción para que el INSERT no falle
    END;
  ELSE
    RAISE NOTICE '⏭️ Mensaje ignorado (no es ride_request o no tiene driver_id)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que el trigger está habilitado
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger actualizado con logging habilitado';
  RAISE NOTICE '💡 Ahora ejecuta database/PRUEBA_NOTIFICACIONES_SEGUNDO_PLANO.sql para ver los logs';
END $$;

SELECT 
  tgname as trigger_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Habilitado'
    ELSE '⚠️ Deshabilitado'
  END as estado
FROM pg_trigger
WHERE tgname = 'trigger_send_push_notification';

