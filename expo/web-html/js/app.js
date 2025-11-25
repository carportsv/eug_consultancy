// Aplicación Principal - Orquestador de todos los servicios
class TaxiApp {
    constructor() {
        this.currentUser = null;
        this.currentRide = null;
        this.isInitialized = false;
        this.isLoadingUsers = false;
        this.allUsers = []; // Almacenar todos los usuarios cargados
        // No inicializar automáticamente, se hará manualmente al final del archivo
    }

    // Inicializar la aplicación
    async init() {
        try {
            console.log('🚀 Inicializando TaxiApp...');
            
            // Mostrar pantalla de carga
            this.showLoadingScreen();
            
            // Inicializar servicios
            await this.initializeServices();
            
            // Configurar listeners
            this.setupEventListeners();
            
            // Configurar notificaciones
            this.setupNotifications();
            
            // Configurar inicialización del mapa
            this.setupMapInitialization();
            
            // Configurar listeners de autenticación
            this.setupAuthListeners();
            
            // Esperar un momento para que Firebase Auth se inicialice completamente
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verificar estado de autenticación
            await this.checkAuthStatus();
            
            // Ocultar pantalla de carga
            this.hideLoadingScreen();
            
            console.log('✅ TaxiApp inicializada correctamente');
        } catch (error) {
            console.error('❌ Error inicializando TaxiApp:', error);
            this.hideLoadingScreen();
        }
    }

    // ===== INICIALIZACIÓN DE SERVICIOS =====

    // Inicializar servicios
    async initializeServices() {
        try {
            console.log('🔧 Inicializando servicios...');
            
            // Inicializar servicios de autenticación
            await authService.init();
            
            console.log('✅ Servicios inicializados correctamente');
        } catch (error) {
            console.error('❌ Error inicializando servicios:', error);
        }
    }

    // Configurar inicialización del mapa
    setupMapInitialization() {
        // El mapa se inicializará cuando el usuario se autentique
        document.addEventListener('userAuthenticated', () => {
            this.initializeMap();
        });
    }

    // Inicializar mapa
    async initializeMap() {
        try {
            if (!mapsService.isMapInitialized()) {
                await mapsService.createMap('map');
                console.log('✅ Mapa inicializado');
            }
        } catch (error) {
            console.error('❌ Error inicializando mapa:', error);
        }
    }

    // Inicializar sistema de notificaciones
    setupNotifications() {
        // Función global para mostrar notificaciones
        window.showNotification = (message, type = 'info') => {
            this.showNotification(message, type);
        };
    }

    // ===== AUTENTICACIÓN =====

    // Configurar listeners de autenticación
    setupAuthListeners() {
        authService.onAuthStateChanged((isAuthenticated, user) => {
            this.handleAuthStateChange(isAuthenticated, user);
        });
    }

    // Manejar cambio de estado de autenticación
    handleAuthStateChange(isAuthenticated, user) {
        this.currentUser = user;

        if (isAuthenticated && user) {
            console.log('👤 Usuario autenticado:', user.email);
            this.onUserAuthenticated(user);
        } else {
            console.log('👤 Usuario no autenticado');
            this.onUserSignedOut();
        }
    }

