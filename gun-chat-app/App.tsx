import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorBoundary from './components/ErrorBoundary';
import UserSetup from './components/UserSetup';
import ChatScreen from './screens/ChatScreen';

// Import EdgeToEdge conditionally
let EdgeToEdge: any = null;
try {
  EdgeToEdge = require('react-native-edge-to-edge').EdgeToEdge;
} catch (error) {
  console.warn('EdgeToEdge not available:', error);
}

const STORAGE_KEY = 'gun-chat-username';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Enable edge-to-edge for Android if available
    if (Platform.OS === 'android' && EdgeToEdge && EdgeToEdge.enable) {
      try {
        EdgeToEdge.enable();
      } catch (error) {
        console.warn('Failed to enable EdgeToEdge:', error);
      }
    }
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        const storedUser = localStorage.getItem(STORAGE_KEY);
        if (storedUser) {
          setCurrentUser(storedUser);
        }
      } else {
        // Use AsyncStorage for React Native
        const storedUser = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedUser) {
          setCurrentUser(storedUser);
        }
      }
    } catch (error) {
      console.error('Failed to load stored user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSet = async (username: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(STORAGE_KEY, username);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, username);
      }
      setCurrentUser(username);
    } catch (error) {
      console.error('Failed to store username:', error);
      // Still set the user even if storage fails
      setCurrentUser(username);
    }
  };

  const handleLogout = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      setCurrentUser(null);
    } catch (error) {
      console.error('Failed to clear stored user:', error);
      // Still logout even if storage fails
      setCurrentUser(null);
    }
  };

  if (isLoading) {
    return <View style={styles.container} />;
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        {currentUser ? (
          <ChatScreen
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        ) : (
          <UserSetup onUserSet={handleUserSet} />
        )}
        <StatusBar style="auto" />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
