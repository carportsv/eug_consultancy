-- =====================================================
-- VERIFICAR POR QUÉ NO HAY LOGS EN LA EDGE FUNCTION
-- =====================================================
-- Este script verifica todos los componentes necesarios
-- para que el trigger llame a la Edge Function
-- =====================================================

-- 1. Verificar que los secrets están en Vault y son accesibles
DO $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. VERIFICANDO SECRETS EN VAULT';
  RAISE NOTICE '========================================';
  
  -- Intentar obtener desde vault
  BEGIN
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url'
    LIMIT 1;
    
    IF supabase_url IS NOT NULL THEN
      RAISE NOTICE '✅ Supabase URL encontrada: %', supabase_url;
    ELSE
      RAISE NOTICE '❌ Supabase URL NO encontrada en Vault';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error accediendo a Vault para supabase_url: %', SQLERRM;
  END;
  
  BEGIN
    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name IN ('service_role_key', 'SUPABASE_SERVICE_ROLE_KEY', 'service_role')
    LIMIT 1;
    
    IF service_role_key IS NOT NULL THEN
      RAISE NOTICE '✅ Service Role Key encontrada (longitud: %)', LENGTH(service_role_key);
    ELSE
      RAISE NOTICE '❌ Service Role Key NO encontrada en Vault';
      RAISE NOTICE '💡 Ejecuta: database/AGREGAR_SECRETS_VAULT.sql';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error accediendo a Vault para service_role_key: %', SQLERRM;
  END;
  
  RAISE NOTICE '========================================';
END $$;

-- 2. Verificar que el trigger está habilitado
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

-- 3. Verificar que la función tiene el código correcto
SELECT 
  '3. FUNCIÓN' as verificacion,
  proname as function_name,
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

-- 4. Verificar que pg_net está instalado
SELECT 
  '4. PG_NET' as verificacion,
  extname as extension_name,
  extversion as version,
  CASE 
    WHEN extname = 'pg_net' THEN '✅ Instalado'
    ELSE '❌ No instalado'
  END as estado
FROM pg_extension
WHERE extname = 'pg_net';

-- 5. Probar manualmente la llamada HTTP
DO $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
  test_result TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '5. PRUEBA MANUAL DE LLAMADA HTTP';
  RAISE NOTICE '========================================';
  
  -- Obtener secrets
  BEGIN
    SELECT decrypted_secret INTO supabase_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_url'
    LIMIT 1;
    
    IF supabase_url IS NULL THEN
      supabase_url := 'https://wpecvlperiberbmsndlg.supabase.co';
    END IF;
    
    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name IN ('service_role_key', 'SUPABASE_SERVICE_ROLE_KEY')
    LIMIT 1;
    
    IF service_role_key IS NULL THEN
      RAISE NOTICE '❌ Service Role Key no encontrada. No se puede probar la llamada HTTP.';
      RAISE NOTICE '💡 Ejecuta: database/AGREGAR_SECRETS_VAULT.sql';
      RETURN;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error obteniendo secrets: %', SQLERRM;
      RETURN;
  END;
  
  RAISE NOTICE '📡 Intentando llamar a Edge Function...';
  RAISE NOTICE 'URL: %/functions/v1/send-push-notification', supabase_url;
  
  BEGIN
    -- Intentar hacer una llamada HTTP de prueba
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'token', 'test-token',
        'title', 'Test desde SQL',
        'body', 'Esta es una prueba manual de la llamada HTTP',
        'data', jsonb_build_object('test', true)
      )
    ) INTO request_id;
    
    RAISE NOTICE '✅ Llamada HTTP exitosa. Request ID: %', request_id;
    RAISE NOTICE '💡 Ahora verifica los logs de la Edge Function';
    RAISE NOTICE '   Debe aparecer una solicitud con error 400 (token inválido, pero la llamada llegó)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ ERROR al hacer llamada HTTP: %', SQLERRM;
      RAISE NOTICE '💡 Esto indica que hay un problema con pg_net o la configuración';
  END;
  
  RAISE NOTICE '========================================';
END $$;

-- 6. Verificar el último mensaje insertado
SELECT 
  '6. ÚLTIMO MENSAJE' as verificacion,
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

