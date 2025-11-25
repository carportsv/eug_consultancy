// In Progress Rides - Specific functionality for in-progress rides page
class InProgressRidesService {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        this.allInProgressRides = [];
        this.filteredRides = [];
        this.availableDrivers = [];
        this.userMap = new Map();
        this.driversMap = new Map(); // Map para buscar conductores por ID
    }

    async init() {
        console.log('🚗 Initializing In Progress Rides Service...');
        
        // Initialize ride edit service
        if (window.rideEditService && window.adminService) {
            window.rideEditService.init(window.adminService);
            console.log('✅ RideEditService inicializado en in-progress-rides');
        }
        
        await this.loadDrivers();
        await this.loadData();
        
        // Listen for ride updates
        document.addEventListener('rideUpdated', () => {
            console.log('🔄 Viaje actualizado, recargando datos...');
            this.loadData();
        });
    }

    // Load available drivers for filtering
    async loadDrivers() {
        try {
            console.log('👥 Loading available drivers...');
            
            const response = await fetch(`${this.supabaseUrl}/rest/v1/users?role=eq.driver&is_active=eq.true&select=id,display_name,email,phone_number&order=display_name.asc`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const drivers = await response.json();
            console.log(`✅ ${drivers.length} drivers loaded`);

            // Build user map and drivers map for all drivers
            drivers.forEach(driver => {
                this.userMap.set(driver.id, driver);
                this.driversMap.set(driver.id, driver);
            });

            this.availableDrivers = drivers;
            this.loadDriversInFilter();
            
            return drivers;
        } catch (error) {
            console.error('❌ Error loading drivers:', error);
            showError('Error loading drivers: ' + error.message);
            return [];
        }
    }

    // Load data for the page
    async loadData() {
        try {
            console.log('📊 Loading in-progress rides data...');
            
            // Load only in-progress rides
            const ridesResponse = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?status=eq.in_progress&select=*&order=created_at.desc`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!ridesResponse.ok) {
                throw new Error(`HTTP Error: ${ridesResponse.status}`);
            }

            this.allInProgressRides = await ridesResponse.json();
            this.filteredRides = [...this.allInProgressRides];
            console.log(`✅ ${this.allInProgressRides.length} in-progress rides loaded`);

            // Update UI
            this.updateRidesList();
            this.updateStats();

            // Hide loading screen using CSS classes
            const loadingScreen = document.getElementById('loadingScreen');
            const mainContent = document.getElementById('mainContent');
            
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                console.log('✅ Pantalla de carga ocultada');
            } else {
                console.warn('⚠️ Elemento loadingScreen no encontrado');
            }
            
            if (mainContent) {
                mainContent.style.display = 'block';
                console.log('✅ Contenido principal mostrado');
            } else {
                console.warn('⚠️ Elemento mainContent no encontrado');
            }

            console.log('✅ In-progress rides data loaded');
        } catch (error) {
            console.error('❌ Error loading in-progress rides data:', error);
            showError('Error loading data: ' + error.message);
        }
    }

    // Update rides list
    updateRidesList() {
        const ridesList = document.getElementById('inProgressRidesList');
        const noRides = document.getElementById('noRides');

        if (!ridesList) return;

        if (this.filteredRides.length === 0) {
            ridesList.style.display = 'none';
            noRides.style.display = 'flex';
            return;
        }

        ridesList.style.display = 'block';
        noRides.style.display = 'none';

        ridesList.innerHTML = this.filteredRides.map(ride => this.createRideCard(ride)).join('');
    }

    // Create ride card HTML
    createRideCard(ride) {
        const driver = ride.driver_id ? this.userMap.get(ride.driver_id) : null;
        const driverName = driver ? (driver.display_name || driver.email) : 'Sin asignar';
        const createdAt = new Date(ride.created_at).toLocaleString('es-ES');
        const startedAt = ride.updated_at ? new Date(ride.updated_at).toLocaleString('es-ES') : 'N/A';
        const origin = ride.origin?.address || 'N/A';
        const destination = ride.destination?.address || 'N/A';
        const price = ride.price ? `$${parseFloat(ride.price).toFixed(2)}` : 'N/A';
        const distance = ride.distance ? `${(ride.distance / 1000).toFixed(1)} km` : 'N/A';
        const clientName = ride.client_name || 'N/A';
        const additionalNotes = ride.additional_notes || '';

        return `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-header" onclick="toggleRideCard('${ride.id}')">
                    <div class="ride-status status-progress">
                        <span class="status-badge">En Progreso</span>
                    </div>
                    <div class="ride-header-content">
                        <div class="ride-title">${clientName}</div>
                    </div>
                    <div class="ride-expand-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="expand-arrow">
                            <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
                
                <div class="ride-content" id="rideContent_${ride.id}" style="display: none;">
                    <div class="ride-actions">
                        <button class="btn btn-sm btn-primary" onclick="completeRide('${ride.id}')">
                            ✅ Completar Viaje
                        </button>
                        <button class="btn btn-sm btn-info" onclick="viewDriverLocation('${ride.id}')">
                            📍 Ver Desplazamiento
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="editRide('${ride.id}')">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="cancelRide('${ride.id}')">
                            ❌ Cancelar
                        </button>
                    </div>
                    
                    <div class="ride-details">
                        <div class="detail-row">
                            <div class="detail-label">Conductor:</div>
                            <div class="detail-value">${driverName}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Origen:</div>
                            <div class="detail-value">${origin}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Destino:</div>
                            <div class="detail-value">${destination}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Distancia:</div>
                            <div class="detail-value">${distance}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Prioridad:</div>
                            <div class="detail-value">${ride.priority || 'Normal'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Costo:</div>
                            <div class="detail-value">${price}</div>
                        </div>
                        ${additionalNotes ? `
                        <div class="detail-row">
                            <div class="detail-label">Notas Adicionales:</div>
                            <div class="detail-value">${additionalNotes}</div>
                        </div>
                        ` : ''}
                        ${ride.scheduled_at ? `
                        <div class="detail-row">
                            <div class="detail-label">Programado para:</div>
                            <div class="detail-value">${new Date(ride.scheduled_at).toLocaleString('es-ES')}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Update statistics (simplified - just update the filtered count)
    updateStats() {
        // No statistics to update in simplified version
        console.log(`[InProgressRides] 📊 ${this.filteredRides.length} viajes en progreso`);
    }

    // Filter rides based on current filters
    filterRides() {
        // No filters in simplified version, show all rides
        this.filteredRides = this.allInProgressRides;
        console.log(`🔍 Mostrando todos los viajes: ${this.filteredRides.length} viajes en progreso`);
        this.updateRidesList();
        this.updateStats();
    }

    // Load drivers in the filter dropdown
    loadDriversInFilter() {
        try {
            const driverFilter = document.getElementById('driverFilter');
            if (!driverFilter) return;

            // Clear existing options
            driverFilter.innerHTML = '<option value="">Todos los conductores</option>';

            // Add each driver
            this.availableDrivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id;
                option.textContent = driver.display_name || driver.email || 'Sin nombre';
                driverFilter.appendChild(option);
            });

            console.log(`✅ ${this.availableDrivers.length + 1} opciones cargadas en filtro de conductores`);
        } catch (error) {
            console.error('❌ Error cargando conductores en filtro:', error);
        }
    }

    // Complete ride
    async completeRide(rideId) {
        try {
            console.log(`✅ Completing ride ${rideId}...`);
            
            const response = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
            });

            if (response.ok) {
                console.log('✅ Ride status updated to completed');
                
                // Remove from in-progress rides list
                const rideIndex = this.allInProgressRides.findIndex(r => r.id === rideId);
                if (rideIndex !== -1) {
                    this.allInProgressRides.splice(rideIndex, 1);
                    console.log('✅ Ride removed from in-progress rides list');
                }

                // Update UI immediately
                this.updateRidesList();
                this.updateStats();
                
                showSuccess('Viaje completado exitosamente - Estado: Completado');
                
                // Redirect immediately to completed rides page
                console.log('🔄 Redirecting to completed-rides.html...');
                window.location.href = 'completed-rides.html';
            } else {
                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Error completing ride:', error);
            showError('Error completando viaje: ' + error.message);
        }
    }

    // Edit ride - USA EL SERVICIO COMPARTIDO
    editRide(rideId) {
        const ride = this.allInProgressRides.find(r => r.id === rideId);
        if (!ride) {
            showError('Viaje no encontrado');
            return;
        }

        console.log('✏️ Abriendo modal de edición para viaje:', rideId);
        // Usar el servicio compartido de edición
        window.rideEditService.openEditModal(ride);
    }

    // Cancel ride
    async cancelRide(rideId) {
        try {
            console.log(`❌ Cancelling ride ${rideId}...`);
            
            const response = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
            });

            if (response.ok) {
                console.log('✅ Ride status updated to cancelled');
                
                // Remove from in-progress rides list
                const rideIndex = this.allInProgressRides.findIndex(r => r.id === rideId);
                if (rideIndex !== -1) {
                    this.allInProgressRides.splice(rideIndex, 1);
                    console.log('✅ Ride removed from in-progress rides list');
                }

                // Update UI immediately
                this.updateRidesList();
                this.updateStats();
                
                showSuccess('Viaje cancelado exitosamente - Estado: Cancelado');
                
                // Redirect immediately to cancelled rides page
                console.log('🔄 Redirecting to cancelled-rides.html...');
                window.location.href = 'cancelled-rides.html';
            } else {
                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Error cancelling ride:', error);
            showError('Error cancelando viaje: ' + error.message);
        }
    }

    // View driver location for a specific ride
    async viewDriverLocation(rideId) {
        try {
            console.log('📍 Viewing driver location for ride', rideId);
            
            const ride = this.allInProgressRides.find(r => r.id === rideId);
            if (!ride) {
                showError('Viaje no encontrado');
                return;
            }

            if (!ride.driver_id) {
                showError('Este viaje no tiene conductor asignado');
                return;
            }

            // Buscar conductor en la lista cargada
            let driver = this.driversMap.get(ride.driver_id);
            
            if (!driver) {
                console.log('👤 Driver not found in map, loading from database...');
                driver = await this.loadDriverById(ride.driver_id);
            }

            if (!driver) {
                showError('Información del conductor no disponible');
                return;
            }

            console.log('👤 Driver found:', driver);
            
            // Abrir modal de tracking
            await this.openDriverTrackingModal(ride, driver);
            
        } catch (error) {
            console.error('❌ Error viewing driver location:', error);
            showError('Error al ver ubicación del conductor: ' + error.message);
        }
    }

    // Load driver by ID from database
    async loadDriverById(driverId) {
        try {
            console.log('👤 Loading driver', driverId, 'from database...');
            
            // Try users table first
            const usersResponse = await fetch(`${this.supabaseUrl}/rest/v1/users?id=eq.${driverId}&select=*`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`
                }
            });
            
            const usersData = await usersResponse.json();
            
            if (usersData && usersData.length > 0) {
                const user = usersData[0];
                const driver = {
                    id: user.id,
                    display_name: user.display_name || user.email,
                    email: user.email,
                    phone_number: user.phone_number || '',
                    role: user.role || 'driver'
                };
                console.log('✅ Driver found in users table:', driver);
                return driver;
            }
            
            // Try drivers table
            const driversResponse = await fetch(`${this.supabaseUrl}/rest/v1/drivers?id=eq.${driverId}&select=*`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`
                }
            });
            
            const driversData = await driversResponse.json();
            
            if (driversData && driversData.length > 0) {
                const driverData = driversData[0];
                const driver = {
                    id: driverData.id,
                    display_name: driverData.display_name || 'Conductor',
                    email: driverData.email || '',
                    phone_number: driverData.phone_number || '',
                    role: 'driver'
                };
                
                console.log('✅ Driver found in drivers table:', driver);
                return driver;
            }
            
            console.error('❌ Driver not found in any table');
            return null;
            
        } catch (error) {
            console.error('❌ Error loading driver:', error);
            return null;
        }
    }

    // Open driver tracking modal
    async openDriverTrackingModal(ride, driver) {
        console.log('🟦 Starting location tracking for ride', ride.id, '...');
        
        // Create modal HTML with real map
        const modalHTML = `
            <div id="driverTrackingModal" class="modal-overlay" style="display: flex;">
                <div class="modal-content glassmorphism-modal">
                    <div class="modal-header">
                        <h3>📍 Desplazamiento del Conductor</h3>
                        <button class="modal-close" onclick="closeDriverTrackingModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="driver-info">
                            <h4>👤 ${driver.display_name}</h4>
                            <p>📧 ${driver.email}</p>
                            <p>📱 ${driver.phone_number || 'No disponible'}</p>
                        </div>
                        <div id="trackingMap" style="height: 400px; width: 100%; border-radius: 8px; margin-top: 16px;"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Initialize real map
        await this.initializeTrackingMap(ride, driver);
        
        // Start location tracking simulation
        this.startLocationTracking(ride.id);
    }

    // Initialize real tracking map
    async initializeTrackingMap(ride, driver) {
        try {
            console.log('🗺️ Initializing tracking map...');
            
            // Get coordinates from ride data (JSONB fields from database)
            let originCoords = null;
            let destinationCoords = null;
            let driverCoords = null;
            
            // Parse origin coordinates from JSONB field
            if (ride.origin && typeof ride.origin === 'object') {
                if (ride.origin.coordinates && typeof ride.origin.coordinates === 'object') {
                    if (ride.origin.coordinates.latitude !== undefined && ride.origin.coordinates.longitude !== undefined) {
                        originCoords = {
                            latitude: ride.origin.coordinates.latitude,
                            longitude: ride.origin.coordinates.longitude
                        };
                    }
                } else if (ride.origin.latitude && ride.origin.longitude) {
                    originCoords = { latitude: ride.origin.latitude, longitude: ride.origin.longitude };
                }
            }
            
            // Parse destination coordinates from JSONB field
            if (ride.destination && typeof ride.destination === 'object') {
                if (ride.destination.coordinates && typeof ride.destination.coordinates === 'object') {
                    if (ride.destination.coordinates.latitude !== undefined && ride.destination.coordinates.longitude !== undefined) {
                        destinationCoords = {
                            latitude: ride.destination.coordinates.latitude,
                            longitude: ride.destination.coordinates.longitude
                        };
                    }
                } else if (ride.destination.latitude && ride.destination.longitude) {
                    destinationCoords = { latitude: ride.destination.latitude, longitude: ride.destination.longitude };
                }
            }
            
            // Parse driver location from JSONB field
            if (ride.driver_location && typeof ride.driver_location === 'object') {
                if (ride.driver_location.latitude && ride.driver_location.longitude) {
                    driverCoords = {
                        latitude: ride.driver_location.latitude,
                        longitude: ride.driver_location.longitude
                    };
                }
            }
            
            // Helper function to validate coordinates
            const isValid = (coords) => {
                return coords && 
                       typeof coords.latitude === 'number' && 
                       typeof coords.longitude === 'number' &&
                       coords.latitude !== 0 && coords.longitude !== 0 && 
                       coords.latitude >= -90 && coords.latitude <= 90 &&
                       coords.longitude >= -180 && coords.longitude <= 180;
            };
            
            // Si no hay coordenadas válidas, intentar geocoding
            if (!isValid(originCoords) && ride.origin?.address) {
                console.log('🌍 No hay coordenadas de origen, intentando geocoding...');
                originCoords = await this.geocodeAddress(ride.origin.address);
            }
            
            if (!isValid(destinationCoords) && ride.destination?.address) {
                console.log('🌍 No hay coordenadas de destino, intentando geocoding...');
                destinationCoords = await this.geocodeAddress(ride.destination.address);
            }
            
            // Validar que tengamos coordenadas válidas después del geocoding
            if (!isValid(originCoords)) {
                console.error('❌ No se pueden obtener coordenadas de origen:', ride.origin);
                showError('No se pueden obtener coordenadas de origen');
                return;
            }
            
            if (!isValid(destinationCoords)) {
                console.error('❌ No se pueden obtener coordenadas de destino:', ride.destination);
                showError('No se pueden obtener coordenadas de destino');
                return;
            }
            
            if (!isValid(driverCoords)) {
                console.error('❌ No se pueden mostrar coordenadas del conductor - datos faltantes en BD:', ride.driver_location);
                showError('Coordenadas del conductor no disponibles en la base de datos');
                return;
            }
            
            console.log('✅ Usando coordenadas válidas:', { originCoords, destinationCoords, driverCoords });
            
            // Initialize Leaflet map
            const map = L.map('trackingMap').setView([driverCoords.latitude, driverCoords.longitude], 13);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Create custom icons with different colors
            const driverIcon = L.divIcon({
                className: 'driver-marker',
                html: '<div style="background-color: #FF9800; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            const originIcon = L.divIcon({
                className: 'origin-marker',
                html: '<div style="background-color: #4CAF50; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            
            const destinationIcon = L.divIcon({
                className: 'destination-marker',
                html: '<div style="background-color: #F44336; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            
            // Add markers with custom icons
            const originMarker = L.marker([originCoords.latitude, originCoords.longitude], { icon: originIcon })
                .addTo(map)
                .bindPopup('<b>📍 Origen</b><br>' + (ride.origin?.address || 'Origen'));
            
            const destinationMarker = L.marker([destinationCoords.latitude, destinationCoords.longitude], { icon: destinationIcon })
                .addTo(map)
                .bindPopup('<b>🎯 Destino</b><br>' + (ride.destination?.address || 'Destino'));
            
            const driverMarker = L.marker([driverCoords.latitude, driverCoords.longitude], { icon: driverIcon })
                .addTo(map)
                .bindPopup('<b>🚗 Conductor</b><br>' + driver.display_name);
            
            // Store driver marker globally for tracking updates
            window.driverMarker = driverMarker;
            
            // Add real routes using OSRM
            await this.addRealRoutes(map, driverCoords, originCoords, destinationCoords);
            
            // Fit map to show all markers
            const group = new L.featureGroup([originMarker, destinationMarker, driverMarker]);
            map.fitBounds(group.getBounds().pad(0.1));
            
            console.log('✅ Tracking map initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing tracking map:', error);
            showError('Error inicializando el mapa de seguimiento: ' + error.message);
        }
    }

    // Geocoding service - Usar Nominatim (gratuito)
    async geocodeAddress(address) {
        try {
            console.log('🌍 Geocodificando dirección:', address);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                const coords = {
                    latitude: parseFloat(result.lat),
                    longitude: parseFloat(result.lon)
                };
                console.log('✅ Geocodificación exitosa:', coords);
                return coords;
            } else {
                console.log('⚠️ No se encontraron coordenadas para:', address);
                return null;
            }
        } catch (error) {
            console.error('❌ Error en geocodificación:', error);
            return null;
        }
    }

    // Add real routes using OSRM
    async addRealRoutes(map, driverCoords, originCoords, destinationCoords) {
        try {
            console.log('🛣️ Adding real routes to map...');
            
            // Route from driver to origin
            if (driverCoords && originCoords) {
                const driverToOriginRoute = await this.getOSRMRoute(
                    [driverCoords.longitude, driverCoords.latitude],
                    [originCoords.longitude, originCoords.latitude]
                );
                
                if (driverToOriginRoute) {
                    L.polyline(driverToOriginRoute, { color: 'blue', weight: 3, opacity: 0.7 })
                        .addTo(map)
                        .bindPopup('Ruta del conductor al origen');
                }
            }
            
            // Route from origin to destination
            if (originCoords && destinationCoords) {
                const originToDestinationRoute = await this.getOSRMRoute(
                    [originCoords.longitude, originCoords.latitude],
                    [destinationCoords.longitude, destinationCoords.latitude]
                );
                
                if (originToDestinationRoute) {
                    L.polyline(originToDestinationRoute, { color: 'green', weight: 4, opacity: 0.8 })
                        .addTo(map)
                        .bindPopup('Ruta del viaje');
                }
            }
            
        } catch (error) {
            console.error('❌ Error adding routes:', error);
        }
    }

    // Get route from OSRM
    async getOSRMRoute(start, end) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
                console.log('✅ Route obtained from OSRM:', coordinates.length, 'points');
                return coordinates;
            } else {
                console.warn('⚠️ No route found from OSRM');
                return null;
            }
        } catch (error) {
            console.error('❌ Error getting OSRM route:', error);
            return null;
        }
    }

    // Start location tracking simulation
    startLocationTracking(rideId) {
        console.log('🔄 Starting location tracking for ride', rideId);
        
        // Check if simulation is enabled (can be disabled for production)
        const enableSimulation = false; // Set to true to enable driver movement simulation
        
        if (!enableSimulation) {
            console.log('📍 Location tracking simulation disabled - using static position');
            return;
        }
        
        // Simulate driver movement (in real app, this would be real-time GPS updates)
        this.trackingInterval = setInterval(() => {
            // Update driver marker position
            const driverMarker = window.driverMarker;
            if (driverMarker) {
                // Simulate realistic movement (smaller changes, less frequent)
                const currentPos = driverMarker.getLatLng();
                const newLat = currentPos.lat + (Math.random() - 0.5) * 0.0001; // Much smaller movement
                const newLng = currentPos.lng + (Math.random() - 0.5) * 0.0001; // Much smaller movement
                
                driverMarker.setLatLng([newLat, newLng]);
                console.log('📍 Driver position updated:', newLat.toFixed(6), newLng.toFixed(6));
            }
        }, 15000); // Update every 15 seconds (more realistic)
    }

    // Stop location tracking
    stopLocationTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
            console.log('⏹️ Location tracking stopped');
        }
    }
}

