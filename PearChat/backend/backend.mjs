// P2P Chat Backend using Pears.com Bare runtime
// This runs in the Bare JavaScript runtime for P2P functionality

const { IPC } = BareKit

// Import P2P modules (these would be bundled in production)
// For now, we'll simulate the P2P functionality

// Application state
const state = {
  profile: null,
  chats: new Map(),
  messages: new Map(),
  peers: new Map(),
  swarm: null,
  autobase: null,
  isReady: false
}

// RPC Commands
const RPC_COMMANDS = {
  SEND_MESSAGE: 'sendMessage',
  JOIN_CHAT: 'joinChat',
  CREATE_CHAT: 'createChat',
  LEAVE_CHAT: 'leaveChat',
  UPDATE_PROFILE: 'updateProfile',
  GET_PROFILE: 'getProfile',
  CONNECT_PEER: 'connectPeer',
  DISCONNECT_PEER: 'disconnectPeer',
  MESSAGE_RECEIVED: 'messageReceived',
  PEER_CONNECTED: 'peerConnected',
  PEER_DISCONNECTED: 'peerDisconnected',
  CHAT_JOINED: 'chatJoined',
  CHAT_LEFT: 'chatLeft',
  READY: 'ready',
  ERROR: 'error'
}

// Initialize P2P networking
async function initializeP2P() {
  try {
    // Generate or load user keypair
    const keyPair = generateKeyPair()

    // Initialize user profile
    state.profile = {
      publicKey: keyPair.publicKey.toString('hex'),
      displayName: 'P2P User',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    // Initialize Hyperswarm (simulated for now)
    state.swarm = createMockSwarm(keyPair)

    // Set up event handlers
    state.swarm.on('connection', handlePeerConnection)
    state.swarm.on('peer-discovery', handlePeerDiscovery)

    state.isReady = true
    console.log('P2P backend initialized with public key:', state.profile.publicKey)

    return state.profile
  } catch (error) {
    console.error('Failed to initialize P2P:', error)
    throw error
  }
}

// Generate a mock keypair (in production, this would use real crypto)
function generateKeyPair() {
  const publicKey = Buffer.from('demo-pubkey-' + Date.now() + Math.random().toString(36))
  const secretKey = Buffer.from('demo-seckey-' + Date.now() + Math.random().toString(36))
  return { publicKey, secretKey }
}

// Create mock Hyperswarm instance
function createMockSwarm(keyPair) {
  const EventEmitter = {
    listeners: {},
    on(event, callback) {
      if (!this.listeners[event]) this.listeners[event] = []
      this.listeners[event].push(callback)
    },
    emit(event, ...args) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => callback(...args))
      }
    }
  }

  return {
    ...EventEmitter,
    keyPair,
    connections: new Set(),
    topics: new Set(),

    join(topic) {
      this.topics.add(topic.toString('hex'))
      console.log('Joined topic:', topic.toString('hex'))

      // Simulate peer discovery after a delay
      setTimeout(() => {
        this.emit('peer-discovery', {
          publicKey: Buffer.from('peer-' + Math.random().toString(36)),
          topic: topic.toString('hex')
        })
      }, 1000)
    },

    leave(topic) {
      this.topics.delete(topic.toString('hex'))
      console.log('Left topic:', topic.toString('hex'))
    }
  }
}

// Handle peer connections
function handlePeerConnection(peer) {
  console.log('Peer connected:', peer.publicKey?.toString('hex'))

  const peerKey = peer.publicKey?.toString('hex') || 'unknown-peer'
  state.peers.set(peerKey, {
    publicKey: peerKey,
    isOnline: true,
    lastSeen: Date.now(),
    connection: peer
  })

  sendEvent(RPC_COMMANDS.PEER_CONNECTED, { publicKey: peerKey })

  // Set up message handling for this peer
  peer.on('data', (data) => {
    try {
      const message = JSON.parse(data.toString())
      handlePeerMessage(peerKey, message)
    } catch (error) {
      console.error('Failed to parse peer message:', error)
    }
  })

  peer.on('close', () => {
    console.log('Peer disconnected:', peerKey)
    if (state.peers.has(peerKey)) {
      state.peers.get(peerKey).isOnline = false
      state.peers.get(peerKey).lastSeen = Date.now()
    }
    sendEvent(RPC_COMMANDS.PEER_DISCONNECTED, { publicKey: peerKey })
  })
}

