-- Script para corregir el estado del conductor Fred Wicket
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar estado actual
SELECT 
  d.id,
  d.is_available,
  d.status,
  d.location,
  u.display_name,
  u.email
FROM drivers d
JOIN users u ON d.user_id = u.id
WHERE u.firebase_uid = 'PO50dbcOFVTJoiA7MouHlnTEGAV2';

-- 2. Actualizar estado del conductor a disponible
UPDATE drivers 
SET 
  is_available = true,
  status = 'active',
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM users 
  WHERE firebase_uid = 'PO50dbcOFVTJoiA7MouHlnTEGAV2'
);

-- 3. Verificar cambio aplicado
SELECT 
  d.id,
  d.is_available,
  d.status,
  d.location,
  u.display_name
FROM drivers d
JOIN users u ON d.user_id = u.id
WHERE u.firebase_uid = 'PO50dbcOFVTJoiA7MouHlnTEGAV2';

-- 4. Verificar conductores disponibles
SELECT 
  d.id,
  d.is_available,
  d.status,
  u.display_name
FROM drivers d
JOIN users u ON d.user_id = u.id
WHERE d.is_available = true AND d.status = 'active'; 