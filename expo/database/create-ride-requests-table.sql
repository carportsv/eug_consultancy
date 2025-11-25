-- Script para crear la tabla ride_requests que falta
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear tabla de solicitudes de viaje
CREATE TABLE IF NOT EXISTS ride_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    origin JSONB NOT NULL, -- {address: string, coordinates: {latitude: number, longitude: number}}
    destination JSONB NOT NULL, -- {address: string, coordinates: {latitude: number, longitude: number}}
    status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
    price DECIMAL(10,2),
    distance DECIMAL(8,2), -- en metros
    duration INTEGER, -- en segundos
    cancellation_reason TEXT,
    driver_location JSONB, -- ubicación actual del conductor
    eta INTEGER, -- tiempo estimado de llegada en segundos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_ride_requests_user_id ON ride_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_driver_id ON ride_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_created_at ON ride_requests(created_at DESC);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_ride_requests_updated_at 
    BEFORE UPDATE ON ride_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Deshabilitar RLS temporalmente para pruebas
ALTER TABLE ride_requests DISABLE ROW LEVEL SECURITY;

-- Verificar que la tabla se creó correctamente
SELECT 'Tabla ride_requests creada exitosamente' as status;
SELECT COUNT(*) as total_ride_requests FROM ride_requests; 