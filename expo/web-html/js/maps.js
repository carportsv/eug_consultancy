// Maps Service - Manejo de mapas con Leaflet y OpenStreetMap
class MapsService {
    constructor() {
        this.map = null;
        this.currentLocation = null;
        this.markers = [];
        this.route = null;
        this.geolocationId = null;
        this.addressSearchResults = [];
        this.init();
    }

    // Inicializar el servicio de mapas
    async init() {
        try {
            // Esperar a que Leaflet esté disponible
            let attempts = 0;
            const maxAttempts = 10;
            
            while (typeof L === 'undefined' && attempts < maxAttempts) {
                console.log(`🔄 Esperando Leaflet... Intento ${attempts + 1}/${maxAttempts}`);
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            
            if (typeof L === 'undefined') {
                console.warn('⚠️ Leaflet no está disponible después de esperar, el servicio se inicializará cuando esté disponible');
                return;
            }

            console.log('✅ Servicio de mapas inicializado');
        } catch (error) {
            console.error('❌ Error inicializando servicio de mapas:', error);
        }
    }

    // ===== INICIALIZACIÓN DEL MAPA =====

    // Crear y configurar el mapa
    createMap(containerId = 'map') {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Contenedor de mapa no encontrado: ${containerId}`);
            }

            // Configuración del mapa
            const mapConfig = CONFIG.MAP_CONFIG;
            
            this.map = L.map(containerId, {
                center: [CONFIG.DEFAULT_LAT, CONFIG.DEFAULT_LNG],
                zoom: mapConfig.ZOOM,
                minZoom: mapConfig.MIN_ZOOM,
                maxZoom: mapConfig.MAX_ZOOM,
                zoomControl: true,
                attributionControl: true
            });

            // Agregar capa de tiles de OpenStreetMap
            L.tileLayer(mapConfig.TILE_LAYER, {
                attribution: mapConfig.ATTRIBUTION,
                maxZoom: mapConfig.MAX_ZOOM
            }).addTo(this.map);

            // Configurar controles personalizados
            this.setupMapControls();

            // Obtener ubicación actual
            this.getCurrentLocation();

            console.log('Mapa creado exitosamente');
            return this.map;
        } catch (error) {
            console.error('Error creando mapa:', error);
            throw error;
        }
    }

    // Configurar controles del mapa
    setupMapControls() {
        // Control de ubicación actual
        const locationControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: () => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                const button = L.DomUtil.create('a', 'location-control', container);
                button.innerHTML = '<i class="fas fa-crosshairs"></i>';
                button.title = 'Mi ubicación';
                
                L.DomEvent.on(button, 'click', () => {
                    this.getCurrentLocation();
                });
                
                return container;
            }
        });

        this.map.addControl(new locationControl());

        // Control de escala
        L.control.scale({
            imperial: false,
            metric: true,
            position: 'bottomleft'
        }).addTo(this.map);
    }

    // ===== GEOLOCALIZACIÓN =====

    // Obtener ubicación actual del usuario
    async getCurrentLocation() {
        try {
            if (!navigator.geolocation) {
                throw new Error('Geolocalización no soportada en este navegador');
            }

            return new Promise((resolve, reject) => {
                const options = {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutos
                };

                this.geolocationId = navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        this.currentLocation = { lat: latitude, lng: longitude };
                        
                        // Centrar mapa en ubicación actual
                        this.centerMapOnLocation(latitude, longitude);
                        
                        // Agregar marcador de ubicación actual
                        this.addCurrentLocationMarker(latitude, longitude);
                        
                        console.log('Ubicación actual obtenida:', this.currentLocation);
                        resolve(this.currentLocation);
                    },
                    (error) => {
                        console.error('Error obteniendo ubicación:', error);
                        this.handleGeolocationError(error);
                        reject(error);
                    },
                    options
                );
            });
        } catch (error) {
            console.error('Error en getCurrentLocation:', error);
            throw error;
        }
    }

    // Centrar mapa en una ubicación específica
    centerMapOnLocation(lat, lng, zoom = CONFIG.MAP_CONFIG.ZOOM) {
        if (this.map) {
            this.map.setView([lat, lng], zoom, {
                animate: true,
                duration: 1
            });
        }
    }

    // Agregar marcador de ubicación actual
    addCurrentLocationMarker(lat, lng) {
        // Remover marcador anterior si existe
        this.removeMarker('current-location');

        const icon = L.divIcon({
            className: 'current-location-marker',
            html: '<i class="fas fa-crosshairs"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker([lat, lng], { icon })
            .addTo(this.map)
            .bindPopup('Tu ubicación actual');

        this.markers.push({
            id: 'current-location',
            marker: marker,
            type: 'current-location'
        });
    }

    // Manejar errores de geolocalización
    handleGeolocationError(error) {
        let message = 'Error obteniendo ubicación';

        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Permiso de ubicación denegado';
                this.showLocationPermissionDialog();
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Información de ubicación no disponible';
                break;
            case error.TIMEOUT:
                message = 'Tiempo de espera agotado';
                break;
            default:
                message = 'Error desconocido';
        }

        this.showNotification(message, 'warning');
    }

    // Mostrar diálogo de permisos de ubicación
    showLocationPermissionDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'location-permission-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3><i class="fas fa-map-marker-alt"></i> Ubicación requerida</h3>
                <p>Para encontrar taxis cercanos, necesitamos acceder a tu ubicación.</p>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Cancelar
                    </button>
                    <button class="btn btn-primary" onclick="mapsService.requestLocationPermission()">
                        Permitir ubicación
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }

    // Solicitar permiso de ubicación
    async requestLocationPermission() {
        try {
            await this.getCurrentLocation();
            document.querySelector('.location-permission-dialog')?.remove();
        } catch (error) {
            console.error('Error solicitando permiso de ubicación:', error);
        }
    }

    // ===== BÚSQUEDA DE DIRECCIONES =====

    // Buscar direcciones
    async searchAddresses(query, limit = 5) {
        try {
            if (!query || query.trim().length < 3) {
                return [];
            }

            const results = await window.adminService.searchAddress(query, limit);
            this.addressSearchResults = results;
            
            // Mostrar resultados en el mapa
            this.showSearchResults(results);
            
            return results;
        } catch (error) {
            console.error('Error buscando direcciones:', error);
            this.showNotification('Error buscando direcciones', 'error');
            return [];
        }
    }

    // Mostrar resultados de búsqueda en el mapa
    showSearchResults(results) {
        // Limpiar marcadores de búsqueda anteriores
        this.removeMarkersByType('search-result');

        if (results.length === 0) {
            this.showNotification('No se encontraron direcciones', 'warning');
            return;
        }

        // Agregar marcadores para cada resultado
        results.forEach((result, index) => {
            this.addSearchResultMarker(result, index);
        });

        // Ajustar vista para mostrar todos los marcadores
        this.fitBoundsToMarkers('search-result');
    }

    // Agregar marcador de resultado de búsqueda
    addSearchResultMarker(result, index) {
        const icon = L.divIcon({
            className: 'search-result-marker',
            html: `<span>${index + 1}</span>`,
            iconSize: [25, 25],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([result.lat, result.lng], { icon })
            .addTo(this.map)
            .bindPopup(`
                <div class="search-result-popup">
                    <h4>${result.display_name}</h4>
                    <button class="btn btn-primary btn-sm" onclick="mapsService.selectAddress(${index})">
                        Seleccionar
                    </button>
                </div>
            `);

        this.markers.push({
            id: `search-result-${index}`,
            marker: marker,
            type: 'search-result',
            data: result
        });
    }

    // Seleccionar dirección de los resultados
    selectAddress(index) {
        const result = this.addressSearchResults[index];
        if (!result) return;

        // Limpiar marcadores de búsqueda
        this.removeMarkersByType('search-result');

        // Agregar marcador de dirección seleccionada
        this.addSelectedAddressMarker(result);

        // Centrar mapa en la dirección seleccionada
        this.centerMapOnLocation(result.lat, result.lng);

        // Cerrar popup
        this.map.closePopup();

        // Disparar evento de selección
        this.dispatchEvent('addressSelected', { address: result });
    }

    // Agregar marcador de dirección seleccionada
    addSelectedAddressMarker(address) {
        const icon = L.divIcon({
            className: 'selected-address-marker',
            html: '<i class="fas fa-map-marker"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        const marker = L.marker([address.lat, address.lng], { icon })
            .addTo(this.map)
            .bindPopup(`
                <div class="selected-address-popup">
                    <h4>Dirección seleccionada</h4>
                    <p>${address.display_name}</p>
                </div>
            `);

        this.markers.push({
            id: 'selected-address',
            marker: marker,
            type: 'selected-address',
            data: address
        });
    }

    // ===== RUTAS Y NAVEGACIÓN =====

    // Calcular ruta entre dos puntos
    async calculateRoute(origin, destination) {
        try {
            // Usar OSRM (Open Source Routing Machine) para calcular ruta
            const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                
                // Dibujar ruta en el mapa
                this.drawRoute(route.geometry);
                
                return {
                    distance: route.distance / 1000, // km
                    duration: route.duration / 60, // minutos
                    geometry: route.geometry
                };
            } else {
                throw new Error('No se pudo calcular la ruta');
            }
        } catch (error) {
            console.error('Error calculando ruta:', error);
            throw error;
        }
    }

    // Dibujar ruta en el mapa
    drawRoute(geometry) {
        // Remover ruta anterior si existe
        if (this.route) {
            this.map.removeLayer(this.route);
        }

        this.route = L.geoJSON(geometry, {
            style: {
                color: CONFIG.PRIMARY_COLOR || '#4CAF50',
                weight: 4,
                opacity: 0.8
            }
        }).addTo(this.map);

        // Ajustar vista para mostrar toda la ruta
        this.map.fitBounds(this.route.getBounds(), { padding: [20, 20] });
    }
    
    // Limpiar ruta del mapa
    clearRoute() {
        if (this.route) {
            this.map.removeLayer(this.route);
            this.route = null;
            console.log('🗺️ Route cleared from map');
        }
    }

    // ===== GESTIÓN DE MARCADORES =====

    // Agregar marcador
    addMarker(lat, lng, options = {}) {
        const defaultIcon = L.divIcon({
            className: 'custom-marker',
            html: '<i class="fas fa-map-marker"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        const marker = L.marker([lat, lng], {
            icon: options.icon || defaultIcon,
            ...options
        }).addTo(this.map);

        if (options.popup) {
            marker.bindPopup(options.popup);
        }

        const markerId = options.id || `marker-${Date.now()}`;
        this.markers.push({
            id: markerId,
            marker: marker,
            type: options.type || 'custom',
            data: options.data
        });

        return marker;
    }

    // Remover marcador por ID
    removeMarker(id) {
        const index = this.markers.findIndex(m => m.id === id);
        if (index !== -1) {
            this.map.removeLayer(this.markers[index].marker);
            this.markers.splice(index, 1);
        }
    }

    // Remover marcadores por tipo
    removeMarkersByType(type) {
        this.markers = this.markers.filter(m => {
            if (m.type === type) {
                this.map.removeLayer(m.marker);
                return false;
            }
            return true;
        });
    }

    // Limpiar todos los marcadores
    clearMarkers() {
        this.markers.forEach(m => {
            this.map.removeLayer(m.marker);
        });
        this.markers = [];
    }

    // Ajustar vista para mostrar marcadores
    fitBoundsToMarkers(type = null) {
        const markers = type 
            ? this.markers.filter(m => m.type === type)
            : this.markers;

        if (markers.length === 0) return;

        const group = new L.featureGroup(markers.map(m => m.marker));
        this.map.fitBounds(group.getBounds(), { padding: [20, 20] });
    }

    // ===== UTILIDADES =====

    // Obtener coordenadas del centro del mapa
    getMapCenter() {
        if (!this.map) return null;
        const center = this.map.getCenter();
        return { lat: center.lat, lng: center.lng };
    }

    // Obtener nivel de zoom actual
    getZoomLevel() {
        return this.map ? this.map.getZoom() : null;
    }

    // Verificar si el mapa está inicializado
    isMapInitialized() {
        return this.map !== null;
    }

    // Obtener la instancia del mapa
    getMap() {
        return this.map;
    }

    // Mostrar notificación
    showNotification(message, type = 'info') {
        // Disparar evento para mostrar notificación
        this.dispatchEvent('showNotification', { message, type });
    }

    // Disparar evento personalizado
    dispatchEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: data,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    // Destruir mapa
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.markers = [];
        this.currentLocation = null;
        
        if (this.geolocationId) {
            navigator.geolocation.clearWatch(this.geolocationId);
            this.geolocationId = null;
        }
    }
}

// Crear instancia global del servicio de mapas
const mapsService = new MapsService();

// Exponer globalmente
window.mapsService = mapsService;

// Inicializar cuando Leaflet esté disponible
function initializeMapsService() {
    if (typeof L !== 'undefined') {
        console.log('🗺️ Leaflet disponible, inicializando servicio de mapas...');
        mapsService.init();
    } else {
        console.log('⏳ Leaflet no disponible, esperando...');
        setTimeout(initializeMapsService, 100);
    }
}

// Iniciar la inicialización
initializeMapsService(); 