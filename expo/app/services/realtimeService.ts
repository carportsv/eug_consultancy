import { RealtimeChannel } from '@supabase/supabase-js';
import { LocationCoords } from './openStreetMapService';
import { supabase } from './supabaseClient';

// Tipos para el sistema híbrido
export enum UserPriority {
  HIGH = 'high',    // Realtime
  MEDIUM = 'medium', // Polling frecuente
  LOW = 'low'       // Polling ocasional
}

export interface UserSession {
  userId: string;
  priority: UserPriority;
  lastActivity: Date;
  isActive: boolean;
  context: {
    hasActiveRide?: boolean;
    isAvailable?: boolean;
    isSearching?: boolean;
    role?: 'user' | 'driver';
  };
}

// Gestor de conexiones híbridas
class RealtimeManager {
  private activeConnections: Map<string, RealtimeChannel> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private maxConnections = 2; // Límite gratuito de Supabase
  private userSessions: Map<string, UserSession> = new Map();

  // Calcular prioridad del usuario
  calculateUserPriority(user: UserSession): UserPriority {
    // Driver activo con viaje en curso = ALTA prioridad
    if (user.context.role === 'driver' && user.context.hasActiveRide) {
      return UserPriority.HIGH;
    }
    
    // Usuario en viaje activo = ALTA prioridad
    if (user.context.role === 'user' && user.context.hasActiveRide) {
      return UserPriority.HIGH;
    }
    
    // Driver disponible = MEDIA prioridad
    if (user.context.role === 'driver' && user.context.isAvailable) {
      return UserPriority.MEDIUM;
    }
    
    // Usuario buscando taxi = MEDIA prioridad
    if (user.context.role === 'user' && user.context.isSearching) {
      return UserPriority.MEDIUM;
    }
    
    // Usuario inactivo = BAJA prioridad
    return UserPriority.LOW;
  }

  // Conectar usuario con estrategia híbrida
  async connectUser(userId: string, context: UserSession['context']): Promise<void> {
    const userSession: UserSession = {
      userId,
      priority: UserPriority.LOW,
      lastActivity: new Date(),
      isActive: true,
      context
    };

    // Calcular prioridad
    userSession.priority = this.calculateUserPriority(userSession);
    this.userSessions.set(userId, userSession);

    console.log(`[RealtimeManager] Conectando usuario ${userId} con prioridad ${userSession.priority}`);

    if (userSession.priority === UserPriority.HIGH) {
      // Intentar conectar con realtime
      if (this.activeConnections.size < this.maxConnections) {
        await this.connectRealtime(userId);
      } else {
        // Degradar a polling frecuente
        this.startFrequentPolling(userId);
      }
    } else {
      // Usar polling según prioridad
      this.startPolling(userId, userSession.priority);
    }
  }

