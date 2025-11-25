import { useAuth } from '@/contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdminHome() {
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const menuItems = [
    {
      title: 'Dashboard',
      icon: 'dashboard',
      onPress: () => router.push('/admin/dashboard'),
    },
    {
      title: 'Usuarios',
      icon: 'people',
      onPress: () => console.log('Usuarios'),
    },
    {
      title: 'Conductores',
      icon: 'local-taxi',
      onPress: () => router.push('/admin/drivers_admin'),
    },
    {
      title: 'Asignar Conductores',
      icon: 'directions-car',
      onPress: () => router.push('/admin/assign-drivers'),
    },
    {
      title: 'Reportes',
      icon: 'assessment',
      onPress: () => console.log('Reportes'),
    },
    {
      title: 'Automatización',
      icon: 'settings',
      onPress: () => router.push('/admin/automation'),
    },
    {
      title: 'Cerrar Sesión',
      icon: 'logout',
      onPress: handleLogout,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel de Administrador</Text>
        <Text style={styles.headerSubtitle}>Bienvenido, {user?.name || 'Admin'}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.grid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.iconButton,
                item.title === 'Cerrar Sesión' && styles.logoutButton
              ]}
              onPress={item.onPress}
            >
              <MaterialIcons 
                name={item.icon as any} 
                size={48} 
                color={item.title === 'Cerrar Sesión' ? '#E53E3E' : '#2563EB'} 
              />
              <Text style={[
                styles.iconText,
                item.title === 'Cerrar Sesión' && { color: '#E53E3E' }
              ]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: '48%',
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#FFF0F0',
  },
});
