-- Script FINAL para corregir la restricción de email en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Eliminar la restricción única existente en email
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- 2. Crear índice único condicional para email (solo para emails no nulos y no vacíos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique 
ON users (email) 
WHERE email IS NOT NULL AND email != '';

-- 3. Verificar usuarios con email vacío
SELECT 'Usuarios con email vacío:' as info;
SELECT id, firebase_uid, email, phone_number 
FROM users 
WHERE email = '';

-- 4. Actualizar usuarios con email vacío a NULL
UPDATE users 
SET email = NULL 
WHERE email = '';

-- 5. Verificar que no hay emails duplicados no nulos
SELECT 'Verificando emails duplicados:' as info;
SELECT email, COUNT(*) 
FROM users 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 6. Verificar la estructura final
SELECT 'Estructura final de la tabla users:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Verificar índices
SELECT 'Índices en la tabla users:' as info;
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'users' 
AND schemaname = 'public'; 