import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  Modal
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChatRoom } from '../types'
import rpcService from '../services/rpc'
import { RPC_COMMANDS } from '../../shared/rpc-commands'

interface HomeScreenProps {
  onChatSelect: (chatId: string, chatName: string) => void
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onChatSelect }) => {
  const [chats, setChats] = useState<ChatRoom[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newChatName, setNewChatName] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    initializeApp()

    const handleReady = () => {
      setIsConnected(true)
      console.log('P2P backend is ready')
    }

    const handleChatJoined = (data: any) => {
      const newChat: ChatRoom = {
        id: data.chatId,
        name: data.name || 'New Chat',
        participants: data.participants || [],
        createdAt: Date.now(),
        isGroup: data.participants?.length > 2
      }
      setChats(prev => [...prev, newChat])
    }

    const handleError = (data: any) => {
      console.error('P2P Error:', data)
      Alert.alert('Error', data.message || 'An error occurred')
    }

    rpcService.on(RPC_COMMANDS.READY, handleReady)
    rpcService.on(RPC_COMMANDS.CHAT_JOINED, handleChatJoined)
    rpcService.on(RPC_COMMANDS.ERROR, handleError)

    return () => {
      rpcService.off(RPC_COMMANDS.READY, handleReady)
      rpcService.off(RPC_COMMANDS.CHAT_JOINED, handleChatJoined)
      rpcService.off(RPC_COMMANDS.ERROR, handleError)
    }
  }, [])

  const initializeApp = async () => {
    try {
      setIsLoading(true)
      await rpcService.initialize()
      
      // Add a default test chat for demo purposes
      const testChat: ChatRoom = {
        id: 'test-chat-1',
        name: 'Test Chat',
        participants: ['me'],
        createdAt: Date.now(),
        isGroup: false
      }
      setChats([testChat])
      
    } catch (error) {
      console.error('Failed to initialize app:', error)
      Alert.alert('Error', 'Failed to initialize P2P connection')
    } finally {
      setIsLoading(false)
    }
  }

  const createNewChat = async () => {
    if (!newChatName.trim()) {
      Alert.alert('Error', 'Please enter a chat name')
      return
    }

    try {
      setIsLoading(true)
      const newChat = await rpcService.createChat(['me'], newChatName.trim())
      setChats(prev => [...prev, newChat])
      setShowCreateModal(false)
      setNewChatName('')
    } catch (error) {
      console.error('Failed to create chat:', error)
      Alert.alert('Error', 'Failed to create chat')
    } finally {
      setIsLoading(false)
    }
  }

  const renderChatItem = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => onChatSelect(item.id, item.name)}
    >
      <View style={styles.chatAvatar}>
        <Text style={styles.chatAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.name}</Text>
        <Text style={styles.chatPreview}>
          {item.lastMessage?.content || 'No messages yet'}
        </Text>
        <Text style={styles.chatTime}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.chatMeta}>
        <View style={[
          styles.chatStatus,
          item.isGroup ? styles.groupChat : styles.directChat
        ]}>
          <Text style={styles.chatStatusText}>
            {item.isGroup ? 'Group' : 'Direct'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PearChat</Text>
        <View style={[
          styles.connectionStatus,
          isConnected ? styles.connected : styles.disconnected
        ]}>
          <Text style={styles.connectionText}>
            {isConnected ? 'P2P Ready' : 'Connecting...'}
          </Text>
        </View>
      </View>

      {isLoading && !isConnected ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing P2P connection...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={chats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id}
            style={styles.chatsList}
            contentContainerStyle={chats.length === 0 ? styles.emptyContainer : undefined}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No chats yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create a new chat to start messaging
                </Text>
              </View>
            }
          />

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
            disabled={!isConnected}
          >
            <Text style={styles.createButtonText}>+ New Chat</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Chat</Text>
            <TextInput
              style={styles.modalInput}
              value={newChatName}
              onChangeText={setNewChatName}
              placeholder="Enter chat name"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false)
                  setNewChatName('')
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createModalButton]}
                onPress={createNewChat}
                disabled={!newChatName.trim() || isLoading}
              >
                <Text style={styles.createModalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  connectionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16
  },
  chatsList: {
    flex: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyState: {
    alignItems: 'center',
    padding: 32
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  chatAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  chatInfo: {
    flex: 1
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  chatPreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  chatTime: {
    fontSize: 12,
    color: '#999'
  },
  chatMeta: {
    alignItems: 'flex-end'
  },
  chatStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  groupChat: {
    backgroundColor: '#E3F2FD'
  },
  directChat: {
    backgroundColor: '#F3E5F5'
  },
  chatStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666'
  },
  createButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 32,
    padding: 24,
    borderRadius: 16,
    width: '80%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center'
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4
  },
  cancelButton: {
    backgroundColor: '#f0f0f0'
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600'
  },
  createModalButton: {
    backgroundColor: '#007AFF'
  },
  createModalButtonText: {
    color: '#fff',
    fontWeight: '600'
  }
})

export default HomeScreen
