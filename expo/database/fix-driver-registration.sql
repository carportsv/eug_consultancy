-- Script para registrar correctamente al driver
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Primero, verificar qué firebase_uid está usando el usuario
SELECT 
    'Firebase UID del usuario actual' as info,
    'PO50dbcOFVTJoiA7MouHlnTEGAV2' as firebase_uid;

-- 2. Verificar si ya existe un driver con este firebase_uid
SELECT 
    id,
    firebase_uid,
    display_name,
    is_available,
    status,
    created_at
FROM drivers 
WHERE firebase_uid = 'PO50dbcOFVTJoiA7MouHlnTEGAV2';

-- 3. Si no existe, crear el driver con el firebase_uid correcto
INSERT INTO drivers (
    firebase_uid,
    display_name,
    email,
    is_available,
    status,
    current_location
) VALUES (
    'PO50dbcOFVTJoiA7MouHlnTEGAV2',
    'Fred Wicket',
    'fred.wicket.us@gmail.com',
    true,
    'active',
    '{"latitude": 32.9342203, "longitude": -96.8076086}'
) ON CONFLICT (firebase_uid) 
DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    is_available = EXCLUDED.is_available,
    status = EXCLUDED.status,
    current_location = EXCLUDED.current_location,
    updated_at = NOW();

-- 4. Verificar que el driver se registró correctamente
SELECT 
    'Driver registrado exitosamente' as status,
    id,
    firebase_uid,
    display_name,
    is_available,
    status as driver_status
FROM drivers 
WHERE firebase_uid = 'PO50dbcOFVTJoiA7MouHlnTEGAV2';

-- 5. Mostrar todos los drivers disponibles
SELECT 
    'Todos los drivers disponibles' as info,
    COUNT(*) as total_drivers
FROM drivers 
WHERE is_available = true AND status = 'active';

-- 6. Verificar que el driver_id existe y puede ser usado
SELECT 
    'Driver ID para usar en ride_requests' as info,
    id as driver_id,
    firebase_uid,
    display_name
FROM drivers 
WHERE firebase_uid = 'PO50dbcOFVTJoiA7MouHlnTEGAV2'; 