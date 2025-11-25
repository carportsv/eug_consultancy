import { AppReadyProvider, useAppReady } from '@/contexts/AppReadyContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { StripeProvider } from '@stripe/stripe-react-native'; // Temporarily disabled
import SplashVideo from './components/SplashVideo';

// Mantener la splash screen visible mientras se carga la app
SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const { appIsReady, setAppIsReady } = useAppReady();
  const [showVideo, setShowVideo] = useState(true);

  useEffect(() => {
    console.log('[Layout] Iniciando preparación de la app...');
    async function prepare() {
      try {
        // Reducir tiempo de carga de 3 segundos a 1 segundo
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('[Layout] Preparación completada, marcando app como lista');
        setAppIsReady(true);
      } catch (e) {
        console.warn('[Layout] Error en preparación:', e);
        setAppIsReady(true); // Marcar como lista incluso si hay error
      }
    }

    prepare();
  }, []);

  const handleVideoEnd = () => {
    console.log('[Layout] Video terminado, ocultando splash');
    setShowVideo(false);
    SplashScreen.hideAsync();
  };

  console.log('[Layout] Render:', { showVideo, appIsReady });

  if (showVideo) {
    return <SplashVideo onVideoEnd={handleVideoEnd} />;
  }

  if (!appIsReady) {
    console.log('[Layout] App no está lista, mostrando null');
    return null; // Mantener la splash screen visible
  }

  console.log('[Layout] App lista, renderizando stack');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* StripeProvider temporarily disabled */}
        <AuthProvider>
          <UserProvider>
            <NotificationProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register/user" />
                <Stack.Screen name="register/driver" />
                <Stack.Screen name="register/admin" />
                <Stack.Screen name="driver/driver_availability" />
                <Stack.Screen name="driver/driver_ride" />
                <Stack.Screen name="driver/driver_home" />
                <Stack.Screen name="driver/driver_requests" />
                <Stack.Screen name="driver/driver_settings" />
                <Stack.Screen name="driver/driver_vehicle" />
                <Stack.Screen name="driver/driver_profile" />
                <Stack.Screen name="driver/driver_history" />
                <Stack.Screen name="driver/driver_registration" />
                <Stack.Screen name="user/user_active_ride" />
                <Stack.Screen name="user/user_drivers" />
                <Stack.Screen name="user/user_history" />
                <Stack.Screen name="user/user_ride_summary" />
                <Stack.Screen name="user/user_home" />
                <Stack.Screen name="user/user_ride" />
                <Stack.Screen name="user/buscando_conductor" />
                <Stack.Screen name="user/user_settings" />
                <Stack.Screen name="user/user_sett_add_home" />
                <Stack.Screen name="user/user_sett_add_work" />
                <Stack.Screen name="user/user_sett_perfil" />
                <Stack.Screen name="user/user_sett_perfil_edit" />
                <Stack.Screen name="user/user_sett_direcciones" />
                <Stack.Screen name="user/user_about" />
                <Stack.Screen name="user/user_payment_methods" />
                <Stack.Screen name="user/user_payment_history" />
                <Stack.Screen name="chat/chat_screen" />
                <Stack.Screen name="admin/admin_home" />
                <Stack.Screen name="admin/dashboard" />
                <Stack.Screen name="admin/assign-drivers" />
                <Stack.Screen name="admin/automation" />
                <Stack.Screen name="admin/cost-monitoring" />
                <Stack.Screen name="test-payment" />
                <Stack.Screen name="diagnostic" />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </NotificationProvider>
          </UserProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppReadyProvider>
      <RootLayoutInner />
    </AppReadyProvider>
  );
}
