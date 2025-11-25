-- Script para verificar el estado actual de los viajes
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar todos los viajes en la base de datos
SELECT 
    'Todos los viajes' as info,
    COUNT(*) as total_rides
FROM ride_requests;

-- 2. Verificar viajes por estado
SELECT 
    status,
    COUNT(*) as count
FROM ride_requests 
GROUP BY status
ORDER BY count DESC;

-- 3. Verificar viajes aceptados específicamente
SELECT 
    'Viajes aceptados' as info,
    id,
    user_id,
    driver_id,
    status,
    origin->>'address' as origin_address,
    destination->>'address' as destination_address,
    created_at,
    updated_at
FROM ride_requests 
WHERE status = 'accepted'
ORDER BY created_at DESC;

-- 4. Verificar si hay viajes con el driver_id correcto
SELECT 
    'Viajes con driver_id correcto' as info,
    id,
    user_id,
    driver_id,
    status,
    origin->>'address' as origin_address,
    destination->>'address' as destination_address,
    created_at
FROM ride_requests 
WHERE driver_id = '3d8b3a72-419f-481d-9dd3-9805869fb942'
ORDER BY created_at DESC;

-- 5. Verificar el driver específico
SELECT 
    'Driver específico' as info,
    id,
    firebase_uid,
    display_name,
    is_available,
    status
FROM drivers 
WHERE id = '3d8b3a72-419f-481d-9dd3-9805869fb942';

-- 6. Verificar viajes recientes (últimas 24 horas)
SELECT 
    'Viajes recientes (últimas 24h)' as info,
    id,
    user_id,
    driver_id,
    status,
    origin->>'address' as origin_address,
    destination->>'address' as destination_address,
    created_at
FROM ride_requests 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC; 