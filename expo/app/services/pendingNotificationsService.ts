import { supabase } from './supabaseClient';

export interface PendingNotification {
  id: string;
  driver_id: string;
  title: string;
  body: string;
  data: any;
  type: string;
  is_read: boolean;
  created_at: string;
  expires_at: string;
}

export class PendingNotificationsService {
  /**
   * Obtener el ID de Supabase del driver basado en su Firebase UID
   */
  private static async getDriverSupabaseId(firebaseUid: string): Promise<string | null> {
    try {
      // Primero buscar en la tabla drivers
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('firebase_uid', firebaseUid)
        .single();

      if (driverData && !driverError) {
        return driverData.id;
      }

      // Si no se encuentra en drivers, buscar en users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', firebaseUid)
        .single();

      if (userData && !userError) {
        return userData.id;
      }

      console.warn('[PendingNotificationsService] ⚠️ No se encontró usuario con Firebase UID:', firebaseUid);
      return null;
    } catch (error) {
      console.error('[PendingNotificationsService] ❌ Error obteniendo ID de Supabase:', error);
      return null;
    }
  }

  /**
   * Obtener todas las notificaciones no leídas para un driver
   */
  static async getUnreadNotifications(firebaseUid: string): Promise<PendingNotification[]> {
    try {
      const supabaseId = await this.getDriverSupabaseId(firebaseUid);
      if (!supabaseId) {
        console.warn('[PendingNotificationsService] ⚠️ No se pudo obtener ID de Supabase para Firebase UID:', firebaseUid);
        return [];
      }

      const { data, error } = await supabase
        .from('pending_notifications')
        .select('*')
        .eq('driver_id', supabaseId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PendingNotificationsService] ❌ Error obteniendo notificaciones:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[PendingNotificationsService] ❌ Error obteniendo notificaciones:', error);
      return [];
    }
  }

  /**
   * Marcar una notificación como leída
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pending_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('[PendingNotificationsService] ❌ Error marcando notificación como leída:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[PendingNotificationsService] ❌ Error marcando notificación como leída:', error);
      return false;
    }
  }

  /**
   * Marcar todas las notificaciones de un driver como leídas
   */
  static async markAllAsRead(firebaseUid: string): Promise<boolean> {
    try {
      const supabaseId = await this.getDriverSupabaseId(firebaseUid);
      if (!supabaseId) {
        console.warn('[PendingNotificationsService] ⚠️ No se pudo obtener ID de Supabase para Firebase UID:', firebaseUid);
        return false;
      }

      const { error } = await supabase
        .from('pending_notifications')
        .update({ is_read: true })
        .eq('driver_id', supabaseId)
        .eq('is_read', false);

      if (error) {
        console.error('[PendingNotificationsService] ❌ Error marcando todas las notificaciones como leídas:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[PendingNotificationsService] ❌ Error marcando todas las notificaciones como leídas:', error);
      return false;
    }
  }

  /**
   * Obtener el conteo de notificaciones no leídas para un driver
   */
  static async getUnreadCount(firebaseUid: string): Promise<number> {
    try {
      const supabaseId = await this.getDriverSupabaseId(firebaseUid);
      if (!supabaseId) {
        console.warn('[PendingNotificationsService] ⚠️ No se pudo obtener ID de Supabase para Firebase UID:', firebaseUid);
        return 0;
      }

      const { count, error } = await supabase
        .from('pending_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', supabaseId)
        .eq('is_read', false);

      if (error) {
        console.error('[PendingNotificationsService] ❌ Error obteniendo conteo de notificaciones:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[PendingNotificationsService] ❌ Error obteniendo conteo de notificaciones:', error);
      return 0;
    }
  }

  /**
   * Eliminar notificaciones expiradas (limpieza manual)
   */
  static async cleanupExpiredNotifications(): Promise<boolean> {
    try {
      const { error } = await supabase
        .rpc('cleanup_expired_notifications');

      if (error) {
        console.error('[PendingNotificationsService] ❌ Error limpiando notificaciones expiradas:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[PendingNotificationsService] ❌ Error limpiando notificaciones expiradas:', error);
      return false;
    }
  }

  /**
   * Suscribirse a cambios en las notificaciones de un driver
   */
  static async subscribeToNotifications(firebaseUid: string, callback: (notification: PendingNotification) => void) {
    try {
      const supabaseId = await this.getDriverSupabaseId(firebaseUid);
      if (!supabaseId) {
        console.warn('[PendingNotificationsService] ⚠️ No se pudo obtener ID de Supabase para Firebase UID:', firebaseUid);
        // Retornar una suscripción vacía que no haga nada
        return {
          unsubscribe: () => {}
        };
      }

      return supabase
        .channel(`pending_notifications:${supabaseId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pending_notifications',
            filter: `driver_id=eq.${supabaseId}`
          },
          (payload) => {
            if (payload.new) {
              callback(payload.new as PendingNotification);
            }
          }
        )
        .subscribe();
    } catch (error) {
      console.error('[PendingNotificationsService] ❌ Error suscribiéndose a notificaciones:', error);
      // Retornar una suscripción vacía que no haga nada
      return {
        unsubscribe: () => {}
      };
    }
  }
}
