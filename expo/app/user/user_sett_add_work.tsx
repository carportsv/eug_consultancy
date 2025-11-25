import AppHeader from '@/components/AppHeader';
import PlaceInput from '@/components/PlaceInput';
import { useUser } from '@/contexts/UserContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function UserSettAddWorkScreen() {
  const router = useRouter();
  const { work, setUserData } = useUser();
  const [address, setAddress] = useState(work || '');

  const handleSave = () => {
    setUserData({ work: address });
    router.back();
  };

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Agregar dirección del trabajo" />
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Dirección del Trabajo</Text>
        <Text style={styles.subtitle}>
          Agrega tu dirección del trabajo para accesos rápidos
        </Text>

        <PlaceInput
          placeholder="Ingresa tu dirección del trabajo"
          onPress={({ description }) => {
            setAddress(description);
          }}
          value={address}
          onChangeText={setAddress}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <MaterialIcons name="save" size={24} color="#fff" />
          <Text style={styles.saveButtonText}>Guardar Dirección</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});