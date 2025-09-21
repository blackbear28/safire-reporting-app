import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';
import { ChatbotService } from './services/chatbotService';

export default function ChatScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your campus assistant. I can help you with reporting issues, checking status, or answering questions about campus services. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
      suggestions: ["Submit a report", "Check report status", "Contact information", "What can I report?"]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await ChatbotService.processMessage(userMessage.text);
      
      const botMessage = {
        id: Date.now() + 1,
        text: response.message,
        isBot: true,
        timestamp: response.timestamp,
        suggestions: response.suggestions,
        intent: response.intent
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble right now. Please try again later or contact support directly.",
        isBot: true,
        timestamp: new Date(),
        suggestions: ["Try again", "Contact support", "Submit a report", "Go to Dashboard"]
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle suggestion tap
  const handleSuggestionTap = (suggestion) => {
    setInputText(suggestion);
  };

  // Handle quick actions
  const handleQuickAction = (action) => {
    switch (action.toLowerCase()) {
      case 'submit a report':
      case 'submit new report':
        navigation.navigate('Report');
        break;
      case 'check report status':
      case 'open dashboard':
        navigation.navigate('Dashboard');
        break;
      case 'view home feed':
        navigation.navigate('Home');
        break;
      case 'contact support':
        Alert.alert(
          'Contact Support',
          'Campus Support:\nPhone: (555) 123-4567\nEmail: support@campus.edu\nOffice: Admin Building, Room 101',
          [{ text: 'OK' }]
        );
        break;
      default:
        setInputText(action);
        break;
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome name="arrow-left" size={20} color="#2667ff" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderTitle}>Campus Assistant</Text>
            <Text style={styles.chatHeaderSubtitle}>
              {isTyping ? 'Typing...' : 'Online'}
            </Text>
          </View>
          <View style={styles.chatBotAvatar}>
            <FontAwesome name="robot" size={24} color="#2667ff" />
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatMessagesContainer}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View key={message.id} style={styles.messageContainer}>
              <View
                style={[
                  styles.messageBubble,
                  message.isBot ? styles.botMessage : styles.userMessage
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.isBot ? styles.botMessageText : styles.userMessageText
                  ]}
                >
                  {message.text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    message.isBot ? styles.botMessageTime : styles.userMessageTime
                  ]}
                >
                  {formatTime(message.timestamp)}
                </Text>
              </View>

              {/* Suggestions */}
              {message.isBot && message.suggestions && (
                <View style={styles.suggestionsContainer}>
                  {message.suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionChip}
                      onPress={() => handleQuickAction(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <View style={styles.messageContainer}>
              <View style={[styles.messageBubble, styles.botMessage, styles.typingBubble]}>
                <View style={styles.typingIndicator}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.chatInputContainer, { paddingBottom: Math.max(20, insets.bottom) }]}>
          <TextInput
            style={styles.chatInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isTyping}
          >
            <FontAwesome name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
