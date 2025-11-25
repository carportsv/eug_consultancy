-- Script para crear la tabla location_category_pricing
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear la tabla location_category_pricing si no existe
CREATE TABLE IF NOT EXISTS location_category_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice en key para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_location_category_pricing_key ON location_category_pricing(key);

-- Verificar la estructura de la tabla
SELECT * FROM location_category_pricing;

