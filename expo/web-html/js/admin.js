// Admin Service - Funciones de administración para la versión web (LIMPIO)
class AdminService {
    constructor() {
        // Verificar si ya existe una instancia global
        if (window.globalAdminService) {
            console.log('🔄 Reutilizando instancia global de AdminService');
            return window.globalAdminService;
        }
        
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        this.currentUser = null;
        this.notificationSubscription = null;
        this.processedNotifications = new Set(); // Para evitar duplicados
        this.supabaseClient = null; // Cliente reutilizable
        
        // Headers base para requests
        this.baseHeaders = {
            'Content-Type': 'application/json',
            'apikey': this.supabaseKey
        };
        
        console.log('🔧 AdminService configurado con Supabase URL:', this.supabaseUrl ? '✅ Configurada' : '❌ No configurada');
        
        // Crear cliente Supabase inmediatamente
        this.createSupabaseClient();
        
        this.initAdminNotifications();
        
        // Guardar como instancia global
        window.globalAdminService = this;
    }

    // Crear cliente Supabase
    createSupabaseClient() {
        try {
            if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
                console.warn('⚠️ Supabase no está disponible, no se puede crear cliente');
                return;
            }
            
            this.supabaseClient = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
            console.log('🔧 Cliente Supabase creado exitosamente');
        } catch (error) {
            console.error('❌ Error creando cliente Supabase:', error);
        }
    }

    // Inicializar notificaciones en tiempo real para el admin
    initAdminNotifications() {
        try {
            // Verificar si ya se inicializó
            if (this.notificationPollingInterval) {
                console.log('🔄 Notificaciones ya inicializadas, saltando...');
                return;
            }
            
            console.log('🔔 Inicializando notificaciones en tiempo real para admin...');
            
            // Verificar si el cliente Supabase está disponible
            if (!this.supabaseClient) {
                console.warn('⚠️ Cliente Supabase no está disponible, saltando notificaciones en tiempo real');
                return;
            }
            const supabaseClient = this.supabaseClient;
            
            // Suscribirse a notificaciones de admin (driver_id es null para admin)
            console.log('🔔 Configurando suscripción a notificaciones de admin...');
        console.log('🔔 Supabase URL:', this.supabaseUrl ? '✅ Configurada' : '❌ No configurada');
        console.log('🔔 Supabase Key presente:', !!this.supabaseKey);
            
            // Crear canal con nombre único para evitar conflictos
            const channelName = `admin-notifications-${Date.now()}`;
            console.log('🔔 Creando canal:', channelName);
            
            // Verificar si Supabase está disponible
            console.log('🔔 Verificando Supabase client:', supabaseClient ? '✅ Cliente creado' : '❌ Error creando cliente');
            console.log('🔔 Verificando método channel:', typeof supabaseClient.channel);
            
            // IMPLEMENTAR SISTEMA DE POLLING PARA NOTIFICACIONES DE ADMIN
            // (Similar a como funciona en la app móvil)
            console.log('🔔 Configurando sistema de polling cada 30 segundos para notificaciones de admin...');
            
            // Inicializar variables para manejo de visibilidad
            this.isPageVisible = !document.hidden;
            this.pollingPaused = false;
            
            // Función para iniciar el polling
            this.startNotificationPolling = () => {
                if (this.notificationPollingInterval) {
                    clearInterval(this.notificationPollingInterval);
                }
                
                this.notificationPollingInterval = setInterval(async () => {
                    // Solo ejecutar si la página está visible
                    if (!document.hidden && this.isPageVisible) {
                        console.log('🔔 Polling ejecutándose (página activa)...');
                        await this.checkForAdminNotifications();
                    } else {
                        console.log('🔔 Polling pausado (página no activa)');
                    }
                }, 30000); // 30 segundos
                
                console.log('✅ Polling de notificaciones iniciado');
            };
            
            // Función para pausar el polling
            this.pauseNotificationPolling = () => {
                if (this.notificationPollingInterval) {
                    clearInterval(this.notificationPollingInterval);
                    this.notificationPollingInterval = null;
                    this.pollingPaused = true;
                    console.log('⏸️ Polling de notificaciones pausado');
                }
            };
            
            // Función para reanudar el polling
            this.resumeNotificationPolling = () => {
                if (this.pollingPaused || !this.notificationPollingInterval) {
                    this.pollingPaused = false;
                    this.startNotificationPolling();
                    console.log('▶️ Polling de notificaciones reanudado');
                }
            };
            
            // Event listeners para manejo de visibilidad de página
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    console.log('🎯 Ventana desenfocada - pausando notificaciones');
                    this.pauseNotificationPolling();
                } else {
                    console.log('🎯 Ventana enfocada - reanudando notificaciones');
                    this.resumeNotificationPolling();
                }
            });
            
            // Iniciar el polling
            this.startNotificationPolling();
            
            // Suscripción a cambios en ride_requests para admin
            try {
                const rideRequestsChannel = supabaseClient
                    .channel('ride-requests-admin')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'ride_requests'
                    }, (payload) => {
                        console.log('🔔 UPDATE en ride_requests recibido:', payload);
                        this.handleRideRequestChange(payload);
                    })
                    .subscribe((status) => {
                        console.log('🔔 Estado de suscripción a ride_requests:', status);
                        if (status === 'SUBSCRIBED') {
                            console.log('✅ Suscripción a ride_requests activa');
                            console.log('🔔 Esperando cambios en viajes...');
                        }
                    });
                
                // Suscripción a cambios en notificaciones para admin
                const notificationsChannel = supabaseClient
                    .channel('admin-notifications')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'notifications',
                        filter: 'driver_id=is.null'
                    }, (payload) => {
                        console.log('🔔 Notificación de admin recibida:', payload);
                        this.handleAdminNotification(payload);
                    })
                    .subscribe((status) => {
                        console.log('🔄 Estado de suscripción a notificaciones de admin:', status);
                        if (status === 'SUBSCRIBED') {
                            console.log('✅ Suscripción a notificaciones de admin activa');
                        }
                    });
                
                this.notificationSubscription = { rideRequestsChannel, notificationsChannel };
                
            } catch (error) {
                console.error('❌ Error configurando suscripciones:', error);
            }
            
        } catch (error) {
            console.error('❌ Error inicializando notificaciones:', error);
        }
    }

    // Verificar notificaciones de admin
    async checkForAdminNotifications() {
        try {
            if (!this.supabaseClient) {
                console.log('⚠️ Cliente Supabase no disponible para verificar notificaciones');
                return;
            }
            
            // Verificar si la tabla de notificaciones existe y tiene datos
            const { data: notifications, error } = await this.supabaseClient
                .from('notifications')
                .select('*')
                .is('driver_id', null) // Notificaciones para admin (usar .is() para null)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (error) {
                // Si es error de tabla no encontrada, simplemente continuar
                if (error.code === '42P01') {
                    console.log('⚠️ Tabla de notificaciones no existe, saltando verificación');
                    return;
                }
                console.error('❌ Error obteniendo notificaciones de admin:', error);
                return;
            }
            
            if (notifications && notifications.length > 0) {
                console.log(`🔔 ${notifications.length} notificaciones de admin encontradas`);
                notifications.forEach(notification => {
                    if (!this.processedNotifications.has(notification.id)) {
                        this.processedNotifications.add(notification.id);
                        this.handleAdminNotification({ new: notification });
                    }
                });
            } else {
                console.log('🔔 No hay notificaciones nuevas para admin');
            }
            
        } catch (error) {
            console.error('❌ Error verificando notificaciones de admin:', error);
        }
    }

    // Manejar cambios en ride_requests
    handleRideRequestChange(payload) {
        try {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            
            if (eventType === 'UPDATE') {
                const rideId = newRecord.id;
                const oldStatus = oldRecord?.status;
                const newStatus = newRecord.status;
                const oldDriverId = oldRecord?.driver_id;
                const newDriverId = newRecord.driver_id;
                
                console.log('🔄 Procesando cambio en viaje:', {
                    id: rideId,
                    oldStatus,
                    newStatus,
                    oldDriverId,
                    newDriverId
                });
                
                // Notificar a las páginas específicas sobre el cambio
                window.dispatchEvent(new CustomEvent('rideUpdated', {
                    detail: {
                        rideId,
                        oldStatus,
                        newStatus,
                        oldDriverId,
                        newDriverId,
                        ride: newRecord
                    }
                }));
            }
            
        } catch (error) {
            console.error('❌ Error manejando cambio en ride_request:', error);
        }
    }

    // Manejar notificaciones de admin
    handleAdminNotification(payload) {
        try {
            const { eventType, new: notification } = payload;
            
            if (eventType === 'INSERT' && notification) {
                console.log('🔔 Nueva notificación de admin:', notification);
                
                // Mostrar notificación en la UI
                if (notification.title && notification.message) {
                    showNotification(notification.title, notification.message, 'info');
                }
                
                // Marcar como leída
                this.markNotificationAsRead(notification.id);
            }
            
        } catch (error) {
            console.error('❌ Error manejando notificación de admin:', error);
        }
    }

    // Marcar notificación como leída
    async markNotificationAsRead(notificationId) {
        try {
            if (!this.supabaseClient) return;
            
            const { error } = await this.supabaseClient
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);
            
            if (error) {
                console.error('❌ Error marcando notificación como leída:', error);
            }
            
        } catch (error) {
            console.error('❌ Error marcando notificación como leída:', error);
        }
    }

    // Inicializar el servicio
    async init() {
        try {
            console.log('🔧 Inicializando Admin Service...');
            
            // Verificar autenticación
            const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
            if (!userData) {
                console.log('⚠️ Usuario no autenticado');
                return;
            }
            
            console.log('🔍 USER_DATA en localStorage:', userData);
            
            try {
                this.currentUser = JSON.parse(userData);
                console.log('🔍 Usuario parseado:', this.currentUser);
            } catch (parseError) {
                console.error('❌ Error parseando USER_DATA:', parseError);
                return;
            }
            
            console.log('🔍 Rol del usuario:', this.currentUser.role);
            
            // Verificar que sea admin
            if (this.currentUser.role !== 'admin') {
                console.log('⚠️ Usuario no es admin, redirigiendo...');
                window.location.href = '/auth/login.html';
                return;
            }
            
            console.log('✅ Admin Service inicializado para:', this.currentUser.email);
            
        } catch (error) {
            console.error('❌ Error inicializando Admin Service:', error);
        }
    }

    // Obtener viajes pendientes
    async getPendingRides() {
        try {
            if (!this.supabaseClient) {
                throw new Error('Cliente Supabase no disponible');
            }
            
            const { data, error } = await this.supabaseClient
                .from('ride_requests')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('❌ Error obteniendo viajes pendientes:', error);
            return [];
        }
    }

    // Obtener conductores disponibles
    async getAvailableDrivers() {
        try {
            if (!this.supabaseClient) {
                throw new Error('Cliente Supabase no disponible');
            }
            
            const { data, error } = await this.supabaseClient
                .from('users')
                .select('*')
                .eq('role', 'driver')
                .eq('is_active', true)
                .order('display_name');
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('❌ Error obteniendo conductores disponibles:', error);
            return [];
        }
    }

    // Obtener estadísticas del dashboard
    async getDashboardStats() {
        try {
            if (!this.supabaseClient) {
                throw new Error('Cliente Supabase no disponible');
            }
            
            const [pendingRides, acceptedRides, inProgressRides, completedRides] = await Promise.all([
                this.supabaseClient.from('ride_requests').select('id').eq('status', 'pending'),
                this.supabaseClient.from('ride_requests').select('id').eq('status', 'accepted'),
                this.supabaseClient.from('ride_requests').select('id').eq('status', 'in_progress'),
                this.supabaseClient.from('ride_requests').select('id').eq('status', 'completed')
            ]);
            
            return {
                pending: pendingRides.data?.length || 0,
                accepted: acceptedRides.data?.length || 0,
                inProgress: inProgressRides.data?.length || 0,
                completed: completedRides.data?.length || 0
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            return { pending: 0, accepted: 0, inProgress: 0, completed: 0 };
        }
    }

    // Obtener todos los viajes
    async getAllRides() {
        try {
            if (!this.supabaseClient) {
                throw new Error('Cliente Supabase no disponible');
            }
            
            const { data, error } = await this.supabaseClient
                .from('ride_requests')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('❌ Error obteniendo todos los viajes:', error);
            return [];
        }
    }

    // Asignar conductor a viaje
    async assignDriverToRide(rideId, driverId) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Cliente Supabase no disponible');
            }
            
            const { error } = await this.supabaseClient
                .from('ride_requests')
                .update({ 
                    driver_id: driverId,
                    status: 'accepted',
                    updated_at: new Date().toISOString()
                })
                .eq('id', rideId);
            
            if (error) throw error;
            
            console.log('✅ Conductor asignado al viaje:', rideId);
            return true;
            
        } catch (error) {
            console.error('❌ Error asignando conductor:', error);
            throw error;
        }
    }

    // Actualizar viaje
    async updateRide(rideId, updates) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Cliente Supabase no disponible');
            }
            
            const { error } = await this.supabaseClient
                .from('ride_requests')
                .update({ 
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', rideId);
            
            if (error) throw error;
            
            console.log('✅ Viaje actualizado:', rideId);
            return true;
            
        } catch (error) {
            console.error('❌ Error actualizando viaje:', error);
            throw error;
        }
    }

    // Eliminar viaje
    async deleteRide(rideId) {
        try {
            if (!this.supabaseClient) {
                throw new Error('Cliente Supabase no disponible');
            }
            
            const { error } = await this.supabaseClient
                .from('ride_requests')
                .delete()
                .eq('id', rideId);
            
            if (error) throw error;
            
            console.log('✅ Viaje eliminado:', rideId);
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando viaje:', error);
            throw error;
        }
    }

}

