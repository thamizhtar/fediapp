import gun, { Message, User, getConnectionStatus, onConnectionStatusChange } from '../gun.config';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ChatService {
  private messagesRef: any;
  private usersRef: any;
  private currentUser: string | null = null;
  private messageListeners: Set<(messages: Message[]) => void> = new Set();
  private userListeners: Set<(users: User[]) => void> = new Set();
  private connectionStatusListeners: Set<(status: string) => void> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cachedMessages: Message[] = [];
  private isOnline: boolean = true;
  private connectionStatusUnsubscribe: (() => void) | null = null;

  constructor() {
    this.messagesRef = gun.get('chat-messages');
    this.usersRef = gun.get('chat-users');

    // Initialize connection and load cached data
    this.initializeConnection();
    this.loadCachedMessages();
    this.setupNetworkListener();
    this.setupConnectionStatusListener();
  }

  private initializeConnection(): void {
    try {
      // Test connection by getting a simple value
      gun.get('test').put({ timestamp: Date.now() });
      console.log('Gun connection test successful');

      // Get initial connection status
      const status = getConnectionStatus();
      this.isOnline = status === 'connected';
      console.log('Initial connection status:', status);
    } catch (error) {
      console.error('Gun connection test failed:', error);
      this.isOnline = false;
    }
  }

  private setupConnectionStatusListener = (): void => {
    // Listen for connection status changes from gun.config
    this.connectionStatusUnsubscribe = onConnectionStatusChange((status: string) => {
      const wasOnline = this.isOnline;
      this.isOnline = status === 'connected';

      console.log('Connection status changed:', status, 'isOnline:', this.isOnline);

      // Notify connection status listeners
      this.connectionStatusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('Error in connection status listener:', error);
        }
      });

      // If we just came back online, try to sync offline messages
      if (!wasOnline && this.isOnline) {
        console.log('🔄 Connection restored, syncing offline messages...');
        this.syncOfflineMessages();
      }

      // If we went offline, notify user
      if (wasOnline && !this.isOnline) {
        console.log('📴 Connection lost, entering offline mode');
      }
    });
  }

  private setupNetworkListener(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        console.log('Network: Online');
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        console.log('Network: Offline');
      });
    }
  }

  private async loadCachedMessages(): Promise<void> {
    try {
      const storageKey = 'gun-chat-messages';
      let cachedData: string | null = null;

      if (Platform.OS === 'web') {
        cachedData = localStorage.getItem(storageKey);
      } else {
        cachedData = await AsyncStorage.getItem(storageKey);
      }

      if (cachedData) {
        this.cachedMessages = JSON.parse(cachedData);
        console.log('Loaded cached messages:', this.cachedMessages.length);

        // Notify listeners with cached data
        this.messageListeners.forEach(listener => {
          try {
            listener(this.cachedMessages);
          } catch (error) {
            console.error('Error in cached message listener:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error loading cached messages:', error);
    }
  }

  private async saveCachedMessages(messages: Message[]): Promise<void> {
    try {
      const storageKey = 'gun-chat-messages';
      const dataToStore = JSON.stringify(messages.slice(-100)); // Keep last 100 messages

      if (Platform.OS === 'web') {
        localStorage.setItem(storageKey, dataToStore);
      } else {
        await AsyncStorage.setItem(storageKey, dataToStore);
      }
    } catch (error) {
      console.error('Error saving cached messages:', error);
    }
  }

  // Set current user
  setCurrentUser(username: string): void {
    this.currentUser = username;
    this.updateUserStatus(username, true);
    this.startHeartbeat();
  }

  // Get current user
  getCurrentUser(): string | null {
    return this.currentUser;
  }

  // Listen for connection status changes
  onConnectionStatus(callback: (status: string) => void): () => void {
    this.connectionStatusListeners.add(callback);

    // Send current status immediately
    setTimeout(() => {
      callback(getConnectionStatus());
    }, 100);

    return () => {
      this.connectionStatusListeners.delete(callback);
    };
  }

  // Get current connection status
  getConnectionStatus(): string {
    return getConnectionStatus();
  }

  // Sync offline messages when connection is restored
  private syncOfflineMessages = async (): Promise<void> => {
    try {
      const storageKey = 'gun-chat-offline-messages';
      let offlineMessages: Message[] = [];

      if (Platform.OS === 'web') {
        const stored = localStorage.getItem(storageKey);
        if (stored) offlineMessages = JSON.parse(stored);
      } else {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) offlineMessages = JSON.parse(stored);
      }

      if (offlineMessages.length > 0) {
        console.log(`Syncing ${offlineMessages.length} offline messages...`);

        for (const message of offlineMessages) {
          try {
            await new Promise<void>((resolve, reject) => {
              this.messagesRef.get(message.id).put(message, (ack: any) => {
                if (ack.err) {
                  console.error('Error syncing offline message:', ack.err);
                  reject(new Error(ack.err));
                } else {
                  console.log('Offline message synced:', message.id);
                  resolve();
                }
              });
            });
          } catch (error) {
            console.error('Failed to sync offline message:', message.id, error);
          }
        }

        // Clear offline messages after successful sync
        if (Platform.OS === 'web') {
          localStorage.removeItem(storageKey);
        } else {
          await AsyncStorage.removeItem(storageKey);
        }

        console.log('Offline messages sync completed');
      }
    } catch (error) {
      console.error('Error syncing offline messages:', error);
    }
  }

  // Send a message
  sendMessage(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.currentUser) {
        reject(new Error('No user set'));
        return;
      }

      const message: Message = {
        id: this.generateId(),
        text: text.trim(),
        user: this.currentUser,
        timestamp: Date.now(),
      };

      // Add to cached messages immediately for offline support
      this.cachedMessages.push(message);
      this.saveCachedMessages(this.cachedMessages);

      // Notify listeners immediately
      this.messageListeners.forEach(listener => {
        try {
          listener([...this.cachedMessages]);
        } catch (error) {
          console.error('Error in message listener:', error);
        }
      });

      // Always try to send the message, even if we think we're offline
      // Gun.js can work locally even without peer connections
      try {
        // Store message with proper error handling
        this.messagesRef.get(message.id).put(message, (ack: any) => {
          if (ack.err) {
            console.error('Error sending message:', ack.err);
            // Store for later sync when online
            this.storeOfflineMessage(message);
            console.log('📴 Message stored for offline sync');
            resolve(); // Still resolve - message is cached
          } else {
            console.log('✅ Message sent successfully:', message.id);
            resolve();
          }
        });

        // If we don't get a response within 3 seconds, assume offline
        setTimeout(() => {
          if (!this.isOnline) {
            console.log('📴 No response, storing message for offline sync');
            this.storeOfflineMessage(message);
            resolve();
          }
        }, 3000);

      } catch (error) {
        console.error('Error sending message:', error);
        // Store for later sync when online
        this.storeOfflineMessage(message);
        console.log('📴 Message stored for offline sync due to error');
        resolve(); // Still resolve - message is cached
      }
    });
  }

  private async storeOfflineMessage(message: Message): Promise<void> {
    try {
      const storageKey = 'gun-chat-offline-messages';
      let offlineMessages: Message[] = [];

      if (Platform.OS === 'web') {
        const stored = localStorage.getItem(storageKey);
        if (stored) offlineMessages = JSON.parse(stored);
      } else {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) offlineMessages = JSON.parse(stored);
      }

      offlineMessages.push(message);

      if (Platform.OS === 'web') {
        localStorage.setItem(storageKey, JSON.stringify(offlineMessages));
      } else {
        await AsyncStorage.setItem(storageKey, JSON.stringify(offlineMessages));
      }
    } catch (error) {
      console.error('Error storing offline message:', error);
    }
  }

  // Listen for messages
  onMessages(callback: (messages: Message[]) => void): () => void {
    this.messageListeners.add(callback);

    // Send cached messages immediately
    if (this.cachedMessages.length > 0) {
      setTimeout(() => {
        callback([...this.cachedMessages]);
      }, 100);
    }

    const messages: { [key: string]: Message } = {};

    try {
      // Listen to individual message updates
      const unsubscribe = this.messagesRef.map().on((data: any, key: string) => {
        try {
          if (data && data.id && data.text && data.user && data.timestamp) {
            // Valid message received
            messages[key] = data as Message;
            console.log('Message received:', data.id, data.text);
          } else if (data === null && key) {
            // Message was deleted
            delete messages[key];
            console.log('Message deleted:', key);
          }

          // Convert to array and sort by timestamp
          const messageArray = Object.values(messages)
            .filter(msg => msg && msg.id)
            .sort((a, b) => a.timestamp - b.timestamp);

          // Merge with cached messages and remove duplicates
          const allMessages = this.mergeMessages(this.cachedMessages, messageArray);
          this.cachedMessages = allMessages;
          this.saveCachedMessages(allMessages);

          // Notify all listeners
          this.messageListeners.forEach(listener => {
            try {
              listener([...allMessages]);
            } catch (error) {
              console.error('Error in message listener:', error);
            }
          });
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });

      return () => {
        try {
          this.messageListeners.delete(callback);
          if (unsubscribe && typeof unsubscribe.off === 'function') {
            unsubscribe.off();
          }
        } catch (error) {
          console.error('Error unsubscribing from messages:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up message listener:', error);
      return () => {
        this.messageListeners.delete(callback);
      };
    }
  }

  private mergeMessages(cached: Message[], live: Message[]): Message[] {
    const messageMap = new Map<string, Message>();

    // Add cached messages
    cached.forEach(msg => messageMap.set(msg.id, msg));

    // Add live messages (will overwrite cached if same ID)
    live.forEach(msg => messageMap.set(msg.id, msg));

    // Convert back to array and sort
    return Array.from(messageMap.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // Start heartbeat for user presence
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.currentUser) {
        this.usersRef.get(this.currentUser).get('lastSeen').put(Date.now());
      }
    }, 15000); // Update every 15 seconds

    // Clean up on page unload/app close
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const cleanup = () => {
        this.stopHeartbeat();
        if (this.currentUser) {
          this.updateUserStatus(this.currentUser, false);
        }
      };

      window.addEventListener('beforeunload', cleanup);
      window.addEventListener('pagehide', cleanup);
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Update user online status
  updateUserStatus(username: string, isOnline: boolean): void {
    const user: User = {
      id: username,
      name: username,
      isOnline,
      lastSeen: Date.now()
    };

    try {
      this.usersRef.get(username).put(user, (ack: any) => {
        if (ack.err) {
          console.error('Error updating user status:', ack.err);
        } else {
          console.log('User status updated:', username, isOnline);
        }
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }

  // Listen for online users
  onUsers(callback: (users: User[]) => void): () => void {
    this.userListeners.add(callback);
    const users: { [key: string]: User } = {};

    try {
      const unsubscribe = this.usersRef.map().on((data: any, key: string) => {
        try {
          if (data && data.id && data.name) {
            // Check if user is considered online (last seen within 45 seconds)
            const isOnline = data.lastSeen && (Date.now() - data.lastSeen) < 45000;
            users[key] = { ...data, isOnline } as User;
          } else if (data === null) {
            delete users[key];
          }

          const userArray = Object.values(users).filter(user => user && user.id);

          // Notify all listeners
          this.userListeners.forEach(listener => {
            try {
              listener(userArray);
            } catch (error) {
              console.error('Error in user listener:', error);
            }
          });
        } catch (error) {
          console.error('Error processing user update:', error);
        }
      });

      // Set up periodic cleanup of offline users
      const cleanupInterval = setInterval(() => {
        const now = Date.now();
        let hasChanges = false;

        Object.keys(users).forEach(key => {
          const user = users[key];
          if (user && user.lastSeen && (now - user.lastSeen) > 60000) {
            // Mark user as offline after 60 seconds
            if (user.isOnline) {
              users[key] = { ...user, isOnline: false };
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          const userArray = Object.values(users).filter(user => user && user.id);
          this.userListeners.forEach(listener => {
            try {
              listener(userArray);
            } catch (error) {
              console.error('Error in user cleanup listener:', error);
            }
          });
        }
      }, 10000); // Check every 10 seconds

      return () => {
        try {
          clearInterval(cleanupInterval);
          this.userListeners.delete(callback);
          if (unsubscribe && typeof unsubscribe.off === 'function') {
            unsubscribe.off();
          }
        } catch (error) {
          console.error('Error unsubscribing from users:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up user listener:', error);
      return () => {
        this.userListeners.delete(callback);
      };
    }
  }

  // Clear all messages (for testing)
  clearMessages(): void {
    try {
      this.messagesRef.map().once((data: any, key: string) => {
        this.messagesRef.get(key).put(null);
      });
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  }

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Disconnect and cleanup
  disconnect(): void {
    try {
      this.stopHeartbeat();
      if (this.currentUser) {
        this.updateUserStatus(this.currentUser, false);
      }

      // Clean up connection status listener
      if (this.connectionStatusUnsubscribe) {
        this.connectionStatusUnsubscribe();
        this.connectionStatusUnsubscribe = null;
      }

      this.messageListeners.clear();
      this.userListeners.clear();
      this.connectionStatusListeners.clear();
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }
}

export default new ChatService();