// Global instance
let inProgressRidesService;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚗 In Progress Rides page loading...');
    
    // Show loading screen initially
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
    
    inProgressRidesService = new InProgressRidesService();
    await inProgressRidesService.init();
});

// Global functions for HTML onclick events
function goBack() {
    console.log('🔙 Going back...');
    // Regresar directamente a ride-management.html (un nivel arriba)
    window.location.href = '../ride-management.html';
}

function loadData() {
    if (inProgressRidesService) {
        inProgressRidesService.loadData();
    }
}

function filterRides() {
    if (inProgressRidesService) {
        inProgressRidesService.filterRides();
    }
}

function clearFilters() {
    console.log('🧹 No filters to clear in simplified version');
    if (inProgressRidesService) {
        inProgressRidesService.filteredRides = [...inProgressRidesService.allInProgressRides];
        inProgressRidesService.updateRidesList();
        inProgressRidesService.updateStats();
    }
}

function toggleRideCard(rideId) {
    const contentElement = document.getElementById(`rideContent_${rideId}`);
    const cardElement = document.querySelector(`[data-ride-id="${rideId}"]`);
    const arrowElement = cardElement?.querySelector('.expand-arrow');
    
    if (contentElement && cardElement && arrowElement) {
        const isVisible = contentElement.style.display !== 'none';
        
        if (isVisible) {
            contentElement.style.display = 'none';
            cardElement.classList.remove('expanded');
            arrowElement.style.transform = 'rotate(0deg)';
        } else {
            contentElement.style.display = 'block';
            cardElement.classList.add('expanded');
            arrowElement.style.transform = 'rotate(180deg)';
        }
    }
}

