import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { chatService, ChatMessage } from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { getUserData } from '@/services/userFirestore';
import { supabase } from '@/services/supabaseClient';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  rideId: string;
  userType: 'user' | 'driver';
  otherParticipantName: string;
}

interface MessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  senderName: string;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isOwnMessage, senderName }) => {
  // console.log('[MessageItem] 🎨 Renderizando mensaje:', {
  //   id: message.id,
  //   message: message.message.substring(0, 30),
  //   isOwnMessage,
  //   senderName
  // });
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={[
      styles.messageContainer,
      isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownBubble : styles.otherBubble
      ]}>
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {message.message}
        </Text>
        <Text style={[
          styles.messageTime,
          isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
        ]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
};

export default function ChatModal({
  visible,
  onClose,
  rideId,
  userType,
  otherParticipantName
}: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useAuth();

  // Cargar mensajes iniciales y configurar suscripción
  useEffect(() => {
    if (visible && rideId) {
      console.log('[ChatModal] 🚀 Inicializando chat para rideId:', rideId, 'visible:', visible);
      loadMessages();
      loadCurrentUserId();
    } else {
      console.log('[ChatModal] ⏸️ Chat no inicializado:', { visible, rideId });
    }
  }, [visible, rideId]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!visible && rideId) {
      console.log('[ChatModal] 🧹 Limpiando chat al cerrar');
      setMessages([]);
      setNewMessage('');
    }
  }, [visible, rideId]);

  // Callback para manejar nuevos mensajes
  const handleNewMessage = useCallback((newMessage: ChatMessage) => {
    console.log('[ChatModal] ✅ Nuevo mensaje recibido:', {
      messageId: newMessage.id,
      senderType: newMessage.sender_type,
      isOwnMessage: newMessage.sender_id === currentUserId,
      visible
    });
    
    setMessages(prev => {
      // Verificar si el mensaje ya existe para evitar duplicados
      const exists = prev.some(msg => msg.id === newMessage.id);
      if (exists) {
        console.log('[ChatModal] ⚠️ Mensaje duplicado, ignorando:', newMessage.id);
        return prev;
      }
      
      console.log('[ChatModal] ➕ Agregando nuevo mensaje a la lista');
      const newMessages = [...prev, newMessage];
      console.log('[ChatModal] 📊 Nuevo estado de mensajes:', newMessages.length);
      return newMessages;
    });

    // Marcar como leído si no es nuestro mensaje y el chat está visible
    if (newMessage.sender_id !== currentUserId && visible && currentUserId) {
      console.log('[ChatModal] 👁️ Marcando mensaje como leído');
      chatService.markMessagesAsRead(rideId, currentUserId);
    }
  }, [currentUserId, visible, rideId]);

  // Suscribirse a mensajes en tiempo real (sistema específico por rideId)
  useEffect(() => {
    if (visible && rideId && currentUserId) {
      console.log('[ChatModal] 🔄 Registrando callback para rideId:', rideId, 'visible:', visible, 'currentUserId:', currentUserId);
      
      // Registrar callback para recibir mensajes
      const channel = chatService.subscribeToMessages(
        rideId,
        handleNewMessage,
        (error) => {
          console.error('[ChatModal] ❌ Error en suscripción:', error);
          Alert.alert('Error de conexión', 'No se pudo conectar al chat en tiempo real');
        }
      );

      console.log('[ChatModal] 📡 Canal de suscripción creado:', channel);

      // Cleanup al desmontar o cambiar rideId
      return () => {
        console.log('[ChatModal] 🗑️ Removiendo callback para rideId:', rideId);
        channel.unsubscribe();
        console.log('[ChatModal] ✅ Callback removido exitosamente');
      };
    } else {
      console.log('[ChatModal] ⏸️ No registrando callback:', { visible, rideId, currentUserId });
    }
  }, [visible, rideId, currentUserId, handleNewMessage]);

  const loadCurrentUserId = async () => {
    try {
      console.log('[ChatModal] 🔍 Cargando currentUserId...', { userUid: user?.uid });
      if (user?.uid) {
        const userData = await getUserData(user.uid);
        console.log('[ChatModal] 📋 UserData obtenido:', { userId: userData?.id, userData });
        if (userData?.id) {
          setCurrentUserId(userData.id);
          console.log('[ChatModal] ✅ CurrentUserId establecido:', userData.id);
        } else {
          console.error('[ChatModal] ❌ UserData no tiene ID válido');
        }
      } else {
        console.error('[ChatModal] ❌ No hay user.uid disponible');
      }
    } catch (error) {
      console.error('[ChatModal] ❌ Error cargando user ID:', error);
    }
  };

  const loadMessages = async () => {
    if (!rideId) return;
    
    try {
      setLoading(true);
      console.log('[ChatModal] 📥 Cargando mensajes para rideId:', rideId);
      const chatMessages = await chatService.getMessages(rideId);
      console.log('[ChatModal] ✅ Mensajes cargados:', chatMessages.length);
      setMessages(chatMessages);
      
      // Marcar mensajes como leídos
      if (currentUserId) {
        await chatService.markMessagesAsRead(rideId, currentUserId);
      }
      
      // Scroll al final después de cargar
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('[ChatModal] ❌ Error cargando mensajes:', error);
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || sending) return;

    const messageText = newMessage.trim();
    console.log('[ChatModal] 📤 Enviando mensaje:', {
      rideId,
      currentUserId,
      userType,
      messageLength: messageText.length
    });

    try {
      setSending(true);
      const sentMessage = await chatService.sendMessage(
        rideId,
        currentUserId,
        userType,
        messageText
      );

      if (sentMessage) {
        console.log('[ChatModal] ✅ Mensaje enviado exitosamente:', sentMessage.id);
        setNewMessage('');
        // El mensaje se agregará automáticamente via realtime
      } else {
        console.error('[ChatModal] ❌ Error: sendMessage retornó null');
        Alert.alert('Error', 'No se pudo enviar el mensaje');
      }
    } catch (error) {
      console.error('[ChatModal] ❌ Error enviando mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    // No desconectar el canal global, solo cerrar el modal
    console.log('[ChatModal] 🚪 Cerrando chat modal para rideId:', rideId);
    onClose();
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      {/* console.log('[ChatModal] 🎭 Renderizando modal, visible:', visible, 'messages:', messages.length); */}
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Chat</Text>
            <Text style={styles.headerSubtitle}>Con {otherParticipantName}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Messages */}
        <View style={styles.messagesContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Cargando mensajes...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="chat" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No hay mensajes aún</Text>
              <Text style={styles.emptySubtext}>Inicia la conversación</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                // console.log('[ChatModal] 🎨 Renderizando mensaje:', item.id, item.message.substring(0, 20));
                const isOwnMessage = item.sender_id === currentUserId;
                const senderName = item.sender_type === 'user' ? 'Usuario' : 'Conductor';
                return (
                  <MessageItem
                    message={item}
                    isOwnMessage={isOwnMessage}
                    senderName={senderName}
                  />
                );
              }}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={scrollToBottom}
              onLayout={scrollToBottom}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={() => console.log('[ChatModal] 📜 Scroll iniciado')}
              onScrollEndDrag={() => console.log('[ChatModal] 📜 Scroll terminado')}
            />
          )}
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  messagesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 4,
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownBubble: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#9ca3af',
    textAlign: 'left',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
