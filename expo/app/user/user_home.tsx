import AppHeader from '@/components/AppHeader';
import { RouteGuard } from '@/components/RouteGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { getActiveRide } from '@/services/rideService';
import { getUserData } from '@/services/userFirestore';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function UserHome() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { nick } = useUser();
  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);

  // Función para generar un nombre temporal amigable
  const getFriendlyName = () => {
    // Primera prioridad: usar el nick
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
  };

  // Función reutilizable para consultar viaje activo
  const checkActiveRide = useCallback(async () => {
    try {
      const firebaseUid = await AsyncStorage.getItem('userUID');
      if (!firebaseUid) {
        setHasActiveRide(false);
        setActiveRideId(null);
        return;
      }
      const userData = await getUserData(firebaseUid);
      if (!userData?.id) {
        setHasActiveRide(false);
        setActiveRideId(null);
        return;
      }
      const activeRide = await getActiveRide(userData.id, 'user');
      if (activeRide) {
        setHasActiveRide(true);
        setActiveRideId(activeRide.id);
      } else {
        setHasActiveRide(false);
        setActiveRideId(null);
      }
    } catch (error) {
      console.error('[UserHome] Error checking active ride (Supabase):', error);
    }
  }, []);

  // Check inicial
  useEffect(() => {
    checkActiveRide();
  }, [checkActiveRide]);

  // Recheck cuando vuelve el foco
  useFocusEffect(
    useCallback(() => {
      checkActiveRide();
      return () => {};
    }, [checkActiveRide])
  );

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleActiveRide = async () => {
    if (activeRideId) {
      router.push({ pathname: '/user/user_active_ride', params: { rideId: activeRideId } });
    } else {
      Alert.alert('Sin viaje activo', 'No tienes un viaje activo en este momento.');
    }
  };

  const menuItems = [
    {
      title: 'Solicitar Taxi',
      subtitle: 'Pedir un taxi a tu ubicación',
      icon: 'local-taxi' as const,
      onPress: () => router.push('/user/user_ride'),
    },
    ...(hasActiveRide ? [{
      title: 'Viaje Activo',
      subtitle: 'Ver estado de tu viaje actual',
      icon: 'directions-car' as const,
      onPress: handleActiveRide,
    }] : []),
    {
      title: 'Historial de Viajes',
      subtitle: 'Ver viajes anteriores',
      icon: 'history' as const,
      onPress: () => router.push('/user/user_history'),
    },
    {
      title: 'Registrarse como Conductor',
      subtitle: 'Convierte tu vehículo en una fuente de ingresos',
      icon: 'directions-car' as const,
      onPress: () => router.push('/driver/driver_registration'),
    },
    {
      title: 'Configuración',
      subtitle: 'Ajustar preferencias de la app',
      icon: 'settings' as const,
      onPress: () => router.push('/user/user_settings'),
    },
    {
      title: '🧪 Centro de Testing',
      subtitle: 'Probar notificaciones y sistema en tiempo real',
      icon: 'bug-report' as const,
      onPress: () => router.push('/test'),
    },
    {
      title: 'Cerrar Sesión',
      subtitle: 'Salir de la aplicación',
      icon: 'logout' as const,
      onPress: handleLogout,
      isLogout: true,
    },
  ];

  return (
    <RouteGuard allowedUserTypes={['user']}>
      <View style={styles.container}>
        <AppHeader subtitle={`Hola, ${getFriendlyName()}`} />
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {menuItems.map((item, index) => (
            <View key={index} style={styles.optionContainer}>
              <TouchableOpacity
                style={styles.option}
                onPress={item.onPress}
              >
                <View style={styles.optionLeft}>
                  <MaterialIcons 
                    name={item.icon} 
                    size={24} 
                    color={item.isLogout ? '#E53E3E' : '#2563EB'} 
                  />
                  <View style={styles.optionText}>
                    <Text style={[
                      styles.optionTitle,
                      item.isLogout && styles.logoutTitle
                    ]}>
                      {item.title}
                    </Text>
                    <Text style={[
                      styles.optionSubtitle,
                      item.isLogout && styles.logoutSubtitle
                    ]}>
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
                <MaterialIcons 
                  name="chevron-right" 
                  size={24} 
                  color={item.isLogout ? '#E53E3E' : '#9CA3AF'} 
                />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </RouteGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#2563EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Poppins',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
    fontFamily: 'Poppins',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  optionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 16,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'Poppins',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
    fontFamily: 'Poppins',
  },
  logoutTitle: {
    color: '#E53E3E',
  },
  logoutSubtitle: {
    color: '#E53E3E',
  },
}); 