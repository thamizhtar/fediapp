// P2P Chat Backend using Pears.com Bare runtime
// This runs in the Bare JavaScript runtime for P2P functionality

const { IPC } = BareKit

// Import real P2P modules
import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Autobase from 'autobase'
import Hyperbee from 'hyperbee'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'

// Application state
const state = {
  profile: null,
  chats: new Map(),
  messages: new Map(),
  peers: new Map(),
  swarm: null,
  corestore: null,
  autobase: null,
  keyPair: null,
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
    state.keyPair = crypto.keyPair()

    // Initialize user profile
    state.profile = {
      publicKey: state.keyPair.publicKey.toString('hex'),
      displayName: 'P2P User',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    // Initialize Corestore for data storage
    state.corestore = new Corestore('./data')

    // Initialize Hyperswarm for P2P networking
    state.swarm = new Hyperswarm()

    // Set up event handlers
    state.swarm.on('connection', handlePeerConnection)

    state.isReady = true
    console.log('P2P backend initialized with public key:', state.profile.publicKey)

    return state.profile
  } catch (error) {
    console.error('Failed to initialize P2P:', error)
    throw error
  }
}

// Create Autobase for a chat room
async function createChatAutobase(chatId) {
  try {
    const topic = b4a.from(chatId, 'hex')

    // Create a local writer core
    const localWriter = state.corestore.get({ name: `chat-${chatId}-local` })
    await localWriter.ready()

    // Create autobase with the local writer
    const autobase = new Autobase([localWriter], {
      input: localWriter,
      eagerUpdate: true
    })

    await autobase.ready()

    // Set up autobase listener for real-time updates
    await setupAutobaseListener(chatId, autobase)

    // Set up peer replication
    state.swarm.on('connection', (connection) => {
      console.log('New peer connected for chat:', chatId)
      autobase.replicate(connection)
    })

    // Join the swarm topic for this chat
    const discovery = state.swarm.join(topic, { server: true, client: true })
    await discovery.flushed()

    console.log('Created autobase for chat:', chatId)
    return autobase
  } catch (error) {
    console.error('Failed to create chat autobase:', error)
    throw error
  }
}

// Handle peer connections
function handlePeerConnection(connection, info) {
  console.log('Peer connected:', info.publicKey?.toString('hex'))

  const peerKey = info.publicKey?.toString('hex') || `peer-${Date.now()}`
  state.peers.set(peerKey, {
    publicKey: peerKey,
    isOnline: true,
    lastSeen: Date.now(),
    connection: connection
  })

  sendEvent(RPC_COMMANDS.PEER_CONNECTED, { publicKey: peerKey })

  // Set up message handling for this peer
  connection.on('data', (data) => {
    try {
      const message = JSON.parse(data.toString())
      handlePeerMessage(peerKey, message)
    } catch (error) {
      console.error('Failed to parse peer message:', error)
    }
  })

  connection.on('close', () => {
    console.log('Peer disconnected:', peerKey)
    if (state.peers.has(peerKey)) {
      state.peers.get(peerKey).isOnline = false
      state.peers.get(peerKey).lastSeen = Date.now()
    }
    sendEvent(RPC_COMMANDS.PEER_DISCONNECTED, { publicKey: peerKey })
  })

  connection.on('error', (error) => {
    console.error('Peer connection error:', error)
  })
}

