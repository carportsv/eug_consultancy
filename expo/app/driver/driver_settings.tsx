import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function DriverSettings(): React.JSX.Element {
  const { setUserType } = useAuth();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const settingsOptions = [
    {
      title: 'Notificaciones',
      subtitle: 'Recibir notificaciones de viajes',
      icon: 'notifications',
      type: 'switch',
      value: notificationsEnabled,
      onValueChange: setNotificationsEnabled,
    },
    {
      title: 'Editar Perfil',
      subtitle: 'Modificar información personal',
      icon: 'person',
      type: 'navigate',
      onPress: () => router.push('/driver/driver_profile'),
    },
    {
      title: 'Información del Vehículo',
      subtitle: 'Gestionar datos del carro',
      icon: 'directions-car',
      type: 'navigate',
      onPress: () => router.push('/driver/driver_vehicle'),
    },
  ];

  const handleBecomeUser = async () => {
    Alert.alert(
      'Cambiar a Usuario',
      '¿Cambiar al modo usuario? Se cerrará el panel de conductor.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cambiar', onPress: async () => { await setUserType('user'); router.replace('/user/user_home'); } }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Ajusta tus preferencias" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {settingsOptions.map((option, index) => (
          <View key={index} style={styles.optionContainer}>
            <TouchableOpacity
              style={styles.option}
              onPress={option.type === 'navigate' ? option.onPress : undefined}
              disabled={option.type === 'switch'}
            >
              <View style={styles.optionLeft}>
                <MaterialIcons name={option.icon as any} size={24} color="#2563EB" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              {option.type === 'switch' ? (
                <Switch
                  value={option.value}
                  onValueChange={option.onValueChange}
                  trackColor={{ false: '#767577', true: '#2563EB' }}
                  thumbColor={option.value ? '#fff' : '#f4f3f4'}
                />
              ) : (
                <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.userButton} onPress={handleBecomeUser}>
          <MaterialIcons name="person" size={24} color="#fff" />
          <Text style={styles.userButtonText}>Cambiar a modo Usuario</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, padding: 16 },
  scrollContent: { paddingBottom: 20 },
  optionContainer: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  optionText: { marginLeft: 16, flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  optionSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  userButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', borderRadius: 12, paddingVertical: 16, marginTop: 16, marginBottom: 24, elevation: 2 },
  userButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 12 },
});
 