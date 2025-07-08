import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Message } from '../gun.config';

interface MessageItemProps {
  message: Message;
  isOwnMessage?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isOwnMessage = false }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      <View style={[
        styles.bubble,
        isOwnMessage ? styles.ownBubble : styles.otherBubble
      ]}>
        {!isOwnMessage && (
          <Text style={styles.username}>{message.user}</Text>
        )}
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {message.text}
        </Text>
        <Text style={[
          styles.timestamp,
          isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp
        ]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    marginHorizontal: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    ...Platform.select({
      android: {
        elevation: 1,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 6,
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    ...Platform.select({
      android: {
        includeFontPadding: false,
      },
    }),
  },
  ownMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#1C1C1E',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTimestamp: {
    color: '#8E8E93',
  },
});

export default MessageItem;
