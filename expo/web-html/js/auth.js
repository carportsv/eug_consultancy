// Auth Service - Manejo de autenticación con Firebase
class AuthService {
    constructor() {
        this.auth = null;
        this.currentUser = null;
        this.authStateListeners = [];
        this.phoneConfirmationResult = null;
        this.recaptchaVerifier = null; // Nuevo para reCAPTCHA
        this.authStateListenerSet = false; // Evitar múltiples listeners
        // No inicializar automáticamente, se hará manualmente desde app.js
    }

    // Inicializar Firebase Auth
    async init() {
        try {
            console.log('🔧 Inicializando Firebase Auth...');
            
            // Verificar si ya está inicializado
            if (this.auth && this.auth.currentUser !== null) {
                console.log('✅ Firebase Auth ya está inicializado');
                return;
            }
            
            // Cargar Firebase si no está cargado
            console.log('📦 Iniciando carga de Firebase...');
            await this.loadFirebase();
            console.log('✅ Firebase cargado exitosamente');
            
            // Verificar que firebase esté disponible
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase no está disponible después de la carga');
            }
            
            // Inicializar Firebase si no está inicializado
            if (!firebase.apps.length) {
                console.log('🔧 Configurando Firebase App...');
                firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
                console.log('✅ Firebase App inicializado');
            } else {
                console.log('✅ Firebase App ya está inicializado');
            }
            
            // Obtener instancia de Auth
            this.auth = firebase.auth();
            console.log('✅ Firebase Auth obtenido:', this.auth);
            
            // Manejar resultado del redirect de Google Sign-In
            try {
                const result = await this.auth.getRedirectResult();
                if (result.user) {
                    console.log('✅ Usuario autenticado por redirect:', result.user.email);
                    
                    // Crear o actualizar perfil en Supabase
                    await this.createUserProfile(result.user, {
                        email: result.user.email,
                        name: result.user.displayName,
                        photoURL: result.user.photoURL
                    });
                    
                    // Guardar usuario en localStorage
                    await this.saveUserToLocalStorage(result.user);
                    this.currentUser = result.user;
                }
            } catch (redirectError) {
                console.warn('⚠️ Error al obtener resultado del redirect:', redirectError);
                // No es crítico, continuar con la inicialización
            }

            // Verificar si el usuario llegó por un link de email
            try {
                const emailResult = await this.verifyEmailLink();
                if (emailResult.success) {
                    console.log('✅ Usuario autenticado por email link:', emailResult.user);
                    await this.saveUserToLocalStorage(emailResult.user);
                    this.currentUser = emailResult.user;
                } else if (emailResult.error) {
                    // Solo mostrar warning si no es un error de cancelación o email inválido
                    if (!emailResult.error.includes('canceló') && !emailResult.error.includes('no válido')) {
                        console.warn('⚠️ Error al verificar email link:', emailResult.error);
                    } else {
                        console.log('ℹ️ Verificación de email link omitida:', emailResult.error);
                    }
                }
            } catch (emailError) {
                console.warn('⚠️ Error al verificar email link:', emailError);
                // No es crítico, continuar con la inicialización
            }
            
            // Configurar listener de estado de autenticación (solo una vez)
            if (!this.authStateListenerSet) {
                this.auth.onAuthStateChanged(async (user) => {
                    console.log('✅ Usuario autenticado:', user);
                    
                    if (user) {
                        // Usuario está autenticado
                        console.log('🔐 Usuario autenticado, guardando en localStorage...');
                        
                        // 🔄 SINCRONIZAR CON SUPABASE
                        try {
                            console.log('🔄 Sincronizando usuario con Supabase...');
                            await this.createUserProfile(user, {
                                displayName: user.displayName,
                                email: user.email,
                                phoneNumber: user.phoneNumber,
                                photoURL: user.photoURL
                            });
                            console.log('✅ Usuario sincronizado con Supabase exitosamente');
                        } catch (syncError) {
                            console.warn('⚠️ Error sincronizando con Supabase (no crítico):', syncError.message);
                        }
                        
                        await this.saveUserToLocalStorage(user);
                        this.currentUser = user;
                        
                        // 🔥 NOTIFICAR A LA APLICACIÓN
                        console.log('📢 Notificando cambio de estado a la aplicación...');
                        this.notifyAuthStateChange(true, user);
                    } else {
                        // Usuario no está autenticado
                        // Verificar si realmente no hay usuario en localStorage antes de limpiar
                        const storedUser = this.getUserFromLocalStorage();
                        if (!storedUser) {
                            console.log('ℹ️ Usuario no autenticado, limpiando localStorage...');
                            this.clearUserFromLocalStorage();
                        } else {
                            console.log('⚠️ Usuario en localStorage pero no en Firebase, manteniendo estado...');
                        }
                        
                        // 🔥 NOTIFICAR A LA APLICACIÓN
                        console.log('📢 Notificando cambio de estado a la aplicación...');
                        this.notifyAuthStateChange(false, null);
                    }
                });
                this.authStateListenerSet = true;
            }
            
            console.log('✅ Firebase Auth inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Firebase Auth:', error);
            throw error;
        }
    }

    // Cargar Firebase desde CDN
    async loadFirebase() {
        return new Promise((resolve, reject) => {
            // Verificar si Firebase ya está cargado
            if (typeof firebase !== 'undefined') {
                console.log('✅ Firebase ya está cargado desde HTML');
                resolve();
                return;
            }
            
            console.log('📦 Cargando Firebase desde CDN...');
            
            // Cargar Firebase App desde CDN principal
            const appScript = document.createElement('script');
            appScript.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js';
            appScript.onload = () => {
                console.log('✅ Firebase App cargado');
                this.loadFirebaseAuth(resolve, reject);
            };
            appScript.onerror = (error) => {
                console.error('❌ Error cargando Firebase App desde CDN principal:', error);
                console.log('🔄 Intentando CDN alternativo...');
                
                // Intentar CDN alternativo
                const fallbackScript = document.createElement('script');
                fallbackScript.src = 'https://cdn.jsdelivr.net/npm/firebase@8.10.0/dist/firebase-app.js';
                fallbackScript.onload = () => {
                    console.log('✅ Firebase App cargado desde CDN alternativo');
                    this.loadFirebaseAuth(resolve, reject);
                };
                fallbackScript.onerror = (fallbackError) => {
                    console.error('❌ Error cargando Firebase App desde CDN alternativo:', fallbackError);
                    reject(new Error('Error cargando Firebase App desde ambos CDNs'));
                };
                document.head.appendChild(fallbackScript);
                return;
            };
            document.head.appendChild(appScript);
            
            // Timeout de seguridad
            setTimeout(() => {
                console.error('⏰ Timeout cargando Firebase desde CDN');
                reject(new Error('Timeout cargando Firebase desde CDN (60s)'));
            }, 60000); // 60 segundos
        });
    }
    
    // Cargar Firebase Auth (función auxiliar)
    loadFirebaseAuth(resolve, reject) {
        // Cargar Firebase Auth
        const authScript = document.createElement('script');
        authScript.src = 'https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js';
        authScript.onload = () => {
            console.log('✅ Firebase Auth cargado');
            resolve();
        };
        authScript.onerror = (error) => {
            console.error('❌ Error cargando Firebase Auth desde CDN principal:', error);
            console.log('🔄 Intentando CDN alternativo para Auth...');
            
            // Intentar CDN alternativo para Auth
            const fallbackAuthScript = document.createElement('script');
            fallbackAuthScript.src = 'https://cdn.jsdelivr.net/npm/firebase@8.10.0/dist/firebase-auth.js';
            fallbackAuthScript.onload = () => {
                console.log('✅ Firebase Auth cargado desde CDN alternativo');
                resolve();
            };
            fallbackAuthScript.onerror = (fallbackError) => {
                console.error('❌ Error cargando Firebase Auth desde CDN alternativo:', fallbackError);
                reject(new Error('Error cargando Firebase Auth desde ambos CDNs'));
            };
            document.head.appendChild(fallbackAuthScript);
        };
        document.head.appendChild(authScript);
    }

    // Configurar listener de estado de autenticación
    setupAuthStateListener() {
        this.auth.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            
            if (user) {
                console.log('✅ Usuario autenticado:', user.email);
                
                // 🔄 SINCRONIZAR CON SUPABASE
                try {
                    console.log('🔄 Sincronizando usuario con Supabase...');
                    await this.createUserProfile(user, {
                        displayName: user.displayName,
                        email: user.email,
                        phoneNumber: user.phoneNumber,
                        photoURL: user.photoURL
                    });
                    console.log('✅ Usuario sincronizado con Supabase exitosamente');
                } catch (syncError) {
                    console.warn('⚠️ Error sincronizando con Supabase (no crítico):', syncError.message);
                }
                
                await this.saveUserToLocalStorage(user);
                this.notifyAuthStateChange(true, user);
            } else {
                console.log('ℹ️ Usuario no autenticado');
                this.clearUserFromLocalStorage();
                this.notifyAuthStateChange(false, null);
            }
        });
    }

    // Verificar usuario actual
    async checkCurrentUser() {
        const user = this.auth.currentUser;
        if (user) {
            this.currentUser = user;
            await this.saveUserToLocalStorage(user);
            this.notifyAuthStateChange(true, user);
        }
    }

    // ===== MÉTODOS DE AUTENTICACIÓN =====

    // Iniciar sesión con email y contraseña
    async signIn(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Obtener token personalizado para Supabase
            const token = await user.getIdToken();
            
            // Guardar token en localStorage
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_TOKEN, token);
            
            console.log('Inicio de sesión exitoso:', user.email);
            return user;
        } catch (error) {
            console.error('Error en inicio de sesión:', error);
            throw this.handleAuthError(error);
        }
    }

    // Iniciar autenticación con Google
    async signInWithGoogle() {
        try {
            console.log('🔧 Iniciando autenticación con Google...');
            
            // Verificar que Firebase esté inicializado
            if (!this.auth) {
                throw new Error('Firebase Auth no está inicializado');
            }

            console.log('✅ Firebase Auth disponible:', this.auth);

            // Crear proveedor de Google
            const provider = new firebase.auth.GoogleAuthProvider();
            
            // Configurar scopes adicionales si es necesario
            provider.addScope('email');
            provider.addScope('profile');
            
            console.log('✅ Proveedor de Google configurado');

            // Intentar autenticación con popup primero, si falla usar redirect
            console.log('🪟 Intentando autenticación con popup...');
            try {
                const result = await this.auth.signInWithPopup(provider);
                console.log('✅ Autenticación con Google exitosa (popup):', result.user.email);
                return result.user;
            } catch (popupError) {
                console.warn('⚠️ Popup falló, intentando con redirect...', popupError);
                
                // Si el popup falla por CSP o bloqueo, usar redirect
                if (popupError.code === 'auth/popup-blocked' || 
                    popupError.code === 'auth/cancelled-popup-request' ||
                    popupError.message.includes('popup')) {
                    
                    console.log('🔄 Redirigiendo para autenticación con Google...');
                    await this.auth.signInWithRedirect(provider);
                    // El redirect no retorna inmediatamente, la página se recargará
                    return null;
                } else {
                    throw popupError;
                }
            }
            
        } catch (error) {
            console.error('❌ Error en autenticación con Google:', error);
            
            // Manejar errores específicos de Google Sign-In
            if (error.code === 'auth/popup-blocked') {
                throw new Error('El popup fue bloqueado por el navegador. Por favor, permite popups para este sitio.');
            } else if (error.code === 'auth/popup-closed-by-user') {
                throw new Error('El popup fue cerrado. Intenta nuevamente.');
            } else if (error.code === 'auth/unauthorized-domain') {
                throw new Error('Este dominio no está autorizado. Contacta al administrador.');
            } else if (error.code === 'auth/network-request-failed') {
                throw new Error('Error de conexión. Verifica tu internet.');
            } else if (error.code === 'auth/api-key-http-referrer-blocked') {
                console.error('❌ Error de configuración de Firebase:', error);
                throw new Error('Error de configuración de Firebase. El dominio actual no está autorizado para Google Sign-In. Contacta al administrador para configurar los dominios autorizados en Firebase Console.');
            } else {
                throw this.handleAuthError(error);
            }
        }
    }

    // Iniciar autenticación por teléfono
    async signInWithPhone(phoneNumber) {
        try {
            console.log('🔧 Iniciando autenticación por teléfono:', phoneNumber);
            
            // Verificar que Firebase esté inicializado
            if (!this.auth) {
                throw new Error('Firebase Auth no está inicializado');
            }

            console.log('✅ Firebase Auth disponible:', this.auth);

            // Limpiar cualquier reCAPTCHA anterior de manera segura
            await this.clearRecaptchaSafely();

            // Verificar que el elemento existe y está visible
            const recaptchaElement = document.getElementById('phoneAuthBtn');
            if (!recaptchaElement) {
                throw new Error('Elemento reCAPTCHA no encontrado');
            }

            // Asegurar que el elemento esté visible y limpio
            recaptchaElement.style.display = 'block';
            
            // Limpiar contenido anterior de manera más segura
            while (recaptchaElement.firstChild) {
                recaptchaElement.removeChild(recaptchaElement.firstChild);
            }
            
            // Pequeño delay para asegurar que el DOM esté listo
            await new Promise(resolve => setTimeout(resolve, 300));
            
            console.log('✅ Elemento reCAPTCHA encontrado y visible');

            // Configurar reCAPTCHA para autenticación por teléfono
            console.log('🔧 Configurando reCAPTCHA para autenticación real...');
            
            // Crear nueva instancia de RecaptchaVerifier con manejo de errores
            try {
                // Verificar que el elemento existe antes de crear el verifier
                const recaptchaElement = document.getElementById('phoneAuthBtn');
                if (!recaptchaElement) {
                    throw new Error('Elemento reCAPTCHA no encontrado');
                }
                
                // Verificar que Firebase está disponible
                if (!firebase || !firebase.auth || !firebase.app) {
                    throw new Error('Firebase no está disponible');
                }
                
                this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('phoneAuthBtn', {
                    'size': 'normal',
                    'callback': (response) => {
                        console.log('✅ reCAPTCHA completado:', response);
                    },
                    'expired-callback': () => {
                        console.log('⚠️ reCAPTCHA expirado');
                    }
                }, firebase.app());
                
                // Renderizar reCAPTCHA con manejo de errores
                await this.recaptchaVerifier.render();
                console.log('✅ reCAPTCHA renderizado correctamente');
            } catch (recaptchaError) {
                console.error('❌ Error al configurar reCAPTCHA:', recaptchaError);
                // Limpiar cualquier estado residual
                if (this.recaptchaVerifier) {
                    try {
                        this.recaptchaVerifier.clear();
                    } catch (clearError) {
                        console.warn('⚠️ Error al limpiar reCAPTCHA en error:', clearError);
                    }
                    this.recaptchaVerifier = null;
                }
                throw new Error('Error al configurar reCAPTCHA. Intenta nuevamente.');
            }
            
            // Enviar código de verificación usando Firebase real
            const confirmation = await this.auth.signInWithPhoneNumber(phoneNumber, this.recaptchaVerifier);
            this.phoneConfirmationResult = confirmation;
            
            console.log('✅ Código de verificación enviado por Firebase');
            
            console.log('✅ Código de verificación enviado al teléfono');
            return { success: true, requiresCode: true };
        } catch (error) {
            console.error('❌ Error en autenticación por teléfono:', error);
            
            // Limpiar reCAPTCHA en caso de error
            if (this.recaptchaVerifier) {
                try {
                    this.recaptchaVerifier.clear();
                } catch (clearError) {
                    console.warn('⚠️ Error al limpiar reCAPTCHA en error:', clearError);
                }
                this.recaptchaVerifier = null;
            }
            
            throw this.handleAuthError(error);
        }
    }

    // Verificar código de teléfono
    async verifyPhoneCode(code) {
        try {
            if (!this.phoneConfirmationResult) {
                throw new Error('No hay confirmación de teléfono pendiente');
            }
            
            const result = await this.phoneConfirmationResult.confirm(code);
            const user = result.user;
            
            console.log('✅ Usuario autenticado en Firebase Auth:', user);
            
            // Obtener token personalizado para Supabase
            const token = await user.getIdToken();
            
            // Guardar token en localStorage
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_TOKEN, token);
            
            // Crear o actualizar perfil en Supabase
            await this.createUserProfile(user, {
                phoneNumber: user.phoneNumber
            });
            
            // Actualizar this.currentUser inmediatamente
            this.currentUser = user;
            
            // Guardar usuario en localStorage
            await this.saveUserToLocalStorage(user);
            
            // Limpiar confirmation result
            this.phoneConfirmationResult = null;
            
            // Limpiar reCAPTCHA después de verificación exitosa
            await this.clearRecaptchaSafely();
            
            // Disparar evento de cambio de estado de autenticación
            this.notifyAuthStateChange(true, user);
            
            console.log('✅ Teléfono verificado exitosamente:', user.phoneNumber);
            console.log('✅ Usuario guardado en localStorage y currentUser actualizado');
            
            return user;
        } catch (error) {
            console.error('❌ Error verificando código de teléfono:', error);
            
            // Limpiar reCAPTCHA en caso de error
            await this.clearRecaptchaSafely();
            
            throw this.handleAuthError(error);
        }
    }

    // Registrarse con email y contraseña
    async signUp(email, password, userData = {}) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Actualizar perfil del usuario
            if (userData.displayName) {
                await user.updateProfile({
                    displayName: userData.displayName
                });
            }

            // Crear perfil en Supabase
            await this.createUserProfile(user, userData);

            console.log('Registro exitoso:', user.email);
            return user;
        } catch (error) {
            console.error('Error en registro:', error);
            throw this.handleAuthError(error);
        }
    }

    // Cerrar sesión
    async signOut() {
        try {
            await this.auth.signOut();
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
            
            console.log('Sesión cerrada exitosamente');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            throw error;
        }
    }

    // Restablecer contraseña
    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            console.log('Email de restablecimiento enviado');
        } catch (error) {
            console.error('Error al enviar email de restablecimiento:', error);
            throw this.handleAuthError(error);
        }
    }

    // Verificar email
    async sendEmailVerification() {
        try {
            const user = this.auth.currentUser;
            if (user && !user.emailVerified) {
                await user.sendEmailVerification();
                console.log('Email de verificación enviado');
            }
        } catch (error) {
            console.error('Error al enviar email de verificación:', error);
            throw error;
        }
    }

    // Iniciar autenticación por email (reemplaza SMS)
    async signInWithEmail(email) {
        try {
            console.log('🔧 Iniciando autenticación por email:', email);
            
            // Verificar que Firebase esté inicializado
            if (!this.auth) {
                throw new Error('Firebase Auth no está inicializado');
            }

            console.log('✅ Firebase Auth disponible:', this.auth);

            // Verificar que email auth esté habilitado
            if (!CONFIG.AUTH_SETTINGS.ENABLE_EMAIL_AUTH) {
                throw new Error('Autenticación por email no está habilitada');
            }

            // Enviar link de autenticación por email
            const actionCodeSettings = {
                url: window.location.origin, // URL de redirección (misma página)
                handleCodeInApp: true
            };

            console.log('📧 Enviando email de verificación a:', email);
            console.log('🔗 URL de redirección:', actionCodeSettings.url);

            // Enviar email de verificación
            await this.auth.sendSignInLinkToEmail(email, actionCodeSettings);
            
            // Guardar email en localStorage para verificación posterior
            localStorage.setItem('emailForSignIn', email);
            
            console.log('✅ Email de verificación enviado exitosamente');
            return { success: true, requiresEmailVerification: true };
            
        } catch (error) {
            console.error('❌ Error en autenticación por email:', error);
            
            // Manejar errores específicos de email auth
            if (error.code === 'auth/invalid-email') {
                throw new Error('El formato del email no es válido');
            } else if (error.code === 'auth/unauthorized-domain') {
                throw new Error('Este dominio no está autorizado para enviar emails. Contacta al administrador.');
            } else if (error.code === 'auth/network-request-failed') {
                throw new Error('Error de conexión. Verifica tu internet.');
            } else {
                throw this.handleAuthError(error);
            }
        }
    }

    // Verificar link de email
    async verifyEmailLink() {
        try {
            // Verificar si el usuario llegó por un link de email
            if (this.auth.isSignInWithEmailLink(window.location.href)) {
                let email = localStorage.getItem('emailForSignIn');
                
                if (!email) {
                    // Si no hay email guardado, limpiar la URL y continuar
                    console.log('ℹ️ No hay email guardado, limpiando URL y continuando...');
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return { success: false, error: 'No hay email guardado' };
                }
                
                // Validar que el email no esté vacío
                if (!email || email.trim() === '') {
                    console.log('ℹ️ Email vacío, saltando verificación de email link');
                    return { success: false, error: 'Email no válido' };
                }
                
                // Completar autenticación
                const result = await this.auth.signInWithEmailLink(email, window.location.href);
                const user = result.user;
                
                console.log('✅ Usuario autenticado por email:', user);
                
                // Limpiar email guardado y URL
                localStorage.removeItem('emailForSignIn');
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Crear o actualizar perfil en Supabase
                await this.createUserProfile(user, {
                    email: user.email,
                    emailVerified: user.emailVerified
                });
                
                return { success: true, user };
            }
            
            return { success: false, error: 'No es un link de verificación válido' };
            
        } catch (error) {
            console.error('❌ Error verificando email:', error);
            
            // Limpiar URL en caso de error
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Si es un error de argumento (email inválido), manejarlo silenciosamente
            if (error.code === 'auth/argument-error' && error.message.includes('First argument "email" must be a valid string')) {
                console.log('ℹ️ Error de email inválido, saltando verificación de email link');
                return { success: false, error: 'Email no válido para verificación' };
            }
            
            throw this.handleAuthError(error);
        }
    }

    // Método alternativo: Email + Password (más tradicional)
    async signInWithEmailPassword(email, password) {
        try {
            console.log('🔧 Iniciando autenticación con email y contraseña');
            
            if (!this.auth) {
                throw new Error('Firebase Auth no está inicializado');
            }

            // Intentar crear usuario o iniciar sesión
            let userCredential;
            
            try {
                // Intentar crear nuevo usuario
                userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
                console.log('✅ Nuevo usuario creado');
            } catch (createError) {
                if (createError.code === 'auth/email-already-in-use') {
                    // Usuario ya existe, intentar iniciar sesión
                    userCredential = await this.auth.signInWithEmailAndPassword(email, password);
                    console.log('✅ Usuario existente, sesión iniciada');
                } else {
                    throw createError;
                }
            }
            
            const user = userCredential.user;
            
            // Crear o actualizar perfil en Supabase
            await this.createUserProfile(user, {
                email: user.email,
                emailVerified: user.emailVerified
            });
            
            return { success: true, user };
            
        } catch (error) {
            console.error('❌ Error en autenticación con email/password:', error);
            throw this.handleAuthError(error);
        }
    }

    // ===== GESTIÓN DE PERFILES =====

    // Crear perfil de usuario en Supabase
    async createUserProfile(firebaseUser, userData) {
        try {
            console.log('🔧 Creando/sincronizando perfil de usuario...');
            
            // Verificar si el usuario ya existe en Supabase
            let existingUser = null;
            try {
                existingUser = await this.getUserFromSupabase(firebaseUser.uid);
            } catch (error) {
                console.log('ℹ️ Usuario no encontrado en Supabase, creando nuevo perfil...');
            }

            if (existingUser) {
                console.log('✅ Usuario ya existe en Supabase, actualizando...');
                // Actualizar perfil existente
                const updateData = {
                    display_name: userData.displayName || userData.name || existingUser.display_name,
                    phone_number: userData.phone || userData.phoneNumber || existingUser.phone_number,
                    email: userData.email || firebaseUser.email || existingUser.email,
                    updated_at: new Date().toISOString()
                };
                
                const result = await this.updateUserInSupabase(firebaseUser.uid, updateData);
                if (result) {
                    console.log('✅ Perfil actualizado en Supabase');
                }
            } else {
                console.log('✅ Creando nuevo perfil en Supabase...');
                // Crear nuevo perfil
                const profileData = {
                    firebase_uid: firebaseUser.uid,
                    email: firebaseUser.email || userData.email || null,
                    display_name: userData.displayName || userData.name || '',
                    phone_number: userData.phone || userData.phoneNumber || '',
                    role: 'user', // Por defecto es usuario
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const result = await this.createUserInSupabase(profileData);
                if (result) {
                    console.log('✅ Nuevo perfil creado en Supabase');
                }
            }
            
            console.log('✅ Perfil de usuario sincronizado con Supabase');
        } catch (error) {
            console.warn('⚠️ Error sincronizando perfil de usuario (no crítico):', error.message);
            // No lanzar error aquí para no interrumpir el registro
        }
    }

    // ===== MÉTODOS DE SUPABASE =====

    // Obtener usuario de Supabase
    async getUserFromSupabase(uid) {
        try {
            console.log('🔍 Buscando usuario en Supabase:', uid);
            
            // Verificar si Supabase está configurado correctamente
            if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
                console.warn('⚠️ Supabase no configurado correctamente');
                return null;
            }
            
            const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/users?firebase_uid=eq.${uid}&select=*`, {
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
                }
            });

            if (!response.ok) {
                console.warn(`⚠️ Error HTTP de Supabase: ${response.status}`);
                return null;
            }

            const users = await response.json();
            console.log('✅ Usuario encontrado en Supabase:', users[0]);
            
            if (users.length > 0) {
                const user = users[0];
                // Mapear campos para compatibilidad
                return {
                    ...user,
                    phone: user.phone_number || user.phone, // Usar phone_number si existe
                    phoneNumber: user.phone_number || user.phone
                };
            }
            return null;
        } catch (error) {
            console.warn('⚠️ Error obteniendo usuario de Supabase (no crítico):', error.message);
            return null;
        }
    }

    // Crear usuario en Supabase
    async createUserInSupabase(userData) {
        try {
            console.log('🔧 Creando usuario en Supabase:', userData);
            
            // Verificar si Supabase está configurado correctamente
            if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
                console.warn('⚠️ Supabase no configurado correctamente');
                return null;
            }
            
            const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                console.warn(`⚠️ Error HTTP creando usuario en Supabase: ${response.status}`);
                return null;
            }

            const result = await response.json();
            console.log('✅ Usuario creado en Supabase:', result);
            return result;
        } catch (error) {
            console.warn('⚠️ Error creando usuario en Supabase (no crítico):', error.message);
            return null;
        }
    }

    // Actualizar usuario en Supabase
    async updateUserInSupabase(uid, updateData) {
        try {
            console.log('🔧 Actualizando usuario en Supabase:', uid, updateData);
            
            // Verificar si Supabase está configurado correctamente
            if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
                console.warn('⚠️ Supabase no configurado correctamente');
                return null;
            }
            
            const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/users?firebase_uid=eq.${uid}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                console.warn(`⚠️ Error HTTP actualizando usuario en Supabase: ${response.status}`);
                return null;
            }

            // Verificar si la respuesta tiene contenido antes de intentar parsear JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const result = await response.json();
                console.log('✅ Usuario actualizado en Supabase:', result);
                return result;
            } else {
                // Respuesta exitosa pero sin contenido JSON (común en operaciones PATCH)
                console.log('✅ Usuario actualizado en Supabase (sin contenido de respuesta)');
                return { success: true };
            }
        } catch (error) {
            console.warn('⚠️ Error actualizando usuario en Supabase (no crítico):', error.message);
            return null;
        }
    }

    // Obtener rol de usuario de Supabase
    async getUserRoleFromSupabase(uid) {
        try {
            const user = await this.getUserFromSupabase(uid);
            const role = user ? user.role : 'user'; // Usar 'user' como valor por defecto
            console.log('🔍 getUserRoleFromSupabase() para UID:', uid, 'retornando rol:', role);
            return role;
        } catch (error) {
            console.error('Error obteniendo rol de usuario:', error);
            return 'user'; // Retornar 'user' como valor por defecto en caso de error
        }
    }

    // Obtener perfil completo del usuario
    async getUserProfile() {
        try {
            if (!this.currentUser) {
                throw new Error('No hay usuario autenticado');
            }

            const profile = await window.adminService.getUserProfile(this.currentUser.uid);
            return profile;
        } catch (error) {
            console.error('Error obteniendo perfil de usuario:', error);
            throw error;
        }
    }

    // Actualizar perfil del usuario
    async updateUserProfile(profileData) {
        try {
            if (!this.currentUser) {
                throw new Error('No hay usuario autenticado');
            }

            // Actualizar en Firebase
            if (profileData.displayName) {
                await this.currentUser.updateProfile({
                    displayName: profileData.displayName
                });
            }

            // Actualizar en Supabase
            const updatedProfile = await window.adminService.updateUserProfile(this.currentUser.uid, profileData);
            
            console.log('Perfil actualizado exitosamente');
            return updatedProfile;
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            throw error;
        }
    }

    // ===== GESTIÓN DE TOKENS =====

    // Obtener token de autenticación
    async getAuthToken() {
        try {
            if (this.currentUser) {
                const token = await this.currentUser.getIdToken(true); // Force refresh
                return token;
            }
            return null;
        } catch (error) {
            console.error('Error obteniendo token:', error);
            return null;
        }
    }

    // Verificar si el token es válido
    async isTokenValid() {
        try {
            const token = await this.getAuthToken();
            if (!token) return false;

            // Verificar token con Supabase
            const response = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': CONFIG.SUPABASE_ANON_KEY
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error verificando token:', error);
            return false;
        }
    }

    // ===== UTILIDADES =====

    // Guardar usuario en localStorage
    async saveUserToLocalStorage(user) {
        try {
            console.log('💾 Guardando usuario en localStorage:', user);
            
            // Obtener rol del usuario desde Supabase
            let userRole = 'user'; // Rol por defecto
            
            try {
                userRole = await this.getUserRoleFromSupabase(user.uid);
                console.log('✅ Rol obtenido de Supabase:', userRole);
            } catch (error) {
                console.warn('⚠️ No se pudo obtener rol de Supabase, usando rol por defecto:', error.message);
                // Usar rol por defecto basado en el tipo de autenticación
                if (user.providerData && user.providerData.length > 0) {
                    const provider = user.providerData[0].providerId;
                    if (provider === 'google.com') {
                        userRole = 'user'; // Usuarios de Google por defecto son 'user'
                    } else if (provider === 'phone') {
                        userRole = 'user'; // Usuarios de teléfono por defecto son 'user'
                    }
                }
            }
            
            // Guardar datos del usuario
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_UID, user.uid);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ROLE, userRole);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify({
                uid: user.uid,
                email: user.email,
                phoneNumber: user.phoneNumber,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: userRole,
                createdAt: new Date().toISOString()
            }));
            
            // Establecer cookie de autenticación para el servidor
            this.setAuthCookie(user.uid, userRole);
            
            console.log('✅ Usuario guardado en localStorage con rol:', userRole);
            console.log('🔍 localStorage USER_ROLE guardado:', localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ROLE));
            console.log('🔍 localStorage USER_DATA guardado:', localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA));
            
        } catch (error) {
            console.error('❌ Error guardando usuario en localStorage:', error);
            throw error;
        }
    }

    // Establecer cookie de autenticación para el servidor
    setAuthCookie(uid, role) {
        try {
            // Crear un token simple (en producción usar JWT)
            const token = btoa(`${uid}:${role}:${Date.now()}`);
            
            // Establecer cookie que expire en 24 horas
            const expires = new Date();
            expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000));
            
            document.cookie = `auth_token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
            
            console.log('🍪 Cookie de autenticación establecida');
        } catch (error) {
            console.error('❌ Error estableciendo cookie de autenticación:', error);
        }
    }

    // Limpiar cookie de autenticación
    clearAuthCookie() {
        try {
            // Establecer cookie con fecha de expiración en el pasado para eliminarla
            document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict';
            console.log('🍪 Cookie de autenticación eliminada');
        } catch (error) {
            console.error('❌ Error eliminando cookie de autenticación:', error);
        }
    }

    // Limpiar usuario de localStorage
    clearUserFromLocalStorage() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_UID);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_ROLE);
        
        // Limpiar cookie de autenticación
        this.clearAuthCookie();
        
        console.log('✅ Usuario limpiado de localStorage y cookies');
    }

    // Obtener usuario de localStorage
    getUserFromLocalStorage() {
        const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        const userRole = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ROLE);
        
        if (userData) {
            const user = JSON.parse(userData);
            user.role = userRole || 'user';
            return user;
        }
        return null;
    }

    // Verificar si el usuario está autenticado
    isAuthenticated() {
        // Verificar tanto this.currentUser como el estado directo de Firebase Auth
        const firebaseUser = this.auth ? this.auth.currentUser : null;
        const hasCurrentUser = this.currentUser !== null;
        const hasFirebaseUser = firebaseUser !== null;
        
        console.log('🔍 isAuthenticated() - this.currentUser:', this.currentUser);
        console.log('🔍 isAuthenticated() - firebase.auth.currentUser:', firebaseUser);
        console.log('🔍 isAuthenticated() - hasCurrentUser:', hasCurrentUser);
        console.log('🔍 isAuthenticated() - hasFirebaseUser:', hasFirebaseUser);
        
        // Si hay usuario en Firebase Auth, actualizar this.currentUser
        if (hasFirebaseUser && !hasCurrentUser) {
            this.currentUser = firebaseUser;
            console.log('🔍 isAuthenticated() - Actualizando this.currentUser desde Firebase Auth');
        }
        
        // Verificar también localStorage como respaldo
        const localStorageUser = this.getUserFromLocalStorage();
        const hasLocalStorageUser = localStorageUser !== null;
        console.log('🔍 isAuthenticated() - localStorage user:', localStorageUser);
        console.log('🔍 isAuthenticated() - hasLocalStorageUser:', hasLocalStorageUser);
        
        // El usuario está autenticado si hay usuario en Firebase Auth O en localStorage
        const isAuthenticated = hasFirebaseUser || hasLocalStorageUser;
        console.log('🔍 isAuthenticated() - Resultado final:', isAuthenticated);
        
        return isAuthenticated;
    }

    // Obtener usuario actual
    getCurrentUser() {
        return this.currentUser;
    }

    // Obtener rol del usuario actual
    getCurrentUserRole() {
        const role = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ROLE) || 'user';
        console.log('🔍 getCurrentUserRole() retornando:', role);
        return role;
    }

    // Verificar si el usuario es admin
    isAdmin() {
        return this.getCurrentUserRole() === 'admin';
    }

    // Verificar si el usuario es driver
    isDriver() {
        return this.getCurrentUserRole() === 'driver';
    }

    // Verificar si el usuario es user (pasajero)
    isUser() {
        return this.getCurrentUserRole() === 'user';
    }

    // ===== LISTENERS DE ESTADO =====

    // Agregar listener de cambio de estado de autenticación
    onAuthStateChanged(callback) {
        this.authStateListeners.push(callback);
        
        // Ejecutar callback inmediatamente si hay usuario
        if (this.currentUser) {
            callback(true, this.currentUser);
        }
        
        // Retornar función de desuscripción
        return () => {
            const index = this.authStateListeners.indexOf(callback);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
                console.log('✅ Listener de autenticación removido');
            }
        };
    }

    // Notificar cambio de estado a todos los listeners
    notifyAuthStateChange(isAuthenticated, user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(isAuthenticated, user);
            } catch (error) {
                console.error('Error en auth state listener:', error);
            }
        });
    }

    // ===== MANEJO DE ERRORES =====

    // Manejar errores de autenticación
    handleAuthError(error) {
        console.error('❌ Error de autenticación:', error);
        
        let message = 'Error de autenticación';
        
        switch (error.code) {
            case 'auth/popup-blocked':
                message = 'El popup fue bloqueado por el navegador. Por favor, permite popups para este sitio.';
                break;
            case 'auth/popup-closed-by-user':
                message = 'El popup fue cerrado. Intenta nuevamente.';
                break;
            case 'auth/cancelled-popup-request':
                message = 'Solicitud cancelada. Intenta nuevamente.';
                break;
            case 'auth/network-request-failed':
                message = 'Error de conexión. Verifica tu internet.';
                break;
            case 'auth/too-many-requests':
                message = 'Demasiados intentos. Espera un momento.';
                break;
            case 'auth/user-disabled':
                message = 'Esta cuenta ha sido deshabilitada.';
                break;
            case 'auth/invalid-email':
                message = 'Email inválido.';
                break;
            case 'auth/user-not-found':
                message = 'Usuario no encontrado.';
                break;
            case 'auth/wrong-password':
                message = 'Contraseña incorrecta.';
                break;
            default:
                message = error.message || 'Error desconocido';
        }
        
        return new Error(message);
    }

    // ===== VALIDACIONES =====

    // Validar email
    validateEmail(email) {
        return CONFIG.VALIDATION.EMAIL_REGEX.test(email);
    }

    // Validar contraseña
    validatePassword(password) {
        return password.length >= CONFIG.VALIDATION.PASSWORD_MIN_LENGTH;
    }

    // Validar datos de registro
    validateRegistrationData(userData) {
        const errors = [];

        if (!userData.name || userData.name.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }

        if (!userData.phone || !CONFIG.VALIDATION.PHONE_REGEX.test(userData.phone)) {
            errors.push('El teléfono debe tener un formato válido');
        }

        return errors;
    }

    // Método para limpiar reCAPTCHA de manera segura
    async clearRecaptchaSafely() {
        try {
            console.log('🧹 Limpiando reCAPTCHA anterior...');
            
            // Primero limpiar el verifier si existe
            if (this.recaptchaVerifier) {
                try {
                    this.recaptchaVerifier.clear();
                    console.log('✅ reCAPTCHA verifier limpiado correctamente');
                } catch (clearError) {
                    console.warn('⚠️ Error al limpiar reCAPTCHA verifier:', clearError);
                }
                this.recaptchaVerifier = null;
            }
            
            // Luego limpiar el elemento DOM con más cuidado
            const recaptchaElement = document.getElementById('phoneAuthBtn');
            if (recaptchaElement) {
                try {
                    // Remover todos los elementos hijos de manera segura
                    while (recaptchaElement.firstChild) {
                        recaptchaElement.removeChild(recaptchaElement.firstChild);
                    }
                    
                    // Limpiar cualquier atributo que pueda haber sido agregado por reCAPTCHA
                    recaptchaElement.removeAttribute('data-sitekey');
                    recaptchaElement.removeAttribute('data-callback');
                    recaptchaElement.removeAttribute('data-expired-callback');
                    
                    console.log('✅ Contenido del contenedor reCAPTCHA limpiado completamente');
                } catch (domError) {
                    console.warn('⚠️ Error al limpiar DOM reCAPTCHA:', domError);
                }
            } else {
                console.warn('⚠️ Elemento reCAPTCHA no encontrado para limpiar');
            }
            
            // Pequeño delay para asegurar que el DOM se actualice
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.warn('⚠️ Error general al limpiar reCAPTCHA:', error);
        }
    }
}

// Crear instancia global del servicio de autenticación
const authService = new AuthService();
// Exponer globalmente
window.authService = authService;

// Global error handler para reCAPTCHA y otros errores
window.addEventListener('error', function(event) {
    if (event.error && event.error.message && event.error.message.includes('Cannot read properties of null')) {
        console.warn('⚠️ Error de DOM detectado (probablemente reCAPTCHA):', event.error.message);
        // No mostrar el error al usuario, solo logearlo
        event.preventDefault();
    }
});

// Global unhandled rejection handler
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('Cannot read properties of null')) {
        console.warn('⚠️ Promesa rechazada (probablemente reCAPTCHA):', event.reason.message);
        // No mostrar el error al usuario, solo logearlo
        event.preventDefault();
    }
});