import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { paymentService, PaymentTransaction } from '@/services/paymentService';
import { useAuth } from '@/contexts/AuthContext';

export default function UserPaymentHistoryScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

  useEffect(() => {
    loadTransactionHistory();
  }, []);

  const loadTransactionHistory = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const history = await paymentService.getTransactionHistory(userId);
      setTransactions(history);
    } catch (error) {
      console.error('Error loading transaction history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactionHistory();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#28A745';
      case 'pending':
        return '#FFC107';
      case 'failed':
        return '#DC3545';
      case 'refunded':
        return '#6C757D';
      default:
        return '#6C757D';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'pending':
        return 'Pendiente';
      case 'failed':
        return 'Fallido';
      case 'refunded':
        return 'Reembolsado';
      default:
        return status;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return 'credit-card';
      case 'cash':
        return 'money';
      case 'paypal':
        return 'account-balance-wallet';
      default:
        return 'payment';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransaction = (transaction: PaymentTransaction) => (
    <TouchableOpacity
      key={transaction.id}
      style={styles.transactionCard}
      onPress={() => {
        // Aquí podrías navegar a una pantalla de detalles
        Alert.alert(
          'Detalles de Transacción',
          `ID: ${transaction.id}\nViaje: ${transaction.ride_id}\nMétodo: ${transaction.payment_method}\nEstado: ${getStatusText(transaction.status)}`
        );
      }}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <MaterialIcons
            name={getPaymentMethodIcon(transaction.payment_method)}
            size={24}
            color="#007AFF"
          />
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionAmount}>
              ${transaction.amount.toFixed(2)}
            </Text>
            <Text style={styles.transactionDate}>
              {formatDate(transaction.created_at)}
            </Text>
          </View>
        </View>
        
        <View style={styles.transactionStatus}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(transaction.status) + '20' }
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(transaction.status) }
              ]}
            >
              {getStatusText(transaction.status)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.transactionFooter}>
        <Text style={styles.transactionMethod}>
          {transaction.payment_method === 'card' ? 'Tarjeta' : 
           transaction.payment_method === 'cash' ? 'Efectivo' : 
           transaction.payment_method === 'paypal' ? 'PayPal' : 
           transaction.payment_method}
        </Text>
        {transaction.stripe_payment_intent_id && (
          <Text style={styles.transactionId}>
            ID: {transaction.stripe_payment_intent_id.slice(-8)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const getTotalSpent = () => {
    return transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalTransactions = () => {
    return transactions.filter(t => t.status === 'completed').length;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Pagos</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Resumen */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <MaterialIcons name="account-balance-wallet" size={32} color="#007AFF" />
            <Text style={styles.summaryAmount}>${getTotalSpent().toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Total Gastado</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <MaterialIcons name="receipt" size={32} color="#28A745" />
            <Text style={styles.summaryAmount}>{getTotalTransactions()}</Text>
            <Text style={styles.summaryLabel}>Viajes Pagados</Text>
          </View>
        </View>

        {/* Lista de Transacciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transacciones Recientes</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando transacciones...</Text>
            </View>
          ) : transactions.length > 0 ? (
            transactions.map(renderTransaction)
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No tienes transacciones aún</Text>
              <Text style={styles.emptySubtext}>
                Tus pagos aparecerán aquí después de completar viajes
              </Text>
            </View>
          )}
        </View>

        {/* Información Adicional */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          
          <View style={styles.infoCard}>
            <MaterialIcons name="info" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              Las transacciones se actualizan automáticamente después de cada viaje
            </Text>
          </View>
          
          <View style={styles.infoCard}>
            <MaterialIcons name="security" size={20} color="#28A745" />
            <Text style={styles.infoText}>
              Todas las transacciones están protegidas y verificadas
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#007AFF',
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  summarySection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  transactionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionDetails: {
    marginLeft: 12,
    flex: 1,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  transactionStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionMethod: {
    fontSize: 14,
    color: '#666',
  },
  transactionId: {
    fontSize: 12,
    color: '#999',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
});
