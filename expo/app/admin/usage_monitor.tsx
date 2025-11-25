import AppHeader from '@/components/AppHeader';
import { realtimeService } from '@/services/realtimeService';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SystemStats {
  activeConnections: number;
  maxConnections: number;
  pollingUsers: number;
  totalUsers: number;
  connectionUsage: number;
  efficiency: string;
}

export default function UsageMonitorScreen() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadStats = () => {
    const currentStats = realtimeService.realtimeManager.getStats();
    const connectionUsage = (currentStats.activeConnections / currentStats.maxConnections) * 100;
    
    const efficiency = connectionUsage > 80 ? 'Alto' : connectionUsage > 50 ? 'Medio' : 'Bajo';
    
    setStats({
      ...currentStats,
      connectionUsage: Math.round(connectionUsage),
      efficiency
    });
    setLastUpdate(new Date());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadStats();
    setRefreshing(false);
  };

  useEffect(() => {
    loadStats();
    
    // Actualizar cada 5 segundos
    const interval = setInterval(loadStats, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (usage: number) => {
    if (usage >= 80) return '#F44336'; // Rojo - Crítico
    if (usage >= 60) return '#FF9800'; // Naranja - Advertencia
    return '#4CAF50'; // Verde - Normal
  };

  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'Alto': return '#F44336';
      case 'Medio': return '#FF9800';
      case 'Bajo': return '#4CAF50';
      default: return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader subtitle="Monitoreo del Sistema Híbrido" />
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Tarjeta de Resumen */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialIcons name="analytics" size={24} color="#2563EB" />
            <Text style={styles.summaryTitle}>Resumen del Sistema</Text>
          </View>
          
          {stats && (
            <View style={styles.summaryStats}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Conexiones Activas:</Text>
                <Text style={styles.statValue}>
                  {stats.activeConnections} / {stats.maxConnections}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Usuarios con Polling:</Text>
                <Text style={styles.statValue}>{stats.pollingUsers}</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total de Usuarios:</Text>
                <Text style={styles.statValue}>{stats.totalUsers}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Tarjeta de Uso de Conexiones */}
        {stats && (
          <View style={styles.usageCard}>
            <View style={styles.usageHeader}>
              <MaterialIcons name="wifi" size={24} color="#2563EB" />
              <Text style={styles.usageTitle}>Uso de Conexiones Realtime</Text>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${stats.connectionUsage}%`,
                      backgroundColor: getStatusColor(stats.connectionUsage)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{stats.connectionUsage}%</Text>
            </View>
            
            <View style={styles.usageDetails}>
              <View style={styles.usageItem}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(stats.connectionUsage) }]} />
                <Text style={styles.usageText}>
                  {stats.connectionUsage >= 80 ? 'Crítico' : 
                   stats.connectionUsage >= 60 ? 'Advertencia' : 'Normal'}
                </Text>
              </View>
              
              <View style={styles.usageItem}>
                <MaterialIcons name="speed" size={16} color="#666" />
                <Text style={styles.usageText}>
                  Eficiencia: <Text style={{ color: getEfficiencyColor(stats.efficiency) }}>
                    {stats.efficiency}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Tarjeta de Estrategias */}
        <View style={styles.strategyCard}>
          <View style={styles.strategyHeader}>
            <MaterialIcons name="settings" size={24} color="#2563EB" />
            <Text style={styles.strategyTitle}>Estrategias Activas</Text>
          </View>
          
          <View style={styles.strategyList}>
            <View style={styles.strategyItem}>
              <MaterialIcons name="flash-on" size={20} color="#4CAF50" />
              <View style={styles.strategyInfo}>
                <Text style={styles.strategyName}>Realtime (Alta Prioridad)</Text>
                <Text style={styles.strategyDesc}>
                  Usuarios en viaje activo y conductores con viaje en curso
                </Text>
              </View>
              <Text style={styles.strategyCount}>
                {stats?.activeConnections || 0}
              </Text>
            </View>
            
            <View style={styles.strategyItem}>
              <MaterialIcons name="schedule" size={20} color="#FF9800" />
              <View style={styles.strategyInfo}>
                <Text style={styles.strategyName}>Polling Frecuente (Media Prioridad)</Text>
                <Text style={styles.strategyDesc}>
                  Conductores disponibles y usuarios buscando taxi
                </Text>
              </View>
              <Text style={styles.strategyCount}>
                {stats?.pollingUsers || 0}
              </Text>
            </View>
            
            <View style={styles.strategyItem}>
              <MaterialIcons name="timer" size={20} color="#9E9E9E" />
              <View style={styles.strategyInfo}>
                <Text style={styles.strategyName}>Polling Ocasional (Baja Prioridad)</Text>
                <Text style={styles.strategyDesc}>
                  Usuarios inactivos y en segundo plano
                </Text>
              </View>
              <Text style={styles.strategyCount}>
                {stats ? Math.max(0, stats.totalUsers - stats.activeConnections - stats.pollingUsers) : 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Tarjeta de Información */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <MaterialIcons name="info" size={24} color="#2563EB" />
            <Text style={styles.infoTitle}>Información del Sistema</Text>
          </View>
          
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.infoText}>
                Sistema híbrido funcionando correctamente
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialIcons name="wifi-tethering" size={16} color="#2563EB" />
              <Text style={styles.infoText}>
                Límite gratuito: 2 conexiones simultáneas
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialIcons name="sync" size={16} color="#FF9800" />
              <Text style={styles.infoText}>
                Polling: 3-10 segundos según prioridad
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <MaterialIcons name="update" size={16} color="#666" />
              <Text style={styles.infoText}>
                Última actualización: {lastUpdate.toLocaleTimeString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Botón de Rebalanceo */}
        <TouchableOpacity 
          style={styles.rebalanceButton}
          onPress={async () => {
            await realtimeService.realtimeManager.rebalanceConnections();
            loadStats();
          }}
        >
          <MaterialIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.rebalanceButtonText}>Rebalancear Conexiones</Text>
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
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
    fontFamily: 'Poppins',
  },
  summaryStats: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins',
  },
  usageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  usageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
    fontFamily: 'Poppins',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins',
  },
  usageDetails: {
    gap: 8,
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  usageText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins',
  },
  strategyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  strategyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
    fontFamily: 'Poppins',
  },
  strategyList: {
    gap: 16,
  },
  strategyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strategyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  strategyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Poppins',
  },
  strategyDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'Poppins',
  },
  strategyCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    fontFamily: 'Poppins',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
    fontFamily: 'Poppins',
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
  rebalanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  rebalanceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
    fontFamily: 'Poppins',
  },
}); 