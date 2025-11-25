-- Script para registrar al driver actual
-- Ejecutar este script en el SQL Editor de Supabase

-- Insertar el driver actual (reemplaza el firebase_uid con el tuyo)
INSERT INTO drivers (
    firebase_uid,
    display_name,
    email,
    is_available,
    status,
    current_location
) VALUES (
    'PO50dbcOFVTJoiA7MouHlnTEGAV2', -- Reemplaza con tu firebase_uid
    'Conductor Demo',
    'conductor@demo.com',
    true,
    'active',
    '{"latitude": 13.7942, "longitude": -88.8965}' -- Ubicación por defecto
) ON CONFLICT (firebase_uid) 
DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    is_available = EXCLUDED.is_available,
    updated_at = NOW();

-- Verificar que el driver se registró correctamente
SELECT 
    id,
    firebase_uid,
    display_name,
    is_available,
    status,
    created_at
FROM drivers 
WHERE firebase_uid = 'PO50dbcOFVTJoiA7MouHlnTEGAV2';

-- Mostrar todos los drivers registrados
SELECT 
    id,
    firebase_uid,
    display_name,
    is_available,
    status,
    created_at
FROM drivers 
ORDER BY created_at DESC; 