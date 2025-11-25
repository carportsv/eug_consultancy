// Driver Service - Funciones de gestión de conductores
class DriverService {
    constructor() {
        this.allDrivers = [];
        this.userIdToFirebase = {};
        this.driverPollingTimer = null;
        this.currentUser = null;
        
        console.log('🚗 DriverService inicializado');
    }

    // Inicializar el servicio de conductores
    async init() {
        try {
            console.log('🚗 Inicializando Driver Service...');
            
            // Verificar que el usuario esté autenticado y sea admin
            const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
            console.log('🔍 USER_DATA en localStorage:', userData);
            
            if (!userData) {
                console.log('⚠️ Usuario no autenticado, redirigiendo al login...');
                window.location.href = '../../home/home.html';
                return;
            }

            const user = JSON.parse(userData);
            console.log('🔍 Usuario parseado:', user);
            console.log('🔍 Rol del usuario:', user.role);
            
            if (user.role !== 'admin') {
                console.log('⚠️ Usuario no es administrador, redirigiendo al login...');
                console.log('⚠️ Rol actual:', user.role, 'Esperado: admin');
                window.location.href = '../../home/home.html';
                return;
            }

            this.currentUser = user;
            console.log('✅ Driver Service inicializado para:', user.email);
            
            // Cargar conductores iniciales
            await this.loadDrivers();
            
        } catch (error) {
            console.error('❌ Error inicializando Driver Service:', error);
            // Redirigir al login en caso de error
            window.location.href = '../../home/home.html';
        }
    }

