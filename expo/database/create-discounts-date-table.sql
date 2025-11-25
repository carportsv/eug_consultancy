-- Script para crear la tabla discounts_date
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear la tabla discounts_date si no existe
CREATE TABLE IF NOT EXISTS discounts_date (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caption TEXT NOT NULL,
    recurring BOOLEAN DEFAULT false,
    from_date DATE,
    to_date DATE,
    category TEXT DEFAULT 'Discount',
    price_type TEXT DEFAULT 'Amount',
    amount DECIMAL(10,2) DEFAULT 0.00,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice en caption para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_discounts_date_caption ON discounts_date(caption);

-- Crear índice en status para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_discounts_date_status ON discounts_date(status);

-- Verificar la estructura de la tabla
SELECT * FROM discounts_date ORDER BY created_at DESC;

