import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

class MessageService {
  // Get or create conversation between user and admin
  static async getOrCreateConversation(userId, userName, userRole) {
    try {
      // Check if conversation already exists
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('userId', '==', userId),
        where('type', '==', 'user-admin')
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }
      
      // Create new conversation
      const newConversation = await addDoc(conversationsRef, {
        userId: userId,
        userName: userName,
        userRole: userRole || 'student',
        type: 'user-admin',
        status: 'active',
        lastMessage: null,
        lastMessageTime: serverTimestamp(),
        unreadCount: 0,
        unreadByAdmin: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return newConversation.id;
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      throw error;
    }
  }

  // Send message
  static async sendMessage(conversationId, senderId, senderName, senderRole, messageText) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      
      const messageData = {
        senderId: senderId,
        senderName: senderName,
        senderRole: senderRole,
        text: messageText,
        timestamp: serverTimestamp(),
        read: false,
        createdAt: serverTimestamp()
      };
      
      await addDoc(messagesRef, messageData);
      
      // Update conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      const updateData = {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Increment unread count for recipient
      if (senderRole === 'admin') {
        updateData.unreadCount = 0; // Reset user unread count
      } else {
        updateData.unreadByAdmin = (await this.getUnreadAdminCount(conversationId)) + 1;
      }
      
      await updateDoc(conversationRef, updateData);
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get unread count for admin
  static async getUnreadAdminCount(conversationId) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(
        messagesRef,
        where('senderRole', '!=', 'admin'),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Subscribe to messages in a conversation
  static subscribeToMessages(conversationId, callback) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      
      return onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
          });
        });
        callback(messages);
      }, (error) => {
        console.error('Error subscribing to messages:', error);
        callback([]);
      });
    } catch (error) {
      console.error('Error setting up message subscription:', error);
      callback([]);
      return null;
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(conversationId, userId) {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(
        messagesRef,
        where('senderId', '!=', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(docSnapshot => {
        const messageRef = doc(db, 'conversations', conversationId, 'messages', docSnapshot.id);
        return updateDoc(messageRef, { read: true });
      });
      
      await Promise.all(updatePromises);
      
      // Update conversation unread count
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, { unreadCount: 0 });
      
      return true;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
  }

  // Get all conversations (for admin)
  static subscribeToAllConversations(callback) {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('type', '==', 'user-admin'),
        orderBy('updatedAt', 'desc')
      );
      
      return onSnapshot(q, (snapshot) => {
        const conversations = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          conversations.push({
            id: doc.id,
            ...data,
            lastMessageTime: data.lastMessageTime?.toDate ? data.lastMessageTime.toDate() : new Date(),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          });
        });
        callback(conversations);
      }, (error) => {
        console.error('Error subscribing to conversations:', error);
        callback([]);
      });
    } catch (error) {
      console.error('Error setting up conversations subscription:', error);
      callback([]);
      return null;
    }
  }
}

export default MessageService;
