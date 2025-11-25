import { useAppReady } from '@/contexts/AppReadyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function AppIndex() {
  console.log('[Index] Componente AppIndex iniciando...');
  const router = useRouter();
  const { isAuthenticated, loading, userType } = useAuth();
  const { appIsReady } = useAppReady();
  
  console.log('[Index] Render:', { isAuthenticated, loading, userType, appIsReady });

  useEffect(() => {
    console.log('[Index] useEffect ejecutado:', { isAuthenticated, loading, userType, appIsReady });
    console.log('[Index] Condiciones de navegación:', { 
      appIsReady, 
      isAuthenticated, 
      loading: !loading,
      userType,
      todasCumplidas: appIsReady && isAuthenticated && !loading
    });
    
    // Solo navegar si la app está completamente lista y el usuario está autenticado
    if (appIsReady && isAuthenticated && !loading) {
      console.log('[Index] App lista y usuario autenticado, navegando...');
      let type = userType;
      if (!type) {
        type = 'user';
      }
      console.log('[Index] Tipo de usuario:', type);
      switch (type) {
        case 'driver':
          console.log('[Index] Navegando a driver_home');
          router.replace('/driver/driver_home');
          break;
        case 'user':
        default:
          console.log('[Index] Navegando a user_home');
          router.replace('/user/user_home');
          break;
      }
    } else if (appIsReady && !isAuthenticated && !loading) {
      // Si no está autenticado y la app está lista, redirigir al login
      console.log('[Index] Usuario no autenticado, redirigiendo al login');
      router.replace('/login');
    } else {
      console.log('[Index] No navegando:', { appIsReady, isAuthenticated, loading });
    }
  }, [appIsReady, isAuthenticated, loading, userType, router]);

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <View style={styles.container}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.title}>cuzcatlansv.ride (OpenStreet)</Text>
        <Text style={styles.loadingText}>Verificando sesión...</Text>
      </View>
    );
  }

  // Si no está autenticado, mostrar loading mientras redirige
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Image source={require('../assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.title}>cuzcatlansv.ride (OpenStreet)</Text>
        <Text style={styles.loadingText}>Redirigiendo al login...</Text>
      </View>
    );
  }

  // Si está autenticado pero aún no se ha redirigido, mostrar loading
  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/icon.png')} style={styles.logo} />
      <Text style={styles.title}>cuzcatlansv.ride (OpenStreet)</Text>
      <Text style={styles.loadingText}>Redirigiendo...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 32,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 48,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
}); 