import { supabase } from './supabaseClient';
import * as Notifications from 'expo-notifications';
import { PUSH_NOTIFICATION_CONFIG } from '../config/notificationConfig';

export interface PushNotificationData {
  type: 'new_ride_request' | 'ride_accepted' | 'ride_cancelled' | 'ride_completed';
  rideId?: string;
  userId?: string;
  driverId?: string;
  message?: string;
  [key: string]: any;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data: PushNotificationData;
  sound?: boolean;
  badge?: number;
}

export class NotificationService {
  /**
   * Enviar notificación push a un driver específico
   */
  static async sendPushToDriver(driverId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      console.log('[NotificationService] 📤 Enviando notificación push a driver:', driverId);
      
      // Obtener el token de notificación del driver
      const { data: driver, error } = await supabase
        .from('drivers')
        .select('notification_token')
        .eq('id', driverId)
        .single();

      if (error || !driver?.notification_token) {
        console.error('[NotificationService] ❌ Error obteniendo token del driver:', error);
        return false;
      }

      // Enviar notificación push real via Expo
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: driver.notification_token,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: PUSH_NOTIFICATION_CONFIG.sound,
          badge: payload.badge || PUSH_NOTIFICATION_CONFIG.badge,
          priority: PUSH_NOTIFICATION_CONFIG.priority,
          channelId: PUSH_NOTIFICATION_CONFIG.android.channelId,
          vibrate: PUSH_NOTIFICATION_CONFIG.vibrate,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log('[NotificationService] ✅ Respuesta de Expo:', result);
      
      if (result.data?.status === 'ok') {
        console.log('[NotificationService] ✅ Notificación push enviada exitosamente');
        return true;
      } else {
        console.error('[NotificationService] ❌ Error en respuesta de Expo:', result);
        return false;
      }
    } catch (error) {
      console.error('[NotificationService] ❌ Error enviando notificación push:', error);
      return false;
    }
  }

  /**
   * Enviar notificación push a múltiples drivers
   */
  static async sendPushToMultipleDrivers(driverIds: string[], payload: NotificationPayload): Promise<number> {
    try {
      console.log('[NotificationService] 📤 Enviando notificación push a múltiples drivers:', driverIds.length);
      
      let successCount = 0;
      
      for (const driverId of driverIds) {
        const success = await this.sendPushToDriver(driverId, payload);
        if (success) successCount++;
      }
      
      console.log('[NotificationService] ✅ Notificaciones push enviadas:', `${successCount}/${driverIds.length}`);
      return successCount;
    } catch (error) {
      console.error('[NotificationService] ❌ Error enviando notificaciones push múltiples:', error);
      return 0;
    }
  }

  /**
   * Enviar notificación push a todos los drivers disponibles
   */
  static async sendPushToAvailableDrivers(payload: NotificationPayload): Promise<number> {
    try {
      console.log('[NotificationService] 📤 Enviando notificación push a drivers disponibles...');
      
      // Obtener todos los drivers disponibles
      let { data: drivers, error } = await supabase
        .from('drivers')
        .select('id, notification_token')
        .eq('is_available', true)
        .eq('status', 'active')
        .not('notification_token', 'is', null);

      if (error || !drivers) {
        console.error('[NotificationService] ❌ Error obteniendo drivers disponibles:', error);
        drivers = [] as any[];
      }

      const driverIds = drivers.map(d => d.id);
      console.log('[NotificationService] 📊 Drivers disponibles encontrados:', driverIds.length);
      
      // Fallback: si no hay disponibles, enviar a todos los que tengan token (comportamiento que usamos ayer)
      if (driverIds.length === 0) {
        console.log('[NotificationService] ⚠️ No hay drivers disponibles. Usando fallback: todos con token');
        const { data: tokenDrivers, error: tokenErr } = await supabase
          .from('drivers')
          .select('id, notification_token')
          .not('notification_token', 'is', null)
          .eq('status', 'active');
        if (tokenErr) {
          console.error('[NotificationService] ❌ Error obteniendo drivers con token:', tokenErr);
        }
        drivers = tokenDrivers || [];
      }
      
      // Recalcular ids si se usó fallback
      const targetIds = drivers.map(d => d.id);
      return await this.sendPushToMultipleDrivers(targetIds, payload);
    } catch (error) {
      console.error('[NotificationService] ❌ Error enviando notificaciones push a drivers disponibles:', error);
      return 0;
    }
  }

  /**
   * Mostrar notificación local en la app
   */
  static async showLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: PUSH_NOTIFICATION_CONFIG.sound,
          badge: payload.badge || PUSH_NOTIFICATION_CONFIG.badge,
          vibrate: PUSH_NOTIFICATION_CONFIG.vibrate,
        },
        trigger: null, // Mostrar inmediatamente
      });

      console.log('[NotificationService] ✅ Notificación local mostrada exitosamente');
    } catch (error) {
      console.error('[NotificationService] ❌ Error mostrando notificación local:', error);
    }
  }

  /**
   * Programar notificación local
   */
  static async scheduleLocalNotification(
    payload: NotificationPayload, 
    trigger: Notifications.NotificationTriggerInput
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: PUSH_NOTIFICATION_CONFIG.sound,
          badge: payload.badge || PUSH_NOTIFICATION_CONFIG.badge,
          vibrate: PUSH_NOTIFICATION_CONFIG.vibrate,
        },
        trigger: trigger,
      });

      console.log('[NotificationService] ✅ Notificación local programada exitosamente');
    } catch (error) {
      console.error('[NotificationService] ❌ Error programando notificación local:', error);
    }
  }

  /**
   * Cancelar todas las notificaciones programadas
   */
  static async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[NotificationService] ✅ Todas las notificaciones programadas canceladas');
    } catch (error) {
      console.error('[NotificationService] ❌ Error cancelando notificaciones programadas:', error);
    }
  }

  /**
   * Obtener todas las notificaciones programadas
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('[NotificationService] 📅 Notificaciones programadas obtenidas:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('[NotificationService] ❌ Error obteniendo notificaciones programadas:', error);
      return [];
    }
  }

  // Métodos de conveniencia para diferentes tipos de notificaciones
  async notifyNewRideRequest(rideId: string, origin: string, destination: string): Promise<number> {
    const payload: NotificationPayload = {
      title: '🚗 Nueva Solicitud de Viaje',
      body: `De ${origin} a ${destination}`,
      data: {
        type: 'new_ride_request',
        rideId,
        message: `Nueva solicitud de viaje disponible: ${origin} → ${destination}`,
      },
      sound: true,
      badge: 1,
    };

    return await NotificationService.sendPushToAvailableDrivers(payload);
  }

  async notifyRideAccepted(rideId: string, driverId: string, message: string): Promise<boolean> {
    const payload: NotificationPayload = {
      title: '✅ Viaje Aceptado',
      body: message,
      data: {
        type: 'ride_accepted',
        rideId,
        driverId,
        message,
      },
      sound: true,
      badge: 1,
    };

    return await NotificationService.sendPushToDriver(driverId, payload);
  }

  async notifyRideCancelled(rideId: string, driverId: string, reason: string): Promise<boolean> {
    const payload: NotificationPayload = {
      title: '❌ Viaje Cancelado',
      body: `Motivo: ${reason}`,
      data: {
        type: 'ride_cancelled',
        rideId,
        driverId,
        message: reason,
      },
      sound: true,
      badge: 1,
    };

    return await NotificationService.sendPushToDriver(driverId, payload);
  }

  async notifyRideCompleted(rideId: string, driverId: string, message: string): Promise<boolean> {
    const payload: NotificationPayload = {
      title: '🎉 Viaje Completado',
      body: message,
      data: {
        type: 'ride_completed',
        rideId,
        driverId,
        message,
      },
      sound: true,
      badge: 1,
    };

    return await NotificationService.sendPushToDriver(driverId, payload);
  }
} 