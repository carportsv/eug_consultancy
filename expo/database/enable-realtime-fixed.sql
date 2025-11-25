-- Script corregido para habilitar Realtime en Supabase
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Verificar si la publicación de Realtime existe
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 2. Agregar la tabla drivers a la publicación de Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;

-- 3. Verificar que la tabla fue agregada correctamente
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'drivers';

-- 4. Verificar todas las tablas en la publicación
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 5. Verificar configuración de la tabla drivers (versión corregida)
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'drivers';

-- 6. Verificar permisos en la tabla drivers
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public'
AND table_name = 'drivers';

-- 7. Verificar que RLS esté configurado correctamente
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'drivers'; 