// Send message to autobase
async function sendMessageToAutobase(chatId, message) {
  try {
    if (!state.chats.has(chatId)) {
      throw new Error('Chat not found')
    }

    const chat = state.chats.get(chatId)
    if (!chat.autobase) {
      throw new Error('Chat autobase not initialized')
    }

    // Append message to autobase
    const messageData = {
      type: 'message',
      id: message.id,
      content: message.content,
      author: message.author,
      authorName: message.authorName,
      timestamp: message.timestamp,
      chatId: message.chatId
    }

    await chat.autobase.append(JSON.stringify(messageData))
    console.log('Message sent to autobase:', message.id)
  } catch (error) {
    console.error('Failed to send message to autobase:', error)
    throw error
  }
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

// Listen for autobase updates and sync messages
async function setupAutobaseListener(chatId, autobase) {
  try {
    autobase.on('append', async () => {
      try {
        // Read new messages from autobase
        const length = autobase.length
        const lastIndex = state.messages.get(chatId)?.length || 0

        for (let i = lastIndex; i < length; i++) {
          const block = await autobase.get(i)
          if (block) {
            const messageData = JSON.parse(block.toString())

            // Only process messages from other peers
            if (messageData.author !== state.profile?.publicKey) {
              const message = {
                id: messageData.id,
                content: messageData.content,
                author: messageData.author,
                authorName: messageData.authorName,
                timestamp: messageData.timestamp,
                type: messageData.type || 'text',
                chatId: messageData.chatId
              }

              if (!state.messages.has(chatId)) {
                state.messages.set(chatId, [])
              }
              state.messages.get(chatId).push(message)

              // Notify UI of new message
              sendEvent(RPC_COMMANDS.MESSAGE_RECEIVED, message)
            }
          }
        }
      } catch (error) {
        console.error('Failed to process autobase update:', error)
      }
    })
  } catch (error) {
    console.error('Failed to setup autobase listener:', error)
  }
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
        const newChatId = crypto.randomBytes(32).toString('hex')
        const newChat = {
          id: newChatId,
          name: data.name || 'New Chat',
          participants: data.participants || [state.profile?.publicKey],
          createdAt: Date.now(),
          isGroup: (data.participants?.length || 1) > 2
        }

        // Create autobase for this chat
        try {
          newChat.autobase = await createChatAutobase(newChatId)
          state.chats.set(newChatId, newChat)
          state.messages.set(newChatId, [])
          sendResponse(true, newChat, null, id)
        } catch (error) {
          sendResponse(false, null, `Failed to create chat: ${error.message}`, id)
        }
        break

      case RPC_COMMANDS.JOIN_CHAT:
        const joinChatId = data.chatId
        try {
          if (!state.chats.has(joinChatId)) {
            // Create the chat if it doesn't exist
            const joinChat = {
              id: joinChatId,
              name: 'P2P Chat',
              participants: [state.profile?.publicKey],
              createdAt: Date.now(),
              isGroup: false
            }

            // Create autobase for this chat
            joinChat.autobase = await createChatAutobase(joinChatId)
            state.chats.set(joinChatId, joinChat)
            state.messages.set(joinChatId, [])
          } else {
            // Join existing chat's swarm topic
            const topic = b4a.from(joinChatId, 'hex')
            const discovery = state.swarm.join(topic, { server: true, client: true })
            await discovery.flushed()
          }

          sendResponse(true, { chatId: joinChatId }, null, id)
          sendEvent(RPC_COMMANDS.CHAT_JOINED, { chatId: joinChatId })
        } catch (error) {
          sendResponse(false, null, `Failed to join chat: ${error.message}`, id)
        }
        break

      case RPC_COMMANDS.LEAVE_CHAT:
        const leaveChatId = data.chatId
        try {
          // Leave the chat topic
          if (state.swarm) {
            const topic = b4a.from(leaveChatId, 'hex')
            state.swarm.leave(topic)
          }

          // Clean up chat data
          if (state.chats.has(leaveChatId)) {
            const chat = state.chats.get(leaveChatId)
            if (chat.autobase) {
              await chat.autobase.close()
            }
            state.chats.delete(leaveChatId)
            state.messages.delete(leaveChatId)
          }

          sendResponse(true, { chatId: leaveChatId }, null, id)
          sendEvent(RPC_COMMANDS.CHAT_LEFT, { chatId: leaveChatId })
        } catch (error) {
          sendResponse(false, null, `Failed to leave chat: ${error.message}`, id)
        }
        break

      case RPC_COMMANDS.SEND_MESSAGE:
        const { chatId: messageChatId, content } = data
        try {
          const message = {
            id: crypto.randomBytes(16).toString('hex'),
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

          // Send message to autobase
          await sendMessageToAutobase(messageChatId, message)

          sendResponse(true, { messageId: message.id }, null, id)

          // Echo the message back to show it in the UI
          setTimeout(() => {
            sendEvent(RPC_COMMANDS.MESSAGE_RECEIVED, message)
          }, 100)
        } catch (error) {
          sendResponse(false, null, `Failed to send message: ${error.message}`, id)
        }
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
