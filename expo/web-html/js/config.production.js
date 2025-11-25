/**
 * Configuración de producción para la aplicación de taxi
 * Este archivo se usa en producción y carga las variables desde el entorno
 */

// Función para cargar variables de entorno de forma segura
function getEnvVar(name, defaultValue = '') {
    // En el navegador, las variables de entorno se pueden acceder de diferentes formas
    // dependiendo del hosting (GitHub Pages, Netlify, Vercel, etc.)
    
    // Intentar obtener desde window.__ENV__ (configurado por el servidor)
    if (window.__ENV__ && window.__ENV__[name]) {
        return window.__ENV__[name];
    }
    
    // Intentar obtener desde meta tags (configurado en el HTML)
    const metaTag = document.querySelector(`meta[name="${name}"]`);
    if (metaTag) {
        return metaTag.getAttribute('content');
    }
    
    // Fallback al valor por defecto
    return defaultValue;
}

// Configuración de Firebase
const CONFIG = {
    FIREBASE_CONFIG: {
        apiKey: getEnvVar('FIREBASE_API_KEY', "AIzaSyAJfonmq_9roRuSP3y9UXXEJHRxD3DhcNQ"),
        authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', "taxi-zkt-7f276.firebaseapp.com"),
        projectId: getEnvVar('FIREBASE_PROJECT_ID', "taxi-zkt-7f276"),
        storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET', "taxi-zkt-7f276.appspot.com"),
        messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID', "570692523770"),
        appId: getEnvVar('FIREBASE_APP_ID', "1:570692523770:web:26e5ad5e0c0ded43331b43")
    },
    
    SUPABASE_URL: getEnvVar('SUPABASE_URL', "https://wpecvlperiberbmsndlg.supabase.co"),
    SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY', "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZWN2bHBlcmliZXJibXNuZGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MzU0NDksImV4cCI6MjA2NzQxMTQ0OX0.Jx0UjYl1pblxsLXGOLSP5j0gzMyXq4arL_dzxN4YFcs"),
    
    // Resto de la configuración igual que en config.js
    APP_NAME: "cuzcatlansv.ride",
    IS_DEVELOPMENT: false,
    AUTHORIZED_DOMAINS: [
        'localhost:8000',
        '127.0.0.1:8000',
        'taxi-zkt-7f276.firebaseapp.com',
        'carportsv.github.io',
        '*.netlify.app',
        '*.vercel.app'
    ],
    STORAGE_KEYS: {
        USER_UID: 'userUID',
        USER_ROLE: 'userRole',
        USER_DATA: 'userData',
        USER_NICK: 'userNick',
        USER_TOKEN: 'userToken'
    },
    USER_TYPES: {
        PASSENGER: 'passenger',
        DRIVER: 'driver',
        ADMIN: 'admin'
    },
    NOTIFICATIONS: {
        AUTO_HIDE_DELAY: 3000
    },
    MAP_CONFIG: {
        ZOOM: 13,
        MIN_ZOOM: 10,
        MAX_ZOOM: 18,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    DEFAULT_LAT: 13.6929,
    DEFAULT_LNG: -89.2182,
    PRIMARY_COLOR: '#007bff',
    VALIDATION: {
        EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        PHONE_REGEX: /^\+503[0-9]{8}$/,
        PASSWORD_MIN_LENGTH: 6
    }
};

// Environment detection
const ENV = {
    IS_DEVELOPMENT: false,
    IS_PRODUCTION: true,
    IS_MOBILE: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    IS_HTTPS: window.location.protocol === 'https:',
    IS_GITHUB_PAGES: window.location.hostname.includes('github.io'),
    IS_NETLIFY: window.location.hostname.includes('netlify.app'),
    IS_VERCEL: window.location.hostname.includes('vercel.app')
};

// Debug configuration
const DEBUG = {
    ENABLED: false,
    LOG_LEVEL: 'error',
    SHOW_PERFORMANCE: false
};

// Utility functions for configuration
const ConfigUtils = {
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
    
    isFeatureEnabled: (feature) => {
        const features = {
            'realtime': true,
            'notifications': true,
            'geolocation': true,
            'offline_mode': false,
            'analytics': true
        };
        
        return features[feature] || false;
    },
    
    getApiUrl: (endpoint) => {
        const baseUrl = CONFIG.SUPABASE_URL;
        const apiEndpoint = CONFIG.API_ENDPOINTS[endpoint] || endpoint;
        return `${baseUrl}${apiEndpoint}`;
    },
    
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

// ===== CONFIGURACIÓN DE SUPABASE =====

// Crear instancia de Supabase usando fetch API
const supabase = {
    from: (table) => {
        return {
            select: (columns = '*') => {
                return {
                    order: (column, options = {}) => {
                        return {
                            then: async () => {
                                try {
                                    const url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}`;
                                    const queryParams = new URLSearchParams();
                                    
                                    if (columns !== '*') {
                                        queryParams.append('select', columns);
                                    }
                                    
                                    if (options.ascending !== undefined) {
                                        queryParams.append('order', `${column}.${options.ascending ? 'asc' : 'desc'}`);
                                    }
                                    
                                    const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;
                                    
                                    const response = await fetch(fullUrl, {
                                        method: 'GET',
                                        headers: {
                                            'apikey': CONFIG.SUPABASE_ANON_KEY,
                                            'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                                            'Content-Type': 'application/json'
                                        }
                                    });
                                    
                                    if (!response.ok) {
                                        throw new Error(`HTTP error! status: ${response.status}`);
                                    }
                                    
                                    const data = await response.json();
                                    return { data, error: null };
                                } catch (error) {
                                    return { data: null, error };
                                }
                            }
                        };
                    }
                };
            },
            
            delete: () => {
                return {
                    eq: (column, value) => {
                        return {
                            then: async () => {
                                try {
                                    const url = `${CONFIG.SUPABASE_URL}/rest/v1/${table}?${column}=eq.${value}`;
                                    
                                    const response = await fetch(url, {
                                        method: 'DELETE',
                                        headers: {
                                            'apikey': CONFIG.SUPABASE_ANON_KEY,
                                            'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                                            'Content-Type': 'application/json'
                                        }
                                    });
                                    
                                    if (!response.ok) {
                                        throw new Error(`HTTP error! status: ${response.status}`);
                                    }
                                    
                                    return { error: null };
                                } catch (error) {
                                    return { error };
                                }
                            }
                        };
                    }
                };
            }
        };
    }
};

// Export configuration for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, ENV, DEBUG, ConfigUtils };
}

// Exponer variables globalmente para uso en otros scripts
window.CONFIG = CONFIG;
window.ENV = ENV;
window.DEBUG = DEBUG;
window.ConfigUtils = ConfigUtils;
window.supabase = supabase; 