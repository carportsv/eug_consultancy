// Completed Rides - Specific functionality for completed rides page
class CompletedRidesService {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        this.allCompletedRides = [];
        this.filteredRides = [];
        this.selectedRides = new Set(); // Para almacenar viajes seleccionados
        this.selectionMode = false; // Modo de selección múltiple
    }

    async init() {
        console.log('✅ Initializing Completed Rides Service...');
        await this.loadData();
    }



    // Load data for the page
    async loadData() {
        try {
            console.log('📊 Loading completed rides data...');
            
            // Load only completed rides
            const ridesResponse = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?status=eq.completed&select=*&order=created_at.desc`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (ridesResponse.ok) {
                this.allCompletedRides = await ridesResponse.json();
                this.filteredRides = [...this.allCompletedRides];
                console.log(`✅ ${this.allCompletedRides.length} completed rides loaded`);
                
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

            console.log('✅ Completed rides data loaded');
        } catch (error) {
            console.error('❌ Error loading completed rides data:', error);
            showError('Error loading data: ' + error.message);
        }
    }

    // Update rides list
    updateRidesList() {
        const ridesList = document.getElementById('completedRidesList');
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
        const createdAt = new Date(ride.created_at).toLocaleString('es-ES');
        const completedAt = ride.updated_at ? new Date(ride.updated_at).toLocaleString('es-ES') : 'N/A';
        const origin = ride.origin?.address || 'N/A';
        const destination = ride.destination?.address || 'N/A';
        const price = ride.price ? `$${parseFloat(ride.price).toFixed(2)}` : 'N/A';
        const distance = ride.distance ? `${(ride.distance / 1000).toFixed(1)} km` : 'N/A';
        const clientName = ride.client_name || 'N/A';
        const additionalNotes = ride.additional_notes || '';
        const isSelected = this.selectedRides.has(ride.id);

        return `
            <div class="ride-card ${isSelected ? 'selected' : ''}" data-ride-id="${ride.id}">
                <div class="ride-header" onclick="toggleRideCard('${ride.id}')">
                    ${this.selectionMode ? `
                    <div class="ride-checkbox" onclick="event.stopPropagation(); toggleRideSelection('${ride.id}')">
                        <input type="checkbox" id="checkbox_${ride.id}" ${isSelected ? 'checked' : ''} onchange="toggleRideSelection('${ride.id}')">
                        <label for="checkbox_${ride.id}"></label>
                    </div>
                    ` : ''}
                    <div class="ride-status status-completed">
                        <span class="status-badge">Completado</span>
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
                    <div class="ride-details">
                        <div class="detail-row">
                            <div class="detail-label">Origen:</div>
                            <div class="detail-value">${origin}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Destino:</div>
                            <div class="detail-value">${destination}</div>
                        </div>
                    </div>
                    
                    <div class="ride-info-grid">
                        <div class="info-card">
                            <div class="info-header">COSTO</div>
                            <div class="info-content">${price}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-header">CLIENTE</div>
                            <div class="info-content">${clientName}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-header">FECHA CREACIÓN</div>
                            <div class="info-content">${createdAt}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-header">FECHA COMPLETADO</div>
                            <div class="info-content">${completedAt}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-header">DISTANCIA</div>
                            <div class="info-content">${distance}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-header">PRIORIDAD</div>
                            <div class="info-content">${ride.priority || 'Normal'}</div>
                        </div>
                        ${ride.scheduled_at ? `
                        <div class="info-card">
                            <div class="info-header">PROGRAMADO PARA</div>
                            <div class="info-content">${new Date(ride.scheduled_at).toLocaleString('es-ES')}</div>
                        </div>
                        ` : ''}
                        ${additionalNotes ? `
                        <div class="info-card">
                            <div class="info-header">NOTAS ADICIONALES</div>
                            <div class="info-content">${additionalNotes}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="ride-actions">
                        <button class="btn btn-delete" onclick="deleteRide('${ride.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0v2m4-2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            🗑️ Eliminar Viaje
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Update statistics (simplified - no statistics to update)
    updateStats() {
        // No statistics to update since we removed the filtered count display
    }

    // Delete single ride
    async deleteRide(rideId) {
        try {
            console.log(`🗑️ Deleting ride ${rideId}...`);
            
            // Confirmar eliminación
            const confirmed = confirm('¿Estás seguro de que quieres eliminar este viaje permanentemente? Esta acción no se puede deshacer.');
            if (!confirmed) {
                return;
            }
            
            const response = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                }
            });

            if (response.ok) {
                // Remove from local data
                this.allCompletedRides = this.allCompletedRides.filter(r => r.id !== rideId);
                this.filteredRides = this.filteredRides.filter(r => r.id !== rideId);
                this.updateRidesList();
                this.updateStats();

                showSuccess('Viaje eliminado permanentemente');
            } else {
                throw new Error(`HTTP Error: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error deleting ride:', error);
            showError('Error deleting ride: ' + error.message);
        }
    }

    // Delete multiple completed rides
    async deleteMultipleCompletedRides() {
        try {
            console.log('🗑️ Deleting multiple completed rides...');
            
            const completedRides = this.allCompletedRides;
            
            if (completedRides.length === 0) {
                showError('No hay viajes completados para eliminar');
                return;
            }
            
            // Confirmar eliminación múltiple
            const confirmed = confirm(`¿Estás seguro de que quieres eliminar ${completedRides.length} viajes completados permanentemente? Esta acción no se puede deshacer.`);
            if (!confirmed) {
                return;
            }
            
            let deletedCount = 0;
            let errorCount = 0;
            
            // Mostrar indicador de progreso
            const deleteButton = document.querySelector('.btn-delete');
            const originalText = deleteButton.innerHTML;
            deleteButton.innerHTML = '🔄 Eliminando...';
            deleteButton.disabled = true;
            
            // Eliminar viajes uno por uno
            for (const ride of completedRides) {
                try {
                    const response = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?id=eq.${ride.id}`, {
                        method: 'DELETE',
                        headers: {
                            'apikey': this.supabaseKey,
                            'Authorization': `Bearer ${this.supabaseKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        }
                    });
                    
                    if (response.ok) {
                        deletedCount++;
                        console.log(`✅ Deleted ride ${ride.id}`);
                    } else {
                        errorCount++;
                        console.error(`❌ Error deleting ride ${ride.id}: ${response.status}`);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Error deleting ride ${ride.id}:`, error);
                }
            }
            
            // Restaurar botón
            deleteButton.innerHTML = originalText;
            deleteButton.disabled = false;
            
            // Recargar datos después de eliminar
            await this.loadData();
            
            if (errorCount === 0) {
                showSuccess(`${deletedCount} viajes completados eliminados exitosamente`);
            } else {
                showError(`${deletedCount} viajes eliminados, ${errorCount} errores`);
            }
            
        } catch (error) {
            console.error('❌ Error deleting multiple rides:', error);
            showError('Error deleting multiple rides: ' + error.message);
            
            // Restaurar botón en caso de error
            const deleteButton = document.querySelector('.btn-delete');
            if (deleteButton) {
                deleteButton.innerHTML = '🗑️ Limpiar Historial';
                deleteButton.disabled = false;
            }
        }
    }



    // Toggle selection mode
    toggleSelectionMode() {
        this.selectionMode = !this.selectionMode;
        
        if (this.selectionMode) {
            // Entrar en modo selección
            document.getElementById('selectionModeBtn').innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ❌ Cancelar Selección
            `;
            document.getElementById('deleteSelectedBtn').style.display = 'inline-flex';
            document.getElementById('deleteAllBtn').style.display = 'none';
        } else {
            // Salir del modo selección
            document.getElementById('selectionModeBtn').innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                📋 Seleccionar Múltiples
            `;
            document.getElementById('deleteSelectedBtn').style.display = 'none';
            document.getElementById('deleteAllBtn').style.display = 'inline-flex';
            
            // Limpiar selecciones
            this.selectedRides.clear();
            this.updateSelectedCount();
        }
        
        // Actualizar la vista
        this.updateRidesList();
    }

    // Toggle ride selection
    toggleRideSelection(rideId) {
        if (this.selectedRides.has(rideId)) {
            this.selectedRides.delete(rideId);
        } else {
            this.selectedRides.add(rideId);
        }
        
        this.updateSelectedCount();
        
        // Actualizar la clase visual de la tarjeta
        const rideCard = document.querySelector(`[data-ride-id="${rideId}"]`);
        if (rideCard) {
            if (this.selectedRides.has(rideId)) {
                rideCard.classList.add('selected');
            } else {
                rideCard.classList.remove('selected');
            }
        }
    }

    // Update selected count
    updateSelectedCount() {
        const selectedCount = document.getElementById('selectedCount');
        if (selectedCount) {
            selectedCount.textContent = this.selectedRides.size;
        }
    }

    // Delete selected rides
    async deleteSelectedRides() {
        if (this.selectedRides.size === 0) {
            showError('No hay viajes seleccionados para eliminar');
            return;
        }

        const confirmed = confirm(`¿Estás seguro de que quieres eliminar ${this.selectedRides.size} viajes seleccionados permanentemente? Esta acción no se puede deshacer.`);
        if (!confirmed) {
            return;
        }

        let deletedCount = 0;
        let errorCount = 0;

        // Mostrar indicador de progreso
        const deleteButton = document.getElementById('deleteSelectedBtn');
        const originalText = deleteButton.innerHTML;
        deleteButton.innerHTML = '🔄 Eliminando...';
        deleteButton.disabled = true;

        // Eliminar viajes seleccionados uno por uno
        for (const rideId of this.selectedRides) {
            try {
                const response = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': this.supabaseKey,
                        'Authorization': `Bearer ${this.supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    }
                });

                if (response.ok) {
                    deletedCount++;
                    console.log(`✅ Deleted ride ${rideId}`);
                } else {
                    errorCount++;
                    console.error(`❌ Error deleting ride ${rideId}: ${response.status}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`❌ Error deleting ride ${rideId}:`, error);
            }
        }

        // Restaurar botón
        deleteButton.innerHTML = originalText;
        deleteButton.disabled = false;

        // Limpiar selecciones y salir del modo selección
        this.selectedRides.clear();
        this.toggleSelectionMode();

        // Recargar datos después de eliminar
        await this.loadData();

        if (errorCount === 0) {
            showSuccess(`${deletedCount} viajes seleccionados eliminados exitosamente`);
        } else {
            showError(`${deletedCount} viajes eliminados, ${errorCount} errores`);
        }
    }
}

// Global instance
let completedRidesService;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ Completed Rides page loading...');
    
    // Show loading screen initially
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
    
    completedRidesService = new CompletedRidesService();
    await completedRidesService.init();
});

// Global functions for HTML onclick events
function goBack() {
    console.log('🔙 Going back...');
    // Regresar directamente a ride-management.html (un nivel arriba)
    window.location.href = '../ride-management.html';
}

function loadData() {
    if (completedRidesService) {
        completedRidesService.loadData();
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

function deleteMultipleCompletedRides() {
    console.log('🗑️ Delete multiple completed rides');
    
    if (completedRidesService) {
        completedRidesService.deleteMultipleCompletedRides();
    }
}

function deleteRide(rideId) {
    console.log('🗑️ Delete single ride:', rideId);
    
    if (completedRidesService) {
        completedRidesService.deleteRide(rideId);
    }
}

function toggleSelectionMode() {
    console.log('📋 Toggle selection mode');
    
    if (completedRidesService) {
        completedRidesService.toggleSelectionMode();
    }
}

function toggleRideSelection(rideId) {
    console.log('📋 Toggle ride selection:', rideId);
    
    if (completedRidesService) {
        completedRidesService.toggleRideSelection(rideId);
    }
}

function deleteSelectedRides() {
    console.log('🗑️ Delete selected rides');
    
    if (completedRidesService) {
        completedRidesService.deleteSelectedRides();
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
