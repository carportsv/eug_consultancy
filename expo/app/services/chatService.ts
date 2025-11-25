import { supabase } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { localNotificationService } from './localNotificationService';
import { pushNotificationService } from './pushNotificationService';

export interface ChatMessage {
  id: string;
  ride_id: string;
  sender_id: string;
  sender_type: 'user' | 'driver';
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ActiveChat {
  id: string;
  ride_id: string;
  user_id: string;
  driver_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class ChatService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private callbacks: Map<string, Set<(message: ChatMessage) => void>> = new Map();
  private notificationCallback?: (senderName: string, message: string, rideId: string) => void;
  private isAppInForeground: boolean = true;
  private globalChatChannel: RealtimeChannel | null = null;

  constructor() {
    // Inicializar suscripción global de chat
    this.initializeGlobalChatSubscription();
    
    // Iniciar procesamiento automático de notificaciones
    pushNotificationService.startAutoProcessing();
  }

  // Inicializar suscripción global de chat
  initializeGlobalChatSubscription() {
    if (this.globalChatChannel) {
      console.log('[ChatService] 🔄 Suscripción global ya existe, reconectando...');
      this.globalChatChannel.unsubscribe();
    }

    console.log('[ChatService] 🌐 Inicializando suscripción global de chat...');
    
    this.globalChatChannel = supabase
      .channel('global-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          console.log('[ChatService] 📨 Mensaje detectado globalmente:', {
            id: newMessage.id,
            message: newMessage.message.substring(0, 10) + '...',
            ride_id: newMessage.ride_id,
            sender_type: newMessage.sender_type
          });

          // Notificar a todos los callbacks registrados para este rideId
          const callbacksForRide = this.callbacks.get(newMessage.ride_id);
          if (callbacksForRide && callbacksForRide.size > 0) {
            console.log(`[ChatService] 📢 Notificando a ${callbacksForRide.size} callbacks para rideId: ${newMessage.ride_id}`);
            callbacksForRide.forEach(callback => {
              callback(newMessage);
            });
          } else {
            console.log(`[ChatService] ⚠️ No hay callbacks registrados para rideId: ${newMessage.ride_id}`);
            // Sistema global de notificaciones completamente deshabilitado
            // Las notificaciones se manejan solo con push notifications desde sendMessage
            console.log('[ChatService] 📱 Sistema global de notificaciones completamente deshabilitado');
          }
        }
      )
      .subscribe((status) => {
        console.log('[ChatService] �� Estado suscripción global:', status);
      });
  }

  // Obtener mensajes de un viaje
  async getMessages(rideId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ChatService] Error obteniendo mensajes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[ChatService] Excepción obteniendo mensajes:', error);
      return [];
    }
  }

  // Enviar mensaje
  async sendMessage(
    rideId: string,
    senderId: string,
    senderType: 'user' | 'driver',
    message: string
  ): Promise<ChatMessage | null> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          ride_id: rideId,
          sender_id: senderId,
          sender_type: senderType,
          message: message.trim(),
          is_read: false
        })
        .select()
        .single();

      if (error) {
        console.error('[ChatService] Error enviando mensaje:', error);
        return null;
      }

      console.log('[ChatService] ✅ Mensaje enviado exitosamente:', data.id);
      
      // Enviar notificación push usando RPC function
      await this.sendChatNotification(rideId, senderType, message.trim());
      
      return data;
    } catch (error) {
      console.error('[ChatService] Excepción enviando mensaje:', error);
      return null;
    }
  }

  // Enviar notificación de chat usando RPC function simple
  private async sendChatNotification(rideId: string, senderType: 'user' | 'driver', message: string): Promise<void> {
    try {
      console.log('[ChatService] 📱 Enviando notificación de chat para rideId:', rideId);
      
      // Usar función ultra simple que funciona
      const { data, error } = await supabase.rpc('send_chat_notification_ultimate', {
        p_ride_id: rideId,
        p_sender_type: senderType,
        p_message: message
      });

      if (error) {
        console.error('[ChatService] ❌ Error enviando notificación de chat:', error);
      } else {
        console.log('[ChatService] ✅ Notificación de chat enviada exitosamente');
        
        // No procesar inmediatamente, dejar que el procesamiento automático lo haga
        // await pushNotificationService.processPendingNotifications();
      }
    } catch (error) {
      console.error('[ChatService] ❌ Excepción enviando notificación de chat:', error);
    }
  }

  // Configurar callback para notificaciones
  setNotificationCallback(callback: (senderName: string, message: string, rideId: string) => void) {
    this.notificationCallback = callback;
  }

  // Actualizar estado de la app (foreground/background)
  setAppState(isForeground: boolean) {
    this.isAppInForeground = isForeground;
  }

  // Suscribirse a mensajes (versión simple - solo para UI)
  subscribeToMessages(
    rideId: string,
    onNewMessage: (message: ChatMessage) => void,
    onError?: (error: any) => void
  ): RealtimeChannel {
    console.log('[ChatService] 🔄 Registrando callback para rideId:', rideId);
    
    // Agregar callback a la lista
    if (!this.callbacks.has(rideId)) {
      this.callbacks.set(rideId, new Set());
    }
    this.callbacks.get(rideId)!.add(onNewMessage);

    // Crear canal de suscripción específico para este rideId
    const channel = supabase
      .channel(`chat-${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `ride_id=eq.${rideId}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          console.log('[ChatService] 📨 Mensaje recibido en canal específico:', {
            id: newMessage.id,
            ride_id: newMessage.ride_id,
            sender_type: newMessage.sender_type
          });
          
          // Notificar al callback
          onNewMessage(newMessage);
        }
      )
      .subscribe((status) => {
        console.log('[ChatService] 📡 Estado suscripción específica:', status);
      });

    // Retornar canal con cleanup
    return {
      ...channel,
      unsubscribe: () => {
        console.log('[ChatService] 🗑️ Removiendo callback para rideId:', rideId);
        const callbacks = this.callbacks.get(rideId);
        if (callbacks) {
          callbacks.delete(onNewMessage);
          if (callbacks.size === 0) {
            this.callbacks.delete(rideId);
          }
        }
        channel.unsubscribe();
      }
    } as any;
  }

  // Desconectar de mensajes
  unsubscribeFromMessages(rideId: string): void {
    console.log('[ChatService] 🚫 Removiendo todos los callbacks para rideId:', rideId);
    this.callbacks.delete(rideId);
  }

  // Marcar mensajes como leídos
  async markMessagesAsRead(rideId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('ride_id', rideId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('[ChatService] Error marcando mensajes como leídos:', error);
      }
    } catch (error) {
      console.error('[ChatService] Excepción marcando mensajes como leídos:', error);
    }
  }

  // Obtener conversación activa
  async getActiveChat(rideId: string): Promise<ActiveChat | null> {
    try {
      const { data, error } = await supabase
        .from('active_chats')
        .select('*')
        .eq('ride_id', rideId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('[ChatService] Error obteniendo chat activo:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[ChatService] Excepción obteniendo chat activo:', error);
      return null;
    }
  }

  // Crear conversación activa
  async createActiveChat(
    rideId: string,
    userId: string,
    driverId: string
  ): Promise<ActiveChat | null> {
    try {
      const { data, error } = await supabase
        .from('active_chats')
        .insert({
          ride_id: rideId,
          user_id: userId,
          driver_id: driverId,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('[ChatService] Error creando chat activo:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[ChatService] Excepción creando chat activo:', error);
      return null;
    }
  }

  // Desactivar conversación
  async deactivateChat(rideId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('active_chats')
        .update({ is_active: false })
        .eq('ride_id', rideId);

      if (error) {
        console.error('[ChatService] Error desactivando chat:', error);
      } else {
        this.unsubscribeFromMessages(rideId);
      }
    } catch (error) {
      console.error('[ChatService] Excepción desactivando chat:', error);
    }
  }

  // Obtener mensajes no leídos
  async getUnreadMessagesCount(rideId: string, userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('ride_id', rideId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('[ChatService] Error contando mensajes no leídos:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[ChatService] Excepción contando mensajes no leídos:', error);
      return 0;
    }
  }

  // Enviar notificación push automáticamente (como las notificaciones de viaje)
  private async sendLocalNotificationForMessage(message: ChatMessage): Promise<void> {
    try {
      console.log('[ChatService] 📱 Enviando notificación local automática para mensaje:', message.id);

      // Obtener información del viaje para identificar al destinatario
      const { data: rideData, error: rideError } = await supabase
        .from('ride_requests')
        .select('user_id, driver_id')
        .eq('id', message.ride_id)
        .single();

      if (rideError || !rideData) {
        console.error('[ChatService] ❌ Error obteniendo datos del viaje:', rideError);
        return;
      }

      const senderName = message.sender_type === 'user' ? 'Usuario' : 'Conductor';

      // Determinar el destinatario correcto
      let actualRecipientUserId: string | null = null;
      let recipientRole: 'user' | 'driver' | null = null;

      if (message.sender_type === 'user') {
        // Message from user, recipient is driver
        console.log('[ChatService] 🔍 Buscando conductor en drivers table con driver_id:', rideData.driver_id);
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('id, user_id')
          .eq('id', rideData.driver_id)
          .single();

        if (!driverError && driverData) {
          actualRecipientUserId = driverData.user_id;
          recipientRole = 'driver';
          console.log('[ChatService] ✅ Conductor encontrado:', { driverId: driverData.id, userId: driverData.user_id });
        } else {
          console.log('[ChatService] ⚠️ Conductor no encontrado en drivers para notificación:', {
            driverId: rideData.driver_id,
            error: driverError
          });
          return;
        }
      } else {
        // Message from driver, recipient is user
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', rideData.user_id)
          .single();

        if (!userError && userData) {
          actualRecipientUserId = userData.id;
          recipientRole = 'user';
        } else {
          console.log('[ChatService] ⚠️ Usuario no encontrado en users para notificación:', rideData.user_id);
          return;
        }
      }

      if (!actualRecipientUserId) {
        console.log('[ChatService] ⚠️ No se pudo determinar el ID de usuario del destinatario, saltando notificación.');
        return;
      }

      // Get the sender's actual user_id to compare
      let actualSenderUserId: string | null = null;
      if (message.sender_type === 'user') {
        actualSenderUserId = message.sender_id; // For users, sender_id is already user_id
      } else {
        // For drivers, message.sender_id is driver.id, need to get driver.user_id
        const { data: senderDriverData, error: senderDriverError } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', message.sender_id)
          .single();
        if (!senderDriverError && senderDriverData) {
          actualSenderUserId = senderDriverData.user_id;
        }
      }

      // Prevent sending notification to the sender themselves
      if (actualSenderUserId && actualRecipientUserId === actualSenderUserId) {
        console.log('[ChatService] ⚠️ Intentando enviar notificación al remitente, saltando:', actualRecipientUserId);
        return;
      }

      console.log('[ChatService] 📱 Enviando notificación local a:', actualRecipientUserId, 'de:', senderName, ' (rol destinatario:', recipientRole, ')');

      await localNotificationService.sendChatLocalNotification(
        actualRecipientUserId,
        senderName,
        message.message,
        message.ride_id
      );

      console.log('[ChatService] ✅ Notificación local enviada exitosamente');

    } catch (error) {
      console.error('[ChatService] ❌ Error enviando notificación local:', error);
    }
  }

  // Enviar notificación push usando Supabase Edge Function
  private async sendPushNotificationForMessage(message: ChatMessage): Promise<void> {
    try {
      console.log('[ChatService] 📱 Enviando notificación push para mensaje:', message.id);

      // Obtener información del viaje para identificar al destinatario
      const { data: rideData, error: rideError } = await supabase
        .from('ride_requests')
        .select('user_id, driver_id')
        .eq('id', message.ride_id)
        .single();

      if (rideError || !rideData) {
        console.error('[ChatService] ❌ Error obteniendo datos del viaje:', rideError);
        return;
      }

      let recipientUserId: string | null = null;
      let senderName = '';

      if (message.sender_type === 'user') {
        // Message from user, recipient is driver
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', rideData.driver_id)
          .single();

        if (!driverError && driverData) {
          recipientUserId = driverData.user_id;
          senderName = 'Usuario';
        }
      } else {
        // Message from driver, recipient is user
        recipientUserId = rideData.user_id;
        senderName = 'Conductor';
      }

      if (!recipientUserId) {
        console.log('[ChatService] ⚠️ No se pudo determinar el destinatario, saltando notificación push');
        return;
      }

      // Llamar a la Edge Function para enviar notificación push
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: recipientUserId,
          title: `Mensaje de ${senderName}`,
          body: message.message.length > 50 ? `${message.message.substring(0, 50)}...` : message.message,
          data: {
            type: 'chat_message',
            rideId: message.ride_id,
            senderName,
            fullMessage: message.message
          }
        }
      });

      if (error) {
        console.error('[ChatService] ❌ Error enviando notificación push:', error);
      } else {
        console.log('[ChatService] ✅ Notificación push enviada exitosamente');
      }

    } catch (error) {
      console.error('[ChatService] ❌ Error enviando notificación push:', error);
    }
  }

  // Enviar notificaciones push pendientes desde el cliente
  private async sendPendingPushNotifications(): Promise<void> {
    try {
      console.log('[ChatService] 📱 Enviando notificaciones push pendientes...');
      
      // Obtener notificaciones listas para envío
      const { data: notifications, error } = await supabase
        .from('push_notifications')
        .select('*')
        .eq('status', 'ready_to_send')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[ChatService] ❌ Error obteniendo notificaciones pendientes:', error);
        return;
      }

      if (!notifications || notifications.length === 0) {
        console.log('[ChatService] ℹ️ No hay notificaciones pendientes para enviar');
        return;
      }

      console.log(`[ChatService] 📤 Enviando ${notifications.length} notificaciones push...`);

      // Enviar cada notificación usando la Edge Function
      for (const notification of notifications) {
        try {
          const { data, error: sendError } = await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: notification.user_id,
              title: notification.title,
              body: notification.body,
              data: notification.data,
              token: notification.token
            }
          });

          if (sendError) {
            console.error('[ChatService] ❌ Error enviando notificación:', sendError);
            // Marcar como fallida
            await supabase
              .from('push_notifications')
              .update({ 
                status: 'failed', 
                error_message: sendError.message,
                sent_at: new Date().toISOString()
              })
              .eq('id', notification.id);
          } else {
            console.log('[ChatService] ✅ Notificación push enviada exitosamente:', notification.id);
            // Marcar como enviada
            await supabase
              .from('push_notifications')
              .update({ 
                status: 'sent', 
                sent_at: new Date().toISOString()
              })
              .eq('id', notification.id);
          }
        } catch (notificationError) {
          console.error('[ChatService] ❌ Excepción enviando notificación:', notificationError);
          // Marcar como fallida
          await supabase
            .from('push_notifications')
            .update({ 
              status: 'failed', 
              error_message: notificationError instanceof Error ? notificationError.message : 'Unknown error',
              sent_at: new Date().toISOString()
            })
            .eq('id', notification.id);
        }
      }

      console.log('[ChatService] ✅ Proceso de envío de notificaciones completado');

    } catch (error) {
      console.error('[ChatService] ❌ Error en sendPendingPushNotifications:', error);
    }
  }

  // Limpiar todos los canales
  cleanup(): void {
    this.callbacks.clear();
    if (this.globalChatChannel) {
      supabase.removeChannel(this.globalChatChannel);
      this.globalChatChannel = null;
    }
  }
}

export const chatService = new ChatService();
