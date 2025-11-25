-- Script para verificar el registro del driver
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar si existe la tabla drivers
SELECT 
    table_name,
    'Tabla drivers' as status
FROM information_schema.tables 
WHERE table_name = 'drivers';

-- 2. Verificar la estructura de la tabla drivers
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'drivers'
ORDER BY ordinal_position;

-- 3. Verificar si el driver específico existe
SELECT 
    id,
    firebase_uid,
    display_name,
    is_available,
    status,
    created_at
FROM drivers 
WHERE firebase_uid = 'PO50dbcOFVTJoiA7MouHlnTEGAV2';

-- 4. Verificar todos los drivers registrados
SELECT 
    id,
    firebase_uid,
    display_name,
    is_available,
    status,
    created_at
FROM drivers 
ORDER BY created_at DESC;

-- 5. Verificar las solicitudes de viaje existentes
SELECT 
    id,
    user_id,
    driver_id,
    status,
    created_at,
    origin->>'address' as origin_address,
    destination->>'address' as destination_address,
    distance,
    duration
FROM ride_requests 
ORDER BY created_at DESC; 