-- Script para agregar la columna startedAt a la tabla ride_requests
-- Esta columna almacenará el timestamp cuando el conductor inicia el viaje

-- Verificar si la columna ya existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ride_requests' 
        AND column_name = 'startedAt'
    ) THEN
        -- Agregar la columna startedAt
        ALTER TABLE ride_requests 
        ADD COLUMN startedAt TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Columna startedAt agregada exitosamente a ride_requests';
    ELSE
        RAISE NOTICE 'La columna startedAt ya existe en ride_requests';
    END IF;
END $$;

-- Verificar la estructura actualizada de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ride_requests' 
ORDER BY ordinal_position;

-- Mostrar un ejemplo de la tabla actualizada
SELECT 
    'ride_requests' as table_name,
    COUNT(*) as total_records
FROM ride_requests; 