// Variables globales
let adminService;
let currentRideForAssignment = null;

// Inicializar la página
async function initAdminPage() {
    try {
        console.log('🚀 Inicializando página de administración...');
        console.log('🔍 CONFIG disponible:', typeof CONFIG !== 'undefined');
        console.log('🔍 CONFIG.SUPABASE_URL:', CONFIG?.SUPABASE_URL);
        
        // Inicializar servicio de administración
        console.log('🔧 Creando AdminService...');
        adminService = new AdminService();
        console.log('🔧 AdminService creado:', !!adminService);
        
        console.log('🔧 Inicializando AdminService...');
        await adminService.init();
        console.log('🔧 AdminService inicializado');
        
        // Si el usuario no está autenticado, mostrar mensaje pero no bloquear
        if (!adminService.currentUser) {
            console.log('⚠️ Usuario no autenticado en página de admin');
            console.log('⚠️ Continuando sin autenticación para permitir funcionalidad básica');
            // No redirigir automáticamente para evitar bucles
        }
        
        if (adminService.currentUser) {
            console.log('✅ Usuario autenticado:', adminService.currentUser.email);
        } else {
            console.log('⚠️ Continuando sin usuario autenticado');
        }
        
        // Cargar datos iniciales
        console.log('📊 Iniciando carga de datos...');
        await loadData();
        
        console.log('✅ Página de administración inicializada');
        
        // Exponer adminService globalmente después de inicializarlo
        window.adminService = adminService;
        console.log('✅ AdminService expuesto globalmente');
        
    } catch (error) {
        console.error('❌ Error inicializando página:', error);
        showError('Error inicializando página: ' + error.message);
    }
}

