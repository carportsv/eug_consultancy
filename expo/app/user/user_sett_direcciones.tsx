import AppHeader from '@/components/AppHeader';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function UserSettDireccionesScreen() {
  const router = useRouter();

  const addressOptions = [
    {
      title: 'Editar Casa',
      subtitle: 'Modificar dirección de casa',
      icon: 'home',
      onPress: () => router.push('/user/user_sett_add_home'),
    },
    {
      title: 'Editar Trabajo',
      subtitle: 'Modificar dirección del trabajo',
      icon: 'work',
      onPress: () => router.push('/user/user_sett_add_work'),
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Gestiona tus ubicaciones" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {addressOptions.map((option, index) => (
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
});