// Handle peer discovery
function handlePeerDiscovery(peerInfo) {
  console.log('Discovered peer:', peerInfo.publicKey.toString('hex'))

  // Simulate connection establishment
  setTimeout(() => {
    const mockPeer = {
      publicKey: peerInfo.publicKey,
      write: (data) => console.log('Sending to peer:', data.toString()),
      on: (event, callback) => {
        // Mock event handling
        if (event === 'close') {
          setTimeout(callback, 5000 + Math.random() * 10000) // Random disconnect
        }
      }
    }

    handlePeerConnection(mockPeer)
  }, 500)
}

// Handle messages from peers
function handlePeerMessage(peerKey, message) {
  console.log('Received message from peer:', peerKey, message)

  if (message.type === 'chat-message') {
    const chatMessage = {
      id: message.id || 'msg-' + Date.now(),
      content: message.content,
      author: peerKey,
      authorName: message.authorName || 'Anonymous',
      timestamp: message.timestamp || Date.now(),
      type: 'text',
      chatId: message.chatId
    }

    // Store message
    if (!state.messages.has(message.chatId)) {
      state.messages.set(message.chatId, [])
    }
    state.messages.get(message.chatId).push(chatMessage)

    // Notify UI
    sendEvent(RPC_COMMANDS.MESSAGE_RECEIVED, chatMessage)
  }
}

// Broadcast message to all connected peers
function broadcastMessageToPeers(message) {
  const peerMessage = {
    type: 'chat-message',
    id: message.id,
    content: message.content,
    author: message.author,
    authorName: message.authorName,
    timestamp: message.timestamp,
    chatId: message.chatId
  }

  const messageData = JSON.stringify(peerMessage)

  state.peers.forEach((peer, peerKey) => {
    if (peer.isOnline && peer.connection) {
      try {
        peer.connection.write(Buffer.from(messageData))
        console.log('Sent message to peer:', peerKey)
      } catch (error) {
        console.error('Failed to send message to peer:', peerKey, error)
      }
    }
  })
}

// Send response back to React Native
function sendResponse(success, data, error, id) {
  const response = {
    success,
    data,
    error,
    id
  }
  IPC.write(Buffer.from(JSON.stringify(response)))
}

// Send event to React Native
function sendEvent(command, data) {
  const event = {
    success: true,
    data: { command, ...data }
  }
  IPC.write(Buffer.from(JSON.stringify(event)))
}

