-- =====================================================
-- PRUEBA SIMPLE DE NOTIFICACIONES PUSH
-- =====================================================
-- Este script es más simple y directo para probar
-- =====================================================

-- 1. Verificar drivers con tokens
SELECT 
  id,
  notification_token,
  updated_at,
  CASE 
    WHEN notification_token IS NOT NULL AND notification_token != '' THEN '✅ Tiene token'
    ELSE '❌ Sin token'
  END as estado
FROM drivers
WHERE notification_token IS NOT NULL
  AND notification_token != ''
ORDER BY updated_at DESC NULLS LAST, created_at DESC
LIMIT 5;

-- 2. Insertar mensaje de prueba
DO $$
DECLARE
  test_driver_id UUID;
  test_driver_token TEXT;
  test_message_id UUID;
BEGIN
  -- Obtener el primer driver que tenga token FCM (el más reciente)
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
    RAISE NOTICE '🧪 PRUEBA DE NOTIFICACIÓN PUSH';
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
      '🚗 Test: Notificación push',
      'Esta es una prueba de notificación push. Si ves esta notificación, el sistema funciona correctamente.',
      false,
      jsonb_build_object(
        'ride_id', 'test-push-' || extract(epoch from now())::text,
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
    RAISE NOTICE '   4. Si NO ves logs del trigger, ejecuta: database/HABILITAR_LOGGING_TRIGGER.sql primero';
    RAISE NOTICE '   5. Si NO ves logs de la Edge Function, el trigger NO está llamándola';
    RAISE NOTICE '';
    RAISE NOTICE '📱 EN EL DISPOSITIVO:';
    RAISE NOTICE '   1. Pon la app en SEGUNDO PLANO (minimiza la app)';
    RAISE NOTICE '   2. Espera 5-10 segundos';
    RAISE NOTICE '   3. Debe llegar una notificación push';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '❌ ERROR: No se encontró ningún driver con notification_token válido';
    RAISE NOTICE '';
    RAISE NOTICE '💡 SOLUCIÓN:';
    RAISE NOTICE '   1. Asegúrate de que la app esté ejecutándose';
    RAISE NOTICE '   2. El driver debe haber iniciado sesión';
    RAISE NOTICE '   3. La app guarda automáticamente el token cuando el driver inicia sesión';
    RAISE NOTICE '   4. Verifica los logs de la app para ver: "✅ Token FCM guardado para driver"';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Para verificar drivers con tokens, ejecuta:';
    RAISE NOTICE '   SELECT id, notification_token FROM drivers WHERE notification_token IS NOT NULL;';
  END IF;
END $$;

-- 3. Verificar el último mensaje insertado
SELECT 
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

