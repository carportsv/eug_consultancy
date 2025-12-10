-- =====================================================
-- VERIFICACIÓN COMPLETA DEL SISTEMA
-- =====================================================
-- Ejecuta este script para verificar todo el sistema
-- =====================================================

-- 1. Verificar que los secrets están en Vault
SELECT 
  '1. SECRETS EN VAULT' as verificacion,
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

-- 2. Verificar que el trigger existe y está habilitado
SELECT 
  '2. TRIGGER' as verificacion,
  tgname as trigger_name,
  tgrelid::regclass as tabla,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Habilitado'
    WHEN tgenabled = 'D' THEN '⚠️ Deshabilitado'
    ELSE '❌ Estado desconocido'
  END as estado
FROM pg_trigger
WHERE tgname = 'trigger_send_push_notification';

-- 3. Verificar que la función existe
SELECT 
  '3. FUNCIÓN' as verificacion,
  proname as function_name,
  CASE 
    WHEN proname = 'send_push_notification' THEN '✅ Existe'
    ELSE '❌ No encontrada'
  END as estado
FROM pg_proc
WHERE proname = 'send_push_notification';

-- 4. Verificar que hay drivers con tokens FCM
SELECT 
  '4. DRIVERS CON TOKENS' as verificacion,
  COUNT(*) as total_drivers,
  COUNT(notification_token) as drivers_con_token,
  CASE 
    WHEN COUNT(notification_token) > 0 THEN '✅ Hay drivers con tokens'
    ELSE '❌ No hay drivers con tokens'
  END as estado
FROM drivers;

-- 5. Verificar que pg_net está instalado
SELECT 
  '5. PG_NET' as verificacion,
  extname as extension_name,
  extversion as version,
  CASE 
    WHEN extname = 'pg_net' THEN '✅ Instalado'
    ELSE '❌ No instalado'
  END as estado
FROM pg_extension
WHERE extname = 'pg_net';

-- =====================================================
-- PRUEBA MANUAL
-- =====================================================
-- Después de verificar todo, ejecuta este bloque para probar
DO $$
DECLARE
  test_driver_id UUID;
  test_driver_token TEXT;
  test_message_id UUID;
  total_drivers_with_token INT;
BEGIN
  -- Verificar cuántos drivers tienen tokens
  SELECT COUNT(*) INTO total_drivers_with_token
  FROM drivers
  WHERE notification_token IS NOT NULL
    AND notification_token != '';
  
  RAISE NOTICE '🔍 Drivers con tokens FCM encontrados: %', total_drivers_with_token;
  
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
    RAISE NOTICE '🧪 PRUEBA MANUAL DEL SISTEMA';
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
      '🚗 Test: Verificación completa',
      'Esta es una prueba para verificar que todo el sistema funciona correctamente',
      false,
      jsonb_build_object(
        'ride_id', 'test-verificacion-' || extract(epoch from now())::text,
        'action', 'driver_accept_reject',
        'test', true
      )
    ) RETURNING id INTO test_message_id;
    
    RAISE NOTICE '✅ Mensaje insertado con ID: %', test_message_id;
    RAISE NOTICE '';
    RAISE NOTICE '💡 PRÓXIMOS PASOS:';
    RAISE NOTICE '   1. Revisa los NOTICE messages arriba para ver los logs del trigger';
    RAISE NOTICE '   2. Ve a Supabase Dashboard > Edge Functions > send-push-notification > Logs';
    RAISE NOTICE '   3. Debes ver una solicitud reciente (últimos 30 segundos)';
    RAISE NOTICE '   4. Si NO ves logs del trigger, ejecuta: database/HABILITAR_LOGGING_TRIGGER.sql';
    RAISE NOTICE '   5. Si NO ves logs de la Edge Function, el trigger NO está llamándola';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '❌ ERROR: No se encontró ningún driver con notification_token';
    RAISE NOTICE '💡 Asegúrate de que:';
    RAISE NOTICE '   1. El driver haya iniciado sesión en la app';
    RAISE NOTICE '   2. La app haya guardado el token FCM';
  END IF;
END $$;