    // Mostrar loading
    showLoading(message = 'Cargando...') {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            const messageElement = loadingScreen.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            loadingScreen.classList.remove('hidden');
        }
    }

    // Ocultar loading
    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }

    // Mostrar notificación
    showNotification(message, type = 'info') {
        console.log(`📢 [${type.toUpperCase()}] ${message}`);
        
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Agregar al DOM
        document.body.appendChild(notification);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Obtener icono para notificación
    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    // Mostrar error
    showError(message) {
        this.showNotification(message, 'error');
    }

    // Mostrar éxito
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    // Cargar conductores desde Supabase
    async loadDrivers() {
        try {
            if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
                console.error('❌ Variables de entorno de Supabase no configuradas');
                this.showError('Error: Variables de entorno de Supabase no configuradas. Verifica el archivo .env');
                return;
            }

            // Evitar bloquear UI si ya hay data y solo es un refresh
            const isFirstLoad = this.allDrivers.length === 0;
            if (isFirstLoad) this.showLoading('Cargando conductores...');

            const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/drivers?select=*&order=updated_at.desc&limit=500`, {
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const drivers = await response.json();
            // Construir/actualizar mapa de usuarios para poder unificar por la misma persona
            await this.buildUserMap(drivers || []);
            const deduped = this.dedupeDrivers(drivers || []);
            this.allDrivers = deduped;

            this.displayDrivers(this.allDrivers);
            this.updateDriverStats(this.allDrivers);
            if (isFirstLoad) this.hideLoading();
        } catch (error) {
            console.error('❌ Error cargando conductores:', error);
            this.showError('Error cargando conductores: ' + error.message);
            this.hideLoading();
        }
    }

    // Construir mapa user_id -> firebase_uid para filas de drivers sin firebase_uid
    async buildUserMap(drivers) {
        try {
            const missingUserIds = Array.from(
                new Set(
                    (drivers || [])
                        .filter(d => d.user_id && !this.userIdToFirebase[d.user_id])
                        .map(d => d.user_id)
                )
            );
            if (missingUserIds.length === 0) return;

            // Consultar usuarios por lote usando filtro IN de PostgREST
            const inList = missingUserIds.join(',');
            const resp = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/users?select=id,firebase_uid&id=in.(${inList})`, {
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!resp.ok) return;
            const rows = await resp.json();
            rows.forEach(u => {
                if (u?.id) this.userIdToFirebase[u.id] = u.firebase_uid || null;
            });
        } catch (_) {
            // silencioso
        }
    }

    async fetchAndCacheUser(userId) {
        try {
            const resp = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/users?select=id,firebase_uid&id=eq.${userId}`, {
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!resp.ok) return;
            const rows = await resp.json();
            const row = rows && rows[0];
            if (row?.id) this.userIdToFirebase[row.id] = row.firebase_uid || null;
        } catch (_) {}
    }

    getKeyForDriver(d) {
        return d.firebase_uid || (d.user_id ? this.userIdToFirebase[d.user_id] : null) || d.user_id || d.id;
    }

    // Quitar duplicados por la misma persona. Priorizar disponible; si empatan, el más reciente
    dedupeDrivers(drivers) {
        const byKey = new Map();
        (drivers || []).forEach(d => {
            const key = this.getKeyForDriver(d);
            const prev = byKey.get(key);
            if (!prev) {
                byKey.set(key, d);
                return;
            }
            const prevTs = new Date(prev.updated_at || prev.created_at || 0).getTime();
            const curTs = new Date(d.updated_at || d.created_at || 0).getTime();
            const prefer = (
                (d.is_available && !prev.is_available) ||
                (d.is_available === prev.is_available && curTs >= prevTs)
            ) ? d : prev;
            byKey.set(key, prefer);
        });
        return Array.from(byKey.values());
    }

    // Mostrar conductores
    displayDrivers(drivers) {
        const tbody = document.getElementById('driversTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!drivers || drivers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fas fa-taxi" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        No hay conductores registrados
                    </td>
                </tr>
            `;
            return;
        }

        drivers.forEach(driver => {
            const row = document.createElement('tr');
            const carInfo = driver.car_info || {};
            const documents = driver.documents || {};
            const name = driver.display_name || 'Conductor';
            
            row.innerHTML = `
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${this.getUserInitials(name)}</div>
                        <div class="user-details">
                            <h4>${name}</h4>
                        </div>
                    </div>
                </td>
                <td>${documents.license || 'No especificado'}</td>
                <td>${carInfo.plate || 'No especificado'}<br><small>${driver.vehicle_make && driver.vehicle_model ? `${driver.vehicle_make} ${driver.vehicle_model}` : 'Sin datos'}</small></td>
                <td>
                    <span class="user-status ${driver.status === 'active' ? 'active' : 'inactive'}">
                        ${driver.status === 'active' ? 'Activo' : (driver.status || 'N/A')}
                    </span>
                </td>
                <td>
                    <span class="user-status ${driver.is_available ? 'active' : 'inactive'}">
                        ${driver.is_available ? 'Disponible' : 'No disponible'}
                    </span>
                </td>
                <td>${this.formatDate(driver.updated_at || driver.created_at)}</td>
                <td>
                    <div class="user-actions">
                        <button class="action-btn view" onclick="driverService.showViewDriverModal('${driver.id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="driverService.showEditDriverModal('${driver.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="driverService.deleteDriver('${driver.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Estadísticas de conductores
    updateDriverStats(drivers) {
        const total = drivers.length;
        const available = drivers.filter(d => d.is_available).length;
        const active = drivers.filter(d => d.status === 'active').length;
        document.getElementById('totalDrivers').textContent = total;
        document.getElementById('activeDriversCount').textContent = active;
        document.getElementById('availableDrivers').textContent = available;
    }

    // Filtros de conductores
    filterDrivers() {
        const term = document.getElementById('driverSearch').value.toLowerCase();
        const status = document.getElementById('driverStatusFilter').value;
        const availability = document.getElementById('driverAvailabilityFilter').value;

        const filtered = this.allDrivers.filter(d => {
            const carInfo = d.car_info || {};
            const documents = d.documents || {};
            const matchesTerm = !term ||
                (d.id && String(d.id).toLowerCase().includes(term)) ||
                (d.display_name && d.display_name.toLowerCase().includes(term)) ||
                (d.email && d.email.toLowerCase().includes(term)) ||
                (d.phone && d.phone.toLowerCase().includes(term)) ||
                (documents.license && documents.license.toLowerCase().includes(term)) ||
                (carInfo.plate && carInfo.plate.toLowerCase().includes(term)) ||
                (d.vehicle_make && d.vehicle_make.toLowerCase().includes(term)) ||
                (d.vehicle_model && d.vehicle_model.toLowerCase().includes(term)) ||
                (d.vehicle_color && d.vehicle_color.toLowerCase().includes(term));

            const matchesStatus = !status || (status === 'active' ? d.status === 'active' : d.status !== 'active');
            const matchesAvailability = !availability ||
                (availability === 'available' ? d.is_available : !d.is_available);
            return matchesTerm && matchesStatus && matchesAvailability;
        });

        this.displayDrivers(filtered);
        this.updateDriverStats(filtered);
    }

    // Refrescar lista
    refreshDriverList() {
        try { clearInterval(this.driverPollingTimer); } catch {}
        this.showLoading('Actualizando conductores...');
        this.loadDrivers().finally(() => {
            this.hideLoading();
            this.showSuccess('Lista de conductores actualizada');
            // reanudar polling
            try { clearInterval(this.driverPollingTimer); } catch {}
            this.driverPollingTimer = setInterval(() => this.loadDrivers(), 10000);
        });
    }

    // Acciones placeholder
    viewDriver(id) { this.showNotification('Ver conductor ' + id + ' - En desarrollo', 'info'); }
    editDriver(id) { this.showNotification('Editar conductor ' + id + ' - En desarrollo', 'info'); }
    previousDriverPage() { this.showNotification('Paginación - En desarrollo', 'info'); }
    nextDriverPage() { this.showNotification('Paginación - En desarrollo', 'info'); }

    // ===== GESTIÓN DE CONDUCTORES =====

    // Mostrar modal de crear conductor
    showCreateDriverModal() {
        console.log('➕ Mostrando modal de crear conductor...');
        document.getElementById('createDriverModal').classList.remove('hidden');
        document.getElementById('createDriverForm').reset();
    }

    // Cerrar modal de crear conductor
    closeCreateDriverModal() {
        console.log('❌ Cerrando modal de crear conductor...');
        document.getElementById('createDriverModal').classList.add('hidden');
    }

    // Crear nuevo conductor
    async createDriver(event) {
        event.preventDefault();
        console.log('🚗 Creando nuevo conductor...');

        const formData = {
            user_id: null, // Se asignará automáticamente
            is_available: true,
            status: document.getElementById('driverStatus').value || 'active',
            location: null, // Se actualizará cuando el conductor se registre
            rating: 0.0,
            total_rides: 0,
            earnings: 0.0,
            email: document.getElementById('driverEmail').value || null,
            phone: document.getElementById('driverPhone').value || null,
            display_name: document.getElementById('driverName').value || 'Conductor',
            firebase_uid: null, // Se asignará si el conductor se registra
            current_location: null,
            notification_token: null,
            available: true,
            completed_rides: 0,
            vehicle_make: document.getElementById('driverVehicleMake').value || 'No especificado',
            vehicle_model: document.getElementById('driverVehicleModel').value || 'No especificado',
            vehicle_color: document.getElementById('driverVehicleColor').value || 'No especificado',
            car_info: {
                make: document.getElementById('driverVehicleMake').value || 'No especificado',
                model: document.getElementById('driverVehicleModel').value || 'No especificado',
                color: document.getElementById('driverVehicleColor').value || 'No especificado',
                plate: document.getElementById('driverPlate').value || 'No especificado'
            },
            documents: {
                license: document.getElementById('driverLicense').value || 'No especificado',
                notes: document.getElementById('driverNotes').value || ''
            },
            created_at: new Date().toISOString()
        };

        console.log('📤 Datos del formulario:', formData);

        try {
            // Crear conductor en Supabase
            const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/drivers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(formData)
            });

            console.log('📡 Respuesta del servidor:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response body:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const newDriver = await response.json();
            console.log('✅ Conductor creado:', newDriver);
            
            this.showNotification('Conductor creado exitosamente', 'success');
            this.closeCreateDriverModal();
            this.refreshDriverList();
        } catch (error) {
            console.error('❌ Error al crear conductor:', error);
            this.showNotification(`Error al crear conductor: ${error.message}`, 'error');
        }
    }

    // Mostrar modal de editar conductor
    async showEditDriverModal(driverId) {
        console.log('✏️ Mostrando modal de editar conductor:', driverId);
        
        try {
            // Obtener datos del conductor desde Supabase
            const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/drivers?id=eq.${driverId}`, {
                method: 'GET',
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
                }
            });

            console.log('📡 Respuesta GET conductor:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response body:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            const drivers = await response.json();
            if (drivers.length === 0) {
                throw new Error('Conductor no encontrado');
            }

            const driverData = drivers[0];
            console.log('📝 Datos del conductor:', driverData);

            // Llenar el formulario con los datos
            const carInfo = driverData.car_info || {};
            const documents = driverData.documents || {};
            
            document.getElementById('editDriverId').value = driverData.id;
            document.getElementById('editDriverName').value = driverData.display_name || 'Conductor';
            document.getElementById('editDriverEmail').value = driverData.email || '';
            document.getElementById('editDriverPhone').value = driverData.phone || '';
            document.getElementById('editDriverLicense').value = documents.license || '';
            document.getElementById('editDriverPlate').value = carInfo.plate || '';
            document.getElementById('editDriverVehicleMake').value = driverData.vehicle_make || '';
            document.getElementById('editDriverVehicleModel').value = driverData.vehicle_model || '';
            document.getElementById('editDriverVehicleColor').value = driverData.vehicle_color || '';
            document.getElementById('editDriverStatus').value = driverData.status || 'active';
            document.getElementById('editDriverNotes').value = documents.notes || '';

            document.getElementById('editDriverModal').classList.remove('hidden');
        } catch (error) {
            console.error('❌ Error al cargar datos del conductor:', error);
            this.showNotification(`Error al cargar datos: ${error.message}`, 'error');
        }
    }

    // Cerrar modal de editar conductor
    closeEditDriverModal() {
        console.log('❌ Cerrando modal de editar conductor...');
        document.getElementById('editDriverModal').classList.add('hidden');
    }

    // Actualizar conductor
    async updateDriver(event) {
        event.preventDefault();
        console.log('🔄 Actualizando conductor...');

        const driverId = document.getElementById('editDriverId').value;
        const formData = {
            is_available: document.getElementById('editDriverStatus').value === 'active',
            status: document.getElementById('editDriverStatus').value || 'active',
            email: document.getElementById('editDriverEmail').value || null,
            phone: document.getElementById('editDriverPhone').value || null,
            display_name: document.getElementById('editDriverName').value || 'Conductor',
            vehicle_make: document.getElementById('editDriverVehicleMake').value || 'No especificado',
            vehicle_model: document.getElementById('editDriverVehicleModel').value || 'No especificado',
            vehicle_color: document.getElementById('editDriverVehicleColor').value || 'No especificado',
            car_info: {
                make: document.getElementById('editDriverVehicleMake').value || 'No especificado',
                model: document.getElementById('editDriverVehicleModel').value || 'No especificado',
                color: document.getElementById('editDriverVehicleColor').value || 'No especificado',
                plate: document.getElementById('editDriverPlate').value || 'No especificado'
            },
            documents: {
                license: document.getElementById('editDriverLicense').value || 'No especificado',
                notes: document.getElementById('editDriverNotes').value || ''
            },
            updated_at: new Date().toISOString()
        };

        console.log('📝 Datos a actualizar:', formData);
        console.log('🆔 ID del conductor:', driverId);

        try {
            // Actualizar conductor en Supabase
            const url = `${CONFIG.SUPABASE_URL}/rest/v1/drivers?id=eq.${driverId}`;
            console.log('🌐 URL de actualización:', url);

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(formData)
            });

            console.log('📡 Respuesta del servidor:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response body:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }

            console.log('✅ Conductor actualizado:', driverId);
            this.showNotification('Conductor actualizado exitosamente', 'success');
            this.closeEditDriverModal();
            this.refreshDriverList();
        } catch (error) {
            console.error('❌ Error al actualizar conductor:', error);
            this.showNotification(`Error al actualizar conductor: ${error.message}`, 'error');
        }
    }

    // Mostrar modal de ver conductor
    async showViewDriverModal(driverId) {
        console.log('👁️ Mostrando detalles del conductor:', driverId);
        
        try {
            // Obtener datos completos del conductor desde Supabase
            const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/drivers?id=eq.${driverId}`, {
                method: 'GET',
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const drivers = await response.json();
            if (drivers.length === 0) {
                throw new Error('Conductor no encontrado');
            }

            const driverData = drivers[0];
            console.log('📝 Datos completos del conductor:', driverData);

            // Llenar los campos de información
            const carInfo = driverData.car_info || {};
            const documents = driverData.documents || {};
            
            document.getElementById('viewDriverName').textContent = driverData.display_name || 'Conductor';
            document.getElementById('viewDriverEmail').textContent = driverData.email || 'No disponible';
            document.getElementById('viewDriverPhone').textContent = driverData.phone || 'No disponible';
            document.getElementById('viewDriverLicense').textContent = documents.license || 'No especificado';
            document.getElementById('viewDriverVehicle').textContent = driverData.vehicle_make && driverData.vehicle_model && driverData.vehicle_color ? 
                `${driverData.vehicle_make} ${driverData.vehicle_model} (${driverData.vehicle_color})` : 'No especificado';
            document.getElementById('viewDriverStatus').textContent = driverData.status === 'active' ? 'Activo' : (driverData.status || 'N/A');
            document.getElementById('viewDriverAvailable').textContent = driverData.is_available ? 'Disponible' : 'No disponible';
            document.getElementById('viewDriverCompletedRides').textContent = driverData.total_rides || '0';
            document.getElementById('viewDriverNotes').textContent = documents.notes || 'Sin notas';
            document.getElementById('viewDriverCreatedAt').textContent = driverData.created_at ? new Date(driverData.created_at).toLocaleDateString() : 'No especificado';

            // Guardar el ID para editar desde la vista
            document.getElementById('viewDriverModal').setAttribute('data-driver-id', driverId);
            
            document.getElementById('viewDriverModal').classList.remove('hidden');
        } catch (error) {
            console.error('❌ Error al cargar detalles del conductor:', error);
            this.showNotification(`Error al cargar detalles: ${error.message}`, 'error');
        }
    }

    // Cerrar modal de ver conductor
    closeViewDriverModal() {
        console.log('❌ Cerrando modal de ver conductor...');
        document.getElementById('viewDriverModal').classList.add('hidden');
    }

    // Editar conductor desde la vista
    editDriverFromView() {
        const driverId = document.getElementById('viewDriverModal').getAttribute('data-driver-id');
        this.closeViewDriverModal();
        this.showEditDriverModal(driverId);
    }

    // Eliminar conductor
    async deleteDriver(driverId) {
        console.log('🗑️ Eliminando conductor:', driverId);
        
        if (confirm('¿Estás seguro de que quieres eliminar este conductor? Esta acción no se puede deshacer.')) {
            try {
                // Eliminar conductor de Supabase
                const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/drivers?id=eq.${driverId}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': CONFIG.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                console.log('✅ Conductor eliminado:', driverId);
                this.showNotification('Conductor eliminado exitosamente', 'success');
                this.refreshDriverList();
            } catch (error) {
                console.error('❌ Error al eliminar conductor:', error);
                this.showNotification(`Error al eliminar conductor: ${error.message}`, 'error');
            }
        }
    }

    // Refrescar lista de conductores
    async refreshDriverList() {
        console.log('🔄 Refrescando lista de conductores...');
        try {
            // Recargar datos de conductores
            await this.loadDrivers();
            this.showNotification('Lista de conductores actualizada', 'success');
        } catch (error) {
            console.error('❌ Error al refrescar lista:', error);
            this.showNotification('Error al actualizar lista', 'error');
        }
    }

    // ===== UTILIDADES =====

    // Obtener iniciales del usuario
    getUserInitials(name) {
        if (!name) return '?';
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    // Formatear fecha
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }
}

// Global functions for HTML onclick events
function goBack() {
    console.log('🔙 Going back...');
    // Usar history.back() para navegación sin recarga
    if (window.history.length > 1) {
        window.history.back();
    } else {
        // Fallback si no hay historial
        window.location.href = '../../home/home.html';
    }
}

// Test function for push notifications
async function testPushNotification() {
    try {
        console.log('🔔 Probando notificaciones push...');
        
        // Mostrar loading
        if (window.driverService) {
            driverService.showNotification('🔔 Probando notificaciones push...', 'info');
        }
        
        // Obtener el primer driver disponible para la prueba
        const drivers = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/drivers?select=id,notification_token&limit=1`, {
            headers: {
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
            }
        });
        
        if (!drivers.ok) {
            throw new Error(`Error obteniendo drivers: ${drivers.status}`);
        }
        
        const driversData = await drivers.json();
        if (!driversData.length) {
            throw new Error('No hay drivers disponibles para la prueba');
        }
        
        const testDriver = driversData[0];
        if (!testDriver.notification_token) {
            throw new Error('El driver no tiene token de notificación');
        }
        
        console.log('📱 Driver encontrado para prueba:', testDriver.id);
        
        // Enviar notificación de prueba
        const pushResponse = await fetch('https://us-central1-{{FIREBASE_PROJECT_ID}}.cloudfunctions.net/sendPushNotification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: testDriver.notification_token,
                title: '🔔 Test de Notificación',
                body: 'Esta es una notificación de prueba desde la web admin',
                data: {
                    type: 'test_notification',
                    driver_id: testDriver.id, // 🔑 CRÍTICO: Incluir driver_id para filtrado
                    message: 'Notificación de prueba exitosa',
                    timestamp: new Date().toISOString()
                }
            })
        });
        
        if (!pushResponse.ok) {
            const errorText = await pushResponse.text();
            throw new Error(`Error enviando notificación: ${pushResponse.status} - ${errorText}`);
        }
        
        const pushResult = await pushResponse.json();
        console.log('✅ Notificación de prueba enviada:', pushResult);
        
        if (window.driverService) {
            driverService.showNotification('✅ Notificación de prueba enviada exitosamente', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error en test de notificaciones:', error);
        if (window.driverService) {
            driverService.showNotification(`❌ Error en test: ${error.message}`, 'error');
        }
    }
}

