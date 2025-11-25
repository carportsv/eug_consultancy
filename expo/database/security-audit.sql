-- =================================================================
-- |||||||||||||||||||||||||  SCRIPT DE AUDITORÍA DE SEGURIDAD  |||||||||||||||||||||||||
-- =================================================================
--
-- Propósito:
-- Este script realiza una auditoría de solo lectura de la configuración de seguridad
-- de la base de datos de Supabase. Revisa el estado de RLS, las políticas,
-- los permisos a nivel de tabla y la configuración de roles.
--
-- Cómo usar:
-- 1. Copia y pega todo el contenido en el SQL Editor de Supabase.
-- 2. Ejecuta el script.
-- 3. Revisa los resultados en el panel de salida.
--
-- =================================================================

-- Desactivar el paginador para ver todos los resultados de una vez
\pset pager off

-- =================================================================
-- SECCIÓN 1: ESTADO DE ROW-LEVEL SECURITY (RLS)
-- =================================================================
-- Revisa qué tablas tienen RLS habilitado o deshabilitado.
-- RLS es la principal capa de seguridad para el acceso a datos.
-- ¡TODA tabla con datos de usuario debería tener RLS HABILITADO!
-- =================================================================

SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity = TRUE THEN '✅ HABILITADO'
        ELSE '🚨 DESHABILITADO'
    END as rls_status
FROM
    pg_tables
WHERE
    schemaname = 'public'
ORDER BY
    tablename;

-- =================================================================
-- SECCIÓN 2: POLÍTICAS DE RLS DETALLADAS
-- =================================================================
-- Muestra todas las políticas de RLS definidas para las tablas.
-- 'qual' es la cláusula USING (para SELECT, UPDATE, DELETE).
-- 'with_check' es la cláusula WITH CHECK (para INSERT, UPDATE).
-- =================================================================

SELECT
    p.schemaname,
    p.tablename,
    p.policyname,
    p.cmd AS command,
    -- Muestra a qué roles se aplica la política
    CASE
        WHEN p.roles[1] = 'public' THEN 'Todos (incluyendo anon)'
        ELSE array_to_string(p.roles, ', ')
    END AS roles,
    p.qual AS using_expression,
    p.with_check AS check_expression
FROM
    pg_policies p
WHERE
    p.schemaname = 'public'
ORDER BY
    p.tablename, p.policyname;

-- =================================================================
-- SECCIÓN 3: PERMISOS A NIVEL DE TABLA
-- =================================================================
-- Muestra los permisos (GRANTs) para los roles clave 'anon' y 'authenticated'.
-- Estos roles no deberían tener más permisos de los necesarios.
-- Idealmente, solo los permisos que las políticas de RLS luego restringirán.
-- =================================================================

SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM
    information_schema.table_privileges
WHERE
    grantee IN ('anon', 'authenticated') AND table_schema = 'public'
ORDER BY
    grantee, table_name, privilege_type;

-- =================================================================
-- SECCIÓN 4: FUNCIONES CON `SECURITY DEFINER`
-- =================================================================
-- Lista funciones que se ejecutan con los permisos del creador (`DEFINER`),
-- no del que la invoca (`INVOKER`).
-- Estas funciones son potentes y pueden ser un riesgo de seguridad si no
-- están escritas cuidadosamente, ya que pueden saltarse las políticas de RLS.
-- =================================================================

SELECT
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_userbyid(p.proowner) as owner,
    CASE
        WHEN p.prosecdef THEN '🚨 SECURITY DEFINER'
        ELSE '✅ SECURITY INVOKER'
    END as security_type
FROM
    pg_proc p
JOIN
    pg_namespace n ON p.pronamespace = n.oid
WHERE
    n.nspname = 'public';

-- =================================================================
-- SECCIÓN 5: TABLAS EXPUESTAS EN REALTIME
-- =================================================================
-- Muestra qué tablas están publicadas a través del servicio de Realtime.
-- Asegúrate de que solo las tablas que necesitan notificaciones en
-- tiempo real estén en esta lista.
-- =================================================================

SELECT schemaname, tablename, pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';