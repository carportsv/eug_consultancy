import AppHeader from '@/components/AppHeader';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function UserAboutScreen() {
  return (
    <View style={styles.container}>
      <AppHeader subtitle="Información de la aplicación" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nombre</Text>
            <Text style={styles.infoValue}>Taxi ZKT</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Versión</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Desarrollador</Text>
            <Text style={styles.infoValue}>carportsv</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Correo de contacto</Text>
            <Text style={styles.infoValue}>carportsv@gmail.com</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Descripción</Text>
            <Text style={styles.infoValue}>
              Esta aplicación fue diseñada para facilitar la búsqueda de transporte en tiempo real, permitiendo a los usuarios gestionar sus viajes, perfiles y configuraciones de manera rápida y eficiente.
            </Text>
          </View>
        </View>
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
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 22,
  },
});
