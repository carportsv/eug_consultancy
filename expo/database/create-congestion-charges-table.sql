-- Script para crear la tabla congestion_charges
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear la tabla congestion_charges si no existe
CREATE TABLE IF NOT EXISTS congestion_charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caption TEXT NOT NULL,
    locations TEXT NOT NULL,
    days TEXT,
    from_time TEXT,
    to_time TEXT,
    category TEXT DEFAULT 'Surcharge',
    price_type TEXT DEFAULT 'Amount',
    amount DECIMAL(10,2) DEFAULT 0.00,
    -- Mantener 'time' y 'price' para compatibilidad con versiones anteriores
    time TEXT,
    price DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice en caption para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_congestion_charges_caption ON congestion_charges(caption);

-- Verificar la estructura de la tabla
SELECT * FROM congestion_charges ORDER BY created_at DESC;

