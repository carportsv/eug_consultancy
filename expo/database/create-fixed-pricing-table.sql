-- Script para crear la tabla fixed_pricing e insertar datos iniciales
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear la tabla fixed_pricing si no existe
CREATE TABLE IF NOT EXISTS fixed_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pick_up TEXT NOT NULL,
    drop_off TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice en pick_up y drop_off para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_fixed_pricing_pick_up ON fixed_pricing(pick_up);
CREATE INDEX IF NOT EXISTS idx_fixed_pricing_drop_off ON fixed_pricing(drop_off);

-- Insertar los registros de precios fijos
INSERT INTO fixed_pricing (pick_up, drop_off, price, created_at, updated_at)
VALUES
  ('AEROPORTO DI CATANIA', 'Taormina Z', 90.00, NOW(), NOW()),
  ('AEROPORTO DI CATANIA', 'SIRACUSA', 100.00, NOW(), NOW()),
  ('Aeroporto Linate Z', 'Milano Centro Z', 80.00, NOW(), NOW()),
  ('Aeroporto Roma Fiumicino Z', 'Roma Citta Z', 70.00, NOW(), NOW()),
  ('ALGHERO CENTRO', 'Alghero-Fertilia Airport (AHO) Z', 60.00, NOW(), NOW()),
  ('Alghero-Fertilia Airport (AHO) Z', 'ALGHERO CENTRO', 60.00, NOW(), NOW()),
  ('Ancona Centro Z', 'Ancona Falconara Airport (AOI) Z', 60.00, NOW(), NOW()),
  ('Ancona Falconara Airport (AOI) Z', 'Ancona Centro Z', 60.00, NOW(), NOW()),
  ('Bologna Centro Z', 'Bologna Guglielmo Marconi Airport (BLQ) Z', 70.00, NOW(), NOW()),
  ('Bologna Guglielmo Marconi Airport (BLQ) Z', 'Bologna Centro Z', 70.00, NOW(), NOW()),
  ('Cagliari Centro Z', 'Cagliari Elmas Airport (CAG) Z', 70.00, NOW(), NOW()),
  ('Cagliari Elmas Airport (CAG) Z', 'Cagliari Centro Z', 70.00, NOW(), NOW()),
  ('Catania Aeroporto Z', 'Siracusa Citta', 100.00, NOW(), NOW()),
  ('Catania Aeroporto Z', 'Taormina Z', 100.00, NOW(), NOW()),
  ('Catania Aeroporto Z', 'CATANIA CENTRO', 50.00, NOW(), NOW()),
  ('Catania Aeroporto Z', 'Milazzo Porto Z', 280.00, NOW(), NOW()),
  ('Catania Aeroporto Z', 'MANGIA''S BRUCOLI', 100.00, NOW(), NOW()),
  ('Catania Aeroporto Z', 'Comiso Airport (CIY) Z', 200.00, NOW(), NOW()),
  ('CATANIA CENTRO', 'Catania Aeroporto Z', 50.00, NOW(), NOW()),
  ('Ciampino-G. B. Pastine International Airport (CIA) Z', 'Roma Citta Z', 70.00, NOW(), NOW()),
  ('Comiso Airport (CIY) Z', 'Catania Aeroporto Z', 200.00, NOW(), NOW()),
  ('Falcone Borsellino Airport (PMO) Z', 'Palermo Centro Z', 60.00, NOW(), NOW()),
  ('Federico Fellini International Airport (RMI) Z', 'Rimini Centro Z', 80.00, NOW(), NOW()),
  ('Firenze Aeroporto Z', 'Firenze Centro Z', 100.00, NOW(), NOW()),
  ('Firenze Centro Z', 'Firenze Aeroporto Z', 100.00, NOW(), NOW()),
  ('Genoa Cristoforo Colombo Airport (GOA) Z', 'Genova Centro Z', 90.00, NOW(), NOW()),
  ('Genova Centro Z', 'Genoa Cristoforo Colombo Airport (GOA) Z', 90.00, NOW(), NOW()),
  ('Il Caravaggio International Airport (BGY) Z', 'Milano Centro Z', 180.00, NOW(), NOW()),
  ('Malpensa International Airport (MXP) Z', 'Milano Centro Z', 160.00, NOW(), NOW()),
  ('MANGIA''S BRUCOLI', 'Catania Aeroporto Z', 100.00, NOW(), NOW()),
  ('Milano Centro Z', 'Il Caravaggio International Airport (BGY) Z', 180.00, NOW(), NOW()),
  ('Milano Centro Z', 'Malpensa International Airport (MXP) Z', 160.00, NOW(), NOW()),
  ('Milano Centro Z', 'Aeroporto Linate Z', 80.00, NOW(), NOW()),
  ('Milazzo Porto Z', 'Catania Aeroporto Z', 280.00, NOW(), NOW()),
  ('Palermo Centro Z', 'Falcone Borsellino Airport (PMO) Z', 60.00, NOW(), NOW()),
  ('Rimini Centro Z', 'Federico Fellini International Airport (RMI) Z', 80.00, NOW(), NOW()),
  ('Roma Citta Z', 'Aeroporto Roma Fiumicino Z', 70.00, NOW(), NOW()),
  ('Roma Citta Z', 'Ciampino-G. B. Pastine International Airport (CIA) Z', 70.00, NOW(), NOW()),
  ('SIRACUSA', 'AEROPORTO DI CATANIA', 100.00, NOW(), NOW()),
  ('Siracusa Citta', 'Catania Aeroporto Z', 100.00, NOW(), NOW()),
  ('Taormina Z', 'AEROPORTO DI CATANIA', 90.00, NOW(), NOW()),
  ('Taormina Z', 'Catania Aeroporto Z', 100.00, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Verificar los registros insertados
SELECT * FROM fixed_pricing ORDER BY pick_up, drop_off;

