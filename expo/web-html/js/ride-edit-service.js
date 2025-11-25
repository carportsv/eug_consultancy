/**
 * Ride Edit Service - Servicio compartido para edición de viajes
 * Maneja la lógica de edición de viajes de forma consistente en todas las pantallas
 */

class RideEditService {
    constructor() {
        this.currentRide = null;
        this.adminService = null;
    }

    // Initialize the service
    init(adminService) {
        this.adminService = adminService;
        console.log('✅ RideEditService inicializado');
    }

    // Open edit modal for a ride
    openEditModal(ride) {
        console.log('✏️ Abriendo modal de edición para viaje:', ride.id);
        console.log('📝 Datos del viaje:', ride);
        
        this.currentRide = ride;
        this.fillEditForm(ride);
        this.showModal();
    }

    // Show the edit modal
    showModal() {
        const modal = document.getElementById('editRideModal');
        console.log('🔍 Buscando modal editRideModal:', modal);
        if (modal) {
            modal.style.display = 'flex';
            console.log('✅ Modal mostrado correctamente');
        } else {
            console.error('❌ Modal editRideModal no encontrado en el DOM');
            this.showError('Modal de edición no disponible');
        }
    }

    // Fill edit form with ride data
    fillEditForm(ride) {
        try {
            console.log('🔍 Llenando formulario con datos:', ride);
            
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
            
            console.log('🔍 Campos encontrados:', {
                idField: !!idField,
                originField: !!originField,
                destinationField: !!destinationField,
                priceField: !!priceField,
                clientField: !!clientField,
                notesField: !!notesField,
                priorityField: !!priorityField
            });
            
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
            
            console.log('✅ Formulario de edición llenado correctamente');
            console.log('📝 Valores finales:', {
                id: idField?.value,
                origin: originField?.value,
                destination: destinationField?.value,
                price: priceField?.value,
                client: clientField?.value,
                notes: notesField?.value,
                priority: priorityField?.value
            });
            
        } catch (error) {
            console.error('❌ Error llenando formulario de edición:', error);
            this.showError('Error cargando datos del viaje');
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

    // Save ride changes
    async saveChanges() {
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
                this.showError('Todos los campos son requeridos y el precio debe ser mayor a 0');
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
            if (!this.adminService) {
                this.showError('Servicio de administración no disponible');
                return;
            }
            
            const result = await this.adminService.updateRide(rideId, updatedData);
            
            if (result) {
                this.showSuccess('Viaje actualizado exitosamente');
                this.closeModal();
                // Trigger refresh event for the current page
                this.triggerRefresh();
            } else {
                this.showError('Error al actualizar el viaje');
            }
            
        } catch (error) {
            console.error('❌ Error guardando cambios:', error);
            this.showError('Error al guardar los cambios: ' + error.message);
        }
    }

    // Close edit modal
    closeModal() {
        const modal = document.getElementById('editRideModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentRide = null;
    }

    // Trigger refresh event for the current page
    triggerRefresh() {
        // Dispatch custom event to notify pages to refresh
        const refreshEvent = new CustomEvent('rideUpdated', {
            detail: { rideId: this.currentRide?.id }
        });
        document.dispatchEvent(refreshEvent);
    }

    // Show error message
    showError(message) {
        if (typeof showError === 'function') {
            showError(message);
        } else {
            console.error('❌ Error:', message);
            alert('Error: ' + message);
        }
    }

    // Show success message
    showSuccess(message) {
        if (typeof showSuccess === 'function') {
            showSuccess(message);
        } else {
            console.log('✅ Éxito:', message);
            alert('Éxito: ' + message);
        }
    }
}

// Create global instance
window.rideEditService = new RideEditService();

// Global functions for modal
window.editRide = function(rideId) {
    console.log('✏️ Edit ride called:', rideId);
    // This will be overridden by each page's specific implementation
    console.warn('⚠️ editRide function not implemented for this page');
};

window.closeEditRideModal = function() {
    window.rideEditService.closeModal();
};

window.saveRideChanges = function() {
    window.rideEditService.saveChanges();
};

console.log('✅ RideEditService cargado');
