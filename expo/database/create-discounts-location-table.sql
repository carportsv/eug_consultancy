-- Script para crear la tabla discounts_location
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear la tabla discounts_location si no existe
CREATE TABLE IF NOT EXISTS discounts_location (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_type TEXT DEFAULT 'Both',
    location TEXT NOT NULL,
    category TEXT DEFAULT 'Discount',
    price_type TEXT DEFAULT 'Amount',
    amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice en location para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_discounts_location_location ON discounts_location(location);

-- Crear índice en location_type para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_discounts_location_type ON discounts_location(location_type);

-- Verificar la estructura de la tabla
SELECT * FROM discounts_location ORDER BY created_at DESC;

