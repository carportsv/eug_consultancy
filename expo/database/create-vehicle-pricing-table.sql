-- Script para crear la tabla vehicle_pricing e insertar datos iniciales
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear la tabla vehicle_pricing si no existe
CREATE TABLE IF NOT EXISTS vehicle_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    priority INTEGER NOT NULL,
    vehicle_name TEXT NOT NULL,
    passengers INTEGER DEFAULT 0,
    small_luggage INTEGER DEFAULT 0,
    large_luggage INTEGER DEFAULT 0,
    child_seat INTEGER DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice en priority para ordenamiento rápido
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_priority ON vehicle_pricing(priority);

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

