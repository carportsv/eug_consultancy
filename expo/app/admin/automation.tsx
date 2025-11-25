import { useAuth } from '@/contexts/AuthContext';
import { AutomationService, AutomationStatus, CleanupResult, DatabaseStats } from '@/services/automationService';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AutomationAdmin() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus>({
    isRunning: false,
    schedules: [],
    activeTasks: 0,
  });
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats>({
    users: 0,
    drivers: 0,
    rideRequests: 0,
    rideHistory: 0,
    notifications: 0,
    estimatedSpace: 0,
    usagePercentage: 0,
  });
  const [autoCleanup, setAutoCleanup] = useState(true);
  const [autoOptimization, setAutoOptimization] = useState(true);
  const [autoMonitoring, setAutoMonitoring] = useState(true);

  useEffect(() => {
    loadAutomationStatus();
    loadDatabaseStats();
  }, []);

  const loadAutomationStatus = async () => {
    try {
      const status = await AutomationService.getAutomationStatus();
      setAutomationStatus(status);
    } catch (error) {
      console.error('Error cargando estado de automatización:', error);
    }
  };

  const loadDatabaseStats = async () => {
    try {
      setLoading(true);
      const stats = await AutomationService.getDatabaseStats();
      setDatabaseStats(stats);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAutomation = async () => {
    try {
      Alert.alert(
        'Iniciar Automatización',
        '¿Estás seguro de que quieres iniciar la automatización?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar',
            onPress: async () => {
              setLoading(true);
              const success = await AutomationService.startAutomation();
              if (success) {
                setAutomationStatus(prev => ({ ...prev, isRunning: true }));
                Alert.alert('Éxito', 'Automatización iniciada correctamente');
              } else {
                Alert.alert('Error', 'No se pudo iniciar la automatización');
              }
              setLoading(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error iniciando automatización:', error);
      Alert.alert('Error', 'No se pudo iniciar la automatización');
    }
  };

  const handleStopAutomation = async () => {
    try {
      Alert.alert(
        'Detener Automatización',
        '¿Estás seguro de que quieres detener la automatización?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Detener',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              const success = await AutomationService.stopAutomation();
              if (success) {
                setAutomationStatus(prev => ({ ...prev, isRunning: false }));
                Alert.alert('Éxito', 'Automatización detenida correctamente');
              } else {
                Alert.alert('Error', 'No se pudo detener la automatización');
              }
              setLoading(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error deteniendo automatización:', error);
      Alert.alert('Error', 'No se pudo detener la automatización');
    }
  };

  const handleManualCleanup = async () => {
    try {
      Alert.alert(
        'Limpieza Manual',
        '¿Estás seguro de que quieres ejecutar la limpieza manual?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ejecutar',
            onPress: async () => {
              setLoading(true);
              const result: CleanupResult = await AutomationService.executeManualCleanup();
              if (result.success) {
                await loadDatabaseStats(); // Recargar estadísticas
                Alert.alert(
                  'Limpieza Completada',
                  `Se liberaron ${result.spaceFreed.toFixed(2)} MB de espacio.\n\n` +
                  `• Viajes eliminados: ${result.ridesDeleted}\n` +
                  `• Usuarios eliminados: ${result.usersDeleted}\n` +
                  `• Notificaciones eliminadas: ${result.notificationsDeleted}\n` +
                  `• Ubicaciones limpiadas: ${result.locationsCleared}`
                );
              } else {
                Alert.alert('Error', `No se pudo completar la limpieza: ${result.error}`);
              }
              setLoading(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error en limpieza manual:', error);
      Alert.alert('Error', 'No se pudo ejecutar la limpieza manual');
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage > 80) return '#E53E3E'; // Rojo
    if (percentage > 60) return '#D69E2E'; // Amarillo
    return '#38A169'; // Verde
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage > 80) return 'Crítico';
    if (percentage > 60) return 'Moderado';
    return 'Saludable';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando automatización...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Automatización</Text>
      </View>

      <View style={styles.content}>
        {/* Estado de Automatización */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado de Automatización</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Estado:</Text>
              <View style={styles.statusIndicator}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: automationStatus.isRunning ? '#38A169' : '#E53E3E' }
                ]} />
                <Text style={styles.statusText}>
                  {automationStatus.isRunning ? 'Activa' : 'Inactiva'}
                </Text>
              </View>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Tareas activas:</Text>
              <Text style={styles.statusValue}>{automationStatus.activeTasks}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Programaciones:</Text>
              <Text style={styles.statusValue}>{automationStatus.schedules.length}</Text>
            </View>
          </View>
        </View>

        {/* Estadísticas de Base de Datos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estadísticas de Base de Datos</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{databaseStats.users}</Text>
              <Text style={styles.statLabel}>Usuarios</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{databaseStats.drivers}</Text>
              <Text style={styles.statLabel}>Conductores</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{databaseStats.rideRequests}</Text>
              <Text style={styles.statLabel}>Viajes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{databaseStats.rideHistory}</Text>
              <Text style={styles.statLabel}>Historial</Text>
            </View>
          </View>
        </View>

        {/* Uso de Espacio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uso de Espacio</Text>
          <View style={styles.usageCard}>
            <View style={styles.usageBar}>
              <View 
                style={[
                  styles.usageFill, 
                  { 
                    width: `${Math.min(databaseStats.usagePercentage, 100)}%`,
                    backgroundColor: getUsageColor(databaseStats.usagePercentage)
                  }
                ]} 
              />
            </View>
            <View style={styles.usageInfo}>
              <Text style={styles.usageText}>
                {databaseStats.estimatedSpace.toFixed(2)} MB / 500 MB
              </Text>
              <Text style={[
                styles.usageStatus,
                { color: getUsageColor(databaseStats.usagePercentage) }
              ]}>
                {getUsageStatus(databaseStats.usagePercentage)}
              </Text>
            </View>
          </View>
        </View>

        {/* Configuración */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          <View style={styles.configCard}>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Limpieza Automática</Text>
              <Switch
                value={autoCleanup}
                onValueChange={setAutoCleanup}
                trackColor={{ false: '#767577', true: '#2563EB' }}
                thumbColor={autoCleanup ? '#fff' : '#f4f3f4'}
              />
            </View>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Optimización de Imágenes</Text>
              <Switch
                value={autoOptimization}
                onValueChange={setAutoOptimization}
                trackColor={{ false: '#767577', true: '#2563EB' }}
                thumbColor={autoOptimization ? '#fff' : '#f4f3f4'}
              />
            </View>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Monitoreo Automático</Text>
              <Switch
                value={autoMonitoring}
                onValueChange={setAutoMonitoring}
                trackColor={{ false: '#767577', true: '#2563EB' }}
                thumbColor={autoMonitoring ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          <View style={styles.actionsContainer}>
            {automationStatus.isRunning ? (
              <TouchableOpacity style={[styles.actionButton, styles.stopButton]} onPress={handleStopAutomation}>
                <MaterialIcons name="stop" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Detener Automatización</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.actionButton, styles.startButton]} onPress={handleStartAutomation}>
                <MaterialIcons name="play-arrow" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Iniciar Automatización</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={[styles.actionButton, styles.cleanupButton]} onPress={handleManualCleanup}>
              <MaterialIcons name="cleaning-services" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Limpieza Manual</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.refreshButton]} onPress={loadDatabaseStats}>
              <MaterialIcons name="refresh" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Actualizar Estadísticas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Información */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • La automatización se ejecuta automáticamente según la programación configurada
            </Text>
            <Text style={styles.infoText}>
              • La limpieza semanal elimina datos antiguos automáticamente
            </Text>
            <Text style={styles.infoText}>
              • El monitoreo diario genera reportes de uso
            </Text>
            <Text style={styles.infoText}>
              • Las imágenes se optimizan automáticamente al subirse
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#2563EB',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
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
    padding: 20,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  usageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  usageBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  usageFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  usageStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  configCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  configLabel: {
    fontSize: 16,
    color: '#333',
  },
  actionsContainer: {
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  startButton: {
    backgroundColor: '#38A169',
  },
  stopButton: {
    backgroundColor: '#E53E3E',
  },
  cleanupButton: {
    backgroundColor: '#D69E2E',
  },
  refreshButton: {
    backgroundColor: '#2563EB',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
}); 