// Handle RPC requests from React Native
async function handleRequest(request) {
  const { command, data, id } = request

  try {
    switch (command) {
      case RPC_COMMANDS.GET_PROFILE:
        if (!state.isReady) {
          await initializeP2P()
        }
        sendResponse(true, state.profile, null, id)
        break

      case RPC_COMMANDS.UPDATE_PROFILE:
        if (state.profile) {
          Object.assign(state.profile, data, { updatedAt: Date.now() })
        } else {
          state.profile = { ...data, createdAt: Date.now(), updatedAt: Date.now() }
        }
        sendResponse(true, state.profile, null, id)
        break

      case RPC_COMMANDS.CREATE_CHAT:
        const newChatId = 'chat-' + Date.now()
        const newChat = {
          id: newChatId,
          name: data.name || 'New Chat',
          participants: data.participants || [state.profile?.publicKey],
          createdAt: Date.now(),
          isGroup: (data.participants?.length || 1) > 2
        }
        state.chats.set(newChatId, newChat)
        state.messages.set(newChatId, [])

        // Join the chat topic for P2P discovery
        if (state.swarm) {
          const topic = Buffer.from(newChatId)
          state.swarm.join(topic)
        }

        sendResponse(true, newChat, null, id)
        break

      case RPC_COMMANDS.JOIN_CHAT:
        const joinChatId = data.chatId
        if (!state.chats.has(joinChatId)) {
          // Create the chat if it doesn't exist
          const demoChat = {
            id: joinChatId,
            name: 'P2P Chat',
            participants: [state.profile?.publicKey],
            createdAt: Date.now(),
            isGroup: false
          }
          state.chats.set(joinChatId, demoChat)
          state.messages.set(joinChatId, [])
        }

        // Join the chat topic for P2P discovery
        if (state.swarm) {
          const topic = Buffer.from(joinChatId)
          state.swarm.join(topic)
        }

        sendResponse(true, { chatId: joinChatId }, null, id)
        sendEvent(RPC_COMMANDS.CHAT_JOINED, { chatId: joinChatId })
        break

      case RPC_COMMANDS.LEAVE_CHAT:
        const leaveChatId = data.chatId

        // Leave the chat topic
        if (state.swarm) {
          const topic = Buffer.from(leaveChatId)
          state.swarm.leave(topic)
        }

        sendResponse(true, { chatId: leaveChatId }, null, id)
        sendEvent(RPC_COMMANDS.CHAT_LEFT, { chatId: leaveChatId })
        break

      case RPC_COMMANDS.SEND_MESSAGE:
        const { chatId: messageChatId, content } = data
        const message = {
          id: 'msg-' + Date.now(),
          content,
          author: state.profile?.publicKey,
          authorName: state.profile?.displayName,
          timestamp: Date.now(),
          type: 'text',
          chatId: messageChatId
        }

        if (!state.messages.has(messageChatId)) {
          state.messages.set(messageChatId, [])
        }
        state.messages.get(messageChatId).push(message)

        // Broadcast message to connected peers
        broadcastMessageToPeers(message)

        sendResponse(true, { messageId: message.id }, null, id)

        // Echo the message back to show it in the UI
        setTimeout(() => {
          sendEvent(RPC_COMMANDS.MESSAGE_RECEIVED, message)
        }, 100)
        break

      case RPC_COMMANDS.CONNECT_PEER:
        const peerKey = data.publicKey
        state.peers.set(peerKey, {
          publicKey: peerKey,
          isOnline: true,
          lastSeen: Date.now()
        })
        sendResponse(true, { publicKey: peerKey }, null, id)
        sendEvent(RPC_COMMANDS.PEER_CONNECTED, { publicKey: peerKey })
        break

      case RPC_COMMANDS.DISCONNECT_PEER:
        const peerKey2 = data.publicKey
        if (state.peers.has(peerKey2)) {
          state.peers.get(peerKey2).isOnline = false
          state.peers.get(peerKey2).lastSeen = Date.now()
        }
        sendResponse(true, { publicKey: peerKey2 }, null, id)
        sendEvent(RPC_COMMANDS.PEER_DISCONNECTED, { publicKey: peerKey2 })
        break

      default:
        sendResponse(false, null, `Unknown command: ${command}`, id)
    }
  } catch (error) {
    console.error('Backend error:', error)
    sendResponse(false, null, error.message, id)
  }
}

// Listen for messages from React Native
IPC.on('data', (data) => {
  try {
    const request = JSON.parse(data.toString())
    console.log('Backend received:', request)
    handleRequest(request)
  } catch (error) {
    console.error('Failed to parse request:', error)
    sendResponse(false, null, 'Invalid request format')
  }
})

// Initialize P2P backend
async function startBackend() {
  try {
    console.log('Starting P2P Chat Backend...')
    await initializeP2P()

    console.log('P2P Chat Backend initialized successfully')
    sendEvent(RPC_COMMANDS.READY, {
      message: 'P2P backend is ready',
      profile: state.profile
    })
  } catch (error) {
    console.error('Failed to start backend:', error)
    sendEvent(RPC_COMMANDS.ERROR, {
      message: 'Failed to initialize P2P backend',
      error: error.message
    })
  }
}

// Start the backend
startBackend()
