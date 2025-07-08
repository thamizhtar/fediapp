import React, { useState, useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View, Text, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import p2pService from './src/services/p2p'

interface ChatMessage {
  id: string
  content: string
  author: string
  authorName: string
  timestamp: number
  type: string
  chatId: string
}

interface UserProfile {
  publicKey: string
  displayName: string
  createdAt: number
  updatedAt: number
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [connectedPeers, setConnectedPeers] = useState(0)
  const [chatId, setChatId] = useState('demo-p2p-room')
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [newRoomId, setNewRoomId] = useState('')
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    // Handle incoming messages
    const handleMessage = (message: ChatMessage) => {
      if (message.chatId === chatId) {
        console.log('Adding message to chat:', chatId)
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === message.id)) return prev
          return [...prev, message]
        })
      }
    }

    // Handle peer events
    const handlePeerConnected = (data: any) => {
      console.log('Peer connected:', data.publicKey)
      setConnectedPeers(p2pService.getPeerCount())
    }

    const handlePeerDisconnected = (data: any) => {
      console.log('Peer disconnected:', data.publicKey)
      setConnectedPeers(p2pService.getPeerCount())
    }

    // Set up event listeners
    p2pService.on('message-received', handleMessage)
    p2pService.on('peer-connected', handlePeerConnected)
    p2pService.on('peer-disconnected', handlePeerDisconnected)
    p2pService.on('peer-count-changed', (data: any) => {
      console.log('Peer count changed:', data.count)
      setConnectedPeers(data.count)
    })

    // Update peer count and connection status periodically
    const interval = setInterval(() => {
      const count = p2pService.getPeerCount()
      setConnectedPeers(count)
      setIsConnected(p2pService.isP2PReady())
      console.log('Periodic update - Peers:', count, 'Connected:', p2pService.isP2PReady())
    }, 3000)

    return () => {
      p2pService.off('message-received', handleMessage)
      p2pService.off('peer-connected', handlePeerConnected)
      p2pService.off('peer-disconnected', handlePeerDisconnected)
      clearInterval(interval)
    }
  }, [chatId])

  useEffect(() => {
    // Initialize app
    const initApp = async () => {
      try {
        setIsInitializing(true)
        console.log('Initializing PearChat P2P app...')
        
        // Wait for P2P service to be ready
        let retries = 0
        while (!p2pService.isP2PReady() && retries < 10) {
          await new Promise(resolve => setTimeout(resolve, 500))
          retries++
        }
        
        if (!p2pService.isP2PReady()) {
          console.log('P2P service not ready, but continuing...')
        }
        
        const userProfile = p2pService.getProfile()
        setUserProfile(userProfile)
        setIsConnected(true)
        
        // Join default room
        await joinChatRoom(chatId)
        
        console.log('PearChat P2P app initialized successfully')
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setIsConnected(false)
        Alert.alert('Initialization Error', 'Failed to initialize P2P backend. Please check console for details.')
      } finally {
        setIsInitializing(false)
      }
    }

    initApp()
  }, [])

  const joinChatRoom = async (roomId: string) => {
    try {
      console.log('Joining chat room:', roomId)
      setChatId(roomId)
      
      const result = await p2pService.joinRoom(roomId)
      
      if (result.success) {
        setMessages(result.messages || [])
        setConnectedPeers(p2pService.getPeerCount())
        console.log('Successfully joined room:', roomId)
      }
    } catch (error) {
      console.error('Failed to join chat room:', error)
      Alert.alert('Join Error', 'Failed to join chat room: ' + (error as Error).message)
    }
  }

  const sendMessage = async () => {
    if (!inputText.trim() || !isConnected) return

    try {
      const content = inputText.trim()
      setInputText('')
      
      console.log('=== SENDING MESSAGE ===')
      console.log('Room:', chatId)
      console.log('Content:', content)
      console.log('User:', userProfile?.publicKey?.slice(-8))
      
      const result = await p2pService.sendMessage(chatId, content)
      
      if (result) {
        console.log('Message sent successfully:', result.id)
        // Add to local messages immediately
        setMessages(prev => {
          if (prev.find(m => m.id === result.id)) return prev
          const newMessages = [...prev, result]
          console.log('Total messages now:', newMessages.length)
          return newMessages
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      Alert.alert('Send Error', 'Failed to send message: ' + (error as Error).message)
    }
  }

  const copyRoomId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(chatId)
      Alert.alert('Copied!', 'Room ID copied to clipboard')
    } else {
      Alert.alert('Room ID', chatId)
    }
  }

  const joinNewRoom = async () => {
    if (!newRoomId.trim()) return
    
    await joinChatRoom(newRoomId.trim())
    setShowJoinModal(false)
    setNewRoomId('')
  }

  const createNewRoom = async () => {
    try {
      const roomId = await p2pService.createRoom()
      setChatId(roomId)
    } catch (error) {
      console.error('Failed to create new room:', error)
      Alert.alert('Create Error', 'Failed to create new room: ' + (error as Error).message)
    }
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.author === userProfile?.publicKey
    const displayName = isOwnMessage ? 'You' : item.authorName || item.author.slice(0, 8)
    
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
            <Text style={styles.senderName}>{displayName}</Text>
          )}
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(item.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    )
  }

  if (isInitializing) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingTitle}>Initializing P2P Backend...</Text>
            <Text style={styles.loadingSubtitle}>
              Setting up P2P connections and chat system
            </Text>
            <Text style={styles.loadingInfo}>
              This may take a few moments on first launch
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>PearChat P2P</Text>
            <Text style={styles.roomInfo}>Room: {chatId}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[
              styles.connectionStatus,
              isConnected ? styles.connected : styles.disconnected
            ]}>
              <Text style={styles.connectionText}>
                {isConnected ? 'P2P Ready' : 'Connecting...'}
              </Text>
            </View>
            {userProfile && (
              <Text style={styles.userInfo}>
                You: {userProfile.publicKey.slice(0, 12)}...
              </Text>
            )}
            <Text style={styles.peerCount}>
              Peers: {connectedPeers} | Msgs: {messages.length}
            </Text>
          </View>
        </View>

        {/* Room Controls */}
        <View style={styles.roomControls}>
          <TouchableOpacity style={styles.roomButton} onPress={copyRoomId}>
            <Text style={styles.roomButtonText}>Copy Room</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roomButton} onPress={() => setShowJoinModal(true)}>
            <Text style={styles.roomButtonText}>Join Room</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roomButton} onPress={createNewRoom}>
            <Text style={styles.roomButtonText}>New Room</Text>
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  {isConnected 
                    ? 'Real P2P Chat Ready!' 
                    : 'Connecting to P2P network...'
                  }
                </Text>
                <Text style={styles.emptySubtitle}>
                  {isConnected 
                    ? 'Open this app in another window to test P2P messaging'
                    : 'Please wait while we establish P2P connections...'
                  }
                </Text>
                {isConnected && (
                  <View style={styles.emptyInfo}>
                    <Text style={styles.emptyInfoText}>
                      Room ID: {chatId}
                    </Text>
                    <Text style={styles.emptyInfoText}>
                      Share this room ID with others to chat
                    </Text>
                    <Text style={styles.emptyInfoText}>
                      Messages are synchronized via P2P network
                    </Text>
                  </View>
                )}
              </View>
            ) : null
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || !isConnected) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || !isConnected}
          >
            <Text style={styles.sendButtonText}>
              {isConnected ? 'Send' : 'Offline'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Join Room Modal */}
        {showJoinModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Join P2P Room</Text>
              <TextInput
                style={styles.modalInput}
                value={newRoomId}
                onChangeText={setNewRoomId}
                placeholder="Enter room ID..."
                placeholderTextColor="#999"
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowJoinModal(false)
                    setNewRoomId('')
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.joinButton]}
                  onPress={joinNewRoom}
                  disabled={!newRoomId.trim()}
                >
                  <Text style={styles.joinButtonText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8
  },
  loadingInfo: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
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
  headerLeft: {
    flex: 1
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  roomInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  headerRight: {
    alignItems: 'flex-end'
  },
  connectionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    marginBottom: 4
  },
  connected: {
    backgroundColor: '#4CAF50'
  },
  disconnected: {
    backgroundColor: '#FF9800'
  },
  connectionText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600'
  },
  userInfo: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2
  },
  peerCount: {
    fontSize: 10,
    color: '#666'
  },
  roomControls: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  roomButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center'
  },
  roomButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16
  },
  emptyInfo: {
    alignItems: 'center'
  },
  emptyInfoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4
  },
  messageContainer: {
    marginBottom: 12
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
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  senderName: {
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
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'right'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    backgroundColor: '#f9f9f9'
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc'
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
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
  joinButton: {
    backgroundColor: '#007AFF'
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600'
  }
})