import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChatMessage } from '../types'
import rpcService from '../services/rpc'
import { RPC_COMMANDS } from '../../shared/rpc-commands'

interface ChatScreenProps {
  chatId: string
  chatName: string
  onBack?: () => void
}

const ChatScreen: React.FC<ChatScreenProps> = ({ chatId, chatName, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    initializeChat()
    
    // Listen for incoming messages
    const handleMessageReceived = (data: any) => {
      if (data.chatId === chatId) {
        const newMessage: ChatMessage = {
          id: data.id || Date.now().toString(),
          content: data.content,
          author: data.author,
          authorName: data.authorName,
          timestamp: data.timestamp || Date.now(),
          type: data.type || 'text',
          chatId: data.chatId
        }
        setMessages(prev => [...prev, newMessage])
      }
    }

    const handlePeerConnected = () => {
      setIsConnected(true)
    }

    const handlePeerDisconnected = () => {
      setIsConnected(false)
    }

    rpcService.on(RPC_COMMANDS.MESSAGE_RECEIVED, handleMessageReceived)
    rpcService.on(RPC_COMMANDS.PEER_CONNECTED, handlePeerConnected)
    rpcService.on(RPC_COMMANDS.PEER_DISCONNECTED, handlePeerDisconnected)

    return () => {
      rpcService.off(RPC_COMMANDS.MESSAGE_RECEIVED, handleMessageReceived)
      rpcService.off(RPC_COMMANDS.PEER_CONNECTED, handlePeerConnected)
      rpcService.off(RPC_COMMANDS.PEER_DISCONNECTED, handlePeerDisconnected)
    }
  }, [chatId])

  const initializeChat = async () => {
    try {
      setIsLoading(true)
      await rpcService.joinChat(chatId)
      setIsConnected(true)
    } catch (error) {
      console.error('Failed to join chat:', error)
      Alert.alert('Error', 'Failed to join chat')
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return

    const tempMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputText.trim(),
      author: 'me', // Will be replaced with actual public key
      authorName: 'You',
      timestamp: Date.now(),
      type: 'text',
      chatId
    }

    // Optimistically add message to UI
    setMessages(prev => [...prev, tempMessage])
    setInputText('')

    try {
      await rpcService.sendMessage(chatId, inputText.trim())
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
      Alert.alert('Error', 'Failed to send message')
    }
  }, [inputText, chatId, isLoading])

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.author === 'me'
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          {!isOwnMessage && (
            <Text style={styles.authorName}>{item.authorName || 'Anonymous'}</Text>
          )}
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{chatName}</Text>
        <View style={[
          styles.connectionStatus,
          isConnected ? styles.connected : styles.disconnected
        ]}>
          <Text style={styles.connectionText}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    marginRight: 12
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  connectionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e0e0e0'
  },
  connected: {
    backgroundColor: '#4CAF50'
  },
  disconnected: {
    backgroundColor: '#FF9800'
  },
  connectionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500'
  },
  chatContainer: {
    flex: 1
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16
  },
  messagesContent: {
    paddingVertical: 16
  },
  messageContainer: {
    marginVertical: 4
  },
  ownMessage: {
    alignItems: 'flex-end'
  },
  otherMessage: {
    alignItems: 'flex-start'
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  authorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20
  },
  ownMessageText: {
    color: '#fff'
  },
  otherMessageText: {
    color: '#333'
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'flex-end'
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    color: '#333'
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc'
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
})

export default ChatScreen
