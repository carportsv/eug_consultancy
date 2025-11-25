import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { supabase } from './supabaseClient';

// Configurar notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Límites del plan gratuito
const FREE_LIMITS = {
  reads: 50000,
  writes: 20000,
  deletes: 20000,
  storage: 1024 * 1024 * 1024, // 1GB en bytes
  transfer: 1024 * 1024 * 1024, // 1GB en bytes
  auth: 10000,
};

// Umbrales de alerta (porcentaje del límite)
const ALERT_THRESHOLDS = {
  warning: 0.7, // 70%
  critical: 0.9, // 90%
  emergency: 0.95, // 95%
};

interface UsageStats {
  date: string;
  reads: number;
  writes: number;
  deletes: number;
  storage: number;
  transfer: number;
  auth: number;
  lastUpdated: string;
}

class UsageMonitor {
  private static instance: UsageMonitor;
  private currentStats: UsageStats | null = null;
  private alertSent: Set<string> = new Set();

  static getInstance(): UsageMonitor {
    if (!UsageMonitor.instance) {
      UsageMonitor.instance = new UsageMonitor();
    }
    return UsageMonitor.instance;
  }

  // Inicializar el monitor
  async initialize() {
    console.log('[UsageMonitor] Inicializando monitor de uso...');
    await this.loadCurrentStats();
    await this.requestNotificationPermissions();
    this.startPeriodicCheck();
  }

