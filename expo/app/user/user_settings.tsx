import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function UserSettingsScreen() {
  const router = useRouter();
  const { name, phone, email, nick, home, work } = useUser();
  const { setUserType } = useAuth();

  const settingsOptions = [
    {
      title: 'Editar Perfil',
      subtitle: 'Modificar información personal',
      icon: 'person',
      onPress: () => router.push('/user/user_sett_perfil_edit'),
    },
    {
      title: 'Métodos de Pago',
      subtitle: 'Gestionar tarjetas y métodos de pago',
      icon: 'credit-card',
      onPress: () => router.push('/user/user_payment_methods'),
    },
    {
      title: 'Historial de Pagos',
      subtitle: 'Ver transacciones y facturas',
      icon: 'receipt',
      onPress: () => router.push('/user/user_payment_history'),
    },
    {
      title: 'Direcciones',
      subtitle: 'Gestionar direcciones guardadas',
      icon: 'location-city',
      onPress: () => router.push('/user/user_sett_direcciones'),
    },
    {
      title: 'Ayuda y Soporte',
      subtitle: 'Contactar soporte técnico',
      icon: 'help',
      onPress: () => Alert.alert('Soporte', 'Función en desarrollo'),
    },
    {
      title: 'Acerca de',
      subtitle: 'Información de la aplicación',
      icon: 'info',
      onPress: () => router.push('/user/user_about'),
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Ajusta tus preferencias" />
      
      <View style={styles.profileSection}>
        <View style={styles.profileBox}>
          <View style={styles.avatarBox}>
            <MaterialIcons name="person" size={32} color="#2563EB" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{nick || name?.split(' ')[0] || 'Usuario'}</Text>
            <Text style={styles.profileDetail}>{phone}</Text>
            <Text style={styles.profileDetail}>{email}</Text>
          </View>
        </View>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {settingsOptions.map((option, index) => (
          <View key={index} style={styles.optionContainer}>
            <TouchableOpacity
              style={styles.option}
              onPress={option.onPress}
            >
              <View style={styles.optionLeft}>
                <MaterialIcons name={option.icon as any} size={24} color="#2563EB" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    padding: 12,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
});
