// Configuración para GitHub Pages (producción)
// Los placeholders serán reemplazados por GitHub Actions con las claves reales
const CONFIG = {
    FIREBASE_CONFIG: {
        apiKey: "{{FIREBASE_API_KEY}}",
        authDomain: "{{FIREBASE_AUTH_DOMAIN}}",
        projectId: "{{FIREBASE_PROJECT_ID}}",
        storageBucket: "{{FIREBASE_STORAGE_BUCKET}}",
        messagingSenderId: "{{FIREBASE_MESSAGING_SENDER_ID}}",
        appId: "{{FIREBASE_APP_ID}}"
    },
    SUPABASE_URL: "{{SUPABASE_URL}}",
    SUPABASE_ANON_KEY: "{{SUPABASE_ANON_KEY}}",
    AUTHORIZED_DOMAINS: [
        'localhost:8000',
        '127.0.0.1:8000',
        'localhost',
        '127.0.0.1',
        'taxi-zkt-7f276.firebaseapp.com',
        'carportsv.github.io',
        'carportsv.github.io/zkt_openstreet'
    ],
    // Configuración de mapas
    DEFAULT_LAT: 13.6929,
    DEFAULT_LNG: -89.2182,
    MAP_CONFIG: {
        ZOOM: 15,
        MIN_ZOOM: 10,
        MAX_ZOOM: 18,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '© OpenStreetMap contributors'
    },
    // Estados de viajes
    RIDE_STATUS: {
        SEARCHING: 'searching',
        DRIVER_ASSIGNED: 'driver_assigned',
        ACCEPTED: 'accepted',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },
    // Configuración de precios
    PRICING: {
        BASE_FARE: 2.50,
        PER_KM_RATE: 0.80,
        PER_MINUTE_RATE: 0.20,
        MINIMUM_FARE: 2.50
    },
    // Validaciones
    VALIDATION: {
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
        PASSWORD_MIN_LENGTH: 6
    },
    // Claves de almacenamiento local
    STORAGE_KEYS: {
        USER_DATA: 'user_data',
        USER_TOKEN: 'user_token',
        USER_UID: 'user_uid',
        USER_ROLE: 'user_role'
    }
};

// Exportar configuración
window.CONFIG = CONFIG;
console.log('✅ Configuración cargada - Los placeholders serán reemplazados por el servidor');
