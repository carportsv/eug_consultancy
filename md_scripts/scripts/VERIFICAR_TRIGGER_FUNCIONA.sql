-- =====================================================
-- VERIFICAR SI EL TRIGGER ESTÁ FUNCIONANDO
-- =====================================================
-- Este script verifica si el trigger está llamando
-- correctamente a la Edge Function
-- =====================================================

-- 1. Verificar que el trigger existe y está habilitado
SELECT 
  '1. TRIGGER' as verificacion,
  tgname as nombre,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Habilitado'
    ELSE '⚠️ Deshabilitado'
  END as estado
FROM pg_trigger
WHERE tgname = 'trigger_send_push_notification';

-- 2. Verificar que la función existe
SELECT 
  '2. FUNCIÓN' as verificacion,
  proname as nombre,
  CASE 
    WHEN proname = 'send_push_notification' THEN '✅ Existe'
    ELSE '❌ No encontrada'
  END as estado,
  CASE 
    WHEN prosrc LIKE '%net.http_post%' THEN '✅ Usa pg_net'
    ELSE '⚠️ No usa pg_net'
  END as usa_pg_net
FROM pg_proc
WHERE proname = 'send_push_notification';

-- 3. Verificar que pg_net está instalado
SELECT 
  '3. PG_NET' as verificacion,
  extname as nombre,
  extversion as version,
  CASE 
    WHEN extname = 'pg_net' THEN '✅ Instalado'
    ELSE '❌ No instalado'
  END as estado
FROM pg_extension
WHERE extname = 'pg_net';

-- 4. Verificar drivers con tokens FCM
SELECT 
  '4. DRIVERS CON TOKENS' as verificacion,
  COUNT(*) as total_drivers,
  COUNT(notification_token) as drivers_con_token,
  CASE 
    WHEN COUNT(notification_token) > 0 THEN '✅ Hay drivers con tokens'
    ELSE '❌ No hay drivers con tokens'
  END as estado
FROM drivers
WHERE notification_token IS NOT NULL
  AND notification_token != ''
  AND LENGTH(notification_token) > 10;

-- 5. Ver mensajes recientes
SELECT 
  '5. MENSAJES RECIENTES' as verificacion,
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
LIMIT 3;

-- 6. Instrucciones para verificar logs
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '📋 INSTRUCCIONES PARA VERIFICAR';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Ve a Supabase Dashboard > Edge Functions > send-push-notification';
  RAISE NOTICE '2. Haz clic en la pestaña "Logs"';
  RAISE NOTICE '3. Filtra por "Last hour" o "Last 24 hours"';
  RAISE NOTICE '4. Debes ver solicitudes recientes si el trigger está funcionando';
  RAISE NOTICE '';
  RAISE NOTICE 'Si NO ves logs:';
  RAISE NOTICE '   - El trigger NO está llamando a la Edge Function';
  RAISE NOTICE '   - Verifica que pg_net esté instalado';
  RAISE NOTICE '   - Verifica que la función tenga los valores correctos';
  RAISE NOTICE '';
  RAISE NOTICE 'Si VES logs pero hay errores:';
  RAISE NOTICE '   - Verifica los secrets de Firebase en Edge Functions';
  RAISE NOTICE '   - Verifica que la Edge Function esté desplegada';
  RAISE NOTICE '========================================';
END $$;

