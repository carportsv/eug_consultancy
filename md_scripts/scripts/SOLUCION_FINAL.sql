-- =====================================================
-- SOLUCIÓN FINAL: Hacer que el trigger funcione
-- =====================================================
-- Este script asegura que todo esté configurado correctamente
-- =====================================================

-- PASO 1: Asegurar que los secrets están en Vault
DO $$
BEGIN
  -- Agregar/actualizar SUPABASE_URL
  UPDATE vault.secrets
  SET secret = 'https://wpecvlperiberbmsndlg.supabase.co'::text,
      description = 'URL de Supabase para el trigger de notificaciones push'
  WHERE name = 'supabase_url';
  
  IF NOT FOUND THEN
    PERFORM vault.create_secret(
      'https://wpecvlperiberbmsndlg.supabase.co',
      'supabase_url',
      'URL de Supabase para el trigger de notificaciones push'
    );
    RAISE NOTICE '✅ Supabase URL agregada a Vault';
  ELSE
    RAISE NOTICE '✅ Supabase URL actualizada en Vault';
  END IF;
  
  -- Agregar/actualizar SERVICE_ROLE_KEY
  UPDATE vault.secrets
  SET secret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZWN2bHBlcmliZXJibXNuZGxnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgzNTQ0OSwiZXhwIjoyMDY3NDExNDQ5fQ.XH4m5a42BTtpeMJCuM_JrHRaOJixszvKEsKhQLDRkwo'::text,
      description = 'Service Role Key de Supabase para autenticar llamadas a Edge Functions'
  WHERE name = 'service_role_key';
  
  IF NOT FOUND THEN
    PERFORM vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZWN2bHBlcmliZXJibXNuZGxnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgzNTQ0OSwiZXhwIjoyMDY3NDExNDQ5fQ.XH4m5a42BTtpeMJCuM_JrHRaOJixszvKEsKhQLDRkwo',
      'service_role_key',
      'Service Role Key de Supabase para autenticar llamadas a Edge Functions'
    );
    RAISE NOTICE '✅ Service Role Key agregada a Vault';
  ELSE
    RAISE NOTICE '✅ Service Role Key actualizada en Vault';
  END IF;
END $$;

-- PASO 2: Recrear la función del trigger con mejor manejo de errores
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
    -- Obtener el token FCM del driver
    SELECT notification_token INTO driver_token
    FROM drivers
    WHERE id = NEW.driver_id;
    
    -- Si el driver tiene token FCM, enviar notificación
    IF driver_token IS NOT NULL AND driver_token != '' THEN
      -- Obtener secrets desde Vault
      BEGIN
        SELECT decrypted_secret INTO supabase_url
        FROM vault.decrypted_secrets
        WHERE name = 'supabase_url'
        LIMIT 1;
        
        SELECT decrypted_secret INTO service_role_key
        FROM vault.decrypted_secrets
        WHERE name IN ('service_role_key', 'SUPABASE_SERVICE_ROLE_KEY', 'service_role')
        LIMIT 1;
      EXCEPTION
        WHEN OTHERS THEN
          -- Si hay error accediendo a Vault, usar valores por defecto
          supabase_url := NULL;
          service_role_key := NULL;
      END;
      
      -- Si no se obtuvieron desde vault, usar valores por defecto
      IF supabase_url IS NULL THEN
        supabase_url := 'https://wpecvlperiberbmsndlg.supabase.co';
      END IF;
      
      IF service_role_key IS NULL THEN
        -- Intentar obtener desde current_setting
        BEGIN
          service_role_key := current_setting('app.settings.service_role_key', true);
        EXCEPTION
          WHEN OTHERS THEN
            service_role_key := NULL;
        END;
        
        -- Si aún es NULL, no podemos continuar
        IF service_role_key IS NULL THEN
          -- Log el error pero no fallar el INSERT
          RAISE WARNING 'Service Role Key no encontrada. No se puede enviar notificación push.';
          RETURN NEW;
        END IF;
      END IF;
      
      -- Llamar a la Edge Function usando pg_net
      BEGIN
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
        
        -- Log exitoso (solo en modo debug, comentado para producción)
        -- RAISE NOTICE 'Notificación push enviada. Request ID: %', request_id;
      EXCEPTION
        WHEN OTHERS THEN
          -- Log el error pero no fallar el INSERT
          error_message := SQLERRM;
          RAISE WARNING 'Error al enviar notificación push: %', error_message;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Verificar que el trigger está habilitado
SELECT 
  'TRIGGER' as componente,
  tgname as nombre,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Habilitado'
    ELSE '⚠️ Deshabilitado'
  END as estado
FROM pg_trigger
WHERE tgname = 'trigger_send_push_notification';

-- PASO 4: Verificar secrets en Vault
SELECT 
  'SECRETS' as componente,
  name as nombre,
  CASE 
    WHEN name = 'supabase_url' THEN '✅ URL configurada'
    WHEN name = 'service_role_key' THEN '✅ Service Role Key configurada'
    ELSE '❓ Secret desconocido'
  END as estado
FROM vault.secrets
WHERE name IN ('supabase_url', 'service_role_key')
ORDER BY name;

-- PASO 5: Probar el sistema completo
DO $$
DECLARE
  test_driver_id UUID;
  test_driver_token TEXT;
  test_message_id UUID;
BEGIN
  -- Obtener el primer driver que tenga token FCM
  SELECT id, notification_token 
  INTO test_driver_id, test_driver_token
  FROM drivers
  WHERE notification_token IS NOT NULL
    AND notification_token != ''
    AND LENGTH(notification_token) > 10
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;
  
  IF test_driver_id IS NOT NULL THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🧪 PRUEBA DEL SISTEMA COMPLETO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Driver ID: %', test_driver_id;
    RAISE NOTICE 'Token FCM: %', substring(test_driver_token, 1, 50) || '...';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Insertando mensaje de prueba...';
    
    -- Insertar mensaje de prueba
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
      '🚗 Test: Notificación en segundo plano',
      'Esta es una prueba para verificar que las notificaciones push funcionan cuando la app está en segundo plano',
      false,
      jsonb_build_object(
        'ride_id', 'test-background-' || extract(epoch from now())::text,
        'action', 'driver_accept_reject',
        'test', true
      )
    ) RETURNING id INTO test_message_id;
    
    RAISE NOTICE '✅ Mensaje insertado con ID: %', test_message_id;
    RAISE NOTICE '';
    RAISE NOTICE '💡 PRÓXIMOS PASOS:';
    RAISE NOTICE '   1. Ve a Supabase Dashboard > Edge Functions > send-push-notification > Logs';
    RAISE NOTICE '   2. Debes ver una solicitud reciente (últimos 30 segundos)';
    RAISE NOTICE '   3. Si ves la solicitud, el trigger está funcionando ✅';
    RAISE NOTICE '   4. Si NO ves la solicitud, hay un problema con los secrets o pg_net';
    RAISE NOTICE '';
    RAISE NOTICE '📱 EN EL DISPOSITIVO:';
    RAISE NOTICE '   1. Pon la app en SEGUNDO PLANO (minimiza la app)';
    RAISE NOTICE '   2. Espera 5-10 segundos';
    RAISE NOTICE '   3. Debe llegar una notificación push';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '❌ ERROR: No se encontró ningún driver con notification_token válido';
  END IF;
END $$;

