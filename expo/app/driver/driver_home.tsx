import AppHeader from '@/components/AppHeader';
import { RouteGuard } from '@/components/RouteGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { RideRequest, getActiveRide } from '@/services/rideService';
import { supabase } from '@/services/supabaseClient';
import { PendingNotificationsService, PendingNotification } from '@/services/pendingNotificationsService';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';

export default function DriverHomeScreen() {
  const [pendingNotifications, setPendingNotifications] = useState<PendingNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const router = useRouter();
  const { logout, user } = useAuth();
  const { nick } = useUser();
  const { 
    hasPermission, 
    isAppInForeground, 
    showLocalNotification
  } = useNotifications();

  useEffect(() => {
    const fetchOnMount = async () => {
      await refreshActiveRide();
    };
    fetchOnMount();
  }, [user?.uid]);

  const resolveDriverId = useCallback(async (): Promise<string | null> => {
    try {
      if (!user?.uid) return null;
      // 1) Obtener users.id desde firebase_uid
      const { data: u } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', user.uid)
        .maybeSingle();
      const supabaseUserId = (u?.id as string) || null;
      if (!supabaseUserId) return null;
      // 2) Mapear a drivers.id usando user_id
      const { data: d } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', supabaseUserId)
        .maybeSingle();
      if (d?.id) return d.id as string;
      // 3) Fallback: algunos proyectos antiguos usaban users.id como drivers.id
      return supabaseUserId;
    } catch {
      return null;
    }
  }, [user?.uid]);

  const refreshActiveRide = useCallback(async () => {
    try {
      // Respaldo rápido: si existe en almacenamiento, úsalo
      const stored = await AsyncStorage.getItem('activeRideId');
      if (stored) {
        setActiveRideId(stored);
      }
      // Consultar en BD con drivers.id correcto
      const dId = await resolveDriverId();
      if (!dId) {
        setActiveRideId(null);
        return;
      }
      const active = await getActiveRide(dId, 'driver');
      setActiveRideId(active?.id || null);
    } catch (e) {
      // noop
    }
  }, [resolveDriverId]);

  // Refrescar al volver al Home del driver
  useFocusEffect(
    useCallback(() => {
      refreshActiveRide();
    }, [refreshActiveRide])
  );

  // Cargar notificaciones pendientes
  useEffect(() => {
    if (user?.uid) {
      const loadPendingNotifications = async () => {
        try {
          const notifications = await PendingNotificationsService.getUnreadNotifications(user.uid);
          setPendingNotifications(notifications);
          setUnreadCount(notifications.length);
        } catch (error) {
          console.error('[DriverHome] Error cargando notificaciones pendientes:', error);
        }
      };

      loadPendingNotifications();

      // Suscribirse a nuevas notificaciones
      let subscription: any = null;
      const setupSubscription = async () => {
        try {
          subscription = await PendingNotificationsService.subscribeToNotifications(
            user.uid,
            (newNotification) => {
              console.log('[DriverHome] 🔔 Nueva notificación recibida:', newNotification);
              setPendingNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);
              
              // Mostrar notificación local con sonido
              showLocalNotification(
                newNotification.title,
                newNotification.body,
                newNotification.data
              );
            }
          );
        } catch (error) {
          console.error('[DriverHome] Error configurando suscripción a notificaciones:', error);
        }
      };

      setupSubscription();

      return () => {
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
        }
      };
    }
  }, [user?.uid, showLocalNotification]);

  // (debug removido)

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Función para generar un nombre temporal amigable
  const getFriendlyName = () => {
    // Primera prioridad: usar el nick del contexto de usuario
    if (nick?.trim()) {
      return nick;
    }
    // Segunda prioridad: usar el email del usuario
    if (user?.email?.trim()) {
      return user.email.split('@')[0];
    }
    // Tercera prioridad: usar el número de teléfono
    if (user?.phoneNumber) {
      const lastDigits = user.phoneNumber.slice(-4);
      return `Conductor ${lastDigits}`;
    }
    return 'Conductor';
  };



  const menuItems = [
    {
      title: 'Solicitudes',
      subtitle: `Ver solicitudes de viajes pendientes${unreadCount > 0 ? ` (${unreadCount} nuevas)` : ''}`,
      icon: 'assignment',
      onPress: () => router.push('/driver/driver_requests'),
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      title: 'Disponibilidad',
      subtitle: 'Activar o desactivar disponibilidad',
      icon: 'toggle-on',
      onPress: () => router.push('/driver/driver_availability'),
    },
    activeRideId
      ? {
          title: 'Viaje Activo',
          subtitle: 'Gestionar viaje en curso',
          icon: 'directions-car',
          onPress: () => router.push({ pathname: '/driver/driver_ride', params: { rideId: activeRideId } }),
        }
      : null,
    {
      title: 'Historial de Viajes',
      subtitle: 'Ver viajes completados',
      icon: 'history',
      onPress: () => router.push('/driver/driver_history'),
    },
    {
      title: 'Configuración',
      subtitle: 'Ajustar preferencias de la app',
      icon: 'settings',
      onPress: () => router.push('/driver/driver_settings'),
    },
    {
      title: 'Cerrar Sesión',
      subtitle: 'Salir de la aplicación',
      icon: 'logout',
      onPress: handleLogout,
    },
  ];

  return (
    <RouteGuard allowedUserTypes={['driver']}>
      <View style={styles.container}>
        <AppHeader subtitle="Inicio del Conductor" />
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Estado de notificaciones removido */}

          {/* Saludo personalizado */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>¡Hola, {getFriendlyName()}!</Text>
            <Text style={styles.welcomeSubtitle}>
              Bienvenido a tu panel de control. Aquí puedes gestionar tus viajes y configuraciones.
            </Text>
          </View>



          {/* Menú principal */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
            {menuItems.filter(Boolean).map((item: any, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemContent}>
                  <MaterialIcons name={item.icon as any} size={24} color="#007AFF" />
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  logoutTitle: {
    color: '#E53E3E',
  },
  logoutSubtitle: {
    color: '#E53E3E',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#555555',
  },
  statusText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
  },
  notificationStatus: {
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  notificationStatusText: {
    fontSize: 14,
    color: '#333',
  },
  welcomeSection: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },

  menuSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    marginLeft: 12,
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
