-- =====================================================
-- AGREGAR/ACTUALIZAR SECRETS A VAULT PARA EL TRIGGER
-- =====================================================
-- Este script agrega o actualiza los secrets necesarios a Vault
-- para que el trigger pueda acceder a ellos
-- =====================================================

-- Agregar o actualizar SUPABASE_URL en Vault
DO $$
BEGIN
  -- Intentar actualizar si existe
  UPDATE vault.secrets
  SET secret = 'https://wpecvlperiberbmsndlg.supabase.co'::text,
      description = 'URL de Supabase para el trigger de notificaciones push'
  WHERE name = 'supabase_url';
  
  -- Si no existe, crearlo
  IF NOT FOUND THEN
    PERFORM vault.create_secret(
      'https://wpecvlperiberbmsndlg.supabase.co',
      'supabase_url',
      'URL de Supabase para el trigger de notificaciones push'
    );
  END IF;
END $$;

-- Agregar o actualizar SERVICE_ROLE_KEY en Vault
DO $$
BEGIN
  -- Intentar actualizar si existe
  UPDATE vault.secrets
  SET secret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZWN2bHBlcmliZXJibXNuZGxnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgzNTQ0OSwiZXhwIjoyMDY3NDExNDQ5fQ.XH4m5a42BTtpeMJCuM_JrHRaOJixszvKEsKhQLDRkwo'::text,
      description = 'Service Role Key de Supabase para autenticar llamadas a Edge Functions'
  WHERE name = 'service_role_key';
  
  -- Si no existe, crearlo
  IF NOT FOUND THEN
    PERFORM vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZWN2bHBlcmliZXJibXNuZGxnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgzNTQ0OSwiZXhwIjoyMDY3NDExNDQ5fQ.XH4m5a42BTtpeMJCuM_JrHRaOJixszvKEsKhQLDRkwo',
      'service_role_key',
      'Service Role Key de Supabase para autenticar llamadas a Edge Functions'
    );
  END IF;
END $$;

-- Verificar que los secrets se crearon correctamente
SELECT 
  name,
  description,
  created_at
FROM vault.secrets
WHERE name IN ('supabase_url', 'service_role_key')
ORDER BY name;

-- =====================================================
-- NOTAS:
-- =====================================================
-- 1. Los secrets en Vault son diferentes a los secrets de Edge Functions
-- 2. Vault es para PostgreSQL, Edge Functions secrets son para Deno
-- 3. Si ya tienes los secrets en Edge Functions, necesitas agregarlos también a Vault
-- 4. Para obtener tu Service Role Key:
--    - Ve a Supabase Dashboard > Project Settings > API
--    - Copia la "service_role" key (NO la "anon" key)
-- =====================================================

