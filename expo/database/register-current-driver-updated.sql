-- Script para registrar al driver actual (versión actualizada)
-- Ejecutar este script en el SQL Editor de Supabase DESPUÉS de ejecutar update-drivers-table.sql

-- Insertar o actualizar el driver actual
INSERT INTO drivers (
    firebase_uid,
    display_name,
    email,
    is_available,
    status,
    current_location
) VALUES (
    'PO50dbcOFVTJoiA7MouHlnTEGAV2', -- Reemplaza con tu firebase_uid real
    'Conductor Demo',
    'conductor@demo.com',
    true,
    'active',
    '{"latitude": 13.7942, "longitude": -88.8965}' -- Ubicación por defecto
) ON CONFLICT (firebase_uid) 
DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    is_available = EXCLUDED.is_available,
    status = EXCLUDED.status,
    current_location = EXCLUDED.current_location,
    updated_at = NOW();

-- Verificar que el driver se registró correctamente
SELECT 
    id,
    firebase_uid,
    display_name,
    email,
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

-- Verificar que el driver puede ser usado para aceptar viajes
SELECT 
    'Driver registrado y listo para aceptar viajes' as status,
    COUNT(*) as total_drivers_available
FROM drivers 
WHERE is_available = true AND status = 'active'; 