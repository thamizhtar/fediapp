import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';

interface UserSetupProps {
  onUserSet: (username: string) => void;
}

const UserSetup: React.FC<UserSetupProps> = ({ onUserSet }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = () => {
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      if (Platform.OS === 'web') {
        alert('Please enter a username');
      } else {
        Alert.alert('Error', 'Please enter a username');
      }
      return;
    }

    if (trimmedUsername.length < 2) {
      if (Platform.OS === 'web') {
        alert('Username must be at least 2 characters long');
      } else {
        Alert.alert('Error', 'Username must be at least 2 characters long');
      }
      return;
    }

    if (trimmedUsername.length > 20) {
      if (Platform.OS === 'web') {
        alert('Username must be less than 20 characters long');
      } else {
        Alert.alert('Error', 'Username must be less than 20 characters long');
      }
      return;
    }

    onUserSet(trimmedUsername);
  };

  const handleSubmitEditing = () => {
    handleSubmit();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Gun Chat!</Text>
        <Text style={styles.subtitle}>
          Enter your username to start chatting
        </Text>
        
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your username"
          placeholderTextColor="#999"
          maxLength={20}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType="done"
          autoFocus
        />
        
        <TouchableOpacity
          style={[
            styles.button,
            username.trim() ? styles.buttonActive : styles.buttonInactive
          ]}
          onPress={handleSubmit}
          disabled={!username.trim()}
        >
          <Text style={[
            styles.buttonText,
            username.trim() ? styles.buttonTextActive : styles.buttonTextInactive
          ]}>
            Start Chatting
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Your username will be visible to other users in the chat
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#F8F8F8',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonActive: {
    backgroundColor: '#007AFF',
  },
  buttonInactive: {
    backgroundColor: '#E5E5EA',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextActive: {
    color: 'white',
  },
  buttonTextInactive: {
    color: '#999',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default UserSetup;
