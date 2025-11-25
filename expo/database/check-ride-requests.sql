-- Script para verificar y crear la tabla ride_requests si no existe
-- Ejecutar este script en el SQL Editor de Supabase

-- Verificar si la tabla existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ride_requests') THEN
        -- Crear tabla de solicitudes de viaje
        CREATE TABLE ride_requests (
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
        CREATE INDEX idx_ride_requests_user_id ON ride_requests(user_id);
        CREATE INDEX idx_ride_requests_driver_id ON ride_requests(driver_id);
        CREATE INDEX idx_ride_requests_status ON ride_requests(status);
        CREATE INDEX idx_ride_requests_created_at ON ride_requests(created_at DESC);

        -- Crear trigger para actualizar updated_at
        CREATE TRIGGER update_ride_requests_updated_at 
            BEFORE UPDATE ON ride_requests 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();

        -- Deshabilitar RLS temporalmente para pruebas
        ALTER TABLE ride_requests DISABLE ROW LEVEL SECURITY;

        RAISE NOTICE 'Tabla ride_requests creada exitosamente';
    ELSE
        RAISE NOTICE 'La tabla ride_requests ya existe';
    END IF;
END $$;

-- Verificar que la tabla existe y mostrar información
SELECT 
    'ride_requests' as table_name,
    COUNT(*) as total_records,
    'Tabla verificada' as status
FROM ride_requests; 