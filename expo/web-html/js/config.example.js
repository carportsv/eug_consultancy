// Archivo de ejemplo de configuración
// Copia este archivo como config.js y actualiza con tus credenciales reales

// Configuración de la aplicación
const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://tu-proyecto.supabase.co',
    SUPABASE_ANON_KEY: 'tu-supabase-anon-key-aqui',
    
    // Firebase Configuration
    FIREBASE_CONFIG: {
        apiKey: "tu-firebase-api-key-aqui",
        authDomain: "tu-proyecto.firebaseapp.com",
        projectId: "tu-proyecto-id",
        storageBucket: "tu-proyecto.appspot.com",
        messagingSenderId: "123456789",
        appId: "tu-app-id"
    },
    
    // OpenStreetMap Configuration
    NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org',
    
    // App Configuration
    APP_NAME: 'Cuzcatlansv.ride',
    APP_VERSION: '1.0.0',
    
    // Default coordinates (San Salvador, El Salvador)
    DEFAULT_LAT: 13.6929,
    DEFAULT_LNG: -89.2182,
    
    // API Endpoints
    API_ENDPOINTS: {
        // Supabase endpoints
        AUTH: '/auth/v1',
        REST: '/rest/v1',
        REALTIME: '/realtime/v1',
        
        // Custom endpoints
        SEARCH_ADDRESS: '/api/search-address',
        CREATE_RIDE: '/api/rides',
        UPDATE_RIDE: '/api/rides',
        GET_DRIVERS: '/api/drivers',
        GET_USER_PROFILE: '/api/user/profile',
        UPDATE_USER_PROFILE: '/api/user/profile'
    },
    
    // Realtime channels
    REALTIME_CHANNELS: {
        RIDES: 'rides',
        DRIVER_LOCATIONS: 'driver_locations',
        USER_UPDATES: 'user_updates'
    },
    
    // Ride status constants
    RIDE_STATUS: {
        SEARCHING: 'searching',
        DRIVER_ASSIGNED: 'driver_assigned',
        DRIVER_ARRIVING: 'driver_arriving',
        DRIVER_ARRIVED: 'driver_arrived',
        RIDE_STARTED: 'ride_started',
        RIDE_COMPLETED: 'ride_completed',
        CANCELLED: 'cancelled'
    },
    
    // User types
    USER_TYPES: {
        PASSENGER: 'passenger',
        DRIVER: 'driver',
        ADMIN: 'admin'
    },
    
    // Map configuration
    MAP_CONFIG: {
        ZOOM: 15,
        MIN_ZOOM: 10,
        MAX_ZOOM: 18,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '© OpenStreetMap contributors'
    },
    
    // Notification settings
    NOTIFICATIONS: {
        AUTO_HIDE_DELAY: 5000,
        POSITION: 'top-right',
        TYPES: {
            SUCCESS: 'success',
            ERROR: 'error',
            WARNING: 'warning',
            INFO: 'info'
        }
    },
    
    // Local storage keys
    STORAGE_KEYS: {
        USER_TOKEN: 'user_token',
        USER_DATA: 'user_data',
        USER_PREFERENCES: 'user_preferences',
        FAVORITE_ADDRESSES: 'favorite_addresses',
        RIDE_HISTORY: 'ride_history'
    },
    
    // Validation rules
    VALIDATION: {
        PASSWORD_MIN_LENGTH: 6,
        PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    
    // Ride pricing (example rates)
    PRICING: {
        BASE_FARE: 2.50,
        PER_KM_RATE: 0.75,
        PER_MINUTE_RATE: 0.25,
        MINIMUM_FARE: 3.00
    }
};

// Environment detection
const ENV = {
    IS_DEVELOPMENT: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    IS_PRODUCTION: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
    IS_MOBILE: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    IS_HTTPS: window.location.protocol === 'https:'
};

// Debug configuration
const DEBUG = {
    ENABLED: ENV.IS_DEVELOPMENT,
    LOG_LEVEL: ENV.IS_DEVELOPMENT ? 'debug' : 'error',
    SHOW_PERFORMANCE: ENV.IS_DEVELOPMENT
};

// Utility functions for configuration
const ConfigUtils = {
    // Get configuration value with fallback
    get: (key, defaultValue = null) => {
        const keys = key.split('.');
        let value = CONFIG;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    },
    
    // Set configuration value
    set: (key, value) => {
        const keys = key.split('.');
        const lastKey = keys.pop();
        let obj = CONFIG;
        
        for (const k of keys) {
            if (!(k in obj) || typeof obj[k] !== 'object') {
                obj[k] = {};
            }
            obj = obj[k];
        }
        
        obj[lastKey] = value;
    },
    
    // Check if feature is enabled
    isFeatureEnabled: (feature) => {
        const features = {
            'realtime': true,
            'notifications': true,
            'geolocation': true,
            'offline_mode': false,
            'analytics': ENV.IS_PRODUCTION
        };
        
        return features[feature] || false;
    },
    
    // Get API URL
    getApiUrl: (endpoint) => {
        const baseUrl = CONFIG.SUPABASE_URL;
        const apiEndpoint = CONFIG.API_ENDPOINTS[endpoint] || endpoint;
        return `${baseUrl}${apiEndpoint}`;
    },
    
    // Get headers for API requests
    getHeaders: (includeAuth = true) => {
        const headers = {
            'Content-Type': 'application/json',
            'apikey': CONFIG.SUPABASE_ANON_KEY
        };
        
        if (includeAuth) {
            const token = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return headers;
    }
};

// Export configuration for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, ENV, DEBUG, ConfigUtils };
}

/*
INSTRUCCIONES DE CONFIGURACIÓN:

1. COPIA ESTE ARCHIVO:
   cp config.example.js config.js

2. OBTÉN TUS CREDENCIALES DE FIREBASE:
   - Ve a https://console.firebase.google.com
   - Crea un proyecto o selecciona uno existente
   - Ve a Configuración del proyecto > General
   - Copia la configuración de la web app

3. OBTÉN TUS CREDENCIALES DE SUPABASE:
   - Ve a https://supabase.com
   - Crea un proyecto o selecciona uno existente
   - Ve a Configuración > API
   - Copia la URL del proyecto y la anon key

4. ACTUALIZA EL ARCHIVO config.js:
   - Reemplaza 'tu-proyecto.supabase.co' con tu URL de Supabase
   - Reemplaza 'tu-supabase-anon-key-aqui' con tu anon key
   - Reemplaza la configuración de Firebase con tus credenciales

5. CONFIGURA LAS COORDENADAS POR DEFECTO:
   - DEFAULT_LAT y DEFAULT_LNG para tu ciudad

6. VERIFICA QUE TU BACKEND ESTÉ FUNCIONANDO:
   - Supabase debe estar activo
   - Las tablas deben estar creadas
   - Las políticas de seguridad configuradas

¡LISTO! Tu aplicación web debería funcionar correctamente.
*/ 