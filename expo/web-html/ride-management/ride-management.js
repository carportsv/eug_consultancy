// Ride Management - Specific functionality for ride management
class RideManagementService {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        this.allRides = [];
        this.filteredRides = [];
        this.availableDrivers = [];
        this.userMap = new Map(); // Para mapear user_id a user data
    }

    async init() {
        console.log('🚗 Initializing Ride Management Service...');
        await this.checkDatabaseStructure();
        await this.loadDrivers();
        await this.loadData();
    }

    // Verificar estructura de la base de datos
    async checkDatabaseStructure() {
        try {
            console.log('🔍 Verificando estructura de la base de datos...');
            
            // Verificar si existe la tabla drivers
            const driversResponse = await fetch(`${this.supabaseUrl}/rest/v1/drivers?select=id&limit=1`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (driversResponse.status === 200) {
                console.log('✅ Tabla "drivers" existe');
                this.hasDriversTable = true;
                
                // Verificar si la tabla drivers tiene conductores
                const driversCountResponse = await fetch(`${this.supabaseUrl}/rest/v1/drivers?select=id`, {
                    headers: {
                        'apikey': this.supabaseKey,
                        'Authorization': `Bearer ${this.supabaseKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (driversCountResponse.ok) {
                    const driversData = await driversCountResponse.json();
                    console.log(`📊 Tabla "drivers" tiene ${driversData.length} registros`);
                    
                    // Si está vacía, sincronizar conductores de users
                    if (driversData.length === 0) {
                        console.log('🔄 Tabla "drivers" vacía, sincronizando conductores...');
                        await this.syncDriversToDriversTable();
                    }
                }
            } else {
                console.log('❌ Tabla "drivers" no existe o no es accesible');
                this.hasDriversTable = false;
            }
            
            // Verificar estructura de ride_requests
            const rideRequestsResponse = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?select=driver_id&limit=1`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (rideRequestsResponse.status === 200) {
                console.log('✅ Tabla "ride_requests" accesible');
            } else {
                console.log('❌ Tabla "ride_requests" no accesible');
            }
            
        } catch (error) {
            console.error('❌ Error verificando estructura de BD:', error);
            this.hasDriversTable = false;
        }
    }

    // Sincronizar conductores de users a drivers
    async syncDriversToDriversTable() {
        try {
            console.log('🔄 Iniciando sincronización de conductores...');
            
            // Primero verificar la estructura real de la tabla drivers
            console.log('🔍 Verificando estructura de tabla drivers...');
            const structureResponse = await fetch(`${this.supabaseUrl}/rest/v1/drivers?select=*&limit=1`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            let driversColumns = ['id', 'display_name', 'email']; // Columnas básicas que sabemos que existen
            
            if (structureResponse.ok) {
                try {
                    const sampleData = await structureResponse.json();
                    if (sampleData.length > 0) {
                        const sampleDriver = sampleData[0];
                        driversColumns = Object.keys(sampleDriver);
                        console.log('📋 Columnas disponibles en tabla drivers:', driversColumns);
                    }
                } catch (e) {
                    console.log('⚠️ No se pudo leer estructura de drivers, usando columnas básicas');
                }
            }
            
            // Obtener conductores de la tabla users
            const usersResponse = await fetch(`${this.supabaseUrl}/rest/v1/users?role=eq.driver&is_active=eq.true&select=id,display_name,email,phone_number`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!usersResponse.ok) {
                throw new Error(`Error obteniendo conductores de users: ${usersResponse.status}`);
            }
            
            const driversFromUsers = await usersResponse.json();
            console.log(`👥 ${driversFromUsers.length} conductores encontrados en users`);
            
            if (driversFromUsers.length === 0) {
                console.log('⚠️ No hay conductores para sincronizar');
                return;
            }
            
            // Insertar conductores en la tabla drivers
            for (const driver of driversFromUsers) {
                try {
                    // Primero verificar si el conductor ya existe
                    const checkResponse = await fetch(`${this.supabaseUrl}/rest/v1/drivers?id=eq.${driver.id}`, {
                        headers: {
                            'apikey': this.supabaseKey,
                            'Authorization': `Bearer ${this.supabaseKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (checkResponse.ok) {
                        const existingDriver = await checkResponse.json();
                        if (existingDriver.length > 0) {
                            console.log(`✅ Conductor ya existe: ${driver.display_name || driver.email}`);
                            continue; // Saltar si ya existe
                        }
                    }
                    
                    // Construir datos de inserción basados en las columnas disponibles
                    const insertData = {};
                    
                    // Solo incluir campos que existen en la tabla drivers
                    if (driversColumns.includes('id')) insertData.id = driver.id;
                    if (driversColumns.includes('display_name')) insertData.display_name = driver.display_name || '';
                    if (driversColumns.includes('email')) insertData.email = driver.email || '';
                    if (driversColumns.includes('phone_number') && driver.phone_number) insertData.phone_number = driver.phone_number;
                    if (driversColumns.includes('is_active')) insertData.is_active = true;
                    if (driversColumns.includes('created_at')) insertData.created_at = new Date().toISOString();
                    if (driversColumns.includes('updated_at')) insertData.updated_at = new Date().toISOString();
                    
                    console.log('📝 Datos a insertar:', insertData);
                    
                    const insertResponse = await fetch(`${this.supabaseUrl}/rest/v1/drivers`, {
                        method: 'POST',
                        headers: {
                            'apikey': this.supabaseKey,
                            'Authorization': `Bearer ${this.supabaseKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'resolution=merge-duplicates'
                        },
                        body: JSON.stringify(insertData)
                    });
                    
                    if (insertResponse.ok) {
                        console.log(`✅ Conductor sincronizado: ${driver.display_name || driver.email}`);
                    } else {
                        const errorText = await insertResponse.text();
                        console.warn(`⚠️ Error sincronizando conductor ${driver.id}: ${insertResponse.status} - ${errorText}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Error sincronizando conductor ${driver.id}:`, error);
                }
            }
            
            console.log('✅ Sincronización de conductores completada');
            
            // Recargar la lista de conductores después de la sincronización
            await this.loadDrivers();
            
        } catch (error) {
            console.error('❌ Error en sincronización de conductores:', error);
        }
    }

    // Load available drivers for assignment
    async loadDrivers() {
        try {
            console.log('👥 Loading available drivers...');
            console.log('🔗 URL:', `${this.supabaseUrl}/rest/v1/users?role=eq.driver&is_active=eq.true&select=id,display_name,email,phone_number&order=display_name.asc`);
            
            const response = await fetch(`${this.supabaseUrl}/rest/v1/users?role=eq.driver&is_active=eq.true&select=id,display_name,email,phone_number&order=display_name.asc`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response error text:', errorText);
                throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
            }

            const drivers = await response.json();
            console.log('📋 Drivers raw response:', drivers);
            console.log(`✅ ${drivers.length} drivers loaded`);

            // Build user map for all drivers
            drivers.forEach((driver, index) => {
                console.log(`👤 Driver ${index + 1}:`, driver);
                this.userMap.set(driver.id, driver);
            });

            this.availableDrivers = drivers;
            
            // Si no hay conductores, mostrar mensaje informativo
            if (drivers.length === 0) {
                console.warn('⚠️ No se encontraron conductores. Verifica:');
                console.warn('   - Que existan usuarios en la tabla users');
                console.warn('   - Que tengan role = "driver"');
                console.warn('   - Que tengan is_active = true');
            }
            
            return drivers;
        } catch (error) {
            console.error('❌ Error loading drivers:', error);
            console.error('🔍 Error details:', {
                message: error.message,
                stack: error.stack,
                supabaseUrl: this.supabaseUrl,
                hasSupabaseKey: !!this.supabaseKey
            });
            showError('Error loading drivers: ' + error.message);
            return [];
        }
    }

    // Load data for the page
    async loadData() {
        try {
            console.log('📊 Loading ride management data...');
            
            // Load all rides
            const ridesResponse = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?select=*&order=created_at.desc`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (ridesResponse.ok) {
                this.allRides = await ridesResponse.json();
                this.filteredRides = [...this.allRides];
                console.log(`✅ ${this.allRides.length} rides loaded`);
                
                // Update UI - solo estadísticas en esta página
                this.updateStats();
                
                // No hay filtros en esta página, solo se cargan para el modal de selección
            }

            // Hide loading screen
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

            console.log('✅ Ride management data loaded');
        } catch (error) {
            console.error('❌ Error loading ride management data:', error);
            showError('Error loading data: ' + error.message);
        }
    }

    // Update pending rides list
    updatePendingRidesList() {
        const pendingRidesList = document.getElementById('pendingRidesList');
        const noPendingRides = document.getElementById('noPendingRides');

        // Si no existe la lista de viajes pendientes en esta página, no hacer nada
        if (!pendingRidesList) {
            console.log('🔍 No hay lista de viajes pendientes en esta página');
            return;
        }

        const pendingRides = this.allRides.filter(ride => ride.status === 'requested');

        if (pendingRides.length === 0) {
            pendingRidesList.style.display = 'none';
            if (noPendingRides) noPendingRides.style.display = 'flex';
            return;
        }

        pendingRidesList.style.display = 'block';
        if (noPendingRides) noPendingRides.style.display = 'none';

        pendingRidesList.innerHTML = pendingRides.map(ride => this.createPendingRideCard(ride)).join('');
    }

    // Create pending ride card HTML
    createPendingRideCard(ride) {
        const createdAt = new Date(ride.created_at).toLocaleString('es-ES');
        const origin = ride.origin?.address || 'N/A';
        const destination = ride.destination?.address || 'N/A';
        const price = ride.price ? `$${parseFloat(ride.price).toFixed(2)}` : 'N/A';
        const distance = ride.distance ? `${(ride.distance / 1000).toFixed(1)} km` : 'N/A';
        const clientName = ride.client_name || 'N/A';
        const additionalNotes = ride.additional_notes || '';
        const priority = ride.priority || 'normal';

        return `
            <div class="ride-card pending" data-ride-id="${ride.id}">
                <div class="ride-header" onclick="toggleRideCard('${ride.id}')">
                    <div class="ride-status pending">
                        <span class="status-badge">Pendiente</span>
                        ${priority !== 'normal' ? `<span class="priority-badge priority-${priority}">${priority === 'high' ? 'Alta' : 'Urgente'}</span>` : ''}
                    </div>
                    <div class="ride-header-content">
                        <div class="ride-title">${clientName}</div>
                        <div class="ride-subtitle">${createdAt}</div>
                    </div>
                    <div class="ride-expand-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" class="expand-arrow">
                            <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
                
                <div class="ride-content" id="rideContent_${ride.id}" style="display: none;">
                    <div class="ride-info-grid">
                        <div class="info-card">
                            <div class="info-header">ORIGEN</div>
                            <div class="info-content">${origin}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-header">DESTINO</div>
                            <div class="info-content">${destination}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-header">COSTO</div>
                            <div class="info-content">${price}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-header">DISTANCIA</div>
                            <div class="info-content">${distance}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-header">CLIENTE</div>
                            <div class="info-content">${clientName}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-header">FECHA/HORA</div>
                            <div class="info-content">${createdAt}</div>
                        </div>
                    </div>
                    
                    ${additionalNotes ? `
                    <div class="ride-notes">
                        <div class="notes-header">Notas Adicionales:</div>
                        <div class="notes-content">${additionalNotes}</div>
                    </div>
                    ` : ''}
                    
                    <div class="ride-actions">
                        <button class="btn btn-primary" onclick="openDriverSelection('${ride.id}')">
                            👤 Asignar Conductor
                        </button>
                        <button class="btn btn-warning" onclick="cancelRide('${ride.id}')">
                            ❌ Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Update all rides list
    updateAllRidesList() {
        const ridesList = document.getElementById('allRidesList');
        const noRides = document.getElementById('noRides');
        const filteredCount = document.getElementById('filteredCount');

        // Si no existe la lista de viajes en esta página, no hacer nada
        if (!ridesList) {
            console.log('🔍 No hay lista de viajes en esta página');
            return;
        }

        if (this.filteredRides.length === 0) {
            ridesList.style.display = 'none';
            if (noRides) noRides.style.display = 'flex';
            if (filteredCount) filteredCount.textContent = '0';
            return;
        }

        ridesList.style.display = 'block';
        if (noRides) noRides.style.display = 'none';
        if (filteredCount) filteredCount.textContent = this.filteredRides.length;

        ridesList.innerHTML = this.filteredRides.map(ride => this.createRideCard(ride)).join('');
    }

    // Create ride card HTML
    createRideCard(ride) {
        const driver = ride.driver_id ? this.userMap.get(ride.driver_id) : null;
        const driverName = driver ? (driver.display_name || driver.email) : 'Sin asignar';
        const statusClass = this.getStatusClass(ride.status);
        const statusText = this.getStatusText(ride.status);
        const createdAt = new Date(ride.created_at).toLocaleString('es-ES');
        const origin = ride.origin?.address || 'N/A';
        const destination = ride.destination?.address || 'N/A';
        const price = ride.price ? `$${parseFloat(ride.price).toFixed(2)}` : 'N/A';
        const distance = ride.distance ? `${(ride.distance / 1000).toFixed(1)} km` : 'N/A';
        const clientName = ride.client_name || 'N/A';
        const additionalNotes = ride.additional_notes || '';

        return `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-header" onclick="toggleRideCard('${ride.id}')">
                    <div class="ride-status ${statusClass}">
                        <span class="status-badge">${statusText}</span>
                    </div>
                    <div class="ride-header-content">
                        <div class="ride-title">${clientName}</div>
                        <div class="ride-subtitle">${createdAt}</div>
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
                        ${ride.status === 'accepted' ? `
                        <button class="btn btn-sm btn-primary" onclick="startRide('${ride.id}')">
                            🚗 Iniciar Viaje
                        </button>
                        ` : ''}
                        ${ride.status === 'in_progress' ? `
                        <button class="btn btn-sm btn-success" onclick="completeRide('${ride.id}')">
                            ✅ Finalizar Viaje
                        </button>
                        ` : ''}
                        ${ride.status === 'completed' ? `
                        <button class="btn btn-sm btn-delete" onclick="deleteRide('${ride.id}')">
                            🗑️ Eliminar Viaje
                        </button>
                        ` : ''}
                        ${ride.status !== 'completed' ? `
                        <button class="btn btn-sm btn-danger" onclick="cancelRide('${ride.id}')">
                            ❌ Cancelar
                        </button>
                        ` : ''}
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
                            <div class="info-header">FECHA/HORA</div>
                            <div class="info-content">${createdAt}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-header">CONDUCTOR</div>
                            <div class="info-content">${driverName}</div>
                        </div>
                        ${additionalNotes ? `
                        <div class="info-card">
                            <div class="info-header">NOTAS ADICIONALES</div>
                            <div class="info-content">${additionalNotes}</div>
                        </div>
                        ` : ''}
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

    // Get status class for styling
    getStatusClass(status) {
        const statusClasses = {
            'requested': 'status-pending',
            'accepted': 'status-active',
            'in_progress': 'status-progress',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        return statusClasses[status] || 'status-pending';
    }

    // Get status text
    getStatusText(status) {
        const statusTexts = {
            'requested': 'Solicitado',
            'accepted': 'Aceptado',
            'in_progress': 'En progreso',
            'completed': 'Completado',
            'cancelled': 'Cancelado'
        };
        return statusTexts[status] || 'Desconocido';
    }

    // Update statistics
    updateStats() {
        const totalRides = this.allRides.length;
        const pendingRides = this.allRides.filter(ride => ride.status === 'requested').length;
        const acceptedRides = this.allRides.filter(ride => ride.status === 'accepted').length;
        const inProgressRides = this.allRides.filter(ride => ride.status === 'in_progress').length;
        const completedRides = this.allRides.filter(ride => ride.status === 'completed').length;
        const cancelledRides = this.allRides.filter(ride => ride.status === 'cancelled').length;

        // Actualizar estadísticas principales si existen
        const totalRidesCount = document.getElementById('totalRidesCount');
        const pendingRidesCount = document.getElementById('pendingRidesCount');
        const activeRidesCount = document.getElementById('activeRidesCount');
        const progressRidesCount = document.getElementById('progressRidesCount');
        const completedRidesCount = document.getElementById('completedRidesCount');
        const cancelledRidesCount = document.getElementById('cancelledRidesCount');

        if (totalRidesCount) totalRidesCount.textContent = totalRides;
        if (pendingRidesCount) pendingRidesCount.textContent = pendingRides;
        if (activeRidesCount) activeRidesCount.textContent = acceptedRides;
        if (progressRidesCount) progressRidesCount.textContent = inProgressRides;
        if (completedRidesCount) completedRidesCount.textContent = completedRides;
        if (cancelledRidesCount) cancelledRidesCount.textContent = cancelledRides;

        // Actualizar contadores de botones de navegación si existen
        const acceptedCount = document.getElementById('acceptedCount');
        const completedCount = document.getElementById('completedCount');
        const cancelledCount = document.getElementById('cancelledCount');
        
        if (acceptedCount) acceptedCount.textContent = this.allRides.filter(ride => ride.status === 'accepted').length;
        if (completedCount) completedCount.textContent = completedRides;
        if (cancelledCount) cancelledCount.textContent = cancelledRides;

        // Actualizar contador de viajes pendientes en la sección
        const pendingCount = document.getElementById('pendingCount');
        if (pendingCount) pendingCount.textContent = pendingRides;

        // Actualizar lista de viajes pendientes
        this.updatePendingRidesList();
    }

    // Navegar a vista específica por estado
    navigateToStatus(status) {
        console.log(`🧭 Navegando a vista de estado: ${status}`);
        
        // Filtrar viajes por estado
        this.filteredRides = this.allRides.filter(ride => ride.status === status);
        
        // Actualizar título de la sección
        const sectionTitle = document.querySelector('.admin-section:last-child .section-header h2');
        if (sectionTitle) {
            const statusTexts = {
                'accepted': 'Viajes Aceptados',
                'in_progress': 'Viajes En Progreso',
                'completed': 'Viajes Completados',
                'cancelled': 'Viajes Cancelados'
            };
            sectionTitle.textContent = statusTexts[status] || 'Viajes';
        }
        
        // Actualizar descripción
        const sectionDescription = document.querySelector('.admin-section:last-child .section-description p');
        if (sectionDescription) {
            const descriptions = {
                'accepted': 'Viajes con conductores asignados, listos para iniciar',
                'in_progress': 'Viajes activos en curso',
                'completed': 'Viajes finalizados exitosamente',
                'cancelled': 'Viajes cancelados por el usuario o sistema'
            };
            sectionDescription.textContent = descriptions[status] || 'Gestión de viajes';
        }
        
        // Actualizar contador
        const filteredCount = document.getElementById('filteredCount');
        if (filteredCount) {
            filteredCount.textContent = this.filteredRides.length;
        }
        
        // Mostrar botón "Ver Todos los Viajes"
        const showAllBtn = document.getElementById('showAllBtn');
        if (showAllBtn) {
            showAllBtn.style.display = 'inline-block';
        }
        
        // Actualizar lista de viajes
        this.updateAllRidesList();
        
        // Mostrar mensaje de confirmación
        const statusTexts = {
            'accepted': 'Viajes Aceptados',
            'in_progress': 'Viajes En Progreso',
            'completed': 'Viajes Completados',
            'cancelled': 'Viajes Cancelados'
        };
        showSuccess(`Mostrando ${this.filteredRides.length} viajes de estado: ${statusTexts[status]}`);
    }

    // Mostrar todos los viajes
    showAllRides() {
        console.log('🔄 Mostrando todos los viajes');
        
        // Restaurar vista general
        this.filteredRides = [...this.allRides];
        
        // Restaurar título original
        const sectionTitle = document.querySelector('.admin-section:last-child .section-header h2');
        if (sectionTitle) {
            sectionTitle.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" fill="#ffffff"/>
                </svg>
                Todos los Viajes
            `;
        }
        
        // Restaurar descripción original
        const sectionDescription = document.querySelector('.admin-section:last-child .section-description p');
        if (sectionDescription) {
            sectionDescription.textContent = 'Gestión completa de todos los viajes del sistema';
        }
        
        // Ocultar botón "Ver Todos los Viajes"
        const showAllBtn = document.getElementById('showAllBtn');
        if (showAllBtn) {
            showAllBtn.style.display = 'none';
        }
        
        // Actualizar contador
        const filteredCount = document.getElementById('filteredCount');
        if (filteredCount) {
            filteredCount.textContent = this.filteredRides.length;
        }
        
        // Actualizar lista de viajes
        this.updateAllRidesList();
        
        showSuccess('Mostrando todos los viajes del sistema');
    }

    // Filter rides based on current filters
    filterRides() {
        // Verificar si los elementos de filtro existen antes de usarlos
        const statusFilter = document.getElementById('statusFilter');
        const driverFilter = document.getElementById('driverFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        // Si no hay filtros, mostrar todos los viajes
        if (!statusFilter && !driverFilter && !dateFilter) {
            console.log('🔍 No hay filtros disponibles en esta página');
            this.filteredRides = [...this.allRides];
            this.updateAllRidesList();
            return;
        }

        const statusValue = statusFilter ? statusFilter.value : '';
        const driverValue = driverFilter ? driverFilter.value : '';
        const dateValue = dateFilter ? dateFilter.value : '';

        console.log('🔍 Aplicando filtros:', { statusValue, driverValue, dateValue });
        console.log('📊 Total de viajes antes de filtrar:', this.allRides.length);

        this.filteredRides = this.allRides.filter(ride => {
            // Status filter
            if (statusValue && ride.status !== statusValue) {
                console.log(`❌ Viaje ${ride.id} filtrado por estado: ${ride.status} !== ${statusValue}`);
                return false;
            }

            // Driver filter
            if (driverValue === 'unassigned' && ride.driver_id) {
                console.log(`❌ Viaje ${ride.id} filtrado por conductor: tiene conductor ${ride.driver_id}`);
                return false;
            }
            if (driverValue && driverValue !== 'unassigned' && ride.driver_id !== driverValue) {
                console.log(`❌ Viaje ${ride.id} filtrado por conductor: ${ride.driver_id} !== ${driverValue}`);
                return false;
            }

            // Date filter
            if (dateValue) {
                const rideDate = new Date(ride.created_at).toISOString().split('T')[0];
                if (rideDate !== dateValue) {
                    console.log(`❌ Viaje ${ride.id} filtrado por fecha: ${rideDate} !== ${dateValue}`);
                    return false;
                }
            }

            console.log(`✅ Viaje ${ride.id} pasa todos los filtros`);
            return true;
        });

        console.log('📊 Viajes después de filtrar:', this.filteredRides.length);
        this.updateAllRidesList();
    }

    // Limpiar todos los filtros
    clearAllFilters() {
        console.log('🧹 Limpiando todos los filtros...');
        
        // Resetear valores de filtros si existen
        const statusFilter = document.getElementById('statusFilter');
        const driverFilter = document.getElementById('driverFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        if (statusFilter) statusFilter.value = '';
        if (driverFilter) driverFilter.value = '';
        if (dateFilter) dateFilter.value = '';
        
        // Mostrar todos los viajes
        this.filteredRides = [...this.allRides];
        console.log('📊 Mostrando todos los viajes:', this.filteredRides.length);
        
        this.updateAllRidesList();
        showSuccess('Filtros limpiados - mostrando todos los viajes');
    }



    // Cargar conductores en el filtro de conductores
    loadDriversInFilter() {
        try {
            const driverFilter = document.getElementById('driverFilter');
            if (!driverFilter) {
                console.error('❌ Elemento driverFilter no encontrado');
                return;
            }

            console.log('👥 Cargando conductores en filtro...');
            console.log('👥 Conductores disponibles:', this.availableDrivers);

            // Limpiar opciones existentes
            driverFilter.innerHTML = '';

            // Agregar opción "Todos los conductores"
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = 'Todos los conductores';
            driverFilter.appendChild(allOption);

            // Agregar opción "Sin asignar"
            const unassignedOption = document.createElement('option');
            unassignedOption.value = 'unassigned';
            unassignedOption.textContent = 'Sin asignar';
            driverFilter.appendChild(unassignedOption);

            // Agregar cada conductor
            this.availableDrivers.forEach(driver => {
                const option = document.createElement('option');
                option.value = driver.id;
                option.textContent = driver.display_name || driver.email || 'Sin nombre';
                driverFilter.appendChild(option);
            });

            console.log(`✅ ${this.availableDrivers.length + 2} opciones cargadas en filtro de conductores`);
        } catch (error) {
            console.error('❌ Error cargando conductores en filtro:', error);
        }
    }

    // Load drivers for selection modal
    async loadDriversForSelection() {
        const driverList = document.getElementById('driverSelectionList');
        if (!driverList) {
            console.error('❌ Elemento driverSelectionList no encontrado');
            return;
        }

        console.log('👥 Cargando conductores para selección...');
        console.log('👥 Conductores disponibles:', this.availableDrivers);
        console.log('👥 Total de conductores:', this.availableDrivers.length);

        let html = `
            <div class="driver-option" onclick="selectDriver(null)">
                <div class="driver-info">
                    <div class="driver-name">Sin conductor</div>
                    <div class="driver-email">Dejar sin asignar</div>
                </div>
            </div>
            <div class="driver-option sync-option" onclick="syncDriversManually()">
                <div class="driver-info">
                    <div class="driver-name">🔄 Sincronizar Conductores</div>
                    <div class="driver-email">Actualizar tabla drivers</div>
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
            this.availableDrivers.forEach((driver, index) => {
                console.log(`👤 Conductor ${index + 1}:`, driver);
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
            
            // Verificar si el viaje ya tiene un conductor asignado
            const localRide = this.allRides.find(r => r.id === rideId);
            if (localRide && localRide.driver_id && driverId) {
                console.log('⚠️ El viaje ya tiene un conductor asignado:', localRide.driver_id);
                const confirmed = confirm('Este viaje ya tiene un conductor asignado. ¿Quieres reemplazarlo?');
                if (!confirmed) {
                    return;
                }
            }
            
            // Primero obtener el estado actual del viaje
            const currentRideResponse = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}&select=driver_id,status`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!currentRideResponse.ok) {
                throw new Error(`Error obteniendo estado del viaje: ${currentRideResponse.status}`);
            }
            
            const currentRideData = await currentRideResponse.json();
            if (currentRideData.length === 0) {
                throw new Error('Viaje no encontrado');
            }
            
            const currentRide = currentRideData[0];
            console.log('📋 Estado actual del viaje:', currentRide);
            
            // Verificar si el estado del viaje permite cambios
            if (currentRide.status === 'completed' || currentRide.status === 'cancelled') {
                throw new Error(`No se puede modificar un viaje con estado: ${currentRide.status}`);
            }
            
            // Intentar asignar el conductor
            let response;
            try {
                                 // Si no hay driverId, asignar null (sin conductor)
                 // Si hay driverId, cambiar estado a 'accepted' (asignado)
                 const updateData = driverId ? {
                     driver_id: driverId,
                     status: 'accepted', // Cambiar a "Asignado"
                     updated_at: new Date().toISOString()
                 } : {
                     driver_id: null,
                     status: 'requested', // Volver a "Solicitado"
                     updated_at: new Date().toISOString()
                 };
                
                response = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': this.supabaseKey,
                        'Authorization': `Bearer ${this.supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(updateData)
                });
            } catch (error) {
                console.error('❌ Error en la petición PATCH:', error);
                throw new Error('Error de conexión al asignar conductor');
            }

            if (response.ok) {
                                 // Update local data
                 const rideIndex = this.allRides.findIndex(r => r.id === rideId);
                 if (rideIndex !== -1) {
                     this.allRides[rideIndex].driver_id = driverId;
                     this.allRides[rideIndex].status = 'accepted'; // Actualizar estado local
                     
                     // IMPORTANTE: Mantener la vista actual, NO resetear filtros
                     // Solo actualizar el viaje específico en filteredRides si está visible
                     const filteredIndex = this.filteredRides.findIndex(r => r.id === rideId);
                     if (filteredIndex !== -1) {
                         this.filteredRides[filteredIndex].driver_id = driverId;
                         this.filteredRides[filteredIndex].status = 'accepted'; // Actualizar estado local
                     }
                     
                     this.updateAllRidesList();
                     this.updateStats(); // Actualizar estadísticas
                 }

                                 if (driverId) {
                     showSuccess('Conductor asignado exitosamente. El viaje ahora está en "Gestión de Viajes"');
                 } else {
                     showSuccess('Conductor removido exitosamente. El viaje ahora está en "Crear Viajes"');
                 }
                 closeDriverSelectionModal();
            } else {
                // Obtener más detalles del error
                let errorMessage = `HTTP Error: ${response.status}`;
                let errorData = null;
                
                try {
                    errorData = await response.text();
                    if (errorData) {
                        errorMessage += ` - ${errorData}`;
                    }
                } catch (e) {
                    // Si no se puede leer el error, continuar
                }
                
                // Log detallado del error
                console.error('❌ Response error details:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    url: response.url,
                    errorData: errorData
                });
                
                            // Manejo específico para error 409 (Foreign Key Constraint)
            if (response.status === 409 && errorData && errorData.includes('drivers')) {
                console.error('🚨 ERROR DE CLAVE FORÁNEA: La tabla ride_requests espera conductores en tabla "drivers"');
                console.error('🚨 PERO estamos usando la tabla "users" para conductores');
                console.error('🔧 SOLUCIÓN AUTOMÁTICA IMPLEMENTADA:');
                console.error('   - Sincronizando conductores de users a drivers automáticamente');
                console.error('   - Reintentando asignación después de sincronización...');
                
                // Intentar sincronizar y reintentar
                try {
                    await this.syncDriversToDriversTable();
                    
                                         // Reintentar la asignación después de sincronizar
                     const retryResponse = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}`, {
                         method: 'PATCH',
                         headers: {
                             'apikey': this.supabaseKey,
                             'Authorization': `Bearer ${this.supabaseKey}`,
                             'Content-Type': 'application/json',
                             'Prefer': 'return=minimal'
                         },
                         body: JSON.stringify({
                             driver_id: driverId,
                             status: 'accepted', // Cambiar a "Asignado"
                             updated_at: new Date().toISOString()
                         })
                     });
                    
                                         if (retryResponse.ok) {
                         // Update local data
                         const rideIndex = this.allRides.findIndex(r => r.id === rideId);
                         if (rideIndex !== -1) {
                             this.allRides[rideIndex].driver_id = driverId;
                             this.allRides[rideIndex].status = 'accepted'; // Actualizar estado local
                             
                             // IMPORTANTE: Mantener la vista actual, NO resetear filtros
                             const filteredIndex = this.filteredRides.findIndex(r => r.id === rideId);
                             if (filteredIndex !== -1) {
                                 this.filteredRides[filteredIndex].driver_id = driverId;
                                 this.filteredRides[filteredIndex].status = 'accepted'; // Actualizar estado local
                             }
                             
                             this.updateAllRidesList();
                             this.updateStats(); // Actualizar estadísticas
                         }
                         
                         showSuccess('Conductor asignado exitosamente (después de sincronización automática). El viaje ahora está en "Gestión de Viajes"');
                         closeDriverSelectionModal();
                         return;
                    } else {
                        throw new Error(`Error en reintento: ${retryResponse.status}`);
                    }
                } catch (syncError) {
                    console.error('❌ Error en sincronización automática:', syncError);
                    throw new Error('Error de base de datos: No se pudo sincronizar conductores automáticamente. Contacta al administrador.');
                }
            }
                
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('❌ Error assigning driver:', error);
            showError('Error assigning driver: ' + error.message);
        }
    }

    // Cambiar estado del viaje a "En proceso"
    async startRide(rideId) {
        try {
            console.log(`🚗 Starting ride ${rideId}...`);
            
            const response = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?id=eq.${rideId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    status: 'in_progress',
                    updated_at: new Date().toISOString()
                })
            });

            if (response.ok) {
                // Update local data
                const rideIndex = this.allRides.findIndex(r => r.id === rideId);
                if (rideIndex !== -1) {
                    this.allRides[rideIndex].status = 'in_progress';
                    
                    // Actualizar también en filteredRides si está visible
                    const filteredIndex = this.filteredRides.findIndex(r => r.id === rideId);
                    if (filteredIndex !== -1) {
                        this.filteredRides[filteredIndex].status = 'in_progress';
                    }
                    
                    this.updateAllRidesList();
                    this.updateStats();
                }

                showSuccess('Viaje iniciado - Estado: En proceso');
            } else {
                throw new Error(`HTTP Error: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error starting ride:', error);
            showError('Error iniciando viaje: ' + error.message);
        }
    }

    // Cambiar estado del viaje a "Completado"
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
                // Update local data
                const rideIndex = this.allRides.findIndex(r => r.id === rideId);
                if (rideIndex !== -1) {
                    this.allRides[rideIndex].status = 'completed';
                    
                    // Actualizar también en filteredRides si está visible
                    const filteredIndex = this.filteredRides.findIndex(r => r.id === rideId);
                    if (filteredIndex !== -1) {
                        this.filteredRides[filteredIndex].status = 'completed';
                    }
                    
                    this.updateAllRidesList();
                    this.updateStats();
                }

                showSuccess('Viaje finalizado exitosamente');
            } else {
                throw new Error(`HTTP Error: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error completing ride:', error);
            showError('Error finalizando viaje: ' + error.message);
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
                // Update local data
                const rideIndex = this.allRides.findIndex(r => r.id === rideId);
                if (rideIndex !== -1) {
                    this.allRides[rideIndex].status = 'cancelled';
                    this.filteredRides = [...this.allRides];
                    this.updateAllRidesList();
                    this.updateStats();
                }

                showSuccess('Viaje cancelado exitosamente');
            } else {
                throw new Error(`HTTP Error: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error cancelling ride:', error);
            showError('Error cancelling ride: ' + error.message);
        }
    }

    // Delete ride permanently
    async deleteRide(rideId) {
        try {
            console.log(`🗑️ Deleting ride ${rideId} permanently...`);
            
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
                this.allRides = this.allRides.filter(r => r.id !== rideId);
                this.filteredRides = this.filteredRides.filter(r => r.id !== rideId);
                this.updateAllRidesList();
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
            
            const completedRides = this.allRides.filter(ride => ride.status === 'completed');
            
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
                    } else {
                        errorCount++;
                        console.error(`Error deleting ride ${ride.id}: ${response.status}`);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`Error deleting ride ${ride.id}:`, error);
                }
            }
            
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
        }
    }




}

// Global instance
let rideManagementService;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚗 Ride Management page loading...');
    
    // Verificar si venimos de create-ride para recargar datos
    const referrer = document.referrer;
    const isFromCreateRide = referrer.includes('create-ride');
    
    if (isFromCreateRide) {
        console.log('🔄 Detectado regreso desde create-ride, recargando datos...');
    }
    
    // Show loading screen initially
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
    
    rideManagementService = new RideManagementService();
    await rideManagementService.init();
    
    // Si venimos de create-ride, recargar datos después de la inicialización
    if (isFromCreateRide) {
        console.log('🔄 Recargando datos después de inicialización...');
        await rideManagementService.loadData();
    }
});

// Global functions for HTML onclick events
function goBack() {
    console.log('🔙 Going back...');
    
    // Verificar si venimos de create-ride
    const referrer = document.referrer;
    const isFromCreateRide = referrer.includes('create-ride');
    
    if (isFromCreateRide) {
        console.log('🔄 Regresando desde create-ride, recargando datos...');
        // Recargar datos antes de ir al home
        if (rideManagementService) {
            rideManagementService.loadData().then(() => {
                console.log('✅ Datos recargados, yendo al home...');
                window.location.href = '../home/home.html';
            });
        } else {
            window.location.href = '../home/home.html';
        }
    } else {
        console.log('🏠 Regresando al home...');
        // Regresar directamente a home
        window.location.href = '../home/home.html';
    }
}

function loadData() {
    if (rideManagementService) {
        rideManagementService.loadData();
    }
}

function filterRides() {
    if (rideManagementService) {
        rideManagementService.filterRides();
    }
}

function clearAllFilters() {
    if (rideManagementService) {
        rideManagementService.clearAllFilters();
    }
}

function navigateToStatusPage(status) {
    console.log(`🧭 Navegando a página de estado: ${status}`);
    console.log(`🧭 URL actual: ${window.location.href}`);
    console.log(`🧭 Directorio actual: ${window.location.pathname}`);
    
    // Navegar a la página específica según el estado
    switch(status) {
        case 'requested':
            // Viajes pendientes (sin conductor asignado)
            console.log(`🧭 Navegando a: pending/pending-rides.html`);
            window.location.href = 'pending/pending-rides.html';
            break;
        case 'accepted':
            // Viajes aceptados
            window.location.href = 'accepted/accepted-rides.html';
            break;
        case 'in_progress':
            window.location.href = 'in-progress/in-progress-rides.html';
            break;
        case 'completed':
            window.location.href = 'completed/completed-rides.html';
            break;
        case 'cancelled':
            window.location.href = 'cancelled/cancelled-rides.html';
            break;
        case 'total':
            // Mostrar todos los viajes en una vista general - redirigir a home
            window.location.href = '../home/home.html';
            break;
        default:
            console.error('❌ Estado no válido:', status);
            showError('Estado no válido');
    }
}

function showAllRides() {
    if (rideManagementService) {
        rideManagementService.showAllRides();
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

function openDriverSelection(rideId) {
    console.log('👤 Opening driver selection for ride:', rideId);
    window.currentRideForAssignment = rideId;
    
    if (rideManagementService) {
        rideManagementService.loadDriversForSelection();
    }
    
    document.getElementById('driverSelectionModal').style.display = 'flex';
}

function reloadDrivers() {
    console.log('🔄 Recargando conductores...');
    if (rideManagementService) {
        rideManagementService.loadDrivers().then(() => {
            rideManagementService.loadDriversForSelection();
            showSuccess('Conductores recargados');
        }).catch(error => {
            console.error('❌ Error recargando conductores:', error);
            showError('Error recargando conductores: ' + error.message);
        });
    }
}

function syncDriversManually() {
    console.log('🔄 Sincronización manual de conductores...');
    if (rideManagementService) {
        rideManagementService.syncDriversToDriversTable().then(() => {
            rideManagementService.loadDriversForSelection();
            showSuccess('Conductores sincronizados manualmente');
        }).catch(error => {
            console.error('❌ Error en sincronización manual:', error);
            showError('Error sincronizando conductores: ' + error.message);
        });
    }
}

function selectDriver(driverId) {
    console.log('👤 Selecting driver:', driverId);
    
    if (window.currentRideForAssignment && rideManagementService) {
        rideManagementService.assignDriverToRide(window.currentRideForAssignment, driverId);
    }
}


function startRide(rideId) {
    console.log('🚗 Start ride:', rideId);
    
    if (confirm('¿Quieres iniciar este viaje? El estado cambiará a "En proceso"')) {
        if (rideManagementService) {
            rideManagementService.startRide(rideId);
        }
    }
}

function completeRide(rideId) {
    console.log('✅ Complete ride:', rideId);
    
    if (confirm('¿Quieres finalizar este viaje? El estado cambiará a "Completado"')) {
        if (rideManagementService) {
            rideManagementService.completeRide(rideId);
        }
    }
}

function cancelRide(rideId) {
    console.log('❌ Cancel ride:', rideId);
    
    if (confirm('¿Estás seguro de que quieres cancelar este viaje?')) {
        if (rideManagementService) {
            rideManagementService.cancelRide(rideId);
        }
    }
}

function deleteRide(rideId) {
    console.log('🗑️ Delete ride:', rideId);
    
    if (rideManagementService) {
        rideManagementService.deleteRide(rideId);
    }
}

function deleteMultipleCompletedRides() {
    console.log('🗑️ Delete multiple completed rides');
    
    if (rideManagementService) {
        rideManagementService.deleteMultipleCompletedRides();
    }
}

// Modal functions
function closeDriverSelectionModal() {
    document.getElementById('driverSelectionModal').style.display = 'none';
    window.currentRideForAssignment = null;
}


function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
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


