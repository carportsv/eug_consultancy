import { useAuth } from '@/contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalDrivers: 0,
    activeRides: 0,
    completedRides: 0,
    monthlyRevenue: 0,
    costData: {
      totalCost: 12.45,
      databaseUsage: 0.8,
      apiCalls: 15420,
      storageUsage: 0.3
    }
  });

  // Simular datos del dashboard
  useEffect(() => {
    setDashboardData({
      totalUsers: 156,
      totalDrivers: 23,
      activeRides: 8,
      completedRides: 342,
      monthlyRevenue: 2847.50,
      costData: {
        totalCost: 12.45,
        databaseUsage: 0.8,
        apiCalls: 15420,
        storageUsage: 0.3
      }
    });
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
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

  const StatCard = ({ icon, value, label, color = '#2563EB', onPress = null }) => (
    <TouchableOpacity 
      style={[styles.statCard, onPress && styles.clickableCard]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <MaterialIcons name={icon} size={32} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const QuickActionCard = ({ title, icon, description, onPress, color = '#2563EB' }) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <MaterialIcons name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Bienvenido, {user?.name || 'Admin'}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Estadísticas principales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Estadísticas Generales</Text>
          <View style={styles.statsGrid}>
            <StatCard 
              icon="people" 
              value={dashboardData.totalUsers} 
              label="Usuarios Totales"
              color="#28a745"
            />
            <StatCard 
              icon="local-taxi" 
              value={dashboardData.totalDrivers} 
              label="Conductores"
              color="#17a2b8"
            />
            <StatCard 
              icon="directions-car" 
              value={dashboardData.activeRides} 
              label="Viajes Activos"
              color="#ffc107"
            />
            <StatCard 
              icon="check-circle" 
              value={dashboardData.completedRides} 
              label="Viajes Completados"
              color="#6f42c1"
            />
          </View>
        </View>

        {/* Monitoreo de Costos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Monitoreo de Costos</Text>
          <View style={styles.costAlert}>
            <MaterialIcons name="info" size={20} color="#ffc107" />
            <Text style={styles.costAlertText}>
              Datos simulados para demostración
            </Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard 
              icon="attach-money" 
              value={`$${dashboardData.costData.totalCost}`} 
              label="Costo Mensual"
              color="#28a745"
              onPress={showCostInfo}
            />
            <StatCard 
              icon="storage" 
              value={`${dashboardData.costData.databaseUsage} GB`} 
              label="Base de Datos"
              color="#17a2b8"
              onPress={showCostInfo}
            />
            <StatCard 
              icon="swap-horiz" 
              value={dashboardData.costData.apiCalls.toLocaleString()} 
              label="Llamadas API"
              color="#ffc107"
              onPress={showCostInfo}
            />
            <StatCard 
              icon="cloud" 
              value={`${dashboardData.costData.storageUsage} GB`} 
              label="Almacenamiento"
              color="#6f42c1"
              onPress={showCostInfo}
            />
          </View>
        </View>

        {/* Acciones Rápidas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Acciones Rápidas</Text>
          <View style={styles.quickActions}>
            <QuickActionCard
              title="Asignar Conductores"
              icon="directions-car"
              description="Gestionar viajes pendientes"
              onPress={() => router.push('/admin/assign-drivers')}
              color="#2563EB"
            />
            <QuickActionCard
              title="Gestionar Usuarios"
              icon="people"
              description="Ver y administrar usuarios"
              onPress={() => Alert.alert('Próximamente', 'Función en desarrollo')}
              color="#28a745"
            />
            <QuickActionCard
              title="Reportes"
              icon="assessment"
              description="Generar reportes y estadísticas"
              onPress={() => Alert.alert('Próximamente', 'Función en desarrollo')}
              color="#ffc107"
            />
            <QuickActionCard
              title="Automatización"
              icon="settings"
              description="Configurar automatizaciones"
              onPress={() => router.push('/admin/automation')}
              color="#6f42c1"
            />
          </View>
        </View>

        {/* Información del Sistema */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Información del Sistema</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • <strong>Usuarios registrados:</strong> {dashboardData.totalUsers}{'\n'}
              • <strong>Conductores activos:</strong> {dashboardData.totalDrivers}{'\n'}
              • <strong>Viajes este mes:</strong> {dashboardData.completedRides}{'\n'}
              • <strong>Ingresos mensuales:</strong> ${dashboardData.monthlyRevenue.toFixed(2)}{'\n'}
              • <strong>Costos de infraestructura:</strong> ${dashboardData.costData.totalCost}
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
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#2563EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
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
  clickableCard: {
    elevation: 4,
    shadowOpacity: 0.15,
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
  costAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  costAlertText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#856404',
  },
  quickActions: {
    gap: 12,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});
