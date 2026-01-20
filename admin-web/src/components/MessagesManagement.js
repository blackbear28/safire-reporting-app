import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  IconButton,
  Badge,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  Shield as ShieldIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function MessagesManagement() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read by admin
  const markMessagesAsRead = useCallback(async () => {
    if (!selectedConversation) return;
    
    try {
      const messagesRef = collection(db, 'conversations', selectedConversation.id, 'messages');
      const q = query(
        messagesRef,
        where('senderRole', '!=', 'admin'),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(docSnapshot => {
        const messageRef = doc(db, 'conversations', selectedConversation.id, 'messages', docSnapshot.id);
        return updateDoc(messageRef, { read: true });
      });
      
      await Promise.all(updatePromises);
      
      // Update conversation unread count
      const conversationRef = doc(db, 'conversations', selectedConversation.id);
      await updateDoc(conversationRef, { unreadByAdmin: 0 });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [selectedConversation]);

  // Subscribe to all conversations
  useEffect(() => {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('type', '==', 'user-admin'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        convs.push({
          id: doc.id,
          ...data,
          lastMessageTime: data.lastMessageTime?.toDate?.() || new Date(),
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        });
      });
      setConversations(convs);
      setLoading(false);
    }, (error) => {
      console.error('Error loading conversations:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'conversations', selectedConversation.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(),
        });
      });
      setMessages(msgs);
      
      // Mark admin messages as read
      markMessagesAsRead();
    }, (error) => {
      console.error('Error loading messages:', error);
    });

    return () => unsubscribe();
  }, [selectedConversation, markMessagesAsRead]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const messagesRef = collection(db, 'conversations', selectedConversation.id, 'messages');
      
      await addDoc(messagesRef, {
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.email.split('@')[0] || 'Admin',
        senderRole: 'admin',
        text: text,
        timestamp: serverTimestamp(),
        read: false,
        createdAt: serverTimestamp()
      });

      // Update conversation
      const conversationRef = doc(db, 'conversations', selectedConversation.id);
      await updateDoc(conversationRef, {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: (selectedConversation.unreadCount || 0) + 1
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  // Format time
  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    const time = messageDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const today = now.toDateString() === messageDate.toDateString();
    
    if (today) return time;
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv =>
    conv.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex' }}>
      {/* Conversations List */}
      <Paper sx={{ width: 350, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e0e0e0' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            User Messages
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Box>
        
        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {filteredConversations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
              <Typography color="text.secondary">
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </Typography>
            </Box>
          ) : (
            filteredConversations.map((conv) => (
              <React.Fragment key={conv.id}>
                <ListItemButton
                  selected={selectedConversation?.id === conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&.Mui-selected': {
                      bgcolor: '#e3f2fd',
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Badge badgeContent={conv.unreadByAdmin || 0} color="error">
                      <Avatar sx={{ bgcolor: '#2667ff' }}>
                        <PersonIcon />
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {conv.userName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(conv.lastMessageTime)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Chip
                          label={conv.userRole === 'faculty' ? 'Faculty' : 'Student'}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.7rem',
                            bgcolor: conv.userRole === 'faculty' ? '#ffebee' : '#e8f5e9',
                            color: conv.userRole === 'faculty' ? '#c62828' : '#2e7d32',
                            mb: 0.5
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'text.secondary'
                          }}
                        >
                          {conv.lastMessage || 'No messages yet'}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
                <Divider />
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

      {/* Messages Panel */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
        {selectedConversation ? (
          <>
            {/* Header */}
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e0e0e0' }}>
              <Avatar sx={{ bgcolor: '#2667ff', mr: 2 }}>
                <PersonIcon />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {selectedConversation.userName}
                </Typography>
                <Chip
                  label={selectedConversation.userRole === 'faculty' ? '👨‍🏫 Faculty' : '🎓 Student'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.75rem',
                    bgcolor: selectedConversation.userRole === 'faculty' ? '#ffebee' : '#e8f5e9',
                    color: selectedConversation.userRole === 'faculty' ? '#c62828' : '#2e7d32'
                  }}
                />
              </Box>
            </Paper>

            {/* Messages */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {messages.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">No messages yet</Typography>
                </Box>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.senderRole === 'admin';
                  return (
                    <Box
                      key={msg.id}
                      sx={{
                        display: 'flex',
                        justifyContent: isAdmin ? 'flex-end' : 'flex-start',
                        mb: 2
                      }}
                    >
                      <Paper
                        sx={{
                          maxWidth: '70%',
                          p: 1.5,
                          bgcolor: isAdmin ? '#2667ff' : '#fff',
                          color: isAdmin ? '#fff' : '#000',
                          borderRadius: 2,
                          ...(isAdmin ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 })
                        }}
                      >
                        {!isAdmin && (
                          <Typography variant="caption" sx={{ color: '#2667ff', fontWeight: 600, display: 'block', mb: 0.5 }}>
                            {msg.senderName}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {msg.text}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 0.5,
                            opacity: 0.7,
                            textAlign: 'right'
                          }}
                        >
                          {formatTime(msg.timestamp)}
                        </Typography>
                      </Paper>
                    </Box>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <Paper sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sending}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                  sx={{ bgcolor: '#2667ff', color: '#fff', '&:hover': { bgcolor: '#1557d0' } }}
                >
                  {sending ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : <SendIcon />}
                </IconButton>
              </Box>
            </Paper>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Box sx={{ textAlign: 'center' }}>
              <ShieldIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Select a conversation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a user from the list to start chatting
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
