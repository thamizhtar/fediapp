import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Message, User } from '../gun.config';
import ChatService from '../services/ChatService';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import Toast from '../components/Toast';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ChatScreenProps {
  currentUser: string;
  onLogout: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ currentUser, onLogout }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    // Set current user in chat service
    ChatService.setCurrentUser(currentUser);
    setConnectionStatus('connecting');

    // Listen for messages
    const unsubscribeMessages = ChatService.onMessages((newMessages) => {
      setMessages(newMessages);
      setIsLoading(false);
      // Don't set connection status here - let the connection status listener handle it
    });

    // Listen for users
    const unsubscribeUsers = ChatService.onUsers((newUsers) => {
      setUsers(newUsers);
    });

    // Listen for connection status changes
    const unsubscribeConnectionStatus = ChatService.onConnectionStatus((status) => {
      console.log('Connection status update in ChatScreen:', status);
      setConnectionStatus(status as 'connecting' | 'connected' | 'disconnected');
      setIsLoading(false);

      if (status === 'connected') {
        setToast({ visible: true, message: 'Connected to chat network', type: 'success' });
      } else if (status === 'disconnected') {
        setToast({ visible: true, message: 'Disconnected from chat network. Messages will be cached.', type: 'error' });
      }
    });

    // Set up connection timeout (increased to 15 seconds)
    const connectionTimeout = setTimeout(() => {
      if (isLoading && ChatService.getConnectionStatus() === 'connecting') {
        setConnectionStatus('disconnected');
        setIsLoading(false);
        setToast({ visible: true, message: 'Connection timeout. Please check your internet connection.', type: 'error' });
      }
    }, 15000); // 15 second timeout

    // Cleanup on unmount
    return () => {
      clearTimeout(connectionTimeout);
      unsubscribeMessages();
      unsubscribeUsers();
      unsubscribeConnectionStatus();
      ChatService.disconnect();
    };
  }, [currentUser, isLoading]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (sendingMessage) return; // Prevent double sending

    setSendingMessage(true);
    try {
      await ChatService.sendMessage(text);
      // Show success feedback for longer messages
      if (text.length > 50) {
        showToast('Message sent!', 'success');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showToast('Failed to send message. Please try again.', 'error');
    } finally {
      setSendingMessage(false);
    }
  }, [sendingMessage, showToast]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleLogout = () => {
    ChatService.disconnect();
    onLogout();
  };

  const onlineUsers = users.filter(user => user.isOnline);
  const onlineCount = onlineUsers.length;

  // Show loading state
  if (isLoading && connectionStatus === 'connecting') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Connecting to chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor="#ffffff"
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Gun Chat</Text>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot,
              { backgroundColor: connectionStatus === 'connected' ? '#34C759' : '#FF3B30' }
            ]} />
            <Text style={styles.headerSubtitle}>
              {connectionStatus === 'connected'
                ? `${onlineCount} user${onlineCount !== 1 ? 's' : ''} online`
                : 'Disconnected'
              }
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.currentUser}>@{currentUser}</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUser={currentUser}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        isLoading={isLoading}
      />

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        placeholder={
          connectionStatus === 'connected'
            ? "Type a message..."
            : connectionStatus === 'connecting'
            ? "Connecting..."
            : "Offline - messages will be cached"
        }
        disabled={sendingMessage}
        isLoading={sendingMessage}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#ffffff',
    minHeight: 80,
    ...Platform.select({
      web: {
        paddingTop: 20,
      },
      android: {
        paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  currentUser: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    minWidth: 70,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ChatScreen;
