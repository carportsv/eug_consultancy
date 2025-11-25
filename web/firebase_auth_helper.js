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
    const result = await auth.signInWithPopup(provider);
    
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
    // Si el popup está bloqueado, intentar con redirect
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      throw new Error('POPUP_BLOCKED: El popup fue bloqueado. Por favor, permite popups para este sitio.');
    }
    throw error;
  }
};

