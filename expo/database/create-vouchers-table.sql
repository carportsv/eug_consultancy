-- Script para crear la tabla vouchers
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear la tabla vouchers si no existe
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher TEXT NOT NULL UNIQUE,
    quantity INTEGER DEFAULT 0,
    applicable TEXT,
    validity DATE,
    discount_type TEXT DEFAULT 'Amount',
    discount_value DECIMAL(10,2) DEFAULT 0.00,
    applied INTEGER DEFAULT 0,
    used INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice en voucher para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_vouchers_voucher ON vouchers(voucher);

-- Crear índice en status para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- Verificar la estructura de la tabla
SELECT * FROM vouchers ORDER BY created_at DESC;

