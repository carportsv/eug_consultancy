import { useAuth } from '@/contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function UserTypeSelection() {
  const router = useRouter();
  const { setUserType } = useAuth();

  const handleUserTypeSelection = async (type: 'user' | 'driver' | 'admin') => {
    try {
      await setUserType(type);
      
      // Redirigir según el tipo seleccionado
      switch (type) {
        case 'user':
          router.replace('/user/user_home');
          break;
        case 'driver':
          router.replace('/driver/driver_home');
          break;
        case 'admin':
          router.replace('/admin/admin_home');
          break;
      }
    } catch (error) {
      console.error('Error setting user type:', error);
    }
  };

  const userTypes = [
    {
      type: 'user' as const,
      title: 'Usuario',
      subtitle: 'Solicitar viajes en taxi',
      icon: 'person',
      color: '#2563EB',
      description: 'Perfecto para solicitar viajes y gestionar tu cuenta de usuario.'
    },
    {
      type: 'driver' as const,
      title: 'Conductor',
      subtitle: 'Ofrecer servicios de taxi',
      icon: 'local-taxi',
      color: '#059669',
      description: 'Ideal para conductores que quieren ofrecer servicios de transporte.'
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>cuzcatlansv.ride</Text>
        <Text style={styles.headerSubtitle}>Selecciona tu tipo de cuenta</Text>
      </View>

      <View style={styles.content}>
        {userTypes.map((userType, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionContainer}
            onPress={() => handleUserTypeSelection(userType.type)}
          >
            <View style={styles.optionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: userType.color }]}>
                <MaterialIcons name={userType.icon as any} size={32} color="#fff" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{userType.title}</Text>
                <Text style={styles.optionSubtitle}>{userType.subtitle}</Text>
              </View>
            </View>
            <Text style={styles.optionDescription}>{userType.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
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
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  optionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  optionDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
}); 