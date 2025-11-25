-- Script para crear la tabla distance_slab
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear la tabla distance_slab si no existe
CREATE TABLE IF NOT EXISTS distance_slab (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_distance INTEGER NOT NULL,
    end_distance INTEGER NOT NULL,
    sedan DECIMAL(10,2) DEFAULT 0.00,
    sedan_business DECIMAL(10,2) DEFAULT 0.00,
    minivan DECIMAL(10,2) DEFAULT 0.00,
    minibus DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice en start_distance para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_distance_slab_start_distance ON distance_slab(start_distance);

-- Verificar la estructura de la tabla
SELECT * FROM distance_slab ORDER BY start_distance;