// Variables globales para filtros
let allRides = [];
let currentFilter = 'all';

// Cargar datos
async function loadData() {
    try {
        console.log(`🔄 === INICIANDO LOADDATA ===`);
        console.log(`📅 Timestamp: ${new Date().toISOString()}`);
        console.log(`🌐 Página actual: ${window.location.pathname}`);
        
        showLoading(true);
        
        console.log('📊 Cargando datos de administración...');
        console.log('🔍 AdminService disponible:', !!adminService);
        
        // Cargar datos en paralelo
        console.log('🔍 Iniciando carga de datos...');
        
        const pendingRidesPromise = adminService.getPendingRides();
        const availableDriversPromise = adminService.getAvailableDrivers();
        const statsPromise = adminService.getDashboardStats();
        const allRidesPromise = adminService.getAllRides();
        
        console.log('🔍 Promesas creadas, esperando resultados...');
        
        const [pendingRides, availableDrivers, stats, allRidesData] = await Promise.all([
            pendingRidesPromise,
            availableDriversPromise,
            statsPromise,
            allRidesPromise
        ]);

        console.log('✅ Datos cargados exitosamente:');
        console.log('  - Viajes pendientes:', pendingRides.length);
        console.log('  - Conductores disponibles:', availableDrivers.length);
        console.log('  - Estadísticas:', stats);
        console.log('  - Total de viajes:', allRidesData.length);

        // Guardar todos los viajes
        allRides = allRidesData;

        // Actualizar UI
        console.log('🔧 Actualizando UI...');
        updateStats(stats);
        updatePendingRidesList(pendingRides);
        
        // Actualizar también la lista de viajes aceptados
        const acceptedRides = allRides.filter(ride => ride.status === 'accepted');
        console.log('🔧 Actualizando viajes aceptados:', acceptedRides.length);
        updateAcceptedRidesList(acceptedRides);
        
        // Actualizar también la lista de viajes en progreso
        const inProgressRides = allRides.filter(ride => ride.status === 'in_progress');
        console.log('🔧 Actualizando viajes en progreso:', inProgressRides.length);
        updateInProgressRidesList(inProgressRides);
        
        // Actualizar también la lista de viajes completados
        const completedRides = allRides.filter(ride => ride.status === 'completed');
        console.log('🔧 Actualizando viajes completados:', completedRides.length);
        updateCompletedRidesList(completedRides);

        showLoading(false);
        
        console.log('✅ === LOADDATA COMPLETADO ===');
        
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        showError('Error cargando datos: ' + error.message);
        showLoading(false);
    }
}

