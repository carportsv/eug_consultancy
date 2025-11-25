// Configuración de alertas de uso de Supabase

export interface AlertConfig {
  warning: number;    // Porcentaje para advertencia (ej: 0.7 = 70%)
  critical: number;   // Porcentaje para crítico (ej: 0.9 = 90%)
  emergency: number;  // Porcentaje para emergencia (ej: 0.95 = 95%)
  checkInterval: number; // Intervalo de verificación en minutos
  enablePushNotifications: boolean;
  enableInAppAlerts: boolean;
  enableEmailAlerts: boolean;
  emailRecipients: string[];
}

// Configuración por defecto
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  warning: 0.7,        // 70%
  critical: 0.9,       // 90%
  emergency: 0.95,     // 95%
  checkInterval: 30,   // 30 minutos
  enablePushNotifications: true,
  enableInAppAlerts: true,
  enableEmailAlerts: false,
  emailRecipients: [],
};

// Límites del plan gratuito de Supabase
export const FREE_LIMITS = {
  databaseSize: 500 * 1024 * 1024, // 500MB
  bandwidth: 2 * 1024 * 1024 * 1024, // 2GB
  authUsers: 50000,
  realtimeConnections: 100,
  edgeFunctions: 500000, // 500k invocations
  storage: 1 * 1024 * 1024 * 1024, // 1GB
  storageTransfer: 2 * 1024 * 1024 * 1024, // 2GB
};

// Mensajes de alerta personalizables
export const ALERT_MESSAGES = {
  warning: {
    title: '⚠️ Advertencia de Uso',
    body: 'El uso de {metric} ha alcanzado el {percentage}% del límite gratuito.',
    action: 'Considera optimizar el uso para evitar costos.',
  },
  critical: {
    title: '🚨 Uso Crítico',
    body: 'El uso de {metric} ha alcanzado el {percentage}% del límite gratuito.',
    action: 'Optimiza inmediatamente el uso o considera actualizar el plan.',
  },
  emergency: {
    title: '🔥 Límite Crítico Alcanzado',
    body: 'El uso de {metric} ha alcanzado el {percentage}% del límite gratuito.',
    action: 'Se recomienda actualizar el plan inmediatamente para evitar interrupciones.',
  },
};

// Métricas que se monitorean en Supabase
export const MONITORED_METRICS = {
  databaseSize: {
    name: 'Tamaño de Base de Datos',
    description: 'Espacio utilizado en la base de datos PostgreSQL',
    unit: 'bytes',
  },
  bandwidth: {
    name: 'Ancho de Banda',
    description: 'Datos transferidos desde la base de datos',
    unit: 'bytes',
  },
  authUsers: {
    name: 'Usuarios Autenticados',
    description: 'Número de usuarios registrados',
    unit: 'usuarios',
  },
  realtimeConnections: {
    name: 'Conexiones en Tiempo Real',
    description: 'Conexiones activas de Realtime',
    unit: 'conexiones',
  },
  edgeFunctions: {
    name: 'Funciones Edge',
    description: 'Invocaciones de Edge Functions',
    unit: 'invocaciones',
  },
  storage: {
    name: 'Almacenamiento',
    description: 'Espacio utilizado en Storage',
    unit: 'bytes',
  },
  storageTransfer: {
    name: 'Transferencia de Storage',
    description: 'Datos transferidos desde Storage',
    unit: 'bytes',
  },
};

// Funciones de utilidad para alertas
export const formatMetricValue = (value: number, metric: keyof typeof MONITORED_METRICS): string => {
  const config = MONITORED_METRICS[metric];
  
  if (config.unit === 'bytes') {
    return formatBytes(value);
  }
  
  return value.toLocaleString();
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getAlertLevel = (percentage: number, config: AlertConfig): 'normal' | 'warning' | 'critical' | 'emergency' => {
  if (percentage >= config.emergency) return 'emergency';
  if (percentage >= config.critical) return 'critical';
  if (percentage >= config.warning) return 'warning';
  return 'normal';
};

export const shouldSendAlert = (percentage: number, config: AlertConfig): boolean => {
  return percentage >= config.warning;
};

// Configuración de notificaciones push
export const PUSH_NOTIFICATION_CONFIG = {
  channelId: 'firebase-usage-alerts',
  channelName: 'Alertas de Uso Firebase',
  channelDescription: 'Notificaciones sobre el uso de Firebase',
  importance: 'high' as const,
  sound: 'default',
  vibrate: true,
  priority: 'high' as const,
};

// Configuración de email (si se implementa)
export const EMAIL_CONFIG = {
  subject: 'Alerta de Uso Firebase - {level}',
  template: `
    <h2>Alerta de Uso Firebase</h2>
    <p><strong>Nivel:</strong> {level}</p>
    <p><strong>Métrica:</strong> {metric}</p>
    <p><strong>Uso actual:</strong> {current}</p>
    <p><strong>Límite:</strong> {limit}</p>
    <p><strong>Porcentaje:</strong> {percentage}%</p>
    <p><strong>Acción recomendada:</strong> {action}</p>
    <hr>
    <p><small>Esta alerta fue generada automáticamente por el sistema de monitoreo.</small></p>
  `,
}; 