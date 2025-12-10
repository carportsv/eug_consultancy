-- =====================================================
-- VERIFICAR TRIGGER Y EDGE FUNCTION
-- =====================================================
-- Este script verifica que el trigger esté ejecutado
-- y que todo esté listo para enviar notificaciones push
-- =====================================================

-- 1. Verificar que el trigger existe y está habilitado
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Habilitado'
    WHEN tgenabled = 'D' THEN '⚠️ Deshabilitado'
    ELSE '❓ Estado desconocido'
  END as estado,
  pg_get_triggerdef(oid) as definicion
FROM pg_trigger
WHERE tgname = 'trigger_send_push_notification';

-- 2. Verificar que la función existe
SELECT 
  proname as function_name,
  CASE 
    WHEN proname = 'send_push_notification' THEN '✅ Función existe'
    ELSE '❌ Función no encontrada'
  END as estado,
  prosrc as codigo_fuente
FROM pg_proc
WHERE proname = 'send_push_notification';

-- 3. Verificar que los secrets están en Vault
SELECT 
  name,
  description,
  created_at,
  CASE 
    WHEN name = 'supabase_url' THEN '✅ URL configurada'
    WHEN name = 'service_role_key' THEN '✅ Service Role Key configurada'
    ELSE '❓ Secret desconocido'
  END as estado
FROM vault.secrets
WHERE name IN ('supabase_url', 'service_role_key')
ORDER BY name;

-- 4. Verificar drivers con tokens FCM
SELECT 
  id,
  notification_token,
  CASE 
    WHEN notification_token IS NOT NULL THEN '✅ Tiene token'
    ELSE '❌ Sin token'
  END as estado
FROM drivers
WHERE notification_token IS NOT NULL
LIMIT 5;

-- =====================================================
-- PRUEBA MANUAL DEL TRIGGER
-- =====================================================
-- Si todo está ✅, ejecuta este bloque para probar:
-- (Reemplaza 'DRIVER_ID_AQUI' con un driver_id real)

/*
DO $$
DECLARE
  test_driver_id UUID;
  test_driver_token TEXT;
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
      'Esta es una prueba para verificar notificaciones push en segundo plano',
      false,
      '{"ride_id": "test-ride-background", "action": "driver_accept_reject"}'::jsonb
    );
    
    RAISE NOTICE '✅ Mensaje de prueba insertado para driver: %', test_driver_id;
    RAISE NOTICE '💡 Ahora:';
    RAISE NOTICE '   1. Pon la app en segundo plano';
    RAISE NOTICE '   2. Verifica los logs de la Edge Function';
    RAISE NOTICE '   3. Verifica que llegó la notificación push';
  ELSE
    RAISE NOTICE '❌ No se encontró ningún driver con notification_token';
  END IF;
END $$;
*/

-- =====================================================
-- VERIFICAR LOGS RECIENTES
-- =====================================================
-- Ver mensajes recientes insertados
SELECT 
  id,
  driver_id,
  type,
  title,
  is_read,
  created_at
FROM messages
WHERE type = 'ride_request'
ORDER BY created_at DESC
LIMIT 10;

