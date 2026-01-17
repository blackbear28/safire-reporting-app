import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MessageService from './services/messageService';
import { useUser } from './App';

export default function AdminMessagingScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user: userData } = useUser();
  const scrollViewRef = useRef();
  
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Initialize conversation
  useEffect(() => {
    if (!userData?.uid) return;
    
    const initConversation = async () => {
      try {
        setLoading(true);
        const convId = await MessageService.getOrCreateConversation(
          userData.uid,
          userData.name || 'User',
          userData.role || 'student'
        );
        setConversationId(convId);
      } catch (error) {
        console.error('Error initializing conversation:', error);
        Alert.alert('Error', 'Failed to load messages. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    initConversation();
  }, [userData?.uid]);

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId) return;
    
    const unsubscribe = MessageService.subscribeToMessages(conversationId, (newMessages) => {
      setMessages(newMessages);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    
    // Mark messages as read when screen is active
    MessageService.markMessagesAsRead(conversationId, userData?.uid);
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId, userData?.uid]);

  // Send message
  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || sending) return;
    
    const messageText = inputText.trim();
    setInputText('');
    setSending(true);
    
    try {
      await MessageService.sendMessage(
        conversationId,
        userData.uid,
        userData.name || 'User',
        userData.role || 'student',
        messageText
      );
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setInputText(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  // Format timestamp
  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    return messageDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5', paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Support</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2667ff" />
          <Text style={{ marginTop: 12, color: '#666' }}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f5f5f5' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Ionicons name="shield-checkmark" size={24} color="#2667ff" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Admin Support</Text>
            <Text style={styles.headerSubtitle}>Available 24/7</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start a conversation with the admin support team
              </Text>
            </View>
          )}
          
          {messages.map((message) => {
            const isAdmin = message.senderRole === 'admin';
            const isOwn = message.senderId === userData?.uid;
            
            return (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  isOwn ? styles.messageRowOwn : styles.messageRowOther
                ]}
              >
                {!isOwn && (
                  <View style={styles.messageAvatar}>
                    <Ionicons 
                      name={isAdmin ? "shield-checkmark" : "person"} 
                      size={20} 
                      color={isAdmin ? "#2667ff" : "#666"} 
                    />
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther
                  ]}
                >
                  {!isOwn && (
                    <Text style={styles.messageSender}>
                      {isAdmin ? '🛡️ Admin' : message.senderName}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      isOwn ? styles.messageTextOwn : styles.messageTextOther
                    ]}
                  >
                    {message.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      isOwn ? styles.messageTimeOwn : styles.messageTimeOther
                    ]}
                  >
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
                {isOwn && <View style={{ width: 40 }} />}
              </View>
            );
          })}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = {
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  messageBubbleOwn: {
    backgroundColor: '#2667ff',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2667ff',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#fff',
  },
  messageTextOther: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOther: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    maxHeight: 100,
    fontSize: 15,
    color: '#000',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2667ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
};
