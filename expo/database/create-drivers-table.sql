-- Script para crear la tabla drivers
-- Ejecutar este script en el SQL Editor de Supabase

-- Verificar si la tabla drivers existe y crearla si no
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'drivers') THEN
        -- Crear tabla de conductores
        CREATE TABLE drivers (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            firebase_uid TEXT UNIQUE NOT NULL,
            display_name TEXT,
            email TEXT,
            phone TEXT,
            vehicle_info JSONB, -- {model: string, plate: string, color: string}
            is_available BOOLEAN DEFAULT true,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
            current_location JSONB, -- {latitude: number, longitude: number}
            rating DECIMAL(3,2) DEFAULT 0.0,
            total_rides INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Crear índices para mejorar el rendimiento
        CREATE INDEX idx_drivers_firebase_uid ON drivers(firebase_uid);
        CREATE INDEX idx_drivers_is_available ON drivers(is_available);
        CREATE INDEX idx_drivers_status ON drivers(status);
        CREATE INDEX idx_drivers_created_at ON drivers(created_at DESC);
        
        -- Crear trigger para actualizar updated_at
        CREATE TRIGGER update_drivers_updated_at 
            BEFORE UPDATE ON drivers 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        
        -- Deshabilitar RLS temporalmente para pruebas
        ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Tabla drivers creada exitosamente';
    ELSE
        RAISE NOTICE 'La tabla drivers ya existe';
    END IF;
END $$;

-- Verificar la estructura de la tabla drivers
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'drivers'
ORDER BY ordinal_position;

-- Verificar si hay drivers registrados
SELECT 
    COUNT(*) as total_drivers,
    'Tabla drivers verificada' as status
FROM drivers; 