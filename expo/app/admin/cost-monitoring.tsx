import { useAuth } from '@/contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';

export default function CostMonitoring() {
  const router = useRouter();
  const { user } = useAuth();
  const [costData, setCostData] = useState({
    totalCost: 0,
    databaseUsage: 0,
    apiCalls: 0,
    storageUsage: 0
  });

  // Simular datos de costos (en producción, estos vendrían de una API real)
  useEffect(() => {
    // Datos simulados para demostración
    setCostData({
      totalCost: 12.45,
      databaseUsage: 0.8,
      apiCalls: 15420,
      storageUsage: 0.3
    });
  }, []);

  const handleBack = () => {
    router.back();
  };

  const showCostInfo = () => {
    Alert.alert(
      'Información de Costos',
      'Los datos mostrados son simulados para demostración.\n\n' +
      'En producción, estos datos se obtendrían de:\n' +
      '• APIs de Supabase para métricas de uso\n' +
      '• Dashboard de Supabase para costos reales\n' +
      '• Webhooks para actualizaciones en tiempo real\n\n' +
      'Para obtener datos reales, necesitarías configurar la integración con las APIs de Supabase.',
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  const StatCard = ({ icon, value, label, color = '#2563EB' }) => (
    <View style={styles.statCard}>
      <MaterialIcons name={icon} size={32} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Monitoreo de Costos</Text>
        <TouchableOpacity style={styles.infoButton} onPress={showCostInfo}>
          <MaterialIcons name="info" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dashboard de costos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Resumen de Costos</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              icon="attach-money" 
              value={`$${costData.totalCost.toFixed(2)}`} 
              label="Costo Total del Mes"
              color="#28a745"
            />
            <StatCard 
              icon="storage" 
              value={`${costData.databaseUsage} GB`} 
              label="Base de Datos"
              color="#17a2b8"
            />
            <StatCard 
              icon="swap-horiz" 
              value={costData.apiCalls.toLocaleString()} 
              label="Llamadas API"
              color="#ffc107"
            />
            <StatCard 
              icon="cloud" 
              value={`${costData.storageUsage} GB`} 
              label="Almacenamiento"
              color="#6f42c1"
            />
          </View>
        </View>

        {/* Alertas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Alertas de Costos</Text>
          <View style={styles.alertCard}>
            <MaterialIcons name="check-circle" size={24} color="#28a745" />
            <Text style={styles.alertText}>
              ✅ Todos los servicios están dentro de los límites normales
            </Text>
          </View>
        </View>

        {/* Información adicional */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Información</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • Los datos mostrados son simulados para demostración{'\n'}
              • Para datos reales, configura la integración con Supabase{'\n'}
              • Monitorea regularmente para evitar costos inesperados{'\n'}
              • Establece alertas para límites de gasto
            </Text>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Acciones</Text>
          <TouchableOpacity style={styles.actionButton} onPress={showCostInfo}>
            <MaterialIcons name="settings" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Configurar Límites</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={showCostInfo}>
            <MaterialIcons name="refresh" size={20} color="#2563EB" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Actualizar Datos</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#2563EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  infoButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    padding: 16,
    borderRadius: 8,
  },
  alertText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1f2937',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  secondaryButtonText: {
    color: '#2563EB',
  },
});
