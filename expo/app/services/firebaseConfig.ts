// Migración a @react-native-firebase/app y @react-native-firebase/auth para persistencia real
import firebase from '@react-native-firebase/app';
import _auth, { GoogleAuthProvider } from '@react-native-firebase/auth';

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.warn(`⚠️ Variable de entorno no configurada: ${name}`);
    return '';
  }
  return value;
}

const firebaseConfig = {
  apiKey: getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID'),
};

let firebaseInitialized = false;
let firebaseInitPromise: Promise<void> | null = null;

export async function initFirebaseAsync() {
  if (!firebaseInitialized) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // Configurar persistencia de autenticación
    try {
      const auth = _auth();
      // En React Native Firebase, la persistencia está habilitada por defecto
      // pero podemos verificar que esté funcionando
      console.log('✅ Firebase Auth inicializado con persistencia por defecto');
    } catch (error) {
      console.warn('⚠️ Error inicializando Firebase Auth:', error);
    }
    
    firebaseInitialized = true;
  }
}

export async function getAuthInstanceAsync() {
  if (!firebaseInitialized) {
    if (!firebaseInitPromise) {
      firebaseInitPromise = initFirebaseAsync();
    }
    await firebaseInitPromise;
  }
  return _auth();
}

export { GoogleAuthProvider };

