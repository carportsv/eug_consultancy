class PendingRidesService {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        this.allPendingRides = [];
        this.userMap = new Map();
        
        this.init();
    }

    async init() {
        try {
            // Initialize ride edit service with retry
            this.initializeRideEditService();
            
            await this.loadData();
            this.setupEventListeners();
            this.setupRealtimeSubscriptions();
            
            // Listen for ride updates
            document.addEventListener('rideUpdated', () => {
                console.log('🔄 Viaje actualizado, recargando datos...');
                this.loadData();
            });

            // Listen for admin service availability
            document.addEventListener('adminServiceReady', () => {
                console.log('🔄 AdminService disponible, inicializando RideEditService...');
                this.initializeRideEditService();
            });
            
            // Mark service as initialized after successful data load
            serviceInitialized = true;
            console.log('✅ PendingRidesService fully initialized');
        } catch (error) {
            console.error('❌ Error initializing PendingRidesService:', error);
            showError('Error inicializando el servicio: ' + error.message);
        }
    }

    // Initialize ride edit service with retry mechanism
    initializeRideEditService() {
        const tryInit = () => {
            if (window.rideEditService && window.adminService) {
                window.rideEditService.init(window.adminService);
                console.log('✅ RideEditService inicializado en pending-rides');
                return true;
            }
            return false;
        };

        // Try immediately
        if (!tryInit()) {
            // If not available, try again after a short delay
            setTimeout(() => {
                if (!tryInit()) {
                    console.warn('⚠️ AdminService no disponible, reintentando en 1 segundo...');
                    setTimeout(tryInit, 1000);
                }
            }, 100);
        }
    }

    setupEventListeners() {
        // Add any additional event listeners here
        console.log('✅ Event listeners configured for PendingRidesService');
    }

    setupRealtimeSubscriptions() {
        try {
            console.log('🔔 Setting up real-time subscriptions for pending rides...');
            
            // Create Supabase client for real-time
            const supabaseClient = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            // Subscribe to changes in ride_requests table
            const subscription = supabaseClient
                .channel('pending-rides-changes')
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
            console.log('✅ Real-time subscriptions configured');
            
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
        
        // If ride was accepted by a driver, remove it from pending list
        if (oldRide.status === 'requested' && updatedRide.status === 'accepted') {
            console.log('🚗 Ride accepted by driver, removing from pending list');
            this.removeRideFromList(updatedRide.id);
            this.showNotification('Viaje Aceptado', `El viaje fue aceptado por un conductor y se movió a la sección de aceptados.`);
        }
        // If ride status changed back to requested, add it back to pending list
        else if (oldRide.status !== 'requested' && updatedRide.status === 'requested') {
            console.log('🔄 Ride status changed to requested, adding to pending list');
            this.addRideToList(updatedRide);
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
        
        // Only add to pending list if status is 'requested'
        if (newRide.status === 'requested') {
            this.addRideToList(newRide);
            this.showNotification('Nueva Solicitud', `Se recibió una nueva solicitud de viaje.`);
        }
    }

    handleRideDelete(payload) {
        const deletedRide = payload.old;
        console.log('🗑️ Ride deleted:', deletedRide);
        
        this.removeRideFromList(deletedRide.id);
    }

    removeRideFromList(rideId) {
        // Remove from allPendingRides
        this.allPendingRides = this.allPendingRides.filter(ride => ride.id !== rideId);
        
        // Update UI
        this.updateRidesList();
        console.log('✅ Ride removed from pending list');
    }

    addRideToList(ride) {
        // Add to allPendingRides if not already present
        const existingIndex = this.allPendingRides.findIndex(r => r.id === ride.id);
        if (existingIndex === -1) {
            this.allPendingRides.unshift(ride); // Add to beginning
            this.updateRidesList();
            console.log('✅ Ride added to pending list');
        }
    }

    updateRideInList(updatedRide) {
        // Update existing ride in allPendingRides
        const index = this.allPendingRides.findIndex(r => r.id === updatedRide.id);
        if (index !== -1) {
            this.allPendingRides[index] = updatedRide;
            this.updateRidesList();
            console.log('✅ Ride updated in pending list');
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

    async loadData() {
        try {
            this.showLoading(true);
            console.log('📊 Loading pending rides data...');

            // Load pending rides (status = 'requested')
            await this.loadPendingRides();
            
            // Load user data for drivers
            await this.loadUsers();
            
            // Update UI with all rides (no filtering)
            this.updateRidesList();
            
            console.log('✅ Pending rides data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading data:', error);
            showError('Error cargando datos: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async loadPendingRides() {
        try {
            console.log('🔍 Loading pending rides from Supabase...');
            console.log('🔍 Supabase URL:', this.supabaseUrl);
            console.log('🔍 Supabase Key:', this.supabaseKey ? 'Present' : 'Missing');
            
            const url = `${this.supabaseUrl}/rest/v1/ride_requests?select=*&order=created_at.desc`;
            console.log('🔍 Request URL:', url);
            
            const response = await fetch(url, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('❌ Response status:', response.status);
                console.error('❌ Response text:', await response.text());
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const allRides = await response.json();
            console.log(`📊 Found ${allRides.length} total rides`);
            
            // Filter for requested rides only
            const requestedRides = allRides.filter(ride => ride.status === 'requested');
            console.log(`📊 Found ${requestedRides.length} requested rides`);
            
            // Log sample ride data for debugging
            if (requestedRides.length > 0) {
                console.log('🔍 Sample ride data:', {
                    id: requestedRides[0].id,
                    origin: requestedRides[0].origin,
                    originType: typeof requestedRides[0].origin,
                    destination: requestedRides[0].destination,
                    destinationType: typeof requestedRides[0].destination,
                    status: requestedRides[0].status
                });
            }

            // Process ride data
            this.allPendingRides = requestedRides.map(ride => {
                try {
                    return {
                        ...ride,
                        origin: ride.origin ? (typeof ride.origin === 'string' ? JSON.parse(ride.origin) : ride.origin) : null,
                        destination: ride.destination ? (typeof ride.destination === 'string' ? JSON.parse(ride.destination) : ride.destination) : null
                    };
                } catch (error) {
                    console.warn('⚠️ Error parsing ride data:', error);
                    return {
                        ...ride,
                        origin: ride.origin,
                        destination: ride.destination
                    };
                }
            });

            this.filteredRides = [...this.allPendingRides];
        } catch (error) {
            console.error('❌ Error loading pending rides:', error);
            throw error;
        }
    }

    async loadUsers() {
        try {
            console.log('👥 Loading users data...');
            
            const response = await fetch(`${this.supabaseUrl}/rest/v1/users?select=*&limit=10`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('❌ Users response status:', response.status);
                console.error('❌ Users response text:', await response.text());
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const users = await response.json();
            console.log(`👥 Found ${users.length} users`);
            
            // Create user map for quick lookup
            this.userMap.clear();
            users.forEach(user => {
                this.userMap.set(user.id, user);
            });

            console.log(`✅ Loaded ${users.length} users`);
        } catch (error) {
            console.error('❌ Error loading users:', error);
            // Don't throw error here, continue without user data
        }
    }

    showLoading(show) {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContent = document.getElementById('mainContent');
        
        if (loadingScreen && mainContent) {
            if (show) {
                loadingScreen.classList.remove('hidden');
                mainContent.style.display = 'none';
            } else {
                loadingScreen.classList.add('hidden');
                mainContent.style.display = 'block';
            }
        }
    }

        // Update rides list
    updateRidesList() {
        const ridesList = document.getElementById('pendingRidesList');
        const noRides = document.getElementById('noRides');
        const filteredCount = document.getElementById('filteredCount');

        if (!ridesList) return;

        if (this.allPendingRides.length === 0) {
            ridesList.style.display = 'none';
            noRides.style.display = 'flex';
            if (filteredCount) filteredCount.textContent = '0';
            return;
        }

        ridesList.style.display = 'block';
        noRides.style.display = 'none';
        if (filteredCount) filteredCount.textContent = this.allPendingRides.length;

        ridesList.innerHTML = this.allPendingRides.map(ride => this.createRideCard(ride)).join('');
    }

    // Create ride card HTML
    createRideCard(ride) {
        const createdAt = new Date(ride.created_at).toLocaleString('es-ES');
        
        // Handle different origin formats
        let origin = 'N/A';
        if (ride.origin) {
            if (typeof ride.origin === 'string') {
                origin = ride.origin;
            } else if (ride.origin.address) {
                origin = ride.origin.address;
            } else if (ride.origin.name) {
                origin = ride.origin.name;
            } else {
                origin = JSON.stringify(ride.origin);
            }
        }
        
        // Handle different destination formats
        let destination = 'N/A';
        if (ride.destination) {
            if (typeof ride.destination === 'string') {
                destination = ride.destination;
            } else if (ride.destination.address) {
                destination = ride.destination.address;
            } else if (ride.destination.name) {
                destination = ride.destination.name;
            } else {
                destination = JSON.stringify(ride.destination);
            }
        }
        
        const price = ride.price ? `$${parseFloat(ride.price).toFixed(2)}` : 'N/A';
        const distance = ride.distance ? `${(ride.distance / 1000).toFixed(1)} km` : 'N/A';
        const clientName = ride.client_name || 'N/A';
        const additionalNotes = ride.additional_notes || '';

        return `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-header" onclick="toggleRideCard('${ride.id}')">
                    <div class="ride-status status-pending">
                        <span class="status-badge">Pendiente</span>
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
                        <button class="btn btn-sm btn-primary" onclick="assignDriver('${ride.id}')">
                            👤 Asignar Conductor
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





    // Open edit ride modal - USA EL SERVICIO COMPARTIDO
    openEditRideModal(rideId) {
        const ride = this.allPendingRides.find(r => r.id === rideId);
        if (!ride) {
            if (typeof showError === 'function') {
                showError('Viaje no encontrado');
            } else {
                alert('Viaje no encontrado');
            }
            return;
        }

        console.log('✏️ Abriendo modal de edición para viaje:', rideId);
        // Usar el servicio compartido de edición
        window.rideEditService.openEditModal(ride);
    }

    // Función saveRideChanges eliminada - ahora usa el servicio compartido

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
                // Remove from pending rides
                const rideIndex = this.allPendingRides.findIndex(r => r.id === rideId);
                if (rideIndex !== -1) {
                    this.allPendingRides.splice(rideIndex, 1);
                }

                this.updateRidesList();
                
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
            showError('Error cancelando viaje: ' + error.message);
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

// Global functions for HTML onclick handlers
function goBackToRideManagement() {
    console.log('🔙 Going back to ride management...');
    console.log('🔙 Current location:', window.location.href);
    console.log('🔙 Target location: ../ride-management.html');
    
    try {
        // Regresar directamente a ride-management.html (un nivel arriba)
        window.location.href = '../ride-management.html';
        console.log('✅ Navigation initiated');
    } catch (error) {
        console.error('❌ Error navigating back:', error);
        // Fallback: usar history.back()
        window.history.back();
    }
}

// Global loadData function for admin.js compatibility
function loadData() {
    if (pendingRidesService && serviceInitialized) {
        console.log('📊 Loading data via PendingRidesService...');
        pendingRidesService.loadData();
    } else if (pendingRidesService) {
        // Service exists but not initialized yet, wait for it
        console.log('⏳ Waiting for PendingRidesService to finish initialization...');
        const checkService = () => {
            if (serviceInitialized) {
                console.log('📊 Loading data via PendingRidesService (delayed)...');
                pendingRidesService.loadData();
            } else {
                // Service exists but not initialized yet, wait a bit more
                setTimeout(checkService, 100);
            }
        };
        setTimeout(checkService, 100);
    } else {
        console.error('❌ PendingRidesService not available');
        if (typeof showError === 'function') {
            showError('Error: Servicio no disponible');
        } else {
            alert('Error: Servicio no disponible');
        }
    }
}



function toggleRideCard(rideId) {
    const content = document.getElementById(`rideContent_${rideId}`);
    if (content) {
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        
        // Update arrow icon
        const arrow = content.parentElement.querySelector('.expand-arrow');
        if (arrow) {
            arrow.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    }
}

function assignDriver(rideId) {
    // Find the ride data
    const ride = pendingRidesService.allPendingRides.find(r => r.id === rideId);
    if (!ride) {
        if (typeof showError === 'function') {
            showError('Viaje no encontrado');
        } else {
            alert('Viaje no encontrado');
        }
        return;
    }
    
    // Open driver assignment modal
    openDriverAssignmentModal(ride);
}

function editRide(rideId) {
    console.log('✏️ Edit ride:', rideId);
    
    if (pendingRidesService) {
        pendingRidesService.openEditRideModal(rideId);
    }
}

function cancelRide(rideId) {
    if (confirm('¿Estás seguro de que quieres cancelar este viaje?')) {
        if (pendingRidesService) {
            pendingRidesService.cancelRide(rideId);
        }
    }
}

// Funciones globales eliminadas - ahora usa el servicio compartido

// Utility functions
function showSuccess(message) {
    console.log('✅ Success:', message);
    if (typeof showInfo === 'function') {
        showInfo(message);
    } else {
        alert(message);
    }
}

function openDriverAssignmentModal(ride) {
    // Create modal HTML
    const modalHTML = `
        <div id="driverAssignmentModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Asignar Conductor</h3>
                    <button class="modal-close" onclick="closeDriverAssignmentModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="ride-info">
                        <p><strong>Cliente:</strong> ${ride.client_name || 'N/A'}</p>
                        <p><strong>Origen:</strong> ${ride.origin?.address || ride.origin?.name || 'N/A'}</p>
                        <p><strong>Destino:</strong> ${ride.destination?.address || ride.destination?.name || 'N/A'}</p>
                    </div>
                    <div class="driver-selection">
                        <label for="driverSelect">Seleccionar Conductor:</label>
                        <select id="driverSelect" class="form-control">
                            <option value="">Selecciona un conductor...</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeDriverAssignmentModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="confirmDriverAssignment('${ride.id}')">Asignar</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Populate driver options
    populateDriverOptions();
    
    // Show modal
    document.getElementById('driverAssignmentModal').style.display = 'flex';
}

function closeDriverAssignmentModal() {
    const modal = document.getElementById('driverAssignmentModal');
    if (modal) {
        modal.remove();
    }
}

async function populateDriverOptions() {
    const driverSelect = document.getElementById('driverSelect');
    if (!driverSelect) return;
    
    // Clear existing options
    driverSelect.innerHTML = `
        <option value="">Selecciona un conductor...</option>
        <option value="null">Sin conductor asignado</option>
    `;
    
    try {
        // 🔧 CORRECCIÓN: Usar adminService.getAvailableDrivers() que ya funciona
        if (window.adminService) {
            const drivers = await adminService.getAvailableDrivers();
            console.log('🚗 Drivers obtenidos para asignación:', drivers);
            
            drivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id; // 🔑 USAR drivers.id, NO user_id
                option.textContent = driver.display_name || driver.email || `Conductor ${driver.id}`;
                driverSelect.appendChild(option);
                
                console.log(`✅ Driver agregado al select:`, {
                    'driver.id': driver.id,
                    'driver.display_name': driver.display_name,
                    'driver.email': driver.email,
                    'texto mostrado': option.textContent
                });
            });
        } else {
            console.error('❌ adminService no disponible');
        }
    } catch (error) {
        console.error('❌ Error obteniendo drivers:', error);
    }
}

async function confirmDriverAssignment(rideId) {
    const driverSelect = document.getElementById('driverSelect');
    const selectedDriverId = driverSelect.value;
    
    if (selectedDriverId === '') {
        if (typeof showError === 'function') {
            showError('Por favor selecciona una opción');
        } else {
            alert('Por favor selecciona una opción');
        }
        return;
    }
    
    // Handle "Sin conductor asignado" option
    if (selectedDriverId === 'null') {
        console.log('🚗 Removing driver assignment for ride:', rideId);
        // 🔧 CORRECCIÓN: Usar ID especial en lugar de null
        const specialDriverId = '00000000-0000-0000-0000-000000000000';
        updateRideStatus(rideId, 'requested', specialDriverId, 'Sin conductor asignado');
        return;
    }
    
    // Get driver info from adminService
    let driverName = `Conductor ${selectedDriverId}`;
    try {
        if (window.adminService) {
            const drivers = await adminService.getAvailableDrivers();
            const driver = drivers.find(d => d.id === selectedDriverId);
            if (driver) {
                driverName = driver.display_name || driver.email || `Conductor ${selectedDriverId}`;
            }
        }
    } catch (error) {
        console.error('❌ Error obteniendo info del driver:', error);
    }
    
    console.log('🚗 Driver assignment details:', {
        rideId,
        selectedDriverId,
        driverName
    });
    
    // Assign driver to ride and update status
    updateRideStatus(rideId, 'requested', selectedDriverId, driverName);
}

async function updateRideStatus(rideId, status, driverId, driverName) {
    try {
        // Use only fields that exist in the ride_requests table
        const updateData = {
            driver_id: driverId, // Use driver_id (not user_id)
            updated_at: new Date().toISOString()
        };
        
        // Add status if provided
        if (status) {
            updateData.status = status;
        }
        
        console.log('🔧 Updating ride with data:', {
            rideId,
            updateData,
            driverId,
            driverName,
            url: `${pendingRidesService.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}`
        });
        
        const response = await fetch(`${pendingRidesService.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}`, {
            method: 'PATCH',
            headers: {
                'apikey': pendingRidesService.supabaseKey,
                'Authorization': `Bearer ${pendingRidesService.supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(updateData)
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Response error text:', errorText);
            throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
        }
        
        console.log('✅ Ride status updated successfully');
        
        // Verificar que se guardó correctamente
        try {
            const verifyResponse = await fetch(`${pendingRidesService.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}&select=id,driver_id,status`, {
                headers: {
                    'apikey': pendingRidesService.supabaseKey,
                    'Authorization': `Bearer ${pendingRidesService.supabaseKey}`
                }
            });
            const verifyData = await verifyResponse.json();
            console.log('🔍 Verificación post-actualización:', verifyData[0]);
        } catch (verifyError) {
            console.error('❌ Error verificando actualización:', verifyError);
        }
        
        // 🔔 ENVIAR NOTIFICACIÓN AL DRIVER (solo si hay driver asignado y no es el conductor especial)
        const specialDriverId = '00000000-0000-0000-0000-000000000000';
        if (driverId && driverId !== specialDriverId) {
            try {
                if (window.adminService) {
                    console.log('🔔 Enviando notificación al driver...');
                    // 🔧 CORRECCIÓN: Obtener datos del viaje actualizados desde la base de datos
                    const rideResponse = await fetch(`${pendingRidesService.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}&select=*`, {
                        headers: {
                            'apikey': pendingRidesService.supabaseKey,
                            'Authorization': `Bearer ${pendingRidesService.supabaseKey}`
                        }
                    });
                    const rideData = await rideResponse.json();
                    const ride = rideData[0];
                    
                    if (ride) {
                        console.log('🔍 Datos del viaje para notificación:', {
                            id: ride.id,
                            driver_id: ride.driver_id,
                            status: ride.status,
                            client_name: ride.client_name
                        });
                        await adminService.sendPushNotificationToDriver(driverId, rideId, ride, 'Cliente');
                        console.log('✅ Notificación enviada al driver');
                    } else {
                        console.error('❌ No se pudo obtener datos del viaje para notificación');
                    }
                }
            } catch (error) {
                console.error('❌ Error enviando notificación:', error);
            }
        } else {
            console.log('📋 No se enviará notificación - viaje sin conductor asignado (conductor especial)');
        }
        
        // Close modal
        closeDriverAssignmentModal();
        
        // Show success message
        if (typeof showInfo === 'function') {
            if (driverId && driverId !== specialDriverId) {
                showInfo(`Conductor ${driverName} asignado exitosamente. El viaje mantiene su estado pendiente.`);
            } else {
                showInfo(`Viaje actualizado exitosamente. Sin conductor asignado.`);
            }
        } else {
            if (driverId && driverId !== specialDriverId) {
                alert(`Conductor ${driverName} asignado exitosamente. El viaje mantiene su estado pendiente.`);
            } else {
                alert(`Viaje actualizado exitosamente. Sin conductor asignado.`);
            }
        }
        
        // Reload data to reflect changes
        pendingRidesService.loadData();
        
    } catch (error) {
        console.error('❌ Error updating ride status:', error);
        if (typeof showError === 'function') {
            showError('Error al asignar conductor: ' + error.message);
        } else {
            alert('Error al asignar conductor: ' + error.message);
        }
    }
}

// Initialize service when DOM is loaded
let pendingRidesService;
let serviceInitialized = false;

// Initialize service immediately when script loads
console.log('🚀 Initializing PendingRidesService...');
pendingRidesService = new PendingRidesService();
// serviceInitialized will be set to true after loadData() completes