    // Usuario autenticado
    onUserAuthenticated(user) {
        console.log('🎉 Usuario autenticado:', user);
        
        // Disparar evento
        document.dispatchEvent(new CustomEvent('userAuthenticated', { detail: { user } }));

        // Actualizar UI
        this.updateUIForAuthenticatedUser(user);

        // Obtener rol del usuario
        const userRole = authService.getCurrentUserRole();
        console.log('🔍 Rol del usuario autenticado:', userRole);
        console.log('🔍 Usuario completo:', user);
        console.log('🔍 localStorage USER_ROLE:', localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ROLE));
        console.log('🔍 localStorage USER_DATA:', localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA));

        // Si no hay rol, intentar obtenerlo de los datos del usuario
        let finalRole = userRole;
        if (!finalRole || finalRole === 'user') {
            // Verificar si hay datos en localStorage
            const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
            if (userData) {
                try {
                    const parsedUser = JSON.parse(userData);
                    finalRole = parsedUser.role || 'user';
                    console.log('🔍 Rol obtenido de USER_DATA:', finalRole);
                } catch (error) {
                    console.warn('⚠️ Error parseando USER_DATA:', error);
                    finalRole = 'user';
                }
            }
        }

        console.log('🔍 Rol final para redirección:', finalRole);

        // Redirigir según el rol (igual que en el móvil)
        switch (finalRole) {
            case 'driver':
                console.log('🚗 Redirigiendo a pantalla de conductor...');
                this.showDriverHome();
                break;
            case 'admin':
                console.log('👑 Redirigiendo a pantalla de administrador...');
                this.showAdminHome();
                break;
            case 'user':
            default:
                console.log('👤 Redirigiendo a pantalla de usuario...');
                this.showUserHome();
                break;
        }
    }

    // Manejar cuando el usuario cierra sesión
    onUserSignedOut() {
        console.log('🚪 Usuario cerró sesión');
        
        // Limpiar datos del usuario actual
        this.currentUser = null;
        
        // Limpiar localStorage usando las claves correctas
        authService.clearUserFromLocalStorage();
        
        // Actualizar UI para usuario no autenticado
        this.updateUIForUnauthenticatedUser();
        
        // Mostrar formulario de login
        this.showLoginForm();
        
        console.log('✅ Sesión cerrada correctamente');
    }

    // Verificar estado de autenticación
    async checkAuthStatus() {
        try {
            console.log('🔍 Verificando estado de autenticación...');
            
            // Esperar a que Firebase Auth esté completamente inicializado
            let attempts = 0;
            const maxAttempts = 1; // 3 intentos máximo
            
            while (attempts < maxAttempts) {
                const isAuthenticated = authService.isAuthenticated();
                console.log(`🔍 Intento ${attempts + 1}: ¿Usuario autenticado?`, isAuthenticated);
                
                if (isAuthenticated) {
                    // Obtener usuario de Firebase Auth o localStorage
                    let user = authService.getCurrentUser();
                    
                    // Si no hay usuario en Firebase Auth, intentar obtenerlo de localStorage
                    if (!user) {
                        const localStorageUser = authService.getUserFromLocalStorage();
                        if (localStorageUser) {
                            console.log('🔍 Usuario encontrado en localStorage:', localStorageUser);
                            user = localStorageUser;
                        }
                    }
                    
                    if (user) {
                        console.log('🔍 Usuario encontrado:', user);
                        console.log('🔍 Llamando a handleAuthStateChange...');
                        this.handleAuthStateChange(true, user);
                        return;
                    }
                }
                
                // Si no está autenticado, esperar un poco más
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo entre intentos
                attempts++;
            }
            
            // Si después de todos los intentos no está autenticado
            console.log('🔍 Usuario no autenticado después de 1 intentos, mostrando login');
            this.showLoginForm();
            
        } catch (error) {
            console.error('❌ Error verificando estado de autenticación:', error);
            this.showLoginForm();
        }
    }

    // ===== EVENT LISTENERS =====

    // Configurar event listeners
    setupEventListeners() {
        // Formularios de autenticación
        this.setupAuthFormListeners();

        // Controles del mapa
        this.setupMapControlListeners();

        // Menú de usuario
        this.setupUserMenuListeners();

        // Búsqueda de taxis
        this.setupTaxiSearchListeners();

        // Acciones rápidas
        this.setupQuickActionListeners();
    }

    // Configurar listeners del formulario de autenticación
    setupAuthFormListeners() {
        // Configurar listeners de autenticación
        console.log('🔧 Configurando listeners de autenticación...');
        
        // Botón de enviar código
        const sendCodeBtn = document.getElementById('sendCodeBtn');
        if (sendCodeBtn) {
            console.log('✅ Botón sendCodeBtn encontrado, agregando listener...');
            sendCodeBtn.addEventListener('click', (e) => {
                console.log('🖱️ Botón sendCodeBtn clickeado');
                e.preventDefault();
                this.handleSendCode();
            });
        } else {
            console.log('❌ Botón sendCodeBtn no encontrado');
        }

        // Botón de Google Sign-In
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        if (googleSignInBtn) {
            console.log('✅ Botón googleSignInBtn encontrado, agregando listener...');
            googleSignInBtn.addEventListener('click', (e) => {
                console.log('🖱️ Botón googleSignInBtn clickeado');
                e.preventDefault();
                this.handleGoogleSignIn();
            });
        } else {
            console.log('❌ Botón googleSignInBtn no encontrado');
        }

        // Input de número de teléfono
        const phoneNumberInput = document.getElementById('phoneNumber');
        if (phoneNumberInput) {
            console.log('✅ Input phoneNumber encontrado, agregando listener...');
            phoneNumberInput.addEventListener('input', (e) => {
                this.validatePhoneNumber(e.target.value);
            });
        } else {
            console.log('❌ Input phoneNumber no encontrado');
        }
    }

    // Validar número de teléfono
    validatePhoneNumber(phoneNumber) {
        const phoneInput = document.getElementById('phoneNumber');
        const sendBtn = document.getElementById('sendCodeBtn');
        
        // Remover caracteres no numéricos
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Validar que tenga al menos 8 dígitos
        const isValid = cleanNumber.length >= 8;
        
        if (isValid) {
            phoneInput.classList.remove('invalid');
            phoneInput.classList.add('valid');
            sendBtn.disabled = false;
        } else {
            phoneInput.classList.remove('valid');
            phoneInput.classList.add('invalid');
            sendBtn.disabled = true;
        }
    }

    // Manejar envío de código
    async handleSendCode() {
        console.log('🚀 handleSendCode() ejecutándose...');
        try {
            const phoneNumber = document.getElementById('phoneNumber').value;
            console.log('📱 Número de teléfono:', phoneNumber);
            
            const cleanNumber = phoneNumber.replace(/\D/g, '');
            console.log('🧹 Número limpio:', cleanNumber);
            
            if (cleanNumber.length < 8) {
                this.showError('Por favor ingresa un número válido');
                return;
            }

            const fullNumber = `+503${cleanNumber}`;
            console.log('📞 Número completo:', fullNumber);
            
            this.showLoading('Enviando código de verificación...');
            
            const result = await authService.signInWithPhone(fullNumber);
            
            this.hideLoading();
            
            if (result.requiresCode) {
                // Destruir completamente el reCAPTCHA después de enviar el código
                if (window.authService && window.authService.recaptchaVerifier) {
                    try {
                        // Limpiar el contenido del contenedor PRIMERO
                        const recaptchaContainer = document.getElementById('phoneAuthBtn');
                        if (recaptchaContainer) {
                            recaptchaContainer.innerHTML = '';
                        }
                        
                        // Pequeño delay para asegurar que el DOM se actualice
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // Ahora limpiar el verifier
                        window.authService.recaptchaVerifier.clear();
                        window.authService.recaptchaVerifier = null;
                        console.log('✅ reCAPTCHA destruido después de enviar código');
                    } catch (error) {
                        console.warn('⚠️ Error al destruir reCAPTCHA:', error);
                    }
                }
                
                // Ocultar el contenedor de reCAPTCHA
                const recaptchaContainer = document.getElementById('phoneAuthBtn');
                if (recaptchaContainer) {
                    recaptchaContainer.style.display = 'none';
                }
                
                // Solicitar código de verificación
                const code = prompt('Ingresa el código de 6 dígitos enviado a tu teléfono:');
                
                if (!code) {
                    return;
                }

                this.showLoading('Verificando código...');
                
                const user = await authService.verifyPhoneCode(code);
                
                this.hideLoading();
                this.showNotification('Teléfono verificado exitosamente', 'success');
                
                // Esperar un momento para que se procese la autenticación
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Verificar si el usuario está autenticado después de la verificación
                if (authService.isAuthenticated()) {
                    console.log('✅ Usuario autenticado después de verificación, redirigiendo...');
                    const currentUser = authService.getCurrentUser() || authService.getUserFromLocalStorage();
                    if (currentUser) {
                        this.handleAuthStateChange(true, currentUser);
                    }
                } else {
                    console.log('⚠️ Usuario no autenticado después de verificación, verificando estado...');
                    // Intentar verificar el estado de autenticación nuevamente
                    await this.checkAuthStatus();
                }
            }
            
        } catch (error) {
            console.error('❌ Error en handleSendCode:', error);
            this.hideLoading();
            this.showError(error.message);
        }
    }

    // Configurar listeners de controles del mapa
    setupMapControlListeners() {
        // Botón de ubicación actual
        document.getElementById('useCurrentLocation')?.addEventListener('click', () => {
            this.useCurrentLocation();
        });

        // Búsqueda de direcciones
        const originInput = document.getElementById('origin');
        const destinationInput = document.getElementById('destination');

        if (originInput) {
            originInput.addEventListener('input', this.debounce(() => {
                this.searchAddresses(originInput.value, 'origin');
            }, 500));
        }

        if (destinationInput) {
            destinationInput.addEventListener('input', this.debounce(() => {
                this.searchAddresses(destinationInput.value, 'destination');
            }, 500));
        }
    }

    // Configurar listeners del menú de usuario
    setupUserMenuListeners() {
        // Botón del menú de usuario
        document.getElementById('userMenuBtn')?.addEventListener('click', () => {
            this.toggleUserMenu();
        });

        // Elementos del menú
        document.getElementById('logoutLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        document.getElementById('profileLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showUserProfile();
        });

        document.getElementById('historyLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRideHistory();
        });
    }

    // Configurar listeners de búsqueda de taxis
    setupTaxiSearchListeners() {
        // Botón de búsqueda
        document.getElementById('searchBtn')?.addEventListener('click', () => {
            this.searchTaxi();
        });

        // Cancelar viaje
        document.getElementById('cancelRide')?.addEventListener('click', () => {
            this.cancelRide();
        });
    }

    // Configurar listeners de acciones rápidas
    setupQuickActionListeners() {
        // Botón de menú
        document.getElementById('menuBtn')?.addEventListener('click', () => {
            this.toggleUserMenu();
        });

        // Botón de ubicación actual
        document.getElementById('locationBtn')?.addEventListener('click', () => {
            this.useCurrentLocation();
        });

        // Botón de debug temporal
        document.getElementById('debugBtn')?.addEventListener('click', () => {
            this.showDebugInfo();
        });

        // Botones de acciones rápidas
        document.getElementById('homeBtn')?.addEventListener('click', () => {
            this.useQuickAddress('home');
        });

        document.getElementById('workBtn')?.addEventListener('click', () => {
            this.useQuickAddress('work');
        });

        document.getElementById('favoritesBtn')?.addEventListener('click', () => {
            this.showFavoriteAddresses();
        });
    }

    // Mostrar información de debug
    showDebugInfo() {
        const isAuthenticated = authService.isAuthenticated();
        const currentUser = authService.getCurrentUser();
        const userRole = authService.getCurrentUserRole();
        const userUID = localStorage.getItem('userUID');
        const userData = localStorage.getItem('userData');
        
        const debugInfo = `
🔍 **INFORMACIÓN DE DEBUG**

✅ Autenticado: ${isAuthenticated}
👤 Usuario: ${currentUser ? currentUser.email || currentUser.phoneNumber : 'No hay usuario'}
🆔 UID: ${userUID || 'No hay UID'}
🎭 Rol: ${userRole || 'No hay rol'}
📊 Datos: ${userData ? 'Guardados' : 'No guardados'}

🗺️ Mapa inicializado: ${mapsService.isMapInitialized()}
📍 Elementos visibles:
- Formulario de búsqueda: ${document.querySelector('.search-form')?.style.display !== 'none' ? 'SÍ' : 'NO'}
- Panel de conductor: ${document.querySelector('.driver-only')?.style.display !== 'none' ? 'SÍ' : 'NO'}
- Panel de admin: ${document.querySelector('.admin-only')?.style.display !== 'none' ? 'SÍ' : 'NO'}
        `;
        
        console.log(debugInfo);
        alert(debugInfo);
    }

    // ===== MANEJO DE AUTENTICACIÓN =====

    // Manejar login
    async handleLogin() {
        try {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Validar campos
            if (!this.validateLoginFields(email, password)) {
                return;
            }

            // Mostrar loading
            this.showLoading('Iniciando sesión...');

            // Intentar login
            await authService.signIn(email, password);

            this.showNotification('Sesión iniciada exitosamente', 'success');
        } catch (error) {
            console.error('Error en login:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    // Manejar registro
    async handleRegister() {
        try {
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const phone = document.getElementById('registerPhone').value;

            // Validar campos
            if (!this.validateRegisterFields(name, email, password, phone)) {
                return;
            }

            // Mostrar loading
            this.showLoading('Creando cuenta...');

            // Intentar registro
            const userData = { displayName: name, phone };
            await authService.signUp(email, password, userData);

            this.showNotification('Cuenta creada exitosamente', 'success');
        } catch (error) {
            console.error('Error en registro:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    // Manejar logout
    async handleLogout() {
        try {
            await authService.signOut();
            this.showNotification('Sesión cerrada exitosamente', 'success');
            this.onUserSignedOut();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            this.showError('Error al cerrar sesión: ' + error.message);
        }
    }

    // Manejar Google Sign-In
    async handleGoogleSignIn() {
        try {
            this.showLoading('Conectando con Google...');
            
            const user = await authService.signInWithGoogle();
            
            this.hideLoading();
            this.showNotification('Inicio de sesión con Google exitoso', 'success');
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    // Manejar autenticación por teléfono
    async handlePhoneAuth() {
        try {
            // Solicitar número de teléfono
            const phoneNumber = prompt('Ingresa tu número de teléfono (con código de país):\nEjemplo: +50312345678');
            
            if (!phoneNumber) {
                return;
            }

            this.showLoading('Enviando código de verificación...');
            
            const result = await authService.signInWithPhone(phoneNumber);
            
            this.hideLoading();
            
            if (result.requiresCode) {
                // Solicitar código de verificación
                const code = prompt('Ingresa el código de 6 dígitos enviado a tu teléfono:');
                
                if (!code) {
                    return;
                }

                this.showLoading('Verificando código...');
                
                const user = await authService.verifyPhoneCode(code);
                
                this.hideLoading();
                this.showNotification('Teléfono verificado exitosamente', 'success');
            }
            
        } catch (error) {
            this.hideLoading();
            this.showError(error.message);
        }
    }

    // ===== BÚSQUEDA DE TAXIS =====

    // Buscar taxi
    async searchTaxi() {
        try {
            const origin = document.getElementById('origin').value;
            const destination = document.getElementById('destination').value;

            if (!origin || !destination) {
                this.showError('Por favor ingresa origen y destino');
                return;
            }

            // Mostrar loading
            this.showLoading('Buscando taxi...');

            // Crear viaje
            const rideData = {
                passengerId: this.currentUser.uid,
                originAddress: origin,
                originLat: this.getSelectedAddressLat('origin'),
                originLng: this.getSelectedAddressLng('origin'),
                destinationAddress: destination,
                destinationLat: this.getSelectedAddressLat('destination'),
                destinationLng: this.getSelectedAddressLng('destination'),
                estimatedPrice: this.calculateEstimatedPrice()
            };

            const ride = await apiService.createRide(rideData);
            this.currentRide = ride;

            // Mostrar estado del viaje
            this.showRideStatus();

            this.showNotification('Buscando conductor...', 'info');
        } catch (error) {
            console.error('Error buscando taxi:', error);
            this.showError('Error al buscar taxi');
        } finally {
            this.hideLoading();
        }
    }

    // Cancelar viaje
    async cancelRide() {
        try {
            if (!this.currentRide) return;

            await apiService.updateRideStatus(this.currentRide.id, CONFIG.RIDE_STATUS.CANCELLED);
            this.currentRide = null;

            this.hideRideStatus();
            this.showNotification('Viaje cancelado', 'info');
        } catch (error) {
            console.error('Error cancelando viaje:', error);
            this.showError('Error al cancelar viaje');
        }
    }

    // ===== UTILIDADES DE MAPA =====

    // Usar ubicación actual
    async useCurrentLocation() {
        try {
            const location = await mapsService.getCurrentLocation();
            if (location) {
                // Obtener dirección de las coordenadas
                const address = await apiService.reverseGeocode(location.lat, location.lng);
                document.getElementById('origin').value = address.display_name;
            }
        } catch (error) {
            console.error('Error usando ubicación actual:', error);
            this.showError('Error obteniendo ubicación actual');
        }
    }

    // Buscar direcciones
    async searchAddresses(query, type) {
        try {
            const results = await mapsService.searchAddresses(query);
            // Los resultados se mostrarán automáticamente en el mapa
        } catch (error) {
            console.error('Error buscando direcciones:', error);
        }
    }

    // Usar dirección rápida
    async useQuickAddress(type) {
        try {
            const addresses = await apiService.getFavoriteAddresses(this.currentUser.uid);
            const address = addresses.find(a => a.type === type);
            
            if (address) {
                document.getElementById('origin').value = address.address;
                this.showNotification(`Usando dirección de ${type}`, 'info');
            } else {
                this.showNotification(`No tienes una dirección de ${type} guardada`, 'warning');
            }
        } catch (error) {
            console.error('Error usando dirección rápida:', error);
        }
    }

    // ===== MANEJO DE UI =====

    // Mostrar pantalla de carga
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    // Ocultar pantalla de carga
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }

    // Actualizar UI para usuario autenticado
    updateUIForAuthenticatedUser(user) {
        // Ocultar botones de login/register
        document.getElementById('loginBtn')?.classList.add('hidden');
        document.getElementById('registerBtn')?.classList.add('hidden');

        // Mostrar botón de usuario
        const userMenuBtn = document.getElementById('userMenuBtn');
        if (userMenuBtn) {
            userMenuBtn.classList.remove('hidden');
            document.getElementById('userName').textContent = user.displayName || user.email;
        }
    }

    // Actualizar UI para usuario no autenticado
    updateUIForUnauthenticatedUser() {
        console.log('👤 Actualizando UI para usuario no autenticado');
        
        // Ocultar todas las pantallas de usuario autenticado
        this.hideAllScreens();
        
        // Mostrar formulario de login
        this.showLoginForm();
        
        console.log('✅ UI actualizada para usuario no autenticado');
    }

    // Mostrar formulario de login
    showLoginForm() {
        console.log('🔐 Mostrando formulario de login');
        
        // Ocultar todas las pantallas
        this.hideAllScreens();
        
        // Mostrar solo el formulario de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.classList.remove('hidden');
            console.log('✅ Formulario de login mostrado');
        } else {
            console.log('❌ Formulario de login no encontrado');
        }
        
        // Asegurar que el contenedor de reCAPTCHA esté visible y limpio
        const recaptchaContainer = document.getElementById('phoneAuthBtn');
        if (recaptchaContainer) {
            // Limpiar cualquier contenido anterior
            recaptchaContainer.innerHTML = '';
            
            // Pequeño delay para asegurar que el DOM esté listo
            setTimeout(() => {
                recaptchaContainer.style.display = 'block';
                console.log('✅ Contenedor de reCAPTCHA mostrado y limpiado');
            }, 100);
        }
    }

    // Mostrar formulario de registro
    showRegisterForm() {
        this.hideAllForms();
        document.getElementById('registerForm')?.classList.remove('hidden');
    }

    // Mostrar mapa
    showMap() {
        this.hideAllForms();
        document.getElementById('mapContainer')?.classList.remove('hidden');
    }

    // Mostrar estado del viaje
    showRideStatus() {
        document.getElementById('rideStatus')?.classList.remove('hidden');
    }

    // Ocultar estado del viaje
    hideRideStatus() {
        document.getElementById('rideStatus')?.classList.add('hidden');
    }

    // Ocultar todos los formularios
    hideAllForms() {
        document.getElementById('loginForm')?.classList.add('hidden');
        document.getElementById('registerForm')?.classList.add('hidden');
        // NO ocultar mapContainer aquí, se maneja por separado
        document.getElementById('rideStatus')?.classList.add('hidden');
    }

    // Alternar menú de usuario
    toggleUserMenu() {
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.classList.toggle('active');
        }
    }

    // ===== VALIDACIONES =====

    // Validar campos de login
    validateLoginFields(email, password) {
        if (!email || !password) {
            this.showError('Por favor completa todos los campos');
            return false;
        }

        if (!authService.validateEmail(email)) {
            this.showError('Email inválido');
            return false;
        }

        return true;
    }

    // Validar campos de registro
    validateRegisterFields(name, email, password, phone) {
        if (!name || !email || !password || !phone) {
            this.showError('Por favor completa todos los campos');
            return false;
        }

        if (!authService.validateEmail(email)) {
            this.showError('Email inválido');
            return false;
        }

        if (!authService.validatePassword(password)) {
            this.showError('La contraseña debe tener al menos 6 caracteres');
            return false;
        }

        if (!authService.validatePhone(phone)) {
            this.showError('Teléfono inválido');
            return false;
        }

        return true;
    }

    // ===== NOTIFICACIONES =====

    // Mostrar notificación
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        notifications.appendChild(notification);

        // Auto-remover después de un tiempo
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    // Mostrar notificación de error
    showError(message) {
        console.error('❌ Error:', message);
        
        // Crear notificación de error
        const notification = document.createElement('div');
        notification.className = 'notification error-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remover automáticamente después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Mostrar notificación de éxito
    showSuccess(message) {
        console.log('✅ Éxito:', message);
        
        // Crear notificación de éxito
        const notification = document.createElement('div');
        notification.className = 'notification success-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remover automáticamente después de 3 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    // Mostrar loading
    showLoading(message = 'Cargando...') {
        // Implementar loading global si es necesario
        console.log('Loading:', message);
    }

    // Ocultar loading
    hideLoading() {
        // Implementar ocultar loading global si es necesario
        console.log('Loading hidden');
    }

    // Obtener icono de notificación
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // ===== UTILIDADES =====

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Calcular precio estimado
    calculateEstimatedPrice() {
        // Implementación básica - se puede mejorar con cálculo real de distancia
        return CONFIG.PRICING.MINIMUM_FARE;
    }

    // Obtener latitud de dirección seleccionada
    getSelectedAddressLat(type) {
        // Implementar lógica para obtener coordenadas de dirección seleccionada
        return CONFIG.DEFAULT_LAT;
    }

    // Obtener longitud de dirección seleccionada
    getSelectedAddressLng(type) {
        // Implementar lógica para obtener coordenadas de dirección seleccionada
        return CONFIG.DEFAULT_LNG;
    }

    // Mostrar perfil de usuario
    showUserProfile() {
        this.showNotification('Funcionalidad en desarrollo', 'info');
    }

    // Mostrar historial de viajes
    showRideHistory() {
        console.log('📋 Mostrando historial de viajes...');
        this.hideAllScreens();
        
        // Crear pantalla de historial
        const historyScreen = document.createElement('div');
        historyScreen.className = 'development-screen';
        historyScreen.innerHTML = `
            <div class="dev-content">
                <h2>📋 Historial de Viajes</h2>
                <p>Esta funcionalidad está en desarrollo.</p>
                <p>Aquí verás todos tus viajes anteriores.</p>
                <button class="btn btn-primary" onclick="taxiApp.backToUserMenu()">
                    <i class="fas fa-arrow-left"></i>
                    Volver al Menú
                </button>
            </div>
        `;
        
        document.body.appendChild(historyScreen);
        console.log('✅ Pantalla de historial mostrada');
    }

    // Mostrar direcciones favoritas
    showFavoriteAddresses() {
        this.showNotification('Funcionalidad en desarrollo', 'info');
    }

    // Mostrar la aplicación principal
    showMainApp() {
        try {
            // Ocultar formulario de login
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.classList.add('hidden');
            }
            
            // Mostrar contenedor del mapa
            const mapContainer = document.getElementById('mapContainer');
            if (mapContainer) {
                mapContainer.classList.remove('hidden');
            }
            
            // Actualizar UI para usuario autenticado
            this.updateUIForAuthenticatedUser(this.currentUser);
            
            // Inicializar mapa si no está inicializado
            this.initializeMap();
            
            console.log('✅ Aplicación principal mostrada');
        } catch (error) {
            console.error('❌ Error mostrando aplicación principal:', error);
        }
    }

    // Mostrar pantalla de usuario (pasajero)
    showUserHome() {
        console.log('🏠 Mostrando pantalla de usuario...');
        this.hideAllScreens();
        
        // Mostrar menú de usuario
        const userMenuScreen = document.getElementById('userMenuScreen');
        if (userMenuScreen) {
            userMenuScreen.classList.remove('hidden');
            console.log('✅ Menú de usuario mostrado');
            
            // Actualizar el saludo
            this.updateUserGreeting();
            
            // Generar las opciones del menú
            this.generateUserMenuOptions();
        }
    }

    // Actualizar el saludo del usuario
    updateUserGreeting() {
        const userGreeting = document.getElementById('userGreeting');
        if (userGreeting) {
            const friendlyName = this.getFriendlyName();
            userGreeting.textContent = `Hola, ${friendlyName}`;
        }
    }

    // Generar nombre amigable como en la versión móvil
    getFriendlyName() {
        const user = authService.getCurrentUser();
        
        // Primera prioridad: usar el nick (si existe en localStorage)
        const nick = localStorage.getItem('userNick');
        if (nick?.trim()) {
            return nick;
        }
        
        // Segunda prioridad: usar el email (sin el dominio)
        if (user?.email?.trim()) {
            const emailName = user.email.split('@')[0];
            return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
        
        // Tercera prioridad: generar uno basado en el número de teléfono
        if (user?.phoneNumber) {
            const lastDigits = user.phoneNumber.slice(-4);
            return `Usuario ${lastDigits}`;
        }
        
        return 'Amigo';
    }

    // Generar las opciones del menú de usuario
    generateUserMenuOptions() {
        const menuOptionsContainer = document.getElementById('userMenuOptions');
        if (!menuOptionsContainer) return;

        // Verificar si hay viaje activo (por ahora siempre false)
        const hasActiveRide = false;
        const activeRideId = null;

        const menuItems = [
            {
                title: 'Solicitar Taxi',
                subtitle: 'Pedir un taxi a tu ubicación',
                icon: 'fas fa-taxi',
                action: () => this.showMapScreen(),
            },
            ...(hasActiveRide ? [{
                title: 'Viaje Activo',
                subtitle: 'Ver estado de tu viaje actual',
                icon: 'fas fa-car',
                action: () => this.handleActiveRide(activeRideId),
            }] : []),
            {
                title: 'Historial de Viajes',
                subtitle: 'Ver viajes anteriores',
                icon: 'fas fa-history',
                action: () => this.showRideHistory(),
            },
            {
                title: 'Registrarse como Conductor',
                subtitle: 'Convierte tu vehículo en una fuente de ingresos',
                icon: 'fas fa-car',
                action: () => this.showDriverRegistration(),
            },
            {
                title: 'Configuración',
                subtitle: 'Ajustar preferencias de la app',
                icon: 'fas fa-cog',
                action: () => this.showSettings(),
            },
            {
                title: 'Cerrar Sesión',
                subtitle: 'Salir de la aplicación',
                icon: 'fas fa-sign-out-alt',
                action: () => this.handleLogout(),
                isLogout: true,
            },
        ];

        // Limpiar contenedor
        menuOptionsContainer.innerHTML = '';

        // Generar opciones
        menuItems.forEach((item, index) => {
            const optionContainer = document.createElement('div');
            optionContainer.className = 'user-option-container';

            const option = document.createElement('button');
            option.className = `user-option ${item.isLogout ? 'logout' : ''}`;
            option.onclick = item.action;

            option.innerHTML = `
                <div class="user-option-left">
                    <i class="${item.icon} user-option-icon"></i>
                    <div class="user-option-text">
                        <div class="user-option-title">${item.title}</div>
                        <div class="user-option-subtitle">${item.subtitle}</div>
                    </div>
                </div>
                <i class="fas fa-chevron-right user-option-chevron"></i>
            `;

            optionContainer.appendChild(option);
            menuOptionsContainer.appendChild(optionContainer);
        });
    }

    // Manejar viaje activo
    handleActiveRide(rideId) {
        if (rideId) {
            console.log('🚗 Mostrando viaje activo:', rideId);
            this.showNotification('Viaje activo - En desarrollo', 'info');
        } else {
            console.log('❌ No hay viaje activo');
            this.showNotification('No tienes un viaje activo en este momento.', 'info');
        }
    }

    // Mostrar pantalla de conductor
    showDriverHome() {
        console.log('🚗 Mostrando pantalla de conductor...');
        this.hideAllScreens();
        
        // Mostrar menú de conductor
        const driverMenuScreen = document.getElementById('driverMenuScreen');
        if (driverMenuScreen) {
            driverMenuScreen.classList.remove('hidden');
            console.log('✅ Menú de conductor mostrado');
        }
    }

    // Mostrar pantalla de administrador
    showAdminHome() {
        console.log('👑 Mostrando pantalla de administrador...');
        this.hideAllScreens();
        
        // Mostrar menú de administrador
        const adminMenuScreen = document.getElementById('adminMenuScreen');
        if (adminMenuScreen) {
            adminMenuScreen.classList.remove('hidden');
            
            // Actualizar nombre del usuario admin
            const adminUserName = document.getElementById('adminUserName');
            if (adminUserName && window.authService && window.authService.currentUser) {
                const user = window.authService.currentUser;
                const displayName = user.displayName || user.email || user.phoneNumber || 'Admin';
                adminUserName.textContent = displayName;
            }
            
            console.log('✅ Menú de administrador mostrado');
        }
    }

    // Ocultar todas las pantallas
    hideAllScreens() {
        console.log('🙈 Ocultando todas las pantallas');
        
        // Ocultar formularios
        document.getElementById('loginForm')?.classList.add('hidden');
        document.getElementById('registerForm')?.classList.add('hidden');
        
        // Ocultar pantallas de usuario autenticado
        document.getElementById('mapContainer')?.classList.add('hidden');
        document.getElementById('userMenuScreen')?.classList.add('hidden');
        document.getElementById('driverMenuScreen')?.classList.add('hidden');
        document.getElementById('adminMenuScreen')?.classList.add('hidden');
        document.getElementById('userManagementScreen')?.classList.add('hidden');
        document.getElementById('rideStatus')?.classList.add('hidden');
        
        // Ocultar pantallas de desarrollo
        const devScreens = document.querySelectorAll('.development-screen');
        devScreens.forEach(screen => screen.remove());
        
        // Ocultar botón de solicitar taxi
        const requestTaxiBtn = document.getElementById('requestTaxiBtn');
        if (requestTaxiBtn) {
            requestTaxiBtn.style.display = 'none';
        }
        
        // Limpiar reCAPTCHA de manera segura
        if (window.authService && window.authService.recaptchaVerifier) {
            try {
                // Limpiar el contenido del contenedor PRIMERO
                const recaptchaContainer = document.getElementById('phoneAuthBtn');
                if (recaptchaContainer) {
                    recaptchaContainer.innerHTML = '';
                }
                
                // Pequeño delay para asegurar que el DOM se actualice
                setTimeout(() => {
                    try {
                        window.authService.recaptchaVerifier.clear();
                        window.authService.recaptchaVerifier = null;
                        console.log('✅ reCAPTCHA limpiado de manera segura');
                    } catch (error) {
                        console.warn('⚠️ Error al limpiar reCAPTCHA:', error);
                    }
                }, 100);
            } catch (error) {
                console.warn('⚠️ Error al limpiar reCAPTCHA:', error);
            }
        }
        
        // Limpiar el contenedor de reCAPTCHA
        const recaptchaContainer = document.getElementById('phoneAuthBtn');
        if (recaptchaContainer) {
            recaptchaContainer.innerHTML = '';
            console.log('✅ Contenedor de reCAPTCHA limpiado');
        }
        
        console.log('✅ Todas las pantallas ocultadas');
    }

    // Mostrar elementos específicos de pasajero
    showPassengerElements() {
        console.log('👤 Configurando elementos de pasajero...');
        
        // Mostrar formulario de búsqueda de taxi
        const searchForm = document.querySelector('.search-form');
        if (searchForm) {
            searchForm.style.display = 'block';
            console.log('✅ Formulario de búsqueda mostrado');
        } else {
            console.log('❌ Formulario de búsqueda no encontrado');
        }
        
        // Mostrar botón de búsqueda de taxi
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.style.display = 'block';
            console.log('✅ Botón de búsqueda mostrado');
        } else {
            console.log('❌ Botón de búsqueda no encontrado');
        }
        
        // Ocultar elementos de conductor/admin
        this.hideDriverElements();
        this.hideAdminElements();
    }

    // Mostrar elementos específicos de conductor
    showDriverElements() {
        console.log('🚗 Configurando elementos de conductor...');
        
        // Ocultar formulario de búsqueda de taxi
        const searchForm = document.querySelector('.search-form');
        if (searchForm) {
            searchForm.style.display = 'none';
            console.log('✅ Formulario de búsqueda oculto');
        }
        
        // Ocultar botón de búsqueda de taxi
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.style.display = 'none';
            console.log('✅ Botón de búsqueda oculto');
        }
        
        // Mostrar elementos específicos de conductor (si existen)
        const driverElements = document.querySelectorAll('.driver-only');
        driverElements.forEach(el => {
            el.style.display = 'block';
            console.log('✅ Elemento de conductor mostrado:', el);
        });
        
        // Ocultar elementos de pasajero/admin
        this.hidePassengerElements();
        this.hideAdminElements();
    }

    // Mostrar elementos específicos de administrador
    showAdminElements() {
        console.log('👑 Configurando elementos de administrador...');
        
        // Ocultar formulario de búsqueda de taxi
        const searchForm = document.querySelector('.search-form');
        if (searchForm) {
            searchForm.style.display = 'none';
            console.log('✅ Formulario de búsqueda oculto');
        }
        
        // Ocultar botón de búsqueda de taxi
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.style.display = 'none';
            console.log('✅ Botón de búsqueda oculto');
        }
        
        // Mostrar elementos específicos de administrador (si existen)
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = 'block';
            console.log('✅ Elemento de administrador mostrado:', el);
        });
        
        // Ocultar elementos de pasajero/conductor
        this.hidePassengerElements();
        this.hideDriverElements();
    }

    // Ocultar elementos de pasajero
    hidePassengerElements() {
        const passengerElements = document.querySelectorAll('.passenger-only');
        passengerElements.forEach(el => el.style.display = 'none');
    }

    // Ocultar elementos de conductor
    hideDriverElements() {
        const driverElements = document.querySelectorAll('.driver-only');
        driverElements.forEach(el => el.style.display = 'none');
    }

    // Ocultar elementos de administrador
    hideAdminElements() {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => el.style.display = 'none');
    }

    // ===== MÉTODOS DEL MENÚ DE USUARIO =====

    // Mostrar pantalla del mapa (Solicitar Taxi)
    showMapScreen() {
        console.log('🗺️ Mostrando pantalla del mapa...');
        this.hideAllScreens();
        
        const mapContainer = document.getElementById('mapContainer');
        if (mapContainer) {
            mapContainer.classList.remove('hidden');
            
            // Inicializar mapa si no está inicializado
            if (!mapsService.isMapInitialized()) {
                this.initializeMap();
            }
            
            // Mostrar elementos específicos de pasajero
            this.showPassengerElements();
            
            // Mostrar botón de solicitar taxi (como en la versión móvil)
            this.showRequestTaxiButton();
            
            // Forzar redimensionamiento del mapa
            setTimeout(() => {
                if (mapsService.isMapInitialized()) {
                    mapsService.getMap().invalidateSize();
                    console.log('✅ Mapa redimensionado');
                }
            }, 100);
            
            console.log('✅ Pantalla del mapa mostrada');
        }
    }

    // Volver al menú de usuario
    backToUserMenu() {
        console.log('🏠 Volviendo al menú de usuario...');
        this.showUserHome();
    }

    // Mostrar historial de viajes
    showRideHistory() {
        console.log('📋 Mostrando historial de viajes...');
        this.hideAllScreens();
        
        // Crear pantalla de historial
        const historyScreen = document.createElement('div');
        historyScreen.className = 'development-screen';
        historyScreen.innerHTML = `
            <div class="dev-content">
                <h2>📋 Historial de Viajes</h2>
                <p>Esta funcionalidad está en desarrollo.</p>
                <p>Aquí verás todos tus viajes anteriores.</p>
                <button class="btn btn-primary" onclick="taxiApp.backToUserMenu()">
                    <i class="fas fa-arrow-left"></i>
                    Volver al Menú
                </button>
            </div>
        `;
        
        document.body.appendChild(historyScreen);
        console.log('✅ Pantalla de historial mostrada');
    }
    
    // Mostrar registro de conductor
    showDriverRegistration() {
        console.log('🚗 Mostrando registro de conductor...');
        this.hideAllScreens();
        
        // Crear pantalla de registro
        const registrationScreen = document.createElement('div');
        registrationScreen.className = 'development-screen';
        registrationScreen.innerHTML = `
            <div class="dev-content">
                <h2>🚗 Registrarse como Conductor</h2>
                <p>Esta funcionalidad está en desarrollo.</p>
                <p>Aquí podrás convertir tu vehículo en una fuente de ingresos.</p>
                <button class="btn btn-primary" onclick="taxiApp.backToUserMenu()">
                    <i class="fas fa-arrow-left"></i>
                    Volver al Menú
                </button>
            </div>
        `;
        
        document.body.appendChild(registrationScreen);
        console.log('✅ Pantalla de registro mostrada');
    }
    
    // Mostrar configuración
    showSettings() {
        console.log('⚙️ Mostrando configuración...');
        this.hideAllScreens();
        
        // Crear pantalla de configuración
        const settingsScreen = document.createElement('div');
        settingsScreen.className = 'development-screen';
        settingsScreen.innerHTML = `
            <div class="dev-content">
                <h2>⚙️ Configuración</h2>
                <p>Esta funcionalidad está en desarrollo.</p>
                <p>Aquí podrás ajustar tus preferencias de la aplicación.</p>
                <button class="btn btn-primary" onclick="taxiApp.backToUserMenu()">
                    <i class="fas fa-arrow-left"></i>
                    Volver al Menú
                </button>
            </div>
        `;
        
        document.body.appendChild(settingsScreen);
        console.log('✅ Pantalla de configuración mostrada');
    }

    // ===== MÉTODOS DEL MENÚ DE CONDUCTOR =====

    // Mostrar solicitudes de conductor
    showDriverRequests() {
        console.log('📋 Mostrando solicitudes de conductor...');
        this.showNotification('Solicitudes de conductor - En desarrollo', 'info');
    }

    // Mostrar disponibilidad del conductor
    showDriverAvailability() {
        console.log('🔄 Mostrando disponibilidad del conductor...');
        this.showNotification('Disponibilidad del conductor - En desarrollo', 'info');
    }

    // Mostrar viaje activo del conductor
    showDriverRide() {
        console.log('🚗 Mostrando viaje activo del conductor...');
        this.showNotification('Viaje activo del conductor - En desarrollo', 'info');
    }

    // Mostrar historial de conductor
    showDriverHistory() {
        console.log('📋 Mostrando historial de conductor...');
        this.showNotification('Historial de conductor - En desarrollo', 'info');
    }

    // Mostrar configuración de conductor
    showDriverSettings() {
        console.log('⚙️ Mostrando configuración de conductor...');
        this.showNotification('Configuración de conductor - En desarrollo', 'info');
    }

    // ===== MÉTODOS DEL MENÚ DE ADMINISTRADOR =====

    // Mostrar dashboard de administrador
    showAdminDashboard() {
        console.log('📊 Mostrando dashboard de administrador...');
        this.showNotification('Dashboard de administrador - En desarrollo', 'info');
    }

    // Gestionar usuarios
    showUserManagement() {
        console.log('👥 Mostrando gestión de usuarios...');
        this.hideAllScreens();
        document.getElementById('userManagementScreen').classList.remove('hidden');
        this.loadUsers();
    }

    // Cargar usuarios desde Supabase
    async loadUsers() {
        // Evitar ejecuciones múltiples
        if (this.isLoadingUsers) {
            return;
        }
        
        this.isLoadingUsers = true;
        
        try {
            // Verificar si las variables de entorno están configuradas
            if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
                console.error('❌ Variables de entorno de Supabase no configuradas');
                this.showError('Error: Variables de entorno de Supabase no configuradas. Verifica el archivo .env');
                this.hideLoading();
                this.isLoadingUsers = false;
                return;
            }
            
            this.showLoading('Cargando usuarios...');
            
            let users, error;
            try {
                const result = await supabase
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .then();
                
                users = result.data;
                error = result.error;
            } catch (supabaseError) {
                console.error('❌ Error en la consulta a Supabase:', supabaseError);
                error = supabaseError;
            }

            console.log('🔍 === DESPUÉS DEL TRY-CATCH ===');
            console.log('🔍 Respuesta de Supabase:', { users, error });
            console.log('🔍 Después de la consulta - users:', users);
            console.log('🔍 Después de la consulta - error:', error);
            console.log('🔍 === LLEGAMOS AQUÍ ===');
            console.log('🔍 Tipo de users:', typeof users);
            console.log('🔍 Es users un array?', Array.isArray(users));
            
            if (error) {
                console.error('❌ Error cargando usuarios:', error);
                this.showError('Error cargando usuarios: ' + error.message);
                this.hideLoading();
                return;
            }
            
            // Almacenar todos los usuarios para filtrado local
            this.allUsers = users || [];
            
            // Si no hay usuarios, mostrar mensaje informativo
            if (!users || users.length === 0) {
                this.showNotification('No hay usuarios registrados en la base de datos', 'info');
            }
            
            this.displayUsers(users);
            this.updateUserStats(users);
            this.hideLoading();
        } catch (error) {
            console.error('❌ Error en loadUsers:', error);
            this.showError('Error cargando usuarios: ' + error.message);
            this.hideLoading();
        } finally {
            this.isLoadingUsers = false;
        }
    }

    // Mostrar usuarios en la tabla
    displayUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        
        if (!tbody) {
            console.error('❌ No se encontró el elemento usersTableBody');
            return;
        }
        
        tbody.innerHTML = '';

        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <i class="fas fa-users" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        No hay usuarios registrados
                    </td>
                </tr>
            `;
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${this.getUserInitials(user.display_name || user.email || 'Usuario')}
                        </div>
                        <div class="user-details">
                            <h4>${user.display_name || 'Sin nombre'}</h4>
                            <p>ID: ${user.firebase_uid}</p>
                        </div>
                    </div>
                </td>
                <td>${user.email || 'No especificado'}</td>
                <td>${user.phone_number || 'No especificado'}</td>
                <td>
                    <span class="user-role ${user.role || 'user'}">
                        ${this.getRoleDisplayName(user.role || 'user')}
                    </span>
                </td>
                <td>
                    <span class="user-status ${user.is_active ? 'active' : 'inactive'}">
                        ${user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>${this.formatDate(user.updated_at || user.created_at)}</td>
                <td>
                    <div class="user-actions">
                        <button class="action-btn view" onclick="taxiApp.viewUser('${user.id}')">
                            <i class="fas fa-eye"></i>
                            Ver
                        </button>
                        <button class="action-btn edit" onclick="taxiApp.editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                            Editar
                        </button>
                        <button class="action-btn delete" onclick="taxiApp.deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                            Eliminar
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Actualizar estadísticas de usuarios
    updateUserStats(users) {
        const totalUsers = users.length;
        const activeUsers = users.filter(user => user.is_active).length;
        const today = new Date();
        const newUsers = users.filter(user => {
            const userDate = new Date(user.created_at);
            return userDate.toDateString() === today.toDateString();
        }).length;

        const totalElement = document.getElementById('totalUsers');
        const activeElement = document.getElementById('activeUsers');
        const newElement = document.getElementById('newUsers');
        
        if (totalElement) totalElement.textContent = totalUsers;
        if (activeElement) activeElement.textContent = activeUsers;
        if (newElement) newElement.textContent = newUsers;
    }

    // Obtener iniciales del usuario
    getUserInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
    }

    // Obtener nombre de visualización del rol
    getRoleDisplayName(role) {
        const roleNames = {
            'user': 'Usuario',
            'driver': 'Conductor',
            'admin': 'Administrador'
        };
        return roleNames[role] || 'Usuario';
    }

    // Formatear fecha
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Filtrar usuarios
    filterUsers() {
        const searchTerm = document.getElementById('userSearch').value.toLowerCase();
        const roleFilter = document.getElementById('userRoleFilter').value;
        const statusFilter = document.getElementById('userStatusFilter').value;

        // Filtrar usuarios localmente
        let filteredUsers = this.allUsers.filter(user => {
            // Filtro de búsqueda por texto
            const matchesSearch = !searchTerm || 
                (user.display_name && user.display_name.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                (user.phone_number && user.phone_number.toLowerCase().includes(searchTerm)) ||
                (user.firebase_uid && user.firebase_uid.toLowerCase().includes(searchTerm));

            // Filtro por rol
            const matchesRole = !roleFilter || user.role === roleFilter;

            // Filtro por estado
            const matchesStatus = !statusFilter || 
                (statusFilter === 'active' && user.is_active) ||
                (statusFilter === 'inactive' && !user.is_active);

            return matchesSearch && matchesRole && matchesStatus;
        });

        // Mostrar usuarios filtrados
        this.displayUsers(filteredUsers);
        this.updateUserStats(filteredUsers);
    }

    // Refrescar lista de usuarios
    refreshUserList() {
        this.loadUsers();
        this.showSuccess('Lista de usuarios actualizada');
    }

    // Ver usuario
    viewUser(userId) {
        console.log('👁️ Ver usuario:', userId);
        this.showNotification('Función de ver usuario - En desarrollo', 'info');
    }

    // Editar usuario
    editUser(userId) {
        console.log('✏️ Editar usuario:', userId);
        this.showNotification('Función de editar usuario - En desarrollo', 'info');
    }

    // Eliminar usuario
    async deleteUser(userId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
            return;
        }

        try {
            this.showLoading('Eliminando usuario...');
            
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (error) {
                console.error('Error eliminando usuario:', error);
                this.showError('Error eliminando usuario');
                return;
            }

            this.showSuccess('Usuario eliminado exitosamente');
            this.loadUsers(); // Recargar lista
        } catch (error) {
            console.error('Error en deleteUser:', error);
            this.showError('Error eliminando usuario');
        } finally {
            this.hideLoading();
        }
    }

    // Navegación de páginas
    previousUserPage() {
        // Implementar paginación
        this.showNotification('Paginación - En desarrollo', 'info');
    }

    nextUserPage() {
        // Implementar paginación
        this.showNotification('Paginación - En desarrollo', 'info');
    }

    // Volver al menú de administrador
    backToAdminMenu() {
        this.hideAllScreens();
        document.getElementById('adminMenuScreen').classList.remove('hidden');
    }

    // Gestionar conductores
    showDriverManagement() {
        console.log('🚗 Mostrando gestión de conductores...');
        this.showNotification('Gestión de conductores - En desarrollo', 'info');
    }

    // Gestionar viajes
    showRideManagement() {
        console.log('🛣️ Mostrando gestión de viajes...');
        this.showNotification('Gestión de viajes - En desarrollo', 'info');
    }

    // Mostrar reportes
    showReports() {
        console.log('📊 Mostrando reportes...');
        this.showNotification('Reportes - En desarrollo', 'info');
    }

    // Mostrar automatización
    showAutomation() {
        console.log('🤖 Mostrando automatización...');
        this.showNotification('Automatización - En desarrollo', 'info');
    }

    // Mostrar botón de solicitar taxi
    showRequestTaxiButton() {
        console.log('🚕 Mostrando botón de solicitar taxi...');
        
        // Crear o mostrar el botón de solicitar taxi
        let requestTaxiBtn = document.getElementById('requestTaxiBtn');
        
        if (!requestTaxiBtn) {
            requestTaxiBtn = document.createElement('button');
            requestTaxiBtn.id = 'requestTaxiBtn';
            requestTaxiBtn.className = 'btn btn-primary request-taxi-btn';
            requestTaxiBtn.innerHTML = `
                <i class="fas fa-taxi"></i>
                <span>Solicitar Taxi</span>
            `;
            requestTaxiBtn.onclick = () => this.handleRequestTaxi();
            
            // Agregar al contenedor del mapa
            const mapContainer = document.getElementById('mapContainer');
            if (mapContainer) {
                mapContainer.appendChild(requestTaxiBtn);
            }
        }
        
        requestTaxiBtn.style.display = 'block';
        console.log('✅ Botón de solicitar taxi mostrado');
    }
    
    // Manejar solicitud de taxi
    handleRequestTaxi() {
        console.log('🚕 Solicitud de taxi iniciada...');
        
        // Obtener origen y destino
        const origin = document.getElementById('origin')?.value || '';
        const destination = document.getElementById('destination')?.value || '';
        
        if (!origin || !destination) {
            this.showError('Por favor, ingresa origen y destino');
            return;
        }
        
        // Aquí iría la lógica para solicitar taxi
        // Por ahora solo mostramos un mensaje
        this.showSuccess('Solicitud de taxi enviada. Buscando conductor...');
        
        // Simular proceso de búsqueda
        setTimeout(() => {
            this.showSuccess('¡Conductor encontrado! Llegará en 5 minutos.');
        }, 2000);
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    window.taxiApp = new TaxiApp();
    // Inicializar la aplicación manualmente
    await window.taxiApp.init();
    // Exponer authService globalmente para acceso desde otros métodos
    window.authService = window.taxiApp.authService;
}); 