  // Solicitar permisos de notificación
  private async requestNotificationPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[UsageMonitor] Permisos de notificación no concedidos');
      }
    } catch (error) {
      console.error('[UsageMonitor] Error al solicitar permisos:', error);
    }
  }

  // Cargar estadísticas actuales desde Supabase
  private async loadCurrentStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('usage_stats')
        .select('*')
        .eq('date', today)
        .single();
      if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
        console.error('[UsageMonitor] Error al cargar estadísticas:', error);
        return;
      }
      if (data) {
        this.currentStats = data as UsageStats;
      } else {
        // Crear estadísticas del día
        this.currentStats = {
          date: today,
          reads: 0,
          writes: 0,
          deletes: 0,
          storage: 0,
          transfer: 0,
          auth: 0,
          lastUpdated: new Date().toISOString(),
        };
        await this.saveStats();
      }
    } catch (error) {
      console.error('[UsageMonitor] Error al cargar estadísticas:', error);
    }
  }

  // Guardar estadísticas en Supabase
  private async saveStats() {
    if (!this.currentStats) return;
    try {
      const { error } = await supabase
        .from('usage_stats')
        .upsert([this.currentStats], { onConflict: 'date' });
      if (error) {
        console.error('[UsageMonitor] Error al guardar estadísticas:', error);
      }
    } catch (error) {
      console.error('[UsageMonitor] Error al guardar estadísticas:', error);
    }
  }

  // Incrementar contador de lecturas
  async incrementReads(count: number = 1) {
    if (!this.currentStats) return;
    this.currentStats.reads += count;
    this.currentStats.lastUpdated = new Date().toISOString();
    await this.saveStats();
    await this.checkLimits('reads');
  }

  // Incrementar contador de escrituras
  async incrementWrites(count: number = 1) {
    if (!this.currentStats) return;
    this.currentStats.writes += count;
    this.currentStats.lastUpdated = new Date().toISOString();
    await this.saveStats();
    await this.checkLimits('writes');
  }

  // Incrementar contador de eliminaciones
  async incrementDeletes(count: number = 1) {
    if (!this.currentStats) return;
    this.currentStats.deletes += count;
    this.currentStats.lastUpdated = new Date().toISOString();
    await this.saveStats();
    await this.checkLimits('deletes');
  }

  // Actualizar uso de almacenamiento
  async updateStorageUsage(bytes: number) {
    if (!this.currentStats) return;
    this.currentStats.storage = bytes;
    this.currentStats.lastUpdated = new Date().toISOString();
    await this.saveStats();
    await this.checkLimits('storage');
  }

  // Verificar límites y enviar alertas
  private async checkLimits(metric: keyof typeof FREE_LIMITS) {
    if (!this.currentStats) return;
    const current = this.currentStats[metric];
    const limit = FREE_LIMITS[metric];
    const percentage = current / limit;
    const alertKey = `${metric}_${this.getAlertLevel(percentage)}`;
    // Evitar alertas duplicadas
    if (this.alertSent.has(alertKey)) return;
    if (percentage >= ALERT_THRESHOLDS.emergency) {
      await this.sendAlert('emergency', metric, percentage, current, limit);
      this.alertSent.add(alertKey);
    } else if (percentage >= ALERT_THRESHOLDS.critical) {
      await this.sendAlert('critical', metric, percentage, current, limit);
      this.alertSent.add(alertKey);
    } else if (percentage >= ALERT_THRESHOLDS.warning) {
      await this.sendAlert('warning', metric, percentage, current, limit);
      this.alertSent.add(alertKey);
    }
  }

  // Determinar nivel de alerta
  private getAlertLevel(percentage: number): string {
    if (percentage >= ALERT_THRESHOLDS.emergency) return 'emergency';
    if (percentage >= ALERT_THRESHOLDS.critical) return 'critical';
    if (percentage >= ALERT_THRESHOLDS.warning) return 'warning';
    return 'normal';
  }

  // Enviar alerta
  private async sendAlert(
    level: 'warning' | 'critical' | 'emergency',
    metric: string,
    percentage: number,
    current: number,
    limit: number
  ) {
    const messages = {
      warning: `⚠️ Uso de ${metric} al ${Math.round(percentage * 100)}%`,
      critical: `🚨 Uso de ${metric} al ${Math.round(percentage * 100)}%`,
      emergency: `🔥 Uso de ${metric} al ${Math.round(percentage * 100)}% - LÍMITE CRÍTICO`,
    };
    const message = messages[level];
    const details = `${current.toLocaleString()} / ${limit.toLocaleString()}`;
    console.warn(`[UsageMonitor] ${message}: ${details}`);
    // Mostrar alerta en la app
    Alert.alert(
      'Alerta de Uso de Supabase',
      `${message}\n\n${details}\n\nConsidera optimizar el uso para evitar costos.`,
      [{ text: 'Entendido' }]
    );
    // Enviar notificación push
    await this.sendPushNotification(message, details);
  }

  // Enviar notificación push
  private async sendPushNotification(title: string, body: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null, // Enviar inmediatamente
      });
    } catch (error) {
      console.error('[UsageMonitor] Error al enviar notificación:', error);
    }
  }

  // Verificación periódica
  private startPeriodicCheck() {
    // Verificar cada 30 minutos
    setInterval(async () => {
      await this.loadCurrentStats();
      if (this.currentStats) {
        await this.checkLimits('reads');
        await this.checkLimits('writes');
        await this.checkLimits('deletes');
        await this.checkLimits('storage');
      }
    }, 30 * 60 * 1000);
  }

  // Obtener estadísticas actuales
  async getCurrentStats(): Promise<UsageStats | null> {
    await this.loadCurrentStats();
    return this.currentStats;
  }

  // Obtener porcentaje de uso
  getUsagePercentage(metric: keyof typeof FREE_LIMITS): number {
    if (!this.currentStats) return 0;
    return this.currentStats[metric] / FREE_LIMITS[metric];
  }

  // Limpiar alertas enviadas (llamar al inicio del día)
  clearSentAlerts() {
    this.alertSent.clear();
  }

  // Obtener resumen de uso
  getUsageSummary() {
    if (!this.currentStats) return null;
    return {
      reads: {
        current: this.currentStats.reads,
        limit: FREE_LIMITS.reads,
        percentage: this.getUsagePercentage('reads'),
      },
      writes: {
        current: this.currentStats.writes,
        limit: FREE_LIMITS.writes,
        percentage: this.getUsagePercentage('writes'),
      },
      deletes: {
        current: this.currentStats.deletes,
        limit: FREE_LIMITS.deletes,
        percentage: this.getUsagePercentage('deletes'),
      },
      storage: {
        current: this.currentStats.storage,
        limit: FREE_LIMITS.storage,
        percentage: this.getUsagePercentage('storage'),
      },
    };
  }
}

// Instancia global
export const usageMonitor = UsageMonitor.getInstance();

// Funciones de conveniencia
export const trackRead = (count: number = 1) => usageMonitor.incrementReads(count);
export const trackWrite = (count: number = 1) => usageMonitor.incrementWrites(count);
export const trackDelete = (count: number = 1) => usageMonitor.incrementDeletes(count);
export const trackStorage = (bytes: number) => usageMonitor.updateStorageUsage(bytes);
export const getUsageStats = () => usageMonitor.getCurrentStats();
export const getUsageSummary = () => usageMonitor.getUsageSummary(); 