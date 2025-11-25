import AppHeader from '@/components/AppHeader';
import { useUser } from '@/contexts/UserContext'; // Importar el hook
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function UserPerfilScreen() {
  const router = useRouter();
  const { name, email, phone } = useUser(); // Obtener datos del contexto

  const handleEdit = () => {
    router.push('/user/user_perfil_edit');
  };

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Perfil del usuario" />

      <View style={styles.infoBox}>
        <Text style={styles.label}>Nombre:</Text>
        <Text style={styles.value}>{name || 'No disponible'}</Text>

        <Text style={styles.label}>Correo:</Text>
        <Text style={styles.value}>{email || 'No disponible'}</Text>

        <Text style={styles.label}>Teléfono:</Text>
        <Text style={styles.value}>{phone || 'No disponible'}</Text>

        {/* <Text style={styles.label}>Rol:</Text>
        <Text style={styles.value}>user</Text> */}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleEdit}>
        <Text style={styles.buttonText}>Editar Perfil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.driverButton} onPress={() => router.push('/register/driver')}>
        <Text style={styles.driverButtonText}>¿Quieres ser conductor? Hazte conductor</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  driverButton: {
    backgroundColor: '#fff',
    borderColor: '#2563EB',
    borderWidth: 2,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  driverButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
