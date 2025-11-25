import { Alert, Platform } from 'react-native';
import { supabase } from './supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export interface LocalNotificationData {
  title: string;
  body: string;
  data?: any;
  userId: string;
}

class LocalNotificationService {
  // Enviar notificación local (solo cuando la app está abierta)
  async sendLocalNotification(notificationData: LocalNotificationData): Promise<boolean> {
    try {
      console.log('[LocalNotificationService] 📱 Enviando notificación local:', notificationData);

      // Guardar la notificación en la base de datos para persistencia
      const { data, error } = await supabase
        .from('local_notifications')
        .insert({
          user_id: notificationData.userId,
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[LocalNotificationService] ❌ Error guardando notificación:', error);
        return false;
      }

      console.log('[LocalNotificationService] ✅ Notificación local guardada:', data);

      // Verificar si el userId corresponde al usuario actual
      // Solo mostrar alerta si es para el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Obtener el user_id del usuario actual desde la tabla users
        const { data: currentUserData } = await supabase
          .from('users')
          .select('id')
          .eq('firebase_uid', user.id)
          .single();

        if (currentUserData && currentUserData.id === notificationData.userId) {
          // Solo mostrar alerta si es para el usuario actual
          console.log('[LocalNotificationService] 📱 Mostrando alerta para usuario actual:', currentUserData.id);
          
          Alert.alert(
            notificationData.title,
            notificationData.body,
            [
              {
                text: 'Ver',
                onPress: () => {
                  // Aquí podrías navegar al chat o mostrar el mensaje
                  console.log('[LocalNotificationService] Usuario presionó "Ver"');
                }
              },
              {
                text: 'Cerrar',
                style: 'cancel'
              }
            ]
          );
        } else {
          console.log('[LocalNotificationService] ⚠️ Notificación no es para el usuario actual, saltando alerta:', {
            currentUserId: currentUserData?.id,
            targetUserId: notificationData.userId
          });
        }
      } else {
        console.log('[LocalNotificationService] ⚠️ No hay usuario autenticado, saltando alerta');
      }

      return true;
    } catch (error) {
      console.error('[LocalNotificationService] ❌ Error enviando notificación local:', error);
      return false;
    }
  }

  // Enviar notificación de chat local
  async sendChatLocalNotification(
    userId: string,
    senderName: string,
    message: string,
    rideId: string
  ): Promise<boolean> {
    try {
      console.log('[LocalNotificationService] 💬 Enviando notificación de chat local:', {
        userId,
        senderName,
        message,
        rideId
      });

      const notificationData: LocalNotificationData = {
        title: `Mensaje de ${senderName}`,
        body: message.length > 50 ? `${message.substring(0, 50)}...` : message,
        data: {
          type: 'chat_message',
          rideId,
          senderName,
          fullMessage: message
        },
        userId
      };

      return await this.sendLocalNotification(notificationData);
    } catch (error) {
      console.error('[LocalNotificationService] ❌ Error enviando notificación de chat local:', error);
      return false;
    }
  }

  // Obtener notificaciones no leídas de un usuario
  async getUnreadNotifications(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('local_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[LocalNotificationService] ❌ Error obteniendo notificaciones:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[LocalNotificationService] ❌ Error obteniendo notificaciones:', error);
      return [];
    }
  }

  // Marcar notificación como leída
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('local_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('[LocalNotificationService] ❌ Error marcando como leída:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[LocalNotificationService] ❌ Error marcando como leída:', error);
      return false;
    }
  }
}

export const localNotificationService = new LocalNotificationService();
