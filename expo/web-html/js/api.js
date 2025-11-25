// API Service - Manejo de todas las comunicaciones con Supabase
class ApiService {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        this.baseHeaders = {
            'Content-Type': 'application/json',
            'apikey': this.supabaseKey
        };
    }

    // Método base para hacer requests
    async request(endpoint, options = {}) {
        const url = `${this.supabaseUrl}${endpoint}`;
        const headers = {
            ...this.baseHeaders,
            ...options.headers
        };

        // Agregar token de autenticación si existe
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method: options.method || 'GET',
            headers,
            ...options
        };

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // ===== AUTENTICACIÓN =====
    
    // Iniciar sesión con email y contraseña
    async signIn(email, password) {
        const endpoint = '/auth/v1/token?grant_type=password';
        const body = {
            email,
            password
        };

        try {
            const response = await this.request(endpoint, {
                method: 'POST',
                body
            });

            if (response.access_token) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER_TOKEN, response.access_token);
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
                return response;
            } else {
                throw new Error('Credenciales inválidas');
            }
        } catch (error) {
            console.error('Sign In Error:', error);
            throw error;
        }
    }

    // Registrarse con email y contraseña
    async signUp(email, password, userData) {
        const endpoint = '/auth/v1/signup';
        const body = {
            email,
            password,
            data: userData
        };

        try {
            const response = await this.request(endpoint, {
                method: 'POST',
                body
            });

            return response;
        } catch (error) {
            console.error('Sign Up Error:', error);
            throw error;
        }
    }

    // Cerrar sesión
    async signOut() {
        const endpoint = '/auth/v1/logout';
        
        try {
            await this.request(endpoint, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Sign Out Error:', error);
        } finally {
            // Limpiar datos locales
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        }
    }

    // Obtener usuario actual
    async getCurrentUser() {
        const endpoint = '/auth/v1/user';
        
        try {
            const user = await this.request(endpoint);
            return user;
        } catch (error) {
            console.error('Get Current User Error:', error);
            return null;
        }
    }

    // ===== BÚSQUEDA DE DIRECCIONES =====
    
    // Buscar direcciones usando OpenStreetMap Nominatim
    async searchAddress(query, limit = 5) {
        const baseUrl = CONFIG.NOMINATIM_BASE_URL;
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: limit,
            addressdetails: 1,
            countrycodes: 'sv' // El Salvador
        });

        try {
            const response = await fetch(`${baseUrl}/search?${params}`);
            const data = await response.json();
            
            return data.map(item => ({
                id: item.place_id,
                display_name: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                type: item.type,
                importance: item.importance,
                address: item.address
            }));
        } catch (error) {
            console.error('Search Address Error:', error);
            throw error;
        }
    }

    // Geocodificación inversa (coordenadas a dirección)
    async reverseGeocode(lat, lng) {
        const baseUrl = CONFIG.NOMINATIM_BASE_URL;
        const params = new URLSearchParams({
            lat: lat,
            lon: lng,
            format: 'json',
            addressdetails: 1
        });

        try {
            const response = await fetch(`${baseUrl}/reverse?${params}`);
            const data = await response.json();
            
            return {
                display_name: data.display_name,
                address: data.address,
                lat: parseFloat(data.lat),
                lng: parseFloat(data.lon)
            };
        } catch (error) {
            console.error('Reverse Geocode Error:', error);
            throw error;
        }
    }

    // ===== GESTIÓN DE VIAJES =====
    
    // Crear un nuevo viaje
    async createRide(rideData) {
        const endpoint = '/rest/v1/rides';
        const body = {
            passenger_id: rideData.passengerId,
            origin_address: rideData.originAddress,
            origin_lat: rideData.originLat,
            origin_lng: rideData.originLng,
            destination_address: rideData.destinationAddress,
            destination_lat: rideData.destinationLat,
            destination_lng: rideData.destinationLng,
            status: CONFIG.RIDE_STATUS.SEARCHING,
            estimated_price: rideData.estimatedPrice,
            created_at: new Date().toISOString()
        };

        try {
            const response = await this.request(endpoint, {
                method: 'POST',
                body
            });

            return response;
        } catch (error) {
            console.error('Create Ride Error:', error);
            throw error;
        }
    }

    // Obtener viaje por ID
    async getRide(rideId) {
        const endpoint = `/rest/v1/rides?id=eq.${rideId}&select=*`;
        
        try {
            const response = await this.request(endpoint);
            return response[0];
        } catch (error) {
            console.error('Get Ride Error:', error);
            throw error;
        }
    }

    // Actualizar estado del viaje
    async updateRideStatus(rideId, status, additionalData = {}) {
        const endpoint = `/rest/v1/rides?id=eq.${rideId}`;
        const body = {
            status,
            updated_at: new Date().toISOString(),
            ...additionalData
        };

        try {
            const response = await this.request(endpoint, {
                method: 'PATCH',
                body
            });

            return response;
        } catch (error) {
            console.error('Update Ride Status Error:', error);
            throw error;
        }
    }

    // Obtener historial de viajes del usuario
    async getRideHistory(userId, limit = 20) {
        const endpoint = `/rest/v1/rides?passenger_id=eq.${userId}&order=created_at.desc&limit=${limit}`;
        
        try {
            const response = await this.request(endpoint);
            return response;
        } catch (error) {
            console.error('Get Ride History Error:', error);
            throw error;
        }
    }

    // ===== GESTIÓN DE CONDUCTORES =====
    
    // Obtener conductores disponibles
    async getAvailableDrivers(lat, lng, radius = 5000) {
        const endpoint = `/rest/v1/drivers?status=eq.available&select=*`;
        
        try {
            const response = await this.request(endpoint);
            
            // Filtrar por distancia (implementación básica)
            return response.filter(driver => {
                const distance = this.calculateDistance(lat, lng, driver.current_lat, driver.current_lng);
                return distance <= radius;
            });
        } catch (error) {
            console.error('Get Available Drivers Error:', error);
            throw error;
        }
    }

    // Asignar conductor a viaje
    async assignDriverToRide(rideId, driverId) {
        const endpoint = `/rest/v1/rides?id=eq.${rideId}`;
        const body = {
            driver_id: driverId,
            status: CONFIG.RIDE_STATUS.DRIVER_ASSIGNED,
            assigned_at: new Date().toISOString()
        };

        try {
            const response = await this.request(endpoint, {
                method: 'PATCH',
                body
            });

            return response;
        } catch (error) {
            console.error('Assign Driver Error:', error);
            throw error;
        }
    }

    // ===== GESTIÓN DE USUARIOS =====
    
    // Obtener perfil del usuario
    async getUserProfile(userId) {
        const endpoint = `/rest/v1/profiles?id=eq.${userId}&select=*`;
        
        try {
            const response = await this.request(endpoint);
            return response[0];
        } catch (error) {
            console.error('Get User Profile Error:', error);
            throw error;
        }
    }

    // Actualizar perfil del usuario
    async updateUserProfile(userId, profileData) {
        const endpoint = `/rest/v1/profiles?id=eq.${userId}`;
        const body = {
            ...profileData,
            updated_at: new Date().toISOString()
        };

        try {
            const response = await this.request(endpoint, {
                method: 'PATCH',
                body
            });

            return response;
        } catch (error) {
            console.error('Update User Profile Error:', error);
            throw error;
        }
    }

    // ===== DIRECCIONES FAVORITAS =====
    
    // Obtener direcciones favoritas
    async getFavoriteAddresses(userId) {
        const endpoint = `/rest/v1/favorite_addresses?user_id=eq.${userId}&select=*&order=created_at.desc`;
        
        try {
            const response = await this.request(endpoint);
            return response;
        } catch (error) {
            console.error('Get Favorite Addresses Error:', error);
            throw error;
        }
    }

    // Agregar dirección favorita
    async addFavoriteAddress(addressData) {
        const endpoint = '/rest/v1/favorite_addresses';
        const body = {
            user_id: addressData.userId,
            name: addressData.name,
            address: addressData.address,
            lat: addressData.lat,
            lng: addressData.lng,
            type: addressData.type, // 'home', 'work', 'custom'
            created_at: new Date().toISOString()
        };

        try {
            const response = await this.request(endpoint, {
                method: 'POST',
                body
            });

            return response;
        } catch (error) {
            console.error('Add Favorite Address Error:', error);
            throw error;
        }
    }

    // ===== UTILIDADES =====
    
    // Calcular distancia entre dos puntos (fórmula de Haversine)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLng = this.deg2rad(lng2 - lng1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distancia en km
        return distance;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    // Calcular precio estimado del viaje
    calculateEstimatedPrice(distance, duration) {
        const baseFare = CONFIG.PRICING.BASE_FARE;
        const distanceCost = distance * CONFIG.PRICING.PER_KM_RATE;
        const timeCost = (duration / 60) * CONFIG.PRICING.PER_MINUTE_RATE;
        const total = baseFare + distanceCost + timeCost;
        
        return Math.max(total, CONFIG.PRICING.MINIMUM_FARE);
    }

    // Validar datos
    validateEmail(email) {
        return CONFIG.VALIDATION.EMAIL_REGEX.test(email);
    }

    validatePassword(password) {
        return password.length >= CONFIG.VALIDATION.PASSWORD_MIN_LENGTH;
    }

    validatePhone(phone) {
        return CONFIG.VALIDATION.PHONE_REGEX.test(phone);
    }
}

// Crear instancia global del servicio API
const apiService = new ApiService(); 