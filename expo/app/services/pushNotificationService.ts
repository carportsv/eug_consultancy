import { supabase } from './supabaseClient';

export class PushNotificationService {
  private static instance: PushNotificationService;
  private lastEmptyLog: number | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Enviar notificación push directamente desde el cliente
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data: any,
    token: string
  ): Promise<boolean> {
    try {
      console.log('[PushNotificationService] 📱 Enviando push notification a:', userId);
      
      const { data: response, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: userId,
          title,
          body,
          data,
          token
        }
      });

      if (error) {
        console.error('[PushNotificationService] ❌ Error enviando push notification:', error);
        return false;
      }

      console.log('[PushNotificationService] ✅ Push notification enviada exitosamente');
      return true;
    } catch (error) {
      console.error('[PushNotificationService] ❌ Excepción enviando push notification:', error);
      return false;
    }
  }

  // Procesar notificaciones pendientes
  async processPendingNotifications(): Promise<void> {
    try {
      // Obtener notificaciones con status 'sent' que necesitan ser enviadas
      const { data: notifications, error } = await supabase
        .from('push_notifications')
        .select('*')
        .eq('status', 'sent')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[PushNotificationService] ❌ Error obteniendo notificaciones:', error);
        return;
      }

      if (!notifications || notifications.length === 0) {
        // Solo log cada 10 minutos para reducir spam
        const now = Date.now();
        if (!this.lastEmptyLog || now - this.lastEmptyLog > 600000) {
          console.log('[PushNotificationService] ℹ️ No hay notificaciones para procesar');
          this.lastEmptyLog = now;
        }
        return;
      }

      console.log(`[PushNotificationService] 📤 Procesando ${notifications.length} notificaciones...`);

      for (const notification of notifications) {
        try {
          const success = await this.sendPushNotification(
            notification.user_id,
            notification.title,
            notification.body,
            notification.data,
            notification.token
          );

          if (success) {
            // Marcar como procesada
            await supabase
              .from('push_notifications')
              .update({ 
                status: 'processed',
                sent_at: new Date().toISOString()
              })
              .eq('id', notification.id);
          } else {
            // Marcar como fallida
            await supabase
              .from('push_notifications')
              .update({ 
                status: 'failed',
                error_message: 'Failed to send push notification'
              })
              .eq('id', notification.id);
          }
        } catch (notificationError) {
          console.error('[PushNotificationService] ❌ Error procesando notificación:', notificationError);
          // Marcar como fallida
          await supabase
            .from('push_notifications')
            .update({ 
              status: 'failed',
              error_message: notificationError instanceof Error ? notificationError.message : 'Unknown error'
            })
            .eq('id', notification.id);
        }
      }

      console.log('[PushNotificationService] ✅ Proceso de notificaciones completado');
    } catch (error) {
      console.error('[PushNotificationService] ❌ Error en processPendingNotifications:', error);
    }
  }

  // Iniciar procesamiento automático
  startAutoProcessing(): void {
    console.log('[PushNotificationService] 🔄 Iniciando procesamiento automático cada 2 minutos...');
    
    // Procesar cada 2 minutos para reducir carga y logs
    setInterval(() => {
      this.processPendingNotifications();
    }, 120000);
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
