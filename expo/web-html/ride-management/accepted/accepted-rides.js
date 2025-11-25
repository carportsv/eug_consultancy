// Accepted Rides - Specific functionality for accepted rides page
class AcceptedRidesService {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        this.allAcceptedRides = [];
        this.filteredRides = [];
        this.availableDrivers = [];
        this.userMap = new Map(); // Para mapear user_id a user data
    }

    async init() {
        console.log('✅ Initializing Accepted Rides Service...');
        
        // Servicio de edición implementado localmente
        
        await this.loadDrivers();
        await this.loadData();
        this.setupRealtimeSubscriptions();
        this.setupModalEventListeners();
        
        // Listen for ride updates
        document.addEventListener('rideUpdated', () => {
            console.log('🔄 Viaje actualizado, recargando datos...');
            this.loadData();
        });
    }

    // Load available drivers for assignment
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

            // Build user map for all drivers
            drivers.forEach(driver => {
                this.userMap.set(driver.id, driver);
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
            console.log('📊 Loading accepted rides data...');
            
            // Load only accepted rides
            const ridesResponse = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?status=eq.accepted&select=*&order=created_at.desc`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (ridesResponse.ok) {
                this.allAcceptedRides = await ridesResponse.json();
                this.filteredRides = [...this.allAcceptedRides];
                console.log(`✅ ${this.allAcceptedRides.length} accepted rides loaded`);
                
                // Update UI
                this.updateRidesList();
                this.updateStats();
            }

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

            console.log('✅ Accepted rides data loaded');
        } catch (error) {
            console.error('❌ Error loading accepted rides data:', error);
            showError('Error loading data: ' + error.message);
        }
    }

    // Update rides list
    updateRidesList() {
        const ridesList = document.getElementById('allRidesList');
        const noRides = document.getElementById('noDataMessage');

        if (!ridesList) return;

        if (this.filteredRides.length === 0) {
            ridesList.style.display = 'none';
            if (noRides) noRides.style.display = 'flex';
            return;
        }

        ridesList.style.display = 'block';
        if (noRides) noRides.style.display = 'none';

        ridesList.innerHTML = this.filteredRides.map(ride => this.createRideCard(ride)).join('');
    }

    // Create ride card HTML
    createRideCard(ride) {
        const driver = ride.driver_id ? this.userMap.get(ride.driver_id) : null;
        const driverName = driver ? (driver.display_name || driver.email) : 'Sin asignar';
        const createdAt = new Date(ride.created_at).toLocaleString('es-ES');        const acceptedAt = ride.updated_at ? new Date(ride.updated_at).toLocaleString('es-ES') : 'N/A';
        const origin = ride.origin?.address || 'N/A';
        const destination = ride.destination?.address || 'N/A';
        const price = ride.price ? `$${parseFloat(ride.price).toFixed(2)}` : 'N/A';
        const distance = ride.distance ? `${(ride.distance / 1000).toFixed(1)} km` : 'N/A';
        const clientName = ride.client_name || 'N/A';
        const additionalNotes = ride.additional_notes || '';

        return `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-header" onclick="toggleRideCard('${ride.id}')">
                    <div class="ride-status status-active">
                        <span class="status-badge">Aceptado</span>
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
                        <button class="btn btn-sm btn-outline" onclick="openDriverSelection('${ride.id}')">
                            👤 Editar Driver
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

    // Update statistics
    updateStats() {
        const acceptedRides = this.allAcceptedRides.length;
        const assignedDrivers = this.allAcceptedRides.filter(ride => ride.driver_id).length;
        const readyToStart = this.allAcceptedRides.filter(ride => ride.driver_id && ride.status === 'accepted').length;

        // Update stats only if elements exist
        const acceptedRidesCount = document.getElementById('acceptedRidesCount');
        const assignedDriversCount = document.getElementById('assignedDriversCount');
        const readyToStartCount = document.getElementById('readyToStartCount');
        
        if (acceptedRidesCount) acceptedRidesCount.textContent = acceptedRides;
        if (assignedDriversCount) assignedDriversCount.textContent = assignedDrivers;
        if (readyToStartCount) readyToStartCount.textContent = readyToStart;
    }

    // Filter rides based on current filters
    filterRides() {
        const driverFilterEl = document.getElementById('driverFilter');
        const dateFilterEl = document.getElementById('dateFilter');
        const priorityFilterEl = document.getElementById('priorityFilter');
        
        const driverFilter = driverFilterEl ? driverFilterEl.value : '';
        const dateFilter = dateFilterEl ? dateFilterEl.value : '';
        const priorityFilter = priorityFilterEl ? priorityFilterEl.value : '';

        console.log('🔍 Aplicando filtros:', { driverFilter, dateFilter, priorityFilter });

        this.filteredRides = this.allAcceptedRides.filter(ride => {
            // Driver filter
            if (driverFilter && ride.driver_id !== driverFilter) {
                return false;
            }

            // Date filter
            if (dateFilter) {
                const rideDate = new Date(ride.created_at).toISOString().split('T')[0];
                if (rideDate !== dateFilter) {
                    return false;
                }
            }

            // Priority filter
            if (priorityFilter && ride.priority !== priorityFilter) {
                return false;
            }

            return true;
        });

        console.log('📊 Viajes después de filtrar:', this.filteredRides.length);
        this.updateRidesList();
    }

    // Cargar conductores en el filtro de conductores
    loadDriversInFilter() {
        try {
            const driverFilter = document.getElementById('driverFilter');
            if (!driverFilter) return;

            // Limpiar opciones existentes
            driverFilter.innerHTML = '';

            // Agregar opción "Todos los conductores"
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = 'Todos los conductores';
            driverFilter.appendChild(allOption);

            // Agregar cada conductor
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

    // Load drivers for selection modal
    async loadDriversForSelection() {
        const driverList = document.getElementById('driverSelectionList');
        if (!driverList) return;

        let html = `
            <div class="driver-option" onclick="selectDriver(null)">
                <div class="driver-info">
                    <div class="driver-name">Sin conductor</div>
                    <div class="driver-email">Dejar sin asignar</div>
                </div>
            </div>
        `;

        if (this.availableDrivers.length === 0) {
            html += `
                <div class="driver-option no-drivers">
                    <div class="driver-info">
                        <div class="driver-name">No hay conductores disponibles</div>
                        <div class="driver-email">Verifica que existan usuarios con rol de conductor</div>
                    </div>
                </div>
            `;
        } else {
            this.availableDrivers.forEach(driver => {
                html += `
                    <div class="driver-option" onclick="selectDriver('${driver.id}')">
                        <div class="driver-info">
                            <div class="driver-name">${driver.display_name || driver.email || 'Sin nombre'}</div>
                            <div class="driver-email">${driver.email || 'Sin email'}</div>
                            ${driver.phone_number ? `<div class="driver-phone">📱 ${driver.phone_number}</div>` : ''}
                        </div>
                    </div>
                `;
            });
        }

        driverList.innerHTML = html;
        console.log('✅ Lista de conductores cargada en el modal');
    }

    // Assign driver to ride
    async assignDriverToRide(rideId, driverId) {
        try {
            console.log(`👤 Assigning driver ${driverId} to ride ${rideId}...`);
            
            // Find the current ride to check its status
            const currentRide = this.allAcceptedRides.find(r => r.id === rideId);
            if (currentRide) {
                console.log('📋 Current ride status:', currentRide.status, 'Current driver:', currentRide.driver_id);
            }
            
            const updateData = driverId ? {
                driver_id: driverId,
                updated_at: new Date().toISOString()
            } : {
                driver_id: null,
                status: 'requested',
                updated_at: new Date().toISOString()
            };
            
            console.log('📤 Update data:', updateData);
            
            const response = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                // Update local data
                const rideIndex = this.allAcceptedRides.findIndex(r => r.id === rideId);
                if (rideIndex !== -1) {
                    this.allAcceptedRides[rideIndex].driver_id = driverId;
                    this.allAcceptedRides[rideIndex].status = driverId ? 'requested' : 'requested';
                    
                    // Remove from accepted rides if no driver
                    if (!driverId) {
                        this.allAcceptedRides.splice(rideIndex, 1);
                        showSuccess('Conductor removido. El viaje ahora está en "Crear Viajes"');
                        // Redirect back to main page
                        setTimeout(() => {
                            window.location.href = '../ride-management.html';
                        }, 1500);
                        return;
                    }
                }

                this.updateRidesList();
                this.updateStats();
                
                if (driverId) {
                    showSuccess('Conductor asignado exitosamente');
                }
                closeDriverSelectionModal();
            } else {
                const errorText = await response.text();
                console.error('❌ HTTP Error Response:', response.status, errorText);
                throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Error assigning driver:', error);
            showError('Error assigning driver: ' + error.message);
        }
    }

    // View driver location and tracking
    async viewDriverLocation(rideId) {
        try {
            console.log(`📍 Viewing driver location for ride ${rideId}...`);
            
            const ride = this.allAcceptedRides.find(r => r.id === rideId);
            if (!ride) {
                showError('Viaje no encontrado');
                return;
            }

            if (!ride.driver_id) {
                showError('Este viaje no tiene conductor asignado');
                return;
            }

            let driver = this.userMap.get(ride.driver_id);
            
            // If driver not found in map, try to load it from database
            if (!driver) {
                console.log(`👤 Driver ${ride.driver_id} not found in map, loading from database...`);
                driver = await this.loadDriverById(ride.driver_id);
                
                if (!driver) {
                    showError('Información del conductor no disponible');
                    return;
                }
                
                // Add to map for future use
                this.userMap.set(driver.id, driver);
            }

            // Open driver tracking modal or redirect to tracking page
            await this.openDriverTrackingModal(ride, driver);
            
        } catch (error) {
            console.error('❌ Error viewing driver location:', error);
            showError('Error al ver ubicación del conductor: ' + error.message);
        }
    }

    // Load specific driver by ID
    async loadDriverById(driverId) {
        try {
            console.log(`👤 Loading driver ${driverId} from database...`);
            
            // Primero intentar en la tabla users
            let response = await fetch(`${this.supabaseUrl}/rest/v1/users?id=eq.${driverId}&select=id,display_name,email,phone_number,role&limit=1`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`🔍 Users table response status: ${response.status}`);

            if (response.ok) {
                const users = await response.json();
                console.log(`🔍 Users table response:`, users);
                
                if (users && users.length > 0) {
                    const user = users[0];
                    const driverData = {
                        id: user.id,
                        display_name: user.display_name || 'Conductor',
                        email: user.email || '',
                        phone_number: user.phone_number || '',
                        role: user.role || 'driver'
                    };
                    console.log(`✅ Driver found in users table:`, driverData);
                    return driverData;
                }
            }

            // Si no se encuentra en users, intentar en la tabla drivers
            console.log(`👤 Driver not found in users table, trying drivers table...`);
            response = await fetch(`${this.supabaseUrl}/rest/v1/drivers?id=eq.${driverId}&select=*&limit=1`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`🔍 Drivers table response status: ${response.status}`);

            if (response.ok) {
                const drivers = await response.json();
                console.log(`🔍 Drivers table response:`, drivers);
                
                if (drivers && drivers.length > 0) {
                    const driver = drivers[0];
                    console.log(`🔍 Raw driver data:`, driver);
                    
                    // Convertir formato de drivers a formato de users
                    const driverData = {
                        id: driver.id,
                        display_name: driver.display_name || driver.name || driver.full_name || 'Conductor',
                        email: driver.email || '',
                        phone_number: driver.phone || driver.phone_number || driver.mobile || '',
                        role: 'driver'
                    };
                    console.log(`✅ Driver found in drivers table:`, driverData);
                    return driverData;
                }
            } else {
                const errorText = await response.text();
                console.error(`❌ HTTP Error ${response.status}:`, errorText);
            }

            // Si no se encuentra en ninguna tabla, crear un conductor temporal
            console.log(`👤 Driver not found in any table, creating temporary driver info...`);
            const tempDriver = {
                id: driverId,
                display_name: 'Conductor',
                email: '',
                phone_number: '',
                role: 'driver'
            };
            console.log(`✅ Temporary driver created:`, tempDriver);
            return tempDriver;
            
        } catch (error) {
            console.error('❌ Error loading driver by ID:', error);
            
            // En caso de error, crear un conductor temporal
            const tempDriver = {
                id: driverId,
                display_name: 'Conductor',
                email: '',
                phone_number: '',
                role: 'driver'
            };
            console.log(`✅ Temporary driver created after error:`, tempDriver);
            return tempDriver;
        }
    }

    // Open driver tracking modal
    async openDriverTrackingModal(ride, driver) {
        console.log('🟦 Starting location tracking for ride', ride.id, '...');
        
        // Create modal HTML with real map
        const modalHTML = `
            <div id="driverTrackingModal" class="modal-overlay" style="display: flex;">
                <div class="modal-content glassmorphism-modal" style="max-width: 800px; width: 90%;">
                    <div class="modal-header">
                        <h3>📍 Desplazamiento del Conductor</h3>
                        <button class="modal-close" onclick="closeDriverTrackingModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="driver-info">
                            <h4>👤 Conductor: ${driver.display_name || driver.email}</h4>
                            <p>📱 Teléfono: ${driver.phone_number || 'No disponible'}</p>
                            <p>🚗 Viaje: ${ride.client_name || 'Sin nombre'}</p>
                        </div>
                        
                        <div class="tracking-container">
                            <div id="trackingMap" style="height: 400px; width: 100%; border-radius: 8px; background: #f0f0f0;"></div>
                            
                            <div class="tracking-info" style="margin-top: 16px; padding: 16px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                                <div class="info-row">
                                    <span class="label">📍 Ubicación actual:</span>
                                    <span class="value">Obteniendo ubicación...</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">⏱️ Última actualización:</span>
                                    <span class="value">${new Date().toLocaleString('es-ES')}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">🚗 Estado del viaje:</span>
                                    <span class="value">Aceptado</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeDriverTrackingModal()">Cerrar</button>
                        <button class="btn btn-primary" onclick="refreshDriverLocation('${ride.id}')">
                            🔄 Actualizar Ubicación
                        </button>
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
                console.log('🔍 Parsing origin data:', ride.origin);
                console.log('🔍 Origin coordinates object:', ride.origin.coordinates);
                console.log('🔍 Origin keys:', Object.keys(ride.origin));
                console.log('🔍 Origin full structure:', JSON.stringify(ride.origin, null, 2));
                
                if (ride.origin.coordinates && typeof ride.origin.coordinates === 'object') {
                    // Check if coordinates has latitude/longitude properties
                    if (ride.origin.coordinates.latitude !== undefined && ride.origin.coordinates.longitude !== undefined) {
                        originCoords = {
                            latitude: ride.origin.coordinates.latitude,
                            longitude: ride.origin.coordinates.longitude
                        };
                        console.log('✅ Origin coordinates from coordinates object:', originCoords);
                    } else {
                        console.log('❌ Origin coordinates object missing lat/lng:', ride.origin.coordinates);
                    }
                } else if (ride.origin.latitude && ride.origin.longitude) {
                    originCoords = { latitude: ride.origin.latitude, longitude: ride.origin.longitude };
                    console.log('✅ Origin coordinates from direct fields:', originCoords);
                } else {
                    console.log('❌ Origin coordinates not found in expected format');
                }
            }
            
            // Parse destination coordinates from JSONB field
            if (ride.destination && typeof ride.destination === 'object') {
                console.log('🔍 Parsing destination data:', ride.destination);
                console.log('🔍 Destination coordinates object:', ride.destination.coordinates);
                console.log('🔍 Destination keys:', Object.keys(ride.destination));
                console.log('🔍 Destination full structure:', JSON.stringify(ride.destination, null, 2));
                
                if (ride.destination.coordinates && typeof ride.destination.coordinates === 'object') {
                    // Check if coordinates has latitude/longitude properties
                    if (ride.destination.coordinates.latitude !== undefined && ride.destination.coordinates.longitude !== undefined) {
                        destinationCoords = {
                            latitude: ride.destination.coordinates.latitude,
                            longitude: ride.destination.coordinates.longitude
                        };
                        console.log('✅ Destination coordinates from coordinates object:', destinationCoords);
                    } else {
                        console.log('❌ Destination coordinates object missing lat/lng:', ride.destination.coordinates);
                    }
                } else if (ride.destination.latitude && ride.destination.longitude) {
                    destinationCoords = { latitude: ride.destination.latitude, longitude: ride.destination.longitude };
                    console.log('✅ Destination coordinates from direct fields:', destinationCoords);
                } else {
                    console.log('❌ Destination coordinates not found in expected format');
                }
            }
            
            // Parse driver location from JSONB field
            if (ride.driver_location && typeof ride.driver_location === 'object') {
                console.log('🔍 Parsing driver location data:', ride.driver_location);
                if (ride.driver_location.coordinates && ride.driver_location.coordinates.latitude && ride.driver_location.coordinates.longitude) {
                    driverCoords = ride.driver_location.coordinates;
                    console.log('✅ Driver coordinates from coordinates field:', driverCoords);
                } else if (ride.driver_location.latitude && ride.driver_location.longitude) {
                    driverCoords = { latitude: ride.driver_location.latitude, longitude: ride.driver_location.longitude };
                    console.log('✅ Driver coordinates from direct fields:', driverCoords);
                } else if (ride.driver_location.lat && ride.driver_location.lng) {
                    driverCoords = { latitude: ride.driver_location.lat, longitude: ride.driver_location.lng };
                    console.log('✅ Driver coordinates from lat/lng fields:', driverCoords);
                } else {
                    console.log('❌ Driver coordinates not found in expected format');
                }
            }
            
            // Validate coordinates - no hardcoded fallbacks
            
            // Check if coordinates are valid (not null/undefined and have proper values)
            const isValid = (coords) => {
                if (!coords || !coords.latitude || !coords.longitude) return false;
                // Check if coordinates are within reasonable bounds (not 0,0 or invalid)
                return coords.latitude !== 0 && coords.longitude !== 0 && 
                       coords.latitude >= -90 && coords.latitude <= 90 &&
                       coords.longitude >= -180 && coords.longitude <= 180;
            };
            
            // Si no hay coordenadas válidas, intentar geocoding
            if (!isValid(originCoords) && ride.origin?.address) {
                console.log('🌍 No hay coordenadas de origen, intentando geocoding...');
                originCoords = await this.geocodeAddress(ride.origin.address);
                if (originCoords) {
                    console.log('✅ Coordenadas de origen obtenidas por geocoding:', originCoords);
                }
            }
            
            if (!isValid(destinationCoords) && ride.destination?.address) {
                console.log('🌍 No hay coordenadas de destino, intentando geocoding...');
                destinationCoords = await this.geocodeAddress(ride.destination.address);
                if (destinationCoords) {
                    console.log('✅ Coordenadas de destino obtenidas por geocoding:', destinationCoords);
                }
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
            
            console.log('📍 Map coordinates:', { originCoords, destinationCoords, driverCoords });
            console.log('📍 Ride data:', ride);
            console.log('📍 Origin data:', ride.origin);
            console.log('📍 Destination data:', ride.destination);
            console.log('📍 Driver location data:', ride.driver_location);
            
            // Load Leaflet CSS and JS if not already loaded
            this.loadLeafletResources().then(() => {
                this.createMap(ride, driver, originCoords, destinationCoords, driverCoords);
            }).catch(error => {
                console.error('❌ Error loading Leaflet resources:', error);
                this.showMapError();
            });
            
        } catch (error) {
            console.error('❌ Error initializing tracking map:', error);
            this.showMapError();
        }
    }

    // Load Leaflet resources
    loadLeafletResources() {
        return new Promise((resolve, reject) => {
            // Check if Leaflet is already loaded
            if (window.L) {
                console.log('✅ Leaflet already loaded');
                resolve();
                return;
            }

            console.log('📦 Loading Leaflet resources...');
            
            // Load CSS
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(cssLink);

            // Load JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
                console.log('✅ Leaflet loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Error loading Leaflet');
                reject(new Error('Failed to load Leaflet'));
            };
            document.head.appendChild(script);
        });
    }

    // Create the actual map
    createMap(ride, driver, originCoords, destinationCoords, driverCoords) {
        try {
            const mapContainer = document.getElementById('trackingMap');
            if (!mapContainer) {
                console.error('❌ Map container not found');
                return;
            }

            // Clear container
            mapContainer.innerHTML = '';
            
            // Create map div
            const mapDiv = document.createElement('div');
            mapDiv.id = 'trackingMapInstance';
            mapDiv.style.width = '100%';
            mapDiv.style.height = '100%';
            mapDiv.style.borderRadius = '8px';
            mapContainer.appendChild(mapDiv);

            // Initialize map
            const map = L.map('trackingMapInstance').setView([driverCoords.latitude, driverCoords.longitude], 15);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            
            // Create custom icons with different colors
            const driverIcon = L.divIcon({
                className: 'driver-marker',
                html: '<div style="background-color: #2196F3; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
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
            
            // Add markers
            const driverMarker = L.marker([driverCoords.latitude, driverCoords.longitude], { icon: driverIcon })
                .addTo(map)
                .bindPopup(`Conductor: ${driver.display_name || "Conductor"}`);
            
            const originMarker = L.marker([originCoords.latitude, originCoords.longitude], { icon: originIcon })
                .addTo(map)
                .bindPopup(`Origen: ${ride.origin?.address || "Origen"}`);
            
            const destinationMarker = L.marker([destinationCoords.latitude, destinationCoords.longitude], { icon: destinationIcon })
                .addTo(map)
                .bindPopup(`Destino: ${ride.destination?.address || "Destino"}`);
            
            // Add real routes using OSRM
            this.addRealRoutes(map, driverCoords, originCoords, destinationCoords);
            
            // Fit map to show all markers
            const group = new L.featureGroup([driverMarker, originMarker, destinationMarker]);
            map.fitBounds(group.getBounds().pad(0.1));
            
            // Store map reference for updates
            this.trackingMap = map;
            this.trackingMapDriverMarker = driverMarker;
            
            console.log('✅ Tracking map created successfully');
            
        } catch (error) {
            console.error('❌ Error creating map:', error);
            this.showMapError();
        }
    }

    // Show map error
    showMapError() {
        const mapContainer = document.getElementById('trackingMap');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; color: #666; background: #f0f0f0; border-radius: 8px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🗺️</div>
                    <p>Mapa de seguimiento</p>
                    <p style="font-size: 14px; margin-top: 8px;">Error al cargar el mapa</p>
                </div>
            `;
        }
    }

    // Start location tracking (simulation for now)
    startLocationTracking(rideId) {
        console.log(`🔄 Starting location tracking for ride ${rideId}...`);
        
        // Simulate location updates every 10 seconds
        this.trackingInterval = setInterval(() => {
            this.updateDriverLocation(rideId);
        }, 10000);
        
        // Initial update
        this.updateDriverLocation(rideId);
    }

    // Add real routes using OSRM routing service
    async addRealRoutes(map, driverCoords, originCoords, destinationCoords) {
        try {
            console.log('🛣️ Calculando rutas reales...');
            
            // Route 1: Driver to Origin (pickup)
            if (driverCoords && originCoords) {
                console.log('📍 Calculando ruta: Conductor → Origen');
                const driverToOriginRoute = await this.getOSRMRoute(
                    driverCoords.longitude, driverCoords.latitude,
                    originCoords.longitude, originCoords.latitude
                );
                
                if (driverToOriginRoute && driverToOriginRoute.length > 0) {
                    L.polyline(driverToOriginRoute, {
                        color: '#FF9800', // Orange for driver to pickup
                        weight: 4,
                        opacity: 0.8
                    }).addTo(map);
                    console.log('✅ Ruta conductor → origen agregada');
                }
            }
            
            // Route 2: Origin to Destination (main trip)
            if (originCoords && destinationCoords) {
                console.log('📍 Calculando ruta: Origen → Destino');
                const originToDestinationRoute = await this.getOSRMRoute(
                    originCoords.longitude, originCoords.latitude,
                    destinationCoords.longitude, destinationCoords.latitude
                );
                
                if (originToDestinationRoute && originToDestinationRoute.length > 0) {
                    L.polyline(originToDestinationRoute, {
                        color: '#4CAF50', // Green for main trip
                        weight: 5,
                        opacity: 0.9
                    }).addTo(map);
                    console.log('✅ Ruta origen → destino agregada');
                }
            }
            
        } catch (error) {
            console.error('❌ Error calculando rutas:', error);
            // Fallback: show straight lines if routing fails
            this.addFallbackRoutes(map, driverCoords, originCoords, destinationCoords);
        }
    }
    
    // Get route from OSRM
    async getOSRMRoute(startLng, startLat, endLng, endLat) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
            console.log('🌍 OSRM URL:', url);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates;
                console.log(`✅ Ruta OSRM obtenida: ${coordinates.length} puntos`);
                return coordinates;
            } else {
                console.warn('⚠️ No se encontró ruta en OSRM');
                return null;
            }
        } catch (error) {
            console.error('❌ Error en OSRM:', error);
            return null;
        }
    }
    
    // Fallback routes (straight lines) if OSRM fails
    addFallbackRoutes(map, driverCoords, originCoords, destinationCoords) {
        console.log('🔄 Usando rutas de respaldo (líneas rectas)');
        
        if (driverCoords && originCoords) {
            L.polyline([
                [driverCoords.latitude, driverCoords.longitude],
                [originCoords.latitude, originCoords.longitude]
            ], {
                color: '#FF9800',
                weight: 3,
                opacity: 0.6,
                dashArray: '5, 5'
            }).addTo(map);
        }
        
        if (originCoords && destinationCoords) {
            L.polyline([
                [originCoords.latitude, originCoords.longitude],
                [destinationCoords.latitude, destinationCoords.longitude]
            ], {
                color: '#4CAF50',
                weight: 3,
                opacity: 0.6,
                dashArray: '5, 5'
            }).addTo(map);
        }
    }

    // Update driver location display
    updateDriverLocation(rideId) {
        const locationValue = document.querySelector('#driverTrackingModal .info-row .value');
        const lastUpdateValue = document.querySelector('#driverTrackingModal .info-row:nth-child(2) .value');
        
        if (locationValue) {
            // Use real location data instead of hardcoded simulation
            locationValue.textContent = 'Ubicación en tiempo real';
        }
        
        if (lastUpdateValue) {
            lastUpdateValue.textContent = new Date().toLocaleString('es-ES');
        }
    }

    // Stop location tracking
    stopLocationTracking() {
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
            console.log('🛑 Location tracking stopped');
        }
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
                // Remove from accepted rides
                const rideIndex = this.allAcceptedRides.findIndex(r => r.id === rideId);
                if (rideIndex !== -1) {
                    this.allAcceptedRides.splice(rideIndex, 1);
                }

                this.updateRidesList();
                this.updateStats();
                
                showSuccess('Viaje cancelado exitosamente');
                
                // Redirect to cancelled rides page
                setTimeout(() => {
                    window.location.href = 'cancelled-rides.html';
                }, 1500);
            } else {
                throw new Error(`HTTP Error: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error cancelling ride:', error);
            showError('Error cancelling ride: ' + error.message);
        }
    }

    // Open edit ride modal - IMPLEMENTACIÓN LOCAL TEMPORAL
    openEditRideModal(rideId) {
        const ride = this.allAcceptedRides.find(r => r.id === rideId);
        if (!ride) {
            showError('Viaje no encontrado');
            return;
        }

        console.log('✏️ Abriendo modal de edición para viaje:', rideId);
        this.showEditRideModal(ride);
    }

    // Show edit ride modal - IMPLEMENTACIÓN LOCAL
    showEditRideModal(ride) {
        console.log('📝 Datos del viaje para edición:', ride);
        
        // Fill form fields
        const idField = document.getElementById('editRideId');
        const originField = document.getElementById('editRideOrigin');
        const destinationField = document.getElementById('editRideDestination');
        const priceField = document.getElementById('editRidePrice');
        const clientField = document.getElementById('editRideClientName');
        const notesField = document.getElementById('editRideAdditionalNotes');
        const priorityField = document.getElementById('editRidePriority');
        const dateField = document.getElementById('editRideScheduledDate');
        const timeField = document.getElementById('editRideScheduledTime');
        
        if (idField) idField.value = ride.id || '';
        if (originField) originField.value = this.getRideField(ride, 'origin', 'address');
        if (destinationField) destinationField.value = this.getRideField(ride, 'destination', 'address');
        if (priceField) priceField.value = this.getRideField(ride, 'price') || 0;
        if (clientField) clientField.value = this.getRideField(ride, 'client_name') || this.getRideField(ride, 'user_name') || '';
        if (notesField) notesField.value = this.getRideField(ride, 'additional_notes');
        if (priorityField) priorityField.value = this.getRideField(ride, 'priority') || 'normal';
        
        // Handle scheduled date/time
        const scheduledAt = this.getRideField(ride, 'scheduled_at');
        if (scheduledAt && dateField && timeField) {
            const date = new Date(scheduledAt);
            dateField.value = date.toISOString().split('T')[0];
            timeField.value = date.toTimeString().slice(0, 5);
        }
        
        // Show the modal
        const modal = document.getElementById('editRideModal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.error('❌ Modal editRideModal no encontrado en el DOM');
            showError('Modal de edición no disponible');
        }
    }

    // Helper function to safely get ride field values
    getRideField(ride, field, subField = null) {
        try {
            if (subField) {
                return ride[field] && ride[field][subField] ? ride[field][subField] : '';
            }
            return ride[field] || '';
        } catch (error) {
            console.warn(`⚠️ Error getting field ${field}${subField ? '.' + subField : ''}:`, error);
            return '';
        }
    }

    // Save ride changes - IMPLEMENTACIÓN LOCAL
    async saveRideChanges() {
        try {
            const rideId = document.getElementById('editRideId').value;
            const origin = document.getElementById('editRideOrigin').value.trim();
            const destination = document.getElementById('editRideDestination').value.trim();
            const price = parseFloat(document.getElementById('editRidePrice').value) || 0;
            const clientName = document.getElementById('editRideClientName').value.trim();
            const additionalNotes = document.getElementById('editRideAdditionalNotes').value.trim();
            const priority = document.getElementById('editRidePriority').value;
            const scheduledDate = document.getElementById('editRideScheduledDate')?.value;
            const scheduledTime = document.getElementById('editRideScheduledTime')?.value;
            
            // Validaciones
            if (!origin || !destination || price <= 0 || !clientName) {
                showError('Todos los campos son requeridos y el precio debe ser mayor a 0');
                return;
            }
            
            // Procesar fecha programada
            let scheduledAt = null;
            if (scheduledDate && scheduledTime) {
                scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
            }
            
            console.log('💾 Guardando cambios del viaje:', {
                rideId,
                origin,
                destination,
                price,
                clientName,
                priority,
                scheduledAt
            });
            
            // Datos actualizados
            const updatedData = {
                origin: { address: origin },
                destination: { address: destination },
                price: price,
                client_name: clientName,
                additional_notes: additionalNotes,
                priority: priority,
                scheduled_at: scheduledAt
            };
            
            // Actualizar viaje usando AdminService
            if (!window.adminService) {
                showError('Servicio de administración no disponible');
                return;
            }
            
            const result = await window.adminService.updateRide(rideId, updatedData);
            
            if (result) {
                showSuccess('Viaje actualizado exitosamente');
                this.closeEditRideModal();
                // Recargar datos
                await this.loadData();
            } else {
                showError('Error al actualizar el viaje');
            }
            
        } catch (error) {
            console.error('❌ Error guardando cambios:', error);
            showError('Error al guardar los cambios: ' + error.message);
        }
    }

    // Close edit modal
    closeEditRideModal() {
        const modal = document.getElementById('editRideModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('✅ Modal de edición cerrado');
        }
    }

    // Setup modal event listeners
    setupModalEventListeners() {
        const modal = document.getElementById('editRideModal');
        if (modal) {
            // Cerrar modal al hacer clic fuera de él
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('🖱️ Clic fuera del modal, cerrando...');
                    this.closeEditRideModal();
                }
            });

            // Cerrar modal con tecla Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display === 'flex') {
                    console.log('⌨️ Tecla Escape presionada, cerrando modal...');
                    this.closeEditRideModal();
                }
            });

            console.log('✅ Event listeners del modal configurados');
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
                console.warn('⚠️ No se encontraron coordenadas para:', address);
                return null;
            }
        } catch (error) {
            console.error('❌ Error en geocodificación:', error);
            return null;
        }
    }

    // Actualizar coordenadas de viajes existentes
    async updateRideCoordinates(rideId) {
        try {
            console.log('🔄 Actualizando coordenadas para viaje:', rideId);
            
            // Obtener el viaje actual
            const ride = this.allAcceptedRides.find(r => r.id === rideId);
            if (!ride) {
                console.error('❌ Viaje no encontrado:', rideId);
                return false;
            }

            const updates = {};
            let hasUpdates = false;

            // Actualizar coordenadas de origen si es necesario
            if (ride.origin?.address && (!ride.origin.coordinates || 
                (ride.origin.coordinates.latitude === 0 && ride.origin.coordinates.longitude === 0))) {
                
                console.log('🌍 Geocodificando origen:', ride.origin.address);
                const originCoords = await this.geocodeAddress(ride.origin.address);
                
                if (originCoords) {
                    updates.origin = {
                        ...ride.origin,
                        coordinates: originCoords
                    };
                    hasUpdates = true;
                    console.log('✅ Coordenadas de origen actualizadas:', originCoords);
                }
            }

            // Actualizar coordenadas de destino si es necesario
            if (ride.destination?.address && (!ride.destination.coordinates || 
                (ride.destination.coordinates.latitude === 0 && ride.destination.coordinates.longitude === 0))) {
                
                console.log('🌍 Geocodificando destino:', ride.destination.address);
                const destCoords = await this.geocodeAddress(ride.destination.address);
                
                if (destCoords) {
                    updates.destination = {
                        ...ride.destination,
                        coordinates: destCoords
                    };
                    hasUpdates = true;
                    console.log('✅ Coordenadas de destino actualizadas:', destCoords);
                }
            }

            // Actualizar en la base de datos si hay cambios
            if (hasUpdates) {
                if (!window.adminService) {
                    console.error('❌ AdminService no disponible');
                    return false;
                }

                const result = await window.adminService.updateRide(rideId, updates);
                if (result) {
                    console.log('✅ Viaje actualizado en la base de datos');
                    // Recargar datos para reflejar los cambios
                    await this.loadData();
                    return true;
                } else {
                    console.error('❌ Error actualizando viaje en la base de datos');
                    return false;
                }
            } else {
                console.log('⏭️ No se necesitan actualizaciones para este viaje');
                return true;
            }

        } catch (error) {
            console.error('❌ Error actualizando coordenadas:', error);
            return false;
        }
    }

    setupRealtimeSubscriptions() {
        try {
            console.log('🔔 Setting up real-time subscriptions for accepted rides...');
            
            // Create Supabase client for real-time
            const supabaseClient = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            // Subscribe to changes in ride_requests table
            const subscription = supabaseClient
                .channel('accepted-rides-changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'ride_requests'
                }, (payload) => {
                    console.log('🔔 Real-time update received:', payload);
                    
                    // Handle different types of changes
                    if (payload.eventType === 'UPDATE') {
                        this.handleRideUpdate(payload);
                    } else if (payload.eventType === 'INSERT') {
                        this.handleRideInsert(payload);
                    } else if (payload.eventType === 'DELETE') {
                        this.handleRideDelete(payload);
                    }
                })
                .subscribe((status) => {
                    console.log('🔔 Subscription status:', status);
                });
            
            // Store subscription for cleanup
            this.realtimeSubscription = subscription;
            console.log('✅ Real-time subscriptions configured for accepted rides');
            
        } catch (error) {
            console.error('❌ Error setting up real-time subscriptions:', error);
        }
    }

    handleRideUpdate(payload) {
        const updatedRide = payload.new;
        const oldRide = payload.old;
        
        console.log('🔄 Ride updated:', {
            id: updatedRide.id,
            oldStatus: oldRide.status,
            newStatus: updatedRide.status,
            oldDriverId: oldRide.driver_id,
            newDriverId: updatedRide.driver_id
        });
        
        // If ride was accepted by a driver, add it to accepted list
        if (oldRide.status === 'requested' && updatedRide.status === 'accepted') {
            console.log('🚗 Ride accepted by driver, adding to accepted list');
            this.addRideToList(updatedRide);
            this.showNotification('Viaje Aceptado', `Un conductor aceptó un viaje y se agregó a la lista de aceptados.`);
        }
        // If ride status changed from accepted, remove it from accepted list
        else if (oldRide.status === 'accepted' && updatedRide.status !== 'accepted') {
            console.log('🔄 Ride status changed from accepted, removing from accepted list');
            this.removeRideFromList(updatedRide.id);
        }
        // If driver was assigned/unassigned, update the ride in the list
        else if (oldRide.driver_id !== updatedRide.driver_id) {
            console.log('👤 Driver assignment changed, updating ride in list');
            this.updateRideInList(updatedRide);
        }
    }

    handleRideInsert(payload) {
        const newRide = payload.new;
        console.log('➕ New ride created:', newRide);
        
        // Only add to accepted list if status is 'accepted'
        if (newRide.status === 'accepted') {
            this.addRideToList(newRide);
            this.showNotification('Nuevo Viaje Aceptado', `Se agregó un nuevo viaje aceptado.`);
        }
    }

    handleRideDelete(payload) {
        const deletedRide = payload.old;
        console.log('🗑️ Ride deleted:', deletedRide);
        
        this.removeRideFromList(deletedRide.id);
    }

    removeRideFromList(rideId) {
        // Remove from allAcceptedRides
        this.allAcceptedRides = this.allAcceptedRides.filter(ride => ride.id !== rideId);
        
        // Update UI
        this.updateRidesList();
        console.log('✅ Ride removed from accepted list');
    }

    addRideToList(ride) {
        // Add to allAcceptedRides if not already present
        const existingIndex = this.allAcceptedRides.findIndex(r => r.id === ride.id);
        if (existingIndex === -1) {
            this.allAcceptedRides.unshift(ride); // Add to beginning
            this.updateRidesList();
            console.log('✅ Ride added to accepted list');
        }
    }

    updateRideInList(updatedRide) {
        // Update existing ride in allAcceptedRides
        const index = this.allAcceptedRides.findIndex(r => r.id === updatedRide.id);
        if (index !== -1) {
            this.allAcceptedRides[index] = updatedRide;
            this.updateRidesList();
            console.log('✅ Ride updated in accepted list');
        }
    }

    showNotification(title, message) {
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/favicon.svg'
            });
        }
        
        // Also show in-page notification
        if (typeof showSuccess === 'function') {
            showSuccess(message);
        }
    }

    // Cleanup method to unsubscribe from real-time updates
    cleanup() {
        if (this.realtimeSubscription) {
            console.log('🧹 Cleaning up real-time subscriptions...');
            this.realtimeSubscription.unsubscribe();
            this.realtimeSubscription = null;
        }
    }
}

// Global instance
let acceptedRidesService;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ Accepted Rides page loading...');
    
    // Show loading screen initially
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
    
    acceptedRidesService = new AcceptedRidesService();
    await acceptedRidesService.init();
});

// Global functions for HTML onclick events
function goBack() {
    console.log('🔙 Going back...');
    // Regresar directamente a ride-management.html (un nivel arriba)
    window.location.href = '../ride-management.html';
}

function loadData() {
    if (acceptedRidesService) {
        acceptedRidesService.loadData();
    }
}

function filterRides() {
    if (acceptedRidesService) {
        acceptedRidesService.filterRides();
    }
}

function clearFilters() {
    console.log('🧹 Clearing all filters...');
    
    // Reset all filter inputs
    const driverFilter = document.getElementById('driverFilter');
    const dateFilter = document.getElementById('dateFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (driverFilter) driverFilter.value = '';
    if (dateFilter) dateFilter.value = '';
    if (priorityFilter) priorityFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    
    // Reset filtered rides to show all
    if (acceptedRidesService) {
        acceptedRidesService.filteredRides = [...acceptedRidesService.allAcceptedRides];
        acceptedRidesService.updateRidesList();
        acceptedRidesService.updateStats();
    }
    
    showSuccess('Filtros limpiados');
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

function openDriverSelection(rideId) {
    console.log('👤 Opening driver selection for ride:', rideId);
    window.currentRideForAssignment = rideId;
    
    if (acceptedRidesService) {
        acceptedRidesService.loadDriversForSelection();
    }
    
    const modal = document.getElementById('driverSelectionModal');
    if (modal) modal.style.display = 'flex';
}

function reloadDrivers() {
    console.log('🔄 Recargando conductores...');
    if (acceptedRidesService) {
        acceptedRidesService.loadDrivers().then(() => {
            acceptedRidesService.loadDriversForSelection();
            showSuccess('Conductores recargados');
        }).catch(error => {
            console.error('❌ Error recargando conductores:', error);
            showError('Error recargando conductores: ' + error.message);
        });
    }
}

function selectDriver(driverId) {
    console.log('👤 Selecting driver:', driverId);
    
    if (window.currentRideForAssignment && acceptedRidesService) {
        acceptedRidesService.assignDriverToRide(window.currentRideForAssignment, driverId);
    }
}

function editRide(rideId) {
    console.log('✏️ Edit ride:', rideId);
    
    if (acceptedRidesService) {
        acceptedRidesService.openEditRideModal(rideId);
    }
}

// Funciones globales para el modal de edición
function closeEditRideModal() {
    console.log('🔒 Cerrando modal de edición...');
    if (acceptedRidesService) {
        acceptedRidesService.closeEditRideModal();
    } else {
        // Fallback: cerrar modal directamente
        const modal = document.getElementById('editRideModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('✅ Modal cerrado (fallback)');
        }
    }
}

function saveRideChanges() {
    console.log('💾 Guardando cambios...');
        if (acceptedRidesService) {
        acceptedRidesService.saveRideChanges();
    } else {
        console.error('❌ acceptedRidesService no disponible');
        showError('Servicio no disponible');
    }
}

function viewDriverLocation(rideId) {
    console.log('📍 View driver location:', rideId);
    
    if (acceptedRidesService) {
        acceptedRidesService.viewDriverLocation(rideId);
    }
}

function refreshDriverLocation(rideId) {
    console.log('🔄 Refresh driver location:', rideId);
    
    if (acceptedRidesService) {
        acceptedRidesService.updateDriverLocation(rideId);
        showSuccess('Ubicación actualizada');
    }
}

function closeDriverTrackingModal() {
    const modal = document.getElementById('driverTrackingModal');
    if (modal) {
        modal.remove();
    }
    
    // Stop location tracking
    if (acceptedRidesService) {
        acceptedRidesService.stopLocationTracking();
    }
}

function cancelRide(rideId) {
    console.log('❌ Cancel ride:', rideId);
    
    if (confirm('¿Estás seguro de que quieres cancelar este viaje?')) {
        if (acceptedRidesService) {
            acceptedRidesService.cancelRide(rideId);
        }
    }
}

// Modal functions
function closeDriverSelectionModal() {
    const modal = document.getElementById('driverSelectionModal');
    if (modal) modal.style.display = 'none';
    window.currentRideForAssignment = null;
}

function closeEditRideModal() {
    // TODO: Implementar cuando se agregue el modal
    window.currentRideForEdit = null;
}

function saveRideChanges() {
    if (acceptedRidesService) {
        acceptedRidesService.saveRideChanges();
    }
}

// Función global para actualizar coordenadas de todos los viajes
async function updateAllRideCoordinates() {
    if (!acceptedRidesService) {
        console.error('❌ acceptedRidesService no disponible');
        showError('Servicio no disponible');
        return;
    }

    try {
        console.log('🔄 Iniciando actualización de coordenadas de todos los viajes...');
        showSuccess('Iniciando actualización de coordenadas...');
        
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const ride of acceptedRidesService.allAcceptedRides) {
            try {
                const success = await acceptedRidesService.updateRideCoordinates(ride.id);
                if (success) {
                    updatedCount++;
                } else {
                    errorCount++;
                }
                
                // Rate limiting para Nominatim (1 segundo entre requests)
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Error actualizando viaje ${ride.id}:`, error);
                errorCount++;
            }
        }
        
        console.log(`✅ Actualización completada: ${updatedCount} actualizados, ${errorCount} errores`);
        showSuccess(`Actualización completada: ${updatedCount} viajes actualizados, ${errorCount} errores`);
        
    } catch (error) {
        console.error('❌ Error en actualización masiva:', error);
        showError('Error en la actualización: ' + error.message);
    }
}

// Utility functions
function showSuccess(message) {
    console.log('✅ Success:', message);
    alert(message); // Replace with proper notification
}

function showError(message) {
    console.error('❌ Error:', message);
    alert('Error: ' + message); // Replace with proper notification
}