// Test function for getAvailableDrivers API
async function testGetAvailableDrivers() {
    try {
        console.log('🔍 Probando API getAvailableDrivers...');
        
        // Mostrar loading
        if (window.driverService) {
            driverService.showNotification('🔍 Probando API getAvailableDrivers...', 'info');
        }
        
        // Verificar que adminService esté disponible
        if (!window.adminService) {
            throw new Error('adminService no está disponible');
        }
        
        console.log('✅ adminService disponible, llamando getAvailableDrivers...');
        
        // Llamar a la función corregida
        const drivers = await adminService.getAvailableDrivers();
        
        console.log('📊 Drivers obtenidos:', drivers);
        
        // Verificar que los IDs sean correctos
        drivers.forEach((driver, index) => {
            console.log(`🔍 Driver ${index + 1}:`, {
                'drivers.id (DEBE ser drivers.id)': driver.id,
                'drivers.user_id': driver.user_id,
                'user.email': driver.user?.email,
                '¿ID correcto?': driver.id !== driver.user_id ? '✅ SÍ' : '❌ NO'
            });
        });
        
        if (window.driverService) {
            driverService.showNotification(`✅ API test completado. ${drivers.length} drivers obtenidos`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Error en test de getAvailableDrivers:', error);
        if (window.driverService) {
            driverService.showNotification(`❌ Error en test: ${error.message}`, 'error');
        }
    }
}