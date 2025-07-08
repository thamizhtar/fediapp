import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  placeholder = 'Type a message...',
  disabled = false,
  isLoading = false
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleSubmitEditing = () => {
    if (Platform.OS !== 'web') {
      handleSend();
    }
  };

  const canSend = message.trim() && !disabled && !isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
            disabled && styles.textInputDisabled
          ]}
          value={message}
          onChangeText={setMessage}
          placeholder={disabled ? 'Connecting...' : placeholder}
          placeholderTextColor={disabled ? "#CCC" : "#999"}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={false}
          returnKeyType="send"
          editable={!disabled}
          textAlignVertical="center"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonInactive
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={[
              styles.sendButtonText,
              canSend ? styles.sendButtonTextActive : styles.sendButtonTextInactive
            ]}>
              Send
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    ...Platform.select({
      android: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 70,
    maxHeight: 150,
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginRight: 12,
    maxHeight: 120,
    fontSize: 16,
    lineHeight: 20,
    backgroundColor: '#F8F9FA',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
      android: {
        textAlignVertical: 'top',
      },
    }),
  },
  textInputDisabled: {
    backgroundColor: '#F0F0F0',
    borderColor: '#D0D0D0',
    color: '#999',
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    minWidth: 70,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
    }),
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonInactive: {
    backgroundColor: '#E5E5EA',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonTextActive: {
    color: '#ffffff',
  },
  sendButtonTextInactive: {
    color: '#999',
  },
});

export default MessageInput;
