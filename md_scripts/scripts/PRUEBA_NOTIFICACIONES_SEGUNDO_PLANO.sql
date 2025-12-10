-- =====================================================
-- PRUEBA DE NOTIFICACIONES EN SEGUNDO PLANO
-- =====================================================
-- Este script prueba el sistema completo de notificaciones push
-- cuando la app está en segundo plano
-- =====================================================

-- PASO 1: Verificar que el trigger está ejecutado
SELECT 
  tgname as trigger_name,
  CASE 
    WHEN tgname = 'trigger_send_push_notification' THEN '✅ Trigger existe'
    ELSE '❌ Trigger no encontrado'
  END as estado
FROM pg_trigger
WHERE tgname = 'trigger_send_push_notification';

-- PASO 2: Verificar que hay drivers con tokens FCM
SELECT 
  id as driver_id,
  notification_token,
  '✅ Tiene token' as estado
FROM drivers
WHERE notification_token IS NOT NULL
LIMIT 1;

-- PASO 3: Insertar mensaje de prueba
-- Este mensaje activará el trigger y enviará la notificación push
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
  LIMIT 1;
  
  IF test_driver_id IS NOT NULL THEN
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
      'Esta es una prueba para verificar notificaciones push cuando la app está en segundo plano. Si ves esta notificación, el sistema funciona correctamente.',
      false,
      jsonb_build_object(
        'ride_id', 'test-ride-background-' || extract(epoch from now())::text,
        'action', 'driver_accept_reject',
        'test', true
      )
    ) RETURNING id INTO test_message_id;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MENSAJE DE PRUEBA INSERTADO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Driver ID: %', test_driver_id;
    RAISE NOTICE 'Message ID: %', test_message_id;
    RAISE NOTICE 'Token FCM: %', substring(test_driver_token, 1, 50) || '...';
    RAISE NOTICE '';
    RAISE NOTICE '💡 PRÓXIMOS PASOS:';
    RAISE NOTICE '   1. Pon la app en SEGUNDO PLANO (minimiza la app)';
    RAISE NOTICE '   2. Espera 5-10 segundos';
    RAISE NOTICE '   3. Debe llegar una notificación push al dispositivo';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VERIFICAR LOGS:';
    RAISE NOTICE '   Supabase Dashboard > Edge Functions > send-push-notification > Logs';
    RAISE NOTICE '   Debes ver:';
    RAISE NOTICE '   - Solicitud recibida';
    RAISE NOTICE '   - Token de acceso OAuth obtenido';
    RAISE NOTICE '   - Notificación enviada a FCM';
    RAISE NOTICE '   - Respuesta exitosa';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '❌ ERROR: No se encontró ningún driver con notification_token';
    RAISE NOTICE '💡 Asegúrate de que:';
    RAISE NOTICE '   1. El driver haya iniciado sesión en la app';
    RAISE NOTICE '   2. La app haya guardado el token FCM';
    RAISE NOTICE '   3. El token esté en la tabla drivers';
  END IF;
END $$;

-- PASO 4: Verificar que el mensaje se insertó
SELECT 
  id,
  driver_id,
  type,
  title,
  message,
  is_read,
  created_at
FROM messages
WHERE type = 'ride_request'
  AND title LIKE '%Test: Notificación en segundo plano%'
ORDER BY created_at DESC
LIMIT 1;

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================
-- Si la notificación NO llega, verifica:

-- 1. ¿El trigger está ejecutado?
--    Ejecuta: SELECT * FROM pg_trigger WHERE tgname = 'trigger_send_push_notification';

-- 2. ¿La Edge Function está desplegada?
--    Ve a: Supabase Dashboard > Edge Functions > send-push-notification

-- 3. ¿Los secrets están configurados?
--    Ve a: Supabase Dashboard > Edge Functions > send-push-notification > Secrets
--    Debe tener: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL

-- 4. ¿Los logs de la Edge Function muestran errores?
--    Ve a: Supabase Dashboard > Edge Functions > send-push-notification > Logs

-- 5. ¿El dispositivo tiene conexión a internet?
--    Las notificaciones push requieren conexión a internet

-- 6. ¿La app tiene permisos de notificaciones?
--    Verifica en la configuración del dispositivo

