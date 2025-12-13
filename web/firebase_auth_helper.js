// Helper para Google Sign-In con Firebase Auth en web
// Este archivo proporciona una función que usa Firebase Auth JS SDK directamente
// Nota: Firebase debe estar inicializado antes de usar esta función

window.firebaseAuthSignInWithGoogle = async function(firebaseConfig) {
  try {
    // Inicializar Firebase si no está inicializado
    if (!firebase.apps || firebase.apps.length === 0) {
      if (!firebaseConfig) {
        throw new Error('Firebase config es requerido para inicializar');
      }
      // Log completo de la configuración (solo primeros y últimos caracteres de API key por seguridad)
      const apiKeyPreview = firebaseConfig.apiKey ? 
        firebaseConfig.apiKey.substring(0, 10) + '...' + firebaseConfig.apiKey.substring(firebaseConfig.apiKey.length - 5) : 
        'missing';
      console.log('[firebaseAuthSignInWithGoogle] Inicializando Firebase con config:', {
        apiKey: apiKeyPreview,
        apiKeyLength: firebaseConfig.apiKey ? firebaseConfig.apiKey.length : 0,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId
      });
      
      // Verificar que la API key tenga el formato correcto
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey.length < 30) {
        throw new Error('API key inválida o faltante en la configuración de Firebase');
      }
      
      firebase.initializeApp(firebaseConfig);
      console.log('[firebaseAuthSignInWithGoogle] ✅ Firebase inicializado');
    } else {
      console.log('[firebaseAuthSignInWithGoogle] ✅ Firebase ya estaba inicializado');
    }
    
    // Obtener la instancia de Firebase Auth
    const auth = firebase.auth();
    
    if (!auth) {
      throw new Error('Firebase Auth no está disponible');
    }
    
    // Verificar que la configuración sea correcta
    const currentApp = firebase.app();
    if (currentApp && currentApp.options) {
      const currentApiKey = currentApp.options.apiKey || 'missing';
      const apiKeyPreview = currentApiKey.length > 15 ? 
        currentApiKey.substring(0, 10) + '...' + currentApiKey.substring(currentApiKey.length - 5) : 
        currentApiKey;
      console.log('[firebaseAuthSignInWithGoogle] Firebase config verificada:', {
        projectId: currentApp.options.projectId,
        authDomain: currentApp.options.authDomain,
        apiKey: apiKeyPreview,
        apiKeyLength: currentApiKey.length
      });
      
      // Verificar que la API key coincida con la que se pasó
      if (firebaseConfig.apiKey && currentApp.options.apiKey !== firebaseConfig.apiKey) {
        console.warn('[firebaseAuthSignInWithGoogle] ⚠️ ADVERTENCIA: La API key de Firebase no coincide con la pasada en config');
        console.warn('[firebaseAuthSignInWithGoogle] API key pasada:', firebaseConfig.apiKey.substring(0, 10) + '...');
        console.warn('[firebaseAuthSignInWithGoogle] API key actual:', currentApp.options.apiKey.substring(0, 10) + '...');
      }
    }

    // Crear el proveedor de Google
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    // Usar signInWithPopup (método simple y directo)
    let result;
    try {
      console.log('[firebaseAuthSignInWithGoogle] Intentando signInWithPopup...');
      console.log('[firebaseAuthSignInWithGoogle] Origen actual:', window.location.origin);
      result = await auth.signInWithPopup(provider);
      console.log('[firebaseAuthSignInWithGoogle] ✅ signInWithPopup exitoso');
    } catch (popupError) {
      console.error('[firebaseAuthSignInWithGoogle] Error en signInWithPopup:', popupError);
      console.error('[firebaseAuthSignInWithGoogle] Error code:', popupError.code);
      console.error('[firebaseAuthSignInWithGoogle] Error message:', popupError.message);
      
      // Si el popup está bloqueado, lanzar error específico
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          (popupError.message && popupError.message.includes('POPUP_BLOCKED')) ||
          (popupError.message && popupError.message.includes('Unable to establish a connection'))) {
        throw new Error('POPUP_BLOCKED: El popup fue bloqueado. Por favor, permite popups para este sitio.');
      }
      
      // Si el error es de API key, proporcionar mensaje más útil
      if (popupError.code === 'auth/api-key-not-valid' || 
          popupError.code === 'auth/invalid-api-key' ||
          popupError.message && (
            popupError.message.includes('API key') || 
            popupError.message.includes('api-key') ||
            popupError.message.includes('INVALID_ARGUMENT') ||
            popupError.message.includes('400')
          )) {
        const currentOrigin = window.location.origin;
        throw new Error(
          'API_KEY_ERROR: La API key de Firebase no es válida o tiene restricciones que bloquean este origen.\n\n' +
          'Origen actual: ' + currentOrigin + '\n\n' +
          'Por favor, verifica en Google Cloud Console:\n' +
          '1. Que la API key "Browser key" tenga "Identity Toolkit API" habilitada\n' +
          '2. Que las restricciones de aplicación permitan ' + currentOrigin + '\n' +
          '3. En Firebase Console, verifica que "localhost" esté en "Authorized domains"\n' +
          '4. Espera 2-5 minutos después de cambiar las restricciones para que se propaguen'
        );
      }
      
      throw popupError;
    }
    
    // Verificar que el resultado sea válido
    if (!result) {
      throw new Error('No se pudo obtener el resultado de la autenticación');
    }
    
    // Verificar que tenemos un usuario
    if (!result.user) {
      throw new Error('No se pudo obtener el usuario de la autenticación');
    }
    
    // Obtener los tokens - intentar desde credential primero, luego desde user
    let idToken = null;
    let accessToken = null;
    
    if (result.credential) {
      // Si hay credential, usar esos tokens (método preferido)
      idToken = result.credential.idToken;
      accessToken = result.credential.accessToken;
    }
    
    // Si no hay credential o falta algún token, obtener del usuario
    if (!idToken) {
      try {
        idToken = await result.user.getIdToken();
        console.log('[firebaseAuthSignInWithGoogle] ✅ idToken obtenido del usuario');
      } catch (tokenError) {
        console.error('[firebaseAuthSignInWithGoogle] Error obteniendo idToken:', tokenError);
        throw new Error('No se pudo obtener el idToken del usuario: ' + tokenError.message);
      }
    }
    
    // accessToken puede no estar disponible en algunos casos, pero intentar obtenerlo
    if (!accessToken) {
      // En Firebase Auth, el accessToken no está disponible directamente del usuario
      // Solo está disponible en result.credential después de signInWithPopup
      // Si no está disponible, usar null (Firebase puede funcionar solo con idToken)
      console.log('[firebaseAuthSignInWithGoogle] ⚠️ accessToken no disponible, continuando solo con idToken');
    }
    
    // Retornar el resultado con los tokens
    // Las funciones async ya retornan Promises automáticamente, no necesitamos Promise.resolve()
    const resultData = {
      user: {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      },
      credential: {
        idToken: idToken,
        accessToken: accessToken || '', // Usar string vacío si no está disponible
      }
    };
    
    // Retornar directamente - la función async ya retorna una Promise
    return resultData;
  } catch (error) {
    console.error('[firebaseAuthSignInWithGoogle] Error:', error);
    // Lanzar el error - las funciones async automáticamente lo convierten en Promise rechazada
    throw error;
  }
};


