import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthService, syncUserWithSupabase } from './authService';
import { getAuthInstanceAsync, GoogleAuthProvider } from './firebaseConfig';
import { getUserRoleFromSupabase } from './userFirestore';

// Configura el Client ID de web desde las variables de entorno
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export default function GoogleSignInButton({ 
  onSuccess, 
  onAuthComplete 
}: { 
  onSuccess?: (token: string) => void;
  onAuthComplete?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleGoogleSignIn = async () => {
    try {
      console.log('GoogleSignIn: Iniciando proceso de autenticación...');
      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('GoogleSignIn: Servicios de Google Play verificados');
      await GoogleSignin.signOut();
      console.log('GoogleSignIn: Llamando a GoogleSignin.signIn()...');
      const result = await GoogleSignin.signIn();
      console.log('GoogleSignIn: Resultado obtenido:', result ? 'Éxito' : 'Falló');
      const res: any = result;
      let idToken = undefined;
      let user = undefined;
      if (res && res.idToken && res.user) {
        idToken = res.idToken;
        user = res.user;
        console.log('GoogleSignIn: Usando versión clásica');
      } else if (res && res.data && res.data.idToken && res.data.user) {
        idToken = res.data.idToken;
        user = res.data.user;
        console.log('GoogleSignIn: Usando versión con .data');
      } else if (res && res.type === 'success' && res.data) {
        idToken = res.data.idToken;
        user = res.data.user;
        console.log('GoogleSignIn: Usando versión con .type');
      } else {
        console.log('GoogleSignIn: No se pudo obtener datos válidos del resultado');
        setLoading(false);
        Alert.alert('Error', 'No se pudo obtener los datos de Google. Actualiza la app o revisa la configuración.');
        return;
      }
      console.log('GoogleSignIn: Autenticando con Firebase...');
      // Usar GoogleAuthProvider directamente
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await (await getAuthInstanceAsync()).signInWithCredential(googleCredential);
      console.log('GoogleSignIn: Autenticación con Firebase exitosa');
      console.log('GoogleSignIn: Guardando sesión...');
      await AuthService.saveUserSession(userCredential.user, userCredential.user.phoneNumber || '');
      console.log('GoogleSignIn: Consultando rol existente en Supabase...');
      let userRole = await getUserRoleFromSupabase(userCredential.user.uid);
      if (!userRole) {
        console.log('GoogleSignIn: Usuario nuevo, permitiendo selección de tipo...');
        userRole = 'user';
        console.log('GoogleSignIn: Asignando tipo por defecto:', userRole);
      } else {
        console.log('GoogleSignIn: Rol existente encontrado:', userRole);
      }
      
      // Sincronizar con Supabase en lugar de usar Firebase
      console.log('GoogleSignIn: Sincronizando con Supabase...');
      const syncResult = await syncUserWithSupabase(userCredential.user);
      if (syncResult) {
        console.log('GoogleSignIn: Usuario sincronizado con Supabase exitosamente');
      } else {
        console.warn('GoogleSignIn: Error sincronizando con Supabase');
      }
      
      await AsyncStorage.setItem('userType', userRole);
      console.log('GoogleSignIn: userType establecido como', `"${userRole}"`);
      console.log('GoogleSignIn: Sesión y perfil guardados exitosamente');
      setLoading(false);
      if (onSuccess) onSuccess(idToken);
      if (onAuthComplete) onAuthComplete();
      console.log('GoogleSignIn: Proceso completado exitosamente');
    } catch (error: any) {
      console.error('GoogleSignIn: Error durante el proceso:', error);
      setLoading(false);
      Alert.alert('Error', error.message || 'Error al iniciar sesión con Google');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.googleButton, loading && styles.disabled]}
      onPress={handleGoogleSignIn}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={styles.innerContainer}>
        <Image source={require('../../assets/images/google_sig.png')} style={styles.googleLogo} />
        <Text style={styles.googleButtonText}>Continuar con Google</Text>
        {loading && <ActivityIndicator style={{ marginLeft: 8 }} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 8,
    marginBottom: 8,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: 12,
    resizeMode: 'contain',
  },
  googleButtonText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
}); 