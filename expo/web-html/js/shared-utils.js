/**
 * Shared Utilities - Utilidades compartidas para todas las pantallas
 * Elimina duplicación de funciones comunes
 */

// Utility functions
function showSuccess(message) {
    console.log('✅ Success:', message);
    if (typeof showInfo === 'function') {
        showInfo(message);
    } else {
        // Fallback: show alert if no notification system
        alert('Éxito: ' + message);
    }
}

function showError(message) {
    console.error('❌ Error:', message);
    if (typeof showInfo === 'function') {
        showInfo(message, 'error');
    } else {
        // Fallback: show alert if no notification system
        alert('Error: ' + message);
    }
}

function showWarning(message) {
    console.log('⚠️ Warning:', message);
    if (typeof showInfo === 'function') {
        showInfo(message, 'warning');
    } else {
        // Fallback: show alert if no notification system
        alert('Advertencia: ' + message);
    }
}

// Navigation functions
function goBack() {
    console.log('🔙 Going back...');
    window.history.back();
}

// Ride card functions
function toggleRideCard(rideId) {
    const contentElement = document.getElementById(`rideContent_${rideId}`);
    if (contentElement) {
        const isVisible = contentElement.style.display !== 'none';
        contentElement.style.display = isVisible ? 'none' : 'block';
        
        // Update button text
        const button = document.querySelector(`[onclick="toggleRideCard('${rideId}')"]`);
        if (button) {
            button.textContent = isVisible ? 'Ver Detalles' : 'Ocultar Detalles';
        }
    }
}

// Filter functions
function clearFilters() {
    console.log('🧹 Clearing all filters...');
    // This will be overridden by each page's specific implementation
    console.warn('⚠️ clearFilters function not implemented for this page');
}

// Date formatting functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatScheduledTime(scheduledAt) {
    if (!scheduledAt) return '';
    const date = new Date(scheduledAt);
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatScheduledDateTime(scheduledAt) {
    if (!scheduledAt) return '';
    const date = new Date(scheduledAt);
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Status and priority functions
function getStatusText(status) {
    const statusMap = {
        'requested': 'Solicitado',
        'accepted': 'Aceptado',
        'in_progress': 'En Progreso',
        'completed': 'Completado',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

function getPriorityText(priority) {
    const priorityMap = {
        'low': 'Baja',
        'normal': 'Normal',
        'high': 'Alta'
    };
    return priorityMap[priority] || priority;
}

function getStatusClass(status) {
    switch (status) {
        case 'requested': return 'status-requested';
        case 'accepted': return 'status-accepted';
        case 'in_progress': return 'status-in-progress';
        case 'completed': return 'status-completed';
        case 'cancelled': return 'status-cancelled';
        default: return 'status-unknown';
    }
}

// Loading functions
function showLoading(show = true) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = show ? 'flex' : 'none';
    }
}

// Fetch with fallback
async function fetchWithFallback(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return response;
    } catch (error) {
        console.error('❌ Fetch error:', error);
        throw error;
    }
}

console.log('✅ Shared utilities loaded');
