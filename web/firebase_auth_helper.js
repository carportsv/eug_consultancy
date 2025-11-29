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
      firebase.initializeApp(firebaseConfig);
    }
    
    // Obtener la instancia de Firebase Auth
    const auth = firebase.auth();
    
    if (!auth) {
      throw new Error('Firebase Auth no está disponible');
    }

    // Crear el proveedor de Google
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    // Usar signInWithPopup (más confiable que signInWithRedirect)
    let result;
    try {
      result = await auth.signInWithPopup(provider);
    } catch (popupError) {
      // Si el popup está bloqueado, lanzar error específico
      if (popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/popup-closed-by-user' ||
          (popupError.message && popupError.message.includes('POPUP_BLOCKED'))) {
        throw new Error('POPUP_BLOCKED: El popup fue bloqueado. Por favor, permite popups para este sitio.');
      }
      throw popupError;
    }
    
    // Verificar que el resultado sea válido
    if (!result) {
      throw new Error('No se pudo obtener el resultado de la autenticación');
    }
    
    // Verificar que result.credential existe
    if (!result.credential) {
      // Si no hay credential pero hay user, puede ser que ya esté autenticado
      // En este caso, intentar obtener el token del usuario actual
      if (result.user) {
        const idToken = await result.user.getIdToken();
        const accessToken = result.user.accessToken || null;
        
        return {
          user: {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
          },
          credential: {
            idToken: idToken,
            accessToken: accessToken,
          }
        };
      }
      throw new Error('No se pudo obtener el resultado de la autenticación');
    }
    
    // Retornar el resultado con los tokens
    return {
      user: {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      },
      credential: {
        idToken: result.credential.idToken,
        accessToken: result.credential.accessToken,
      }
    };
  } catch (error) {
    console.error('[firebaseAuthSignInWithGoogle] Error:', error);
    throw error;
  }
};

