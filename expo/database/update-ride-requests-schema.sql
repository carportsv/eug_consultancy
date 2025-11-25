-- Script completo para actualizar la tabla ride_requests
-- Agrega las columnas necesarias para el flujo completo del viaje

-- Verificar y agregar columna startedAt
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ride_requests' 
        AND column_name = 'startedAt'
    ) THEN
        ALTER TABLE ride_requests ADD COLUMN startedAt TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Columna startedAt agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna startedAt ya existe';
    END IF;
END $$;

-- Verificar y agregar columna etaType
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ride_requests' 
        AND column_name = 'etaType'
    ) THEN
        ALTER TABLE ride_requests ADD COLUMN etaType TEXT;
        RAISE NOTICE 'Columna etaType agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna etaType ya existe';
    END IF;
END $$;

-- Verificar y agregar columna etaDescription
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ride_requests' 
        AND column_name = 'etaDescription'
    ) THEN
        ALTER TABLE ride_requests ADD COLUMN etaDescription TEXT;
        RAISE NOTICE 'Columna etaDescription agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna etaDescription ya existe';
    END IF;
END $$;

-- Verificar la estructura final de la tabla
SELECT 
    'ride_requests' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ride_requests' 
ORDER BY ordinal_position;

-- Mostrar estadísticas de la tabla
SELECT 
    'ride_requests' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'requested' THEN 1 END) as requested_rides,
    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_rides,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_rides,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_rides,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_rides
FROM ride_requests; 