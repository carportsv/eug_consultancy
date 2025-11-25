import AppHeader from '@/components/AppHeader';
import PlaceInput from '@/components/PlaceInput';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function TestInputsScreen() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const styles = {
    container: {
      flex: 0,
      width: '100%',
    },
    description: {
      color: '#1F2937',
      fontSize: 14,
    },
    listView: {
      backgroundColor: '#fff',
      borderColor: '#E5E7EB',
      borderRadius: 8,
      borderWidth: 1,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    powered: {
      display: 'none',
    },
    row: {
      flexDirection: 'row',
      height: 44,
      padding: 13,
    },
    separator: {
      backgroundColor: '#E5E7EB',
      height: 1,
    },
    textInput: {
      backgroundColor: '#F3F4F6',
      borderColor: '#E5E7EB',
      borderRadius: 8,
      borderWidth: 1,
      color: '#1F2937',
      fontSize: 16,
      height: 44,
      paddingHorizontal: 12,
    },
    textInputContainer: {
      backgroundColor: '#fff',
      borderBottomWidth: 0,
      borderTopWidth: 0,
      marginHorizontal: 0,
      paddingHorizontal: 0,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <AppHeader subtitle="Prueba de PlaceInput" />
      <ScrollView style={containerStyle.container}>
        <Text style={containerStyle.title}>Prueba de PlaceInput - API Directa</Text>
        
        <View style={containerStyle.section}>
          <Text style={containerStyle.sectionTitle}>Origen:</Text>
          <PlaceInput
            placeholder="Punto de inicio"
            onPress={(data, details = null) => {
              console.log('Origen seleccionado:', data.description);
              setOrigin(data.description);
            }}
            styles={styles}
            textInputProps={{
              onFocus: () => console.log('Focus en origen'),
            }}
          />
          {origin ? (
            <Text style={containerStyle.selectedText}>Seleccionado: {origin}</Text>
          ) : null}
        </View>

        <View style={containerStyle.section}>
          <Text style={containerStyle.sectionTitle}>Destino:</Text>
          <PlaceInput
            placeholder="Punto de destino"
            onPress={(data, details = null) => {
              console.log('Destino seleccionado:', data.description);
              setDestination(data.description);
            }}
            styles={styles}
            textInputProps={{
              onFocus: () => console.log('Focus en destino'),
            }}
          />
          {destination ? (
            <Text style={containerStyle.selectedText}>Seleccionado: {destination}</Text>
          ) : null}
        </View>

        <View style={containerStyle.infoSection}>
          <Text style={containerStyle.infoTitle}>Información:</Text>
          <Text style={containerStyle.infoText}>• Usando implementación directa de Google Places API</Text>
          <Text style={containerStyle.infoText}>• Búsqueda automática al escribir 3+ caracteres</Text>
          <Text style={containerStyle.infoText}>• Revisa la consola para ver los logs de búsqueda</Text>
          <Text style={containerStyle.infoText}>• Sin dependencia de librerías externas problemáticas</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const containerStyle = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  selectedText: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e8f5e8',
    borderRadius: 5,
    color: '#2d5a2d',
    fontSize: 14,
  },
  infoSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
  },
}); 