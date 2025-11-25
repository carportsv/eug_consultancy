-- Script para corregir la restricción de email en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Eliminar la restricción única existente en email (si existe)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- 2. Crear índice único condicional para email (solo para emails no nulos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique 
ON users (email) 
WHERE email IS NOT NULL;

-- 3. Verificar que no hay emails duplicados no nulos
SELECT email, COUNT(*) 
FROM users 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 4. Si hay duplicados, mantener solo el más reciente
-- (Este paso es opcional, ejecutar solo si hay duplicados)
-- DELETE FROM users 
-- WHERE id NOT IN (
--   SELECT MAX(id) 
--   FROM users 
--   WHERE email IS NOT NULL 
--   GROUP BY email
-- );

-- 5. Verificar la estructura final
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position; 