  // Conectar con realtime
  private async connectRealtime(userId: string): Promise<void> {
    try {
      const userSession = this.userSessions.get(userId);
      if (!userSession) return;

      console.log(`[RealtimeManager] Conectando ${userId} con realtime`);

      // Crear canal de realtime
      const channel = supabase.channel(`user_${userId}`);

      // Configurar suscripciones según el contexto
      if (userSession.context.role === 'driver') {
        // Driver: suscribirse a solicitudes de viaje
        channel.on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ride_requests' },
          (payload) => {
            console.log('[RealtimeManager] Nueva solicitud de viaje recibida:', payload);
            // Aquí se manejaría la notificación
          }
        );
      } else {
        // Usuario: suscribirse a actualizaciones del viaje
        if (userSession.context.hasActiveRide) {
          channel.on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'ride_requests' },
            (payload) => {
              console.log('[RealtimeManager] Actualización de viaje recibida:', payload);
              // Aquí se manejaría la actualización
            }
          );
        }
      }

      // Suscribirse al canal
      await channel.subscribe();
      this.activeConnections.set(userId, channel);

    } catch (error) {
      console.error(`[RealtimeManager] Error conectando realtime para ${userId}:`, error);
      // Fallback a polling
      this.startFrequentPolling(userId);
    }
  }

  // Iniciar polling frecuente (10 segundos)
  private startFrequentPolling(userId: string): void {
    console.log(`[RealtimeManager] Iniciando polling frecuente para ${userId}`);
    
    const interval = setInterval(() => {
      this.updateUserData(userId);
    }, 60000);

    this.pollingIntervals.set(userId, interval);
  }

  // Iniciar polling según prioridad
  private startPolling(userId: string, priority: UserPriority): void {
    const interval = priority === UserPriority.MEDIUM ? 15000 : 30000;
    console.log(`[RealtimeManager] Iniciando polling cada ${interval}ms para ${userId}`);
    
    const timeout = setInterval(() => {
      this.updateUserData(userId);
    }, interval);

    this.pollingIntervals.set(userId, timeout);
  }

  // Actualizar datos del usuario (simulado)
  private updateUserData(userId: string): void {
    const userSession = this.userSessions.get(userId);
    if (!userSession) return;

    // Solo logear cada 5 actualizaciones para reducir spam
    const updateCount = (userSession as any).updateCount || 0;
    if (updateCount % 5 === 0) {
      console.log(`[RealtimeManager] Actualizando datos para ${userId} (${userSession.priority})`);
    }
    (userSession as any).updateCount = updateCount + 1;
    
    // Aquí se harían las consultas a la base de datos
    // Por ahora solo actualizamos la actividad
    userSession.lastActivity = new Date();
  }

  // Desconectar usuario
  disconnectUser(userId: string): void {
    console.log(`[RealtimeManager] Desconectando usuario ${userId}`);

    // Limpiar conexión realtime
    const connection = this.activeConnections.get(userId);
    if (connection) {
      connection.unsubscribe();
      this.activeConnections.delete(userId);
    }

    // Limpiar polling
    const interval = this.pollingIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(userId);
    }

    // Limpiar sesión
    this.userSessions.delete(userId);
  }

  // Obtener estadísticas
  getStats() {
    return {
      activeConnections: this.activeConnections.size,
      maxConnections: this.maxConnections,
      pollingUsers: this.pollingIntervals.size,
      totalUsers: this.userSessions.size
    };
  }

  // Rebalancear conexiones (cuando se libera una conexión realtime)
  async rebalanceConnections(): Promise<void> {
    const availableSlots = this.maxConnections - this.activeConnections.size;
    
    if (availableSlots > 0) {
      // Buscar usuarios con polling que deberían tener realtime
      for (const [userId, session] of this.userSessions) {
        if (session.priority === UserPriority.HIGH && !this.activeConnections.has(userId)) {
          console.log(`[RealtimeManager] Promoviendo ${userId} a realtime`);
          
          // Limpiar polling
          const interval = this.pollingIntervals.get(userId);
          if (interval) {
            clearInterval(interval);
            this.pollingIntervals.delete(userId);
          }

          // Conectar realtime
          await this.connectRealtime(userId);
          break; // Solo promover uno por vez
        }
      }
    }
  }
}

// Instancia global del gestor
export const realtimeManager = new RealtimeManager();

// Funciones existentes del servicio (mantener compatibilidad)
export const updateDriverLocation = async (driverId: string, location: LocationCoords) => {
  try {
    // Actualizar ubicación en la tabla drivers
    const { error: driverError } = await supabase
      .from('drivers')
      .update({
        location,
        updated_at: new Date().toISOString()
      })
      .eq('id', driverId);

    if (driverError) {
      console.error('Error al actualizar ubicación del conductor en drivers:', driverError);
    }

    // Obtener user_id asociado al driver para cubrir casos donde driver_id tenga users.id
    let possibleDriverIds: string[] = [driverId];
    try {
      const { data: drvRow } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', driverId)
        .single();
      if (drvRow?.user_id) {
        possibleDriverIds.push(drvRow.user_id);
      }
    } catch {}

    // También actualizar driver_location en ride_requests activos (cubriendo ambos IDs)
    const { error: rideError } = await supabase
      .from('ride_requests')
      .update({
        driver_location: location,
        updated_at: new Date().toISOString()
      })
      .in('driver_id', possibleDriverIds)
      .in('status', ['accepted', 'in_progress']);

    if (rideError) {
      console.error('Error al actualizar driver_location en ride_requests:', rideError);
    }
  } catch (error) {
    console.error('Error al actualizar ubicación del conductor:', error);
  }
};

export const subscribeToRideUpdates = (rideId: string, callback: (update: any) => void) => {
  return supabase
    .channel(`ride_${rideId}`)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'ride_requests', filter: `id=eq.${rideId}` },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();
};

export const unsubscribe = (channel: RealtimeChannel | string) => {
  if (channel && typeof channel === 'object' && 'unsubscribe' in channel) {
    (channel as RealtimeChannel).unsubscribe();
  } else if (typeof channel === 'string') {
    // Si se pasa un string, intentar remover el canal por nombre
    supabase.removeChannel(channel as any);
  }
};

// Exportar el servicio completo
export const realtimeService = {
  updateDriverLocation,
  subscribeToRideUpdates,
  unsubscribe,
  realtimeManager
}; 