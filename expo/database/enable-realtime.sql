-- Script para habilitar Realtime en Supabase
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

-- 5. Verificar que RLS no esté bloqueando (opcional, para pruebas)
-- ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;

-- 6. Verificar configuración de la tabla drivers
SELECT 
    table_name,
    is_insertable_into,
    is_updatable,
    is_deletable
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'drivers';

-- 7. Verificar triggers en la tabla drivers (si existen)
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'drivers';

-- 8. Crear un trigger de prueba para verificar que los cambios se detectan
-- (Opcional, solo para debugging)
CREATE OR REPLACE FUNCTION log_driver_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log del cambio (para debugging)
    RAISE NOTICE 'Driver change detected: % % %', TG_OP, OLD.id, NEW.id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS driver_changes_trigger ON drivers;
CREATE TRIGGER driver_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON drivers
    FOR EACH ROW EXECUTE FUNCTION log_driver_changes();

-- 9. Verificar que el trigger se creó correctamente
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'drivers'
AND trigger_name = 'driver_changes_trigger'; 