function completeRide(rideId) {
    console.log('✅ Complete ride:', rideId);
    
    if (confirm('¿Quieres finalizar este viaje? El estado cambiará a "Completado"')) {
        if (inProgressRidesService) {
            inProgressRidesService.completeRide(rideId);
        }
    }
}

function editRide(rideId) {
    console.log('✏️ Edit ride:', rideId);
    if (inProgressRidesService) {
        inProgressRidesService.editRide(rideId);
    }
}

function cancelRide(rideId) {
    console.log('❌ Cancel ride:', rideId);
    
    if (confirm('¿Estás seguro de que quieres cancelar este viaje?')) {
        if (inProgressRidesService) {
            inProgressRidesService.cancelRide(rideId);
        }
    }
}

function viewDriverLocation(rideId) {
    console.log('📍 View driver location:', rideId);
    
    if (inProgressRidesService) {
        inProgressRidesService.viewDriverLocation(rideId);
    }
}

function closeDriverTrackingModal() {
    const modal = document.getElementById('driverTrackingModal');
    if (modal) {
        modal.remove();
    }
    
    // Stop tracking if active
    if (inProgressRidesService) {
        inProgressRidesService.stopLocationTracking();
    }
}

function showSuccess(message) {
    console.log('✅ Success:', message);
    alert(message); // Replace with proper notification
}

function showError(message) {
    console.error('❌ Error:', message);
    alert('Error: ' + message); // Replace with proper notification
}
