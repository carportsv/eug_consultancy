// Cancelled Rides - Specific functionality for cancelled rides page
class CancelledRidesService {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        this.allCancelledRides = [];
        this.filteredRides = [];
        this.availableDrivers = [];
        this.userMap = new Map();
    }

    async init() {
        console.log('❌ Initializing Cancelled Rides Service...');
        await this.loadDrivers();
        await this.loadData();
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
            console.log('📊 Loading cancelled rides data...');
            
            // Load only cancelled rides
            const ridesResponse = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?status=eq.cancelled&select=*&order=created_at.desc`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!ridesResponse.ok) {
                throw new Error(`HTTP Error: ${ridesResponse.status}`);
            }

            this.allCancelledRides = await ridesResponse.json();
            this.filteredRides = [...this.allCancelledRides];
            console.log(`✅ ${this.allCancelledRides.length} cancelled rides loaded`);

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

            console.log('✅ Cancelled rides data loaded');
        } catch (error) {
            console.error('❌ Error loading cancelled rides data:', error);
            showError('Error loading data: ' + error.message);
        }
    }

    // Update rides list
    updateRidesList() {
        const ridesList = document.getElementById('cancelledRidesList');
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
        const cancelledAt = ride.updated_at ? new Date(ride.updated_at).toLocaleString('es-ES') : 'N/A';
        const origin = ride.origin?.address || 'N/A';
        const destination = ride.destination?.address || 'N/A';
        const price = ride.price ? `$${parseFloat(ride.price).toFixed(2)}` : 'N/A';
        const distance = ride.distance ? `${(ride.distance / 1000).toFixed(1)} km` : 'N/A';
        const clientName = ride.client_name || 'N/A';
        const additionalNotes = ride.additional_notes || '';

        return `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-header" onclick="toggleRideCard('${ride.id}')">
                    <div class="ride-status status-cancelled">
                        <span class="status-badge">Cancelado</span>
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
                        <button class="btn btn-sm btn-outline" onclick="editRide('${ride.id}')">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="reactivateRide('${ride.id}')">
                            🔄 Reactivar
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
                        <div class="detail-row">
                            <div class="detail-label">Conductor:</div>
                            <div class="detail-value">${driverName}</div>
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
        console.log(`[CancelledRides] 📊 ${this.filteredRides.length} viajes cancelados`);
    }

    // Filter rides based on current filters (simplified - no filters in UI)
    filterRides() {
        // No filters in simplified version, show all rides
        this.filteredRides = this.allCancelledRides;
        console.log(`🔍 Mostrando todos los viajes: ${this.filteredRides.length} viajes cancelados`);
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
}

// Global instance
let cancelledRidesService;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('❌ Cancelled Rides page loading...');
    
    // Show loading screen initially
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
    
    cancelledRidesService = new CancelledRidesService();
    await cancelledRidesService.init();
});

// Global functions for HTML onclick events
function goBack() {
    console.log('🔙 Going back...');
    // Regresar directamente a ride-management.html (un nivel arriba)
    window.location.href = '../ride-management.html';
}

function loadData() {
    if (cancelledRidesService) {
        cancelledRidesService.loadData();
    }
}

function filterRides() {
    if (cancelledRidesService) {
        cancelledRidesService.filterRides();
    }
}

function clearFilters() {
    console.log('🧹 No filters to clear in simplified version');
    if (cancelledRidesService) {
        cancelledRidesService.filteredRides = [...cancelledRidesService.allCancelledRides];
        cancelledRidesService.updateRidesList();
        cancelledRidesService.updateStats();
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

function editRide(rideId) {
    console.log('✏️ Edit ride:', rideId);
    // Aquí implementarías la lógica para editar el viaje
    showSuccess('Función de edición en desarrollo');
}

function reactivateRide(rideId) {
    console.log('🔄 Reactivate ride:', rideId);
    
    if (confirm('¿Quieres reactivar este viaje? El estado cambiará a "Solicitado"')) {
        // Aquí implementarías la lógica para reactivar el viaje
        showSuccess('Viaje reactivado exitosamente');
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
