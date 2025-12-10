-- =====================================================
-- SCRIPT DE PRUEBA PARA NOTIFICACIONES PUSH
-- =====================================================
-- Este script:
-- 1. Obtiene un driver_id real de la tabla drivers
-- 2. Verifica que el driver tenga un notification_token
-- 3. Inserta un mensaje de prueba que activará el trigger
-- =====================================================

-- Paso 1: Ver drivers disponibles con tokens FCM
SELECT 
  id as driver_id,
  notification_token,
  CASE 
    WHEN notification_token IS NOT NULL THEN '✅ Tiene token'
    ELSE '❌ Sin token'
  END as estado_token
FROM drivers
WHERE notification_token IS NOT NULL
LIMIT 5;

-- Paso 2: Si hay drivers con token, usar el primero para la prueba
-- (Reemplaza 'DRIVER_ID_AQUI' con un driver_id real del resultado anterior)
-- O ejecuta este INSERT directamente con un driver_id que sepas que existe:

/*
INSERT INTO messages (
  driver_id, 
  type, 
  title, 
  message, 
  is_read,
  data
) VALUES (
  'DRIVER_ID_AQUI',  -- ⚠️ REEMPLAZA con un driver_id real del SELECT anterior
  'ride_request',
  '🚗 Test: Nuevo viaje asignado',
  'Este es un mensaje de prueba para verificar las notificaciones push',
  false,
  '{"ride_id": "test-ride-123", "action": "driver_accept_reject"}'::jsonb
);
*/

-- =====================================================
-- ALTERNATIVA: Script automático que usa el primer driver disponible
-- =====================================================

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
  
  -- Si encontramos un driver, insertar mensaje de prueba
  IF test_driver_id IS NOT NULL THEN
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
      '🚗 Test: Nuevo viaje asignado',
      'Este es un mensaje de prueba para verificar las notificaciones push',
      false,
      '{"ride_id": "test-ride-123", "action": "driver_accept_reject"}'::jsonb
    );
    
    RAISE NOTICE '✅ Mensaje de prueba insertado para driver: %', test_driver_id;
    RAISE NOTICE '✅ Token FCM del driver: %', LEFT(test_driver_token, 20) || '...';
  ELSE
    RAISE NOTICE '❌ No se encontró ningún driver con notification_token';
    RAISE NOTICE '💡 Asegúrate de que al menos un driver haya iniciado sesión en la app';
  END IF;
END $$;

-- =====================================================
-- VERIFICACIÓN POST-INSERCIÓN
-- =====================================================

-- Verificar que el mensaje se insertó correctamente
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
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- PRÓXIMOS PASOS
-- =====================================================
-- 1. Verifica los logs de la Edge Function:
--    Supabase Dashboard > Edge Functions > send-push-notification > Logs
--
-- 2. Verifica en el dispositivo del driver:
--    Debe llegar una notificación push
--
-- 3. Si no llega, verifica:
--    - Que los secrets estén configurados correctamente
--    - Que el trigger esté activo
--    - Que la Edge Function esté desplegada
-- =====================================================

