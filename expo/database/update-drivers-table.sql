-- Script para verificar y actualizar la tabla drivers existente
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar la estructura actual de la tabla drivers
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'drivers'
ORDER BY ordinal_position;

-- 2. Verificar si la columna firebase_uid existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'drivers' 
        AND column_name = 'firebase_uid'
    ) THEN
        -- Agregar la columna firebase_uid si no existe
        ALTER TABLE drivers ADD COLUMN firebase_uid TEXT UNIQUE;
        RAISE NOTICE 'Columna firebase_uid agregada a la tabla drivers';
    ELSE
        RAISE NOTICE 'La columna firebase_uid ya existe en la tabla drivers';
    END IF;
END $$;

-- 3. Verificar si existen otras columnas necesarias y agregarlas si no
DO $$
BEGIN
    -- Agregar display_name si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'drivers' 
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE drivers ADD COLUMN display_name TEXT;
        RAISE NOTICE 'Columna display_name agregada';
    END IF;
    
    -- Agregar email si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'drivers' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE drivers ADD COLUMN email TEXT;
        RAISE NOTICE 'Columna email agregada';
    END IF;
    
    -- Agregar is_available si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'drivers' 
        AND column_name = 'is_available'
    ) THEN
        ALTER TABLE drivers ADD COLUMN is_available BOOLEAN DEFAULT true;
        RAISE NOTICE 'Columna is_available agregada';
    END IF;
    
    -- Agregar status si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'drivers' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE drivers ADD COLUMN status TEXT DEFAULT 'active';
        RAISE NOTICE 'Columna status agregada';
    END IF;
    
    -- Agregar current_location si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'drivers' 
        AND column_name = 'current_location'
    ) THEN
        ALTER TABLE drivers ADD COLUMN current_location JSONB;
        RAISE NOTICE 'Columna current_location agregada';
    END IF;
END $$;

-- 4. Verificar la estructura final
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'drivers'
ORDER BY ordinal_position;

-- 5. Mostrar los drivers existentes
SELECT 
    id,
    firebase_uid,
    display_name,
    is_available,
    status,
    created_at
FROM drivers 
ORDER BY created_at DESC; 