-- =====================================================
-- DEBUG: Verificar Trigger y Edge Function
-- =====================================================
-- Este script ayuda a diagnosticar por qué las notificaciones
-- no llegan cuando la app está en segundo plano
-- =====================================================

-- 1. Verificar que el trigger existe y está habilitado
SELECT 
  '1. TRIGGER' as verificacion,
  tgname as trigger_name,
  tgrelid::regclass as tabla,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Habilitado'
    WHEN tgenabled = 'D' THEN '⚠️ Deshabilitado'
    ELSE '❌ Estado desconocido'
  END as estado
FROM pg_trigger
WHERE tgname = 'trigger_send_push_notification';

-- 2. Verificar que la función existe
SELECT 
  '2. FUNCIÓN' as verificacion,
  proname as function_name,
  CASE 
    WHEN proname = 'send_push_notification' THEN '✅ Existe'
    ELSE '❌ No encontrada'
  END as estado
FROM pg_proc
WHERE proname = 'send_push_notification';

-- 3. Verificar que hay drivers con tokens FCM
SELECT 
  '3. DRIVERS CON TOKENS' as verificacion,
  COUNT(*) as total_drivers,
  COUNT(notification_token) as drivers_con_token,
  CASE 
    WHEN COUNT(notification_token) > 0 THEN '✅ Hay drivers con tokens'
    ELSE '❌ No hay drivers con tokens'
  END as estado
FROM drivers;

-- 4. Verificar secrets en Vault
SELECT 
  '4. SECRETS EN VAULT' as verificacion,
  name,
  CASE 
    WHEN name = 'supabase_url' THEN '✅ URL configurada'
    WHEN name = 'service_role_key' THEN '✅ Service Role Key configurada'
    ELSE '❓ Secret desconocido'
  END as estado,
  created_at
FROM vault.secrets
WHERE name IN ('supabase_url', 'service_role_key')
ORDER BY name;

-- 5. Ver mensajes recientes insertados
SELECT 
  '5. MENSAJES RECIENTES' as verificacion,
  id,
  driver_id,
  type,
  title,
  is_read,
  created_at,
  CASE 
    WHEN created_at > NOW() - INTERVAL '5 minutes' THEN '✅ Reciente'
    ELSE '⏰ Antiguo'
  END as estado
FROM messages
WHERE type = 'ride_request'
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- PRUEBA MANUAL DEL TRIGGER
-- =====================================================
-- Este bloque inserta un mensaje de prueba y muestra
-- información de debug
DO $$
DECLARE
  test_driver_id UUID;
  test_driver_token TEXT;
  test_message_id UUID;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Obtener el primer driver que tenga token FCM
  SELECT id, notification_token 
  INTO test_driver_id, test_driver_token
  FROM drivers
  WHERE notification_token IS NOT NULL
  LIMIT 1;
  
  IF test_driver_id IS NOT NULL THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🧪 PRUEBA MANUAL DEL TRIGGER';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Driver ID: %', test_driver_id;
    RAISE NOTICE 'Token FCM: %', substring(test_driver_token, 1, 50) || '...';
    
    -- Verificar secrets
    BEGIN
      SELECT decrypted_secret INTO supabase_url
      FROM vault.decrypted_secrets
      WHERE name = 'supabase_url'
      LIMIT 1;
      
      SELECT decrypted_secret INTO service_role_key
      FROM vault.decrypted_secrets
      WHERE name IN ('service_role_key', 'SUPABASE_SERVICE_ROLE_KEY')
      LIMIT 1;
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
    
    IF supabase_url IS NOT NULL THEN
      RAISE NOTICE '✅ Supabase URL encontrada en Vault';
    ELSE
      RAISE NOTICE '⚠️ Supabase URL NO encontrada en Vault';
    END IF;
    
    IF service_role_key IS NOT NULL THEN
      RAISE NOTICE '✅ Service Role Key encontrada en Vault';
    ELSE
      RAISE NOTICE '❌ Service Role Key NO encontrada en Vault';
      RAISE NOTICE '💡 Esto impedirá que el trigger llame a la Edge Function';
    END IF;
    
    -- Insertar mensaje de prueba
    RAISE NOTICE '';
    RAISE NOTICE '📝 Insertando mensaje de prueba...';
    
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
      '🚗 Test: Debug de notificaciones',
      'Esta es una prueba para verificar que el trigger funciona correctamente',
      false,
      jsonb_build_object(
        'ride_id', 'test-debug-' || extract(epoch from now())::text,
        'action', 'driver_accept_reject',
        'test', true
      )
    ) RETURNING id INTO test_message_id;
    
    RAISE NOTICE '✅ Mensaje insertado con ID: %', test_message_id;
    RAISE NOTICE '';
    RAISE NOTICE '💡 PRÓXIMOS PASOS:';
    RAISE NOTICE '   1. Ve a Supabase Dashboard > Edge Functions > send-push-notification > Logs';
    RAISE NOTICE '   2. Debes ver una solicitud reciente (últimos 30 segundos)';
    RAISE NOTICE '   3. Si NO ves logs, el trigger NO está llamando a la Edge Function';
    RAISE NOTICE '   4. Si ves errores, comparte el mensaje de error';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '❌ ERROR: No se encontró ningún driver con notification_token';
    RAISE NOTICE '💡 Asegúrate de que:';
    RAISE NOTICE '   1. El driver haya iniciado sesión en la app';
    RAISE NOTICE '   2. La app haya guardado el token FCM';
  END IF;
END $$;

-- 6. Verificar el último mensaje insertado
SELECT 
  '6. ÚLTIMO MENSAJE INSERTADO' as verificacion,
  id,
  driver_id,
  type,
  title,
  created_at,
  CASE 
    WHEN created_at > NOW() - INTERVAL '1 minute' THEN '✅ Muy reciente'
    WHEN created_at > NOW() - INTERVAL '5 minutes' THEN '⏰ Reciente'
    ELSE '⏰ Antiguo'
  END as estado
FROM messages
WHERE type = 'ride_request'
ORDER BY created_at DESC
LIMIT 1;

