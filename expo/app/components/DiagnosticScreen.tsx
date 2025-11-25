import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { testSupabaseConnection, checkSupabaseConfig } from '@/services/supabaseClient';
import { initFirebaseAsync } from '@/services/firebaseConfig';

interface DiagnosticResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function DiagnosticScreen() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    const newResults: DiagnosticResult[] = [];

    // 1. Verificar configuración de Supabase
    console.log('🔍 Verificando configuración de Supabase...');
    const supabaseConfig = checkSupabaseConfig();
    
    if (supabaseConfig.isValid) {
      newResults.push({
        name: 'Configuración Supabase',
        status: 'success',
        message: 'Variables de entorno configuradas correctamente',
      });
    } else {
      newResults.push({
        name: 'Configuración Supabase',
        status: 'error',
        message: 'Problemas en la configuración',
        details: supabaseConfig.issues.join(', '),
      });
    }
    setResults([...newResults]);

    // 2. Verificar configuración de Firebase
    console.log('🔍 Verificando configuración de Firebase...');
    try {
      const firebaseConfig = {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      };

      const missingKeys = Object.entries(firebaseConfig)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

      if (missingKeys.length === 0) {
        newResults.push({
          name: 'Configuración Firebase',
          status: 'success',
          message: 'Variables de entorno configuradas correctamente',
        });
      } else {
        newResults.push({
          name: 'Configuración Firebase',
          status: 'error',
          message: 'Variables de entorno faltantes',
          details: missingKeys.join(', '),
        });
      }
    } catch (error) {
      newResults.push({
        name: 'Configuración Firebase',
        status: 'error',
        message: 'Error verificando configuración',
        details: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
    setResults([...newResults]);

    // 3. Probar conexión a Supabase
    console.log('🔍 Probando conexión a Supabase...');
    newResults.push({
      name: 'Conexión Supabase',
      status: 'pending',
      message: 'Probando conexión...',
    });
    setResults([...newResults]);

    try {
      const isConnected = await testSupabaseConnection(15000); // 15 segundos de timeout
      
      const connectionResult = newResults.find(r => r.name === 'Conexión Supabase');
      if (connectionResult) {
        connectionResult.status = isConnected ? 'success' : 'error';
        connectionResult.message = isConnected 
          ? 'Conexión exitosa' 
          : 'Error de conexión (timeout o error de red)';
      }
    } catch (error) {
      const connectionResult = newResults.find(r => r.name === 'Conexión Supabase');
      if (connectionResult) {
        connectionResult.status = 'error';
        connectionResult.message = 'Error inesperado';
        connectionResult.details = error instanceof Error ? error.message : 'Error desconocido';
      }
    }
    setResults([...newResults]);

    // 4. Probar inicialización de Firebase
    console.log('🔍 Probando inicialización de Firebase...');
    newResults.push({
      name: 'Inicialización Firebase',
      status: 'pending',
      message: 'Inicializando...',
    });
    setResults([...newResults]);

    try {
      await initFirebaseAsync();
      const firebaseResult = newResults.find(r => r.name === 'Inicialización Firebase');
      if (firebaseResult) {
        firebaseResult.status = 'success';
        firebaseResult.message = 'Firebase inicializado correctamente';
      }
    } catch (error) {
      const firebaseResult = newResults.find(r => r.name === 'Inicialización Firebase');
      if (firebaseResult) {
        firebaseResult.status = 'error';
        firebaseResult.message = 'Error inicializando Firebase';
        firebaseResult.details = error instanceof Error ? error.message : 'Error desconocido';
      }
    }
    setResults([...newResults]);

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pending':
        return <ActivityIndicator size={16} color="#2563EB" />;
      case 'success':
        return <MaterialIcons name="check-circle" size={16} color="#10b981" />;
      case 'error':
        return <MaterialIcons name="error" size={16} color="#ef4444" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pending':
        return '#2563EB';
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔧 Diagnóstico del Sistema</Text>
        <Text style={styles.subtitle}>Verificando configuración y conexiones</Text>
      </View>

      <View style={styles.content}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              {getStatusIcon(result.status)}
              <Text style={[styles.resultName, { color: getStatusColor(result.status) }]}>
                {result.name}
              </Text>
            </View>
            <Text style={styles.resultMessage}>{result.message}</Text>
            {result.details && (
              <Text style={styles.resultDetails}>{result.details}</Text>
            )}
          </View>
        ))}

        {results.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Ejecutando diagnósticos...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.retryButton, isRunning && styles.retryButtonDisabled]}
          onPress={runDiagnostics}
          disabled={isRunning}
        >
          <MaterialIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>
            {isRunning ? 'Ejecutando...' : 'Ejecutar Diagnósticos'}
          </Text>
        </TouchableOpacity>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>💡 Soluciones Comunes:</Text>
          <Text style={styles.helpText}>
            • Verifica que el archivo .env esté configurado correctamente
          </Text>
          <Text style={styles.helpText}>
            • Asegúrate de tener conexión a internet
          </Text>
          <Text style={styles.helpText}>
            • Reinicia la aplicación después de cambiar variables de entorno
          </Text>
          <Text style={styles.helpText}>
            • Verifica que las claves de Supabase y Firebase sean válidas
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    fontFamily: 'Poppins',
  },
  content: {
    padding: 16,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  resultMessage: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins',
  },
  resultDetails: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    fontFamily: 'Poppins',
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    fontFamily: 'Poppins',
  },
  retryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  retryButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  helpSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    fontFamily: 'Poppins',
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontFamily: 'Poppins',
  },
});
