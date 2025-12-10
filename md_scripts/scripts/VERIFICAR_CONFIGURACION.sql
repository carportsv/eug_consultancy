-- =====================================================
-- SCRIPT DE VERIFICACIÓN COMPLETA
-- =====================================================
-- Este script verifica que todo esté configurado correctamente
-- =====================================================

-- 1. Verificar que los secrets están en Vault
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

-- 2. Verificar que el trigger existe
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE 
    WHEN tgenabled = 'O' THEN '✅ Habilitado'
    WHEN tgenabled = 'D' THEN '⚠️ Deshabilitado'
    ELSE '❓ Estado desconocido'
  END as estado
FROM pg_trigger
WHERE tgname = 'trigger_send_push_notification';

-- 3. Verificar que la función existe
SELECT 
  proname as function_name,
  CASE 
    WHEN proname = 'send_push_notification' THEN '✅ Función existe'
    ELSE '❌ Función no encontrada'
  END as estado
FROM pg_proc
WHERE proname = 'send_push_notification';

-- 4. Verificar que hay drivers con notification_token
SELECT 
  COUNT(*) as total_drivers,
  COUNT(notification_token) as drivers_con_token,
  CASE 
    WHEN COUNT(notification_token) > 0 THEN '✅ Hay drivers con token FCM'
    ELSE '⚠️ No hay drivers con token FCM - La app debe guardar tokens al iniciar sesión'
  END as estado
FROM drivers;

-- 5. Verificar que pg_net está instalado
SELECT 
  extname as extension_name,
  extversion as version,
  CASE 
    WHEN extname = 'pg_net' THEN '✅ pg_net instalado'
    ELSE '❌ pg_net no instalado'
  END as estado
FROM pg_extension
WHERE extname = 'pg_net';

-- =====================================================
-- RESUMEN
-- =====================================================
-- Si todos los checks muestran ✅, el sistema está listo
-- Si hay ⚠️ o ❌, revisa la configuración correspondiente
-- =====================================================

