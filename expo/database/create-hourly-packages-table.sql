-- Script para crear la tabla hourly_packages
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear la tabla hourly_packages si no existe
CREATE TABLE IF NOT EXISTS hourly_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distance INTEGER NOT NULL,
    hours INTEGER NOT NULL,
    sedan DECIMAL(10,2) DEFAULT 0.00,
    sedan_business DECIMAL(10,2) DEFAULT 0.00,
    minivan DECIMAL(10,2) DEFAULT 0.00,
    minibus DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice en distance y hours para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_hourly_packages_distance ON hourly_packages(distance);
CREATE INDEX IF NOT EXISTS idx_hourly_packages_hours ON hourly_packages(hours);

-- Verificar la estructura de la tabla
SELECT * FROM hourly_packages ORDER BY distance, hours;

