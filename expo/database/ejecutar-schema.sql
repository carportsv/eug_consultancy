-- Script para ejecutar en Supabase SQL Editor
-- Este script crea las tablas necesarias para la aplicación de taxi

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Eliminar tablas existentes si es necesario (opcional)
-- DROP TABLE IF EXISTS user_settings CASCADE;
-- DROP TABLE IF EXISTS ride_history CASCADE;
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS ride_requests CASCADE;
-- DROP TABLE IF EXISTS drivers CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    display_name TEXT,
    phone_number TEXT,
    photo_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'driver', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de conductores
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'busy')),
    location JSONB, -- {latitude: number, longitude: number}
    rating DECIMAL(3,2) DEFAULT 0,
    total_rides INTEGER DEFAULT 0,
    earnings DECIMAL(10,2) DEFAULT 0,
    car_info JSONB, -- {model: string, plate: string, year: number}
    documents JSONB, -- {license: string, insurance: string, registration: string}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de solicitudes de viaje
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

-- Tabla de mensajes del sistema
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('ride_request', 'ride_update', 'driver_location', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de historial de viajes
CREATE TABLE IF NOT EXISTS ride_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    price DECIMAL(10,2),
    distance DECIMAL(8,2),
    duration INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de configuraciones de usuario
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    home_address JSONB, -- {address: string, coordinates: {latitude: number, longitude: number}}
    work_address JSONB, -- {address: string, coordinates: {latitude: number, longitude: number}}
    preferred_payment_method TEXT DEFAULT 'cash',
    notifications_enabled BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'es',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_ride_requests_user_id ON ride_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_driver_id ON ride_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_created_at ON ride_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ride_requests_updated_at BEFORE UPDATE ON ride_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = firebase_uid);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = firebase_uid);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = firebase_uid);

-- Políticas para conductores
CREATE POLICY "Drivers can view own data" ON drivers FOR SELECT USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text));
CREATE POLICY "Drivers can update own data" ON drivers FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text));
CREATE POLICY "Drivers can insert own data" ON drivers FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text));
CREATE POLICY "Anyone can view available drivers" ON drivers FOR SELECT USING (is_available = true);

-- Políticas para solicitudes de viaje
CREATE POLICY "Users can view own rides" ON ride_requests FOR SELECT USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text));
CREATE POLICY "Users can create own rides" ON ride_requests FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text));
CREATE POLICY "Drivers can view assigned rides" ON ride_requests FOR SELECT USING (driver_id IN (SELECT d.id FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.firebase_uid = auth.uid()::text));
CREATE POLICY "Drivers can update assigned rides" ON ride_requests FOR UPDATE USING (driver_id IN (SELECT d.id FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.firebase_uid = auth.uid()::text));

-- Políticas para mensajes
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text));
CREATE POLICY "Users can insert own messages" ON messages FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text));

-- Políticas para configuraciones de usuario
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text));
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text));
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text)); 