// Actualizar estadísticas
function updateStats(stats) {
    try {
        const pendingElement = document.getElementById('pendingCount');
        const acceptedElement = document.getElementById('acceptedCount');
        const inProgressElement = document.getElementById('inProgressCount');
        const completedElement = document.getElementById('completedCount');
        
        if (pendingElement) pendingElement.textContent = stats.pending;
        if (acceptedElement) acceptedElement.textContent = stats.accepted;
        if (inProgressElement) inProgressElement.textContent = stats.inProgress;
        if (completedElement) completedElement.textContent = stats.completed;
        
        console.log('✅ Estadísticas actualizadas:', stats);
        
    } catch (error) {
        console.error('❌ Error actualizando estadísticas:', error);
    }
}

// Actualizar lista de viajes pendientes
function updatePendingRidesList(rides) {
    try {
        const container = document.getElementById('pendingRidesList');
        if (!container) return;
        
        if (rides.length === 0) {
            container.innerHTML = '<div class="no-data-message">No hay viajes pendientes</div>';
            return;
        }
        
        container.innerHTML = rides.map(ride => `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-info">
                    <h3>Viaje #${ride.id.slice(-8)}</h3>
                    <p><strong>Origen:</strong> ${ride.origin?.address || 'N/A'}</p>
                    <p><strong>Destino:</strong> ${ride.destination?.address || 'N/A'}</p>
                    <p><strong>Precio:</strong> $${ride.price || '0.00'}</p>
                    <p><strong>Cliente:</strong> ${ride.client_name || 'N/A'}</p>
                </div>
                <div class="ride-actions">
                    <button class="btn btn-primary" onclick="assignDriver('${ride.id}')">
                        Asignar Conductor
                    </button>
                    <button class="btn btn-secondary" onclick="editRide('${ride.id}')">
                        Editar
                    </button>
                    <button class="btn btn-danger" onclick="deleteRide('${ride.id}')">
                        Eliminar
                    </button>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Lista de viajes pendientes actualizada');
        
    } catch (error) {
        console.error('❌ Error actualizando lista de viajes pendientes:', error);
    }
}

// Actualizar lista de viajes aceptados
function updateAcceptedRidesList(rides) {
    try {
        const container = document.getElementById('acceptedRidesList');
        if (!container) return;
        
        if (rides.length === 0) {
            container.innerHTML = '<div class="no-data-message">No hay viajes aceptados</div>';
            return;
        }
        
        container.innerHTML = rides.map(ride => `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-info">
                    <h3>Viaje #${ride.id.slice(-8)}</h3>
                    <p><strong>Conductor:</strong> ${ride.driver_name || 'N/A'}</p>
                    <p><strong>Origen:</strong> ${ride.origin?.address || 'N/A'}</p>
                    <p><strong>Destino:</strong> ${ride.destination?.address || 'N/A'}</p>
                    <p><strong>Precio:</strong> $${ride.price || '0.00'}</p>
                </div>
                <div class="ride-actions">
                    <button class="btn btn-warning" onclick="startRide('${ride.id}')">
                        Iniciar Viaje
                    </button>
                    <button class="btn btn-secondary" onclick="editRide('${ride.id}')">
                        Editar
                    </button>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Lista de viajes aceptados actualizada');
        
    } catch (error) {
        console.error('❌ Error actualizando lista de viajes aceptados:', error);
    }
}

// Actualizar lista de viajes en progreso
function updateInProgressRidesList(rides) {
    try {
        const container = document.getElementById('inProgressRidesList');
        if (!container) return;
        
        if (rides.length === 0) {
            container.innerHTML = '<div class="no-data-message">No hay viajes en progreso</div>';
            return;
        }
        
        container.innerHTML = rides.map(ride => `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-info">
                    <h3>Viaje #${ride.id.slice(-8)}</h3>
                    <p><strong>Conductor:</strong> ${ride.driver_name || 'N/A'}</p>
                    <p><strong>Origen:</strong> ${ride.origin?.address || 'N/A'}</p>
                    <p><strong>Destino:</strong> ${ride.destination?.address || 'N/A'}</p>
                    <p><strong>Precio:</strong> $${ride.price || '0.00'}</p>
                </div>
                <div class="ride-actions">
                    <button class="btn btn-success" onclick="completeRide('${ride.id}')">
                        Completar Viaje
                    </button>
                    <button class="btn btn-info" onclick="trackRide('${ride.id}')">
                        Rastrear
                    </button>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Lista de viajes en progreso actualizada');
        
    } catch (error) {
        console.error('❌ Error actualizando lista de viajes en progreso:', error);
    }
}

// Actualizar lista de viajes completados
function updateCompletedRidesList(rides) {
    try {
        const container = document.getElementById('completedRidesList');
        if (!container) return;
        
        if (rides.length === 0) {
            container.innerHTML = '<div class="no-data-message">No hay viajes completados</div>';
            return;
        }
        
        container.innerHTML = rides.map(ride => `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-info">
                    <h3>Viaje #${ride.id.slice(-8)}</h3>
                    <p><strong>Conductor:</strong> ${ride.driver_name || 'N/A'}</p>
                    <p><strong>Origen:</strong> ${ride.origin?.address || 'N/A'}</p>
                    <p><strong>Destino:</strong> ${ride.destination?.address || 'N/A'}</p>
                    <p><strong>Precio:</strong> $${ride.price || '0.00'}</p>
                    <p><strong>Completado:</strong> ${new Date(ride.completed_at).toLocaleString()}</p>
                </div>
                <div class="ride-actions">
                    <button class="btn btn-info" onclick="viewRideDetails('${ride.id}')">
                        Ver Detalles
                    </button>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Lista de viajes completados actualizada');
        
    } catch (error) {
        console.error('❌ Error actualizando lista de viajes completados:', error);
    }
}

// Funciones de utilidad
function showLoading(show) {
    const loadingElement = document.getElementById('loadingScreen');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    console.error('❌ Error:', message);
    // Implementar notificación de error
}

function showSuccess(message) {
    console.log('✅ Success:', message);
    // Implementar notificación de éxito
}

function showNotification(title, message, type = 'info') {
    console.log(`🔔 ${type.toUpperCase()}: ${title} - ${message}`);
    // Implementar notificación
}

// Funciones de acción (placeholder)
function assignDriver(rideId) {
    console.log('Asignar conductor a viaje:', rideId);
    // Implementar lógica de asignación
}

function editRide(rideId) {
    console.log('Editar viaje:', rideId);
    // Implementar lógica de edición
}

function deleteRide(rideId) {
    console.log('Eliminar viaje:', rideId);
    // Implementar lógica de eliminación
}

function startRide(rideId) {
    console.log('Iniciar viaje:', rideId);
    // Implementar lógica de inicio
}

function completeRide(rideId) {
    console.log('Completar viaje:', rideId);
    // Implementar lógica de completado
}

function trackRide(rideId) {
    console.log('Rastrear viaje:', rideId);
    // Implementar lógica de rastreo
}

function viewRideDetails(rideId) {
    console.log('Ver detalles del viaje:', rideId);
    // Implementar lógica de detalles
}

// ===== INICIALIZACIÓN DE LA PÁGINA =====

// Variable para evitar múltiples inicializaciones
let adminPageInitialized = false;

// Solo inicializar admin.js si estamos en una página de administración específica
function shouldInitializeAdmin() {
    const currentPath = window.location.pathname;
    const adminPaths = [
        '/create-ride',
        '/drivers',
        '/ride-management',
        '/reports',
        '/configuration'
    ];
    
    // Si estamos en la página principal (home.html), no inicializar admin
    if (currentPath === '/' || currentPath === '/home.html' || currentPath.endsWith('/')) {
        return false;
    }
    
    // Solo inicializar si estamos en una ruta de admin
    return adminPaths.some(path => currentPath.includes(path));
}

// Inicializar AdminService globalmente
function initGlobalAdminService() {
    if (!window.globalAdminService) {
        console.log('🌐 Inicializando AdminService globalmente...');
        window.globalAdminService = new AdminService();
        console.log('✅ AdminService global creado');
        
        // Dispatch event when admin service is ready
        document.dispatchEvent(new CustomEvent('adminServiceReady'));
        console.log('📢 Evento adminServiceReady disparado');
    }
}

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, verificando si inicializar admin...');
    
    // Esperar un poco para que Supabase se cargue completamente
    setTimeout(() => {
        // Inicializar AdminService globalmente para todas las páginas del admin
        initGlobalAdminService();
        
        if (shouldInitializeAdmin() && !adminPageInitialized) {
            console.log('📄 Inicializando página de administración...');
            adminPageInitialized = true;
            initAdminPage();
        } else {
            console.log('📄 No es una página de admin, saltando inicialización');
        }
    }, 100); // 100ms de retraso para asegurar que Supabase esté cargado
});

// Exponer funciones globalmente
window.loadData = loadData;
window.assignDriver = assignDriver;
window.editRide = editRide;
window.deleteRide = deleteRide;
window.startRide = startRide;
window.completeRide = completeRide;
window.trackRide = trackRide;
window.viewRideDetails = viewRideDetails;

console.log('✅ admin.js cargado - versión: 2024-01-23-35');
