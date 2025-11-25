-- Script para insertar datos de ejemplo en vehicle_pricing
-- Ejecutar este script en el SQL Editor de Supabase

-- Insertar los vehículos que aparecen en la interfaz
INSERT INTO vehicle_pricing (priority, vehicle_name, passengers, small_luggage, large_luggage, child_seat, price, created_at, updated_at)
VALUES
  (2, 'Sedan', 3, 3, 0, 1, 0.00, NOW(), NOW()),
  (3, 'Sedan Bussines', 3, 3, 0, 1, 20.00, NOW(), NOW()),
  (5, 'Minivan', 6, 6, 0, 2, 10.00, NOW(), NOW()),
  (6, 'Minibus', 8, 8, 0, 2, 30.00, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Verificar los registros insertados
SELECT * FROM vehicle_pricing ORDER BY priority;

