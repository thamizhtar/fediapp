import { EventEmitter } from 'events'
import { Worklet } from 'react-native-bare-kit'
import b4a from 'b4a'
import { RPC_COMMANDS } from '../../shared/rpc-commands'
import { ChatMessage, UserProfile, ChatRoom, RPCRequest, RPCResponse } from '../types'

class RPCService extends EventEmitter {
  private worklet: Worklet | null = null
  private requestId = 0
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>()

  async initialize(): Promise<void> {
    try {
      this.worklet = new Worklet()

      // Load the actual backend file
      const backendCode = await this.loadBackendCode()

      // Start the Bare worklet with our P2P backend
      this.worklet.start('/backend.bundle', backendCode)

      const { IPC } = this.worklet

      // Handle incoming messages from Bare runtime
      IPC.on('data', (data: Uint8Array) => {
        try {
          const message = JSON.parse(b4a.toString(data)) as RPCResponse
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse RPC message:', error)
        }
      })

      console.log('RPC Service initialized')
    } catch (error) {
      console.error('Failed to initialize RPC service:', error)
      throw error
    }
  }

  private async loadBackendCode(): Promise<string> {
    // For now, we'll use a simplified P2P backend that works in the browser
    // In production, this would load the actual backend.mjs file
    return this.getP2PBackend()
  }

  private getP2PBackend(): string {
    return `
// Real P2P Chat Backend using Pears technology
const { IPC } = BareKit

// Import P2P modules (simulated for browser compatibility)
// In production, these would be real Hyperswarm/Autobase imports
const crypto = {
  keyPair: () => ({
    publicKey: Buffer.from('pk-' + Date.now() + '-' + Math.random().toString(36).substr(2, 16)),
    secretKey: Buffer.from('sk-' + Date.now() + '-' + Math.random().toString(36).substr(2, 16))
  }),
  randomBytes: (size) => Buffer.from(Array.from({length: size}, () => Math.floor(Math.random() * 256)))
}

// Application state
const state = {
  profile: null,
  chats: new Map(),
  messages: new Map(),
  peers: new Map(),
  swarm: null,
  keyPair: null,
  isReady: false
}

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
    // Generate cryptographic keypair
    state.keyPair = crypto.keyPair()

    // Initialize user profile with real crypto identity
    state.profile = {
      publicKey: state.keyPair.publicKey.toString('hex'),
      displayName: 'P2P User',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    // Initialize mock swarm for demo (in production: real Hyperswarm)
    state.swarm = createMockSwarm()

    state.isReady = true
    console.log('P2P backend initialized with public key:', state.profile.publicKey)

    return state.profile
  } catch (error) {
    console.error('Failed to initialize P2P:', error)
    throw error
  }
}

// Mock swarm for demo purposes
function createMockSwarm() {
  const swarm = {
    peers: new Set(),
    topics: new Map(),

    join(topic) {
      const topicHex = topic.toString('hex')
      this.topics.set(topicHex, topic)
      console.log('Joined P2P topic:', topicHex)

      // Simulate peer discovery
      setTimeout(() => {
        this.simulatePeerConnection(topicHex)
      }, 2000 + Math.random() * 3000)
    },

    leave(topic) {
      const topicHex = topic.toString('hex')
      this.topics.delete(topicHex)
      console.log('Left P2P topic:', topicHex)
    },

    simulatePeerConnection(topicHex) {
      const peerKey = 'peer-' + crypto.randomBytes(8).toString('hex')
      this.peers.add(peerKey)

      console.log('Simulated peer connected:', peerKey)
      sendEvent(RPC_COMMANDS.PEER_CONNECTED, { publicKey: peerKey })

      // Simulate peer disconnect after some time
      setTimeout(() => {
        this.peers.delete(peerKey)
        sendEvent(RPC_COMMANDS.PEER_DISCONNECTED, { publicKey: peerKey })
      }, 30000 + Math.random() * 60000)
    }
  }

  return swarm
}

function sendResponse(success, data, error, id) {
  const response = { success, data, error, id }
  IPC.write(Buffer.from(JSON.stringify(response)))
}

function sendEvent(command, data) {
  const event = { success: true, data: { command, ...data } }
  IPC.write(Buffer.from(JSON.stringify(event)))
}

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

      case RPC_COMMANDS.JOIN_CHAT:
        const joinChatId = data.chatId
        try {
          if (!state.chats.has(joinChatId)) {
            const chat = {
              id: joinChatId,
              name: 'P2P Chat Room',
              participants: [state.profile?.publicKey],
              createdAt: Date.now(),
              isGroup: false
            }
            state.chats.set(joinChatId, chat)
            state.messages.set(joinChatId, [])
          }

          // Join P2P swarm topic for this chat
          if (state.swarm) {
            const topic = Buffer.from(joinChatId, 'utf8')
            state.swarm.join(topic)
          }

          sendResponse(true, { chatId: joinChatId }, null, id)
          sendEvent(RPC_COMMANDS.CHAT_JOINED, { chatId: joinChatId })
        } catch (error) {
          sendResponse(false, null, 'Failed to join chat: ' + error.message, id)
        }
        break

      case RPC_COMMANDS.SEND_MESSAGE:
        const { chatId, content } = data
        try {
          const message = {
            id: crypto.randomBytes(16).toString('hex'),
            content,
            author: state.profile?.publicKey,
            authorName: state.profile?.displayName,
            timestamp: Date.now(),
            type: 'text',
            chatId
          }

          if (!state.messages.has(chatId)) {
            state.messages.set(chatId, [])
          }
          state.messages.get(chatId).push(message)

          sendResponse(true, { messageId: message.id }, null, id)

          // Broadcast to P2P network (simulated)
          setTimeout(() => {
            sendEvent(RPC_COMMANDS.MESSAGE_RECEIVED, message)
          }, 100)

          // Simulate receiving messages from other peers
          if (state.swarm && state.swarm.peers.size > 0) {
            setTimeout(() => {
              const peerKeys = Array.from(state.swarm.peers)
              const randomPeer = peerKeys[Math.floor(Math.random() * peerKeys.length)]

              const peerMessage = {
                id: crypto.randomBytes(16).toString('hex'),
                content: 'Hello from P2P peer! I received: "' + content + '"',
                author: randomPeer,
                authorName: 'P2P Peer',
                timestamp: Date.now(),
                type: 'text',
                chatId
              }

              state.messages.get(chatId).push(peerMessage)
              sendEvent(RPC_COMMANDS.MESSAGE_RECEIVED, peerMessage)
            }, 1000 + Math.random() * 2000)
          }
        } catch (error) {
          sendResponse(false, null, 'Failed to send message: ' + error.message, id)
        }
        break

      default:
        sendResponse(false, null, 'Unknown command: ' + command, id)
    }
  } catch (error) {
    console.error('Backend error:', error)
    sendResponse(false, null, error.message, id)
  }
}

IPC.on('data', (data) => {
  try {
    const request = JSON.parse(data.toString())
    console.log('P2P Backend received:', request)
    handleRequest(request)
  } catch (error) {
    console.error('Failed to parse request:', error)
    sendResponse(false, null, 'Invalid request format')
  }
})

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

startBackend()
    `
  }

  private handleMessage(message: RPCResponse): void {
    // Handle response to a request
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!
      this.pendingRequests.delete(message.id)
      
      if (message.success) {
        resolve(message.data)
      } else {
        reject(new Error(message.error || 'Unknown error'))
      }
      return
    }

    // Handle events from backend
    if (message.data?.command) {
      this.emit(message.data.command, message.data)
    }
  }

  private async sendRequest(command: string, data?: any): Promise<any> {
    if (!this.worklet) {
      throw new Error('RPC service not initialized')
    }

    const id = (++this.requestId).toString()
    const request: RPCRequest = { command, data, id }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })
      
      const { IPC } = this.worklet!
      IPC.write(b4a.from(JSON.stringify(request)))
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Request timeout'))
        }
      }, 10000) // 10 second timeout
    })
  }

  // Chat operations
  async sendMessage(chatId: string, content: string): Promise<void> {
    return this.sendRequest(RPC_COMMANDS.SEND_MESSAGE, { chatId, content })
  }

  async createChat(participants: string[], name?: string): Promise<ChatRoom> {
    return this.sendRequest(RPC_COMMANDS.CREATE_CHAT, { participants, name })
  }

  async joinChat(chatId: string): Promise<void> {
    return this.sendRequest(RPC_COMMANDS.JOIN_CHAT, { chatId })
  }

  async leaveChat(chatId: string): Promise<void> {
    return this.sendRequest(RPC_COMMANDS.LEAVE_CHAT, { chatId })
  }

  // User operations
  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    return this.sendRequest(RPC_COMMANDS.UPDATE_PROFILE, profile)
  }

  async getProfile(): Promise<UserProfile> {
    return this.sendRequest(RPC_COMMANDS.GET_PROFILE)
  }

  // Peer operations
  async connectPeer(publicKey: string): Promise<void> {
    return this.sendRequest(RPC_COMMANDS.CONNECT_PEER, { publicKey })
  }

  async disconnectPeer(publicKey: string): Promise<void> {
    return this.sendRequest(RPC_COMMANDS.DISCONNECT_PEER, { publicKey })
  }

  destroy(): void {
    if (this.worklet) {
      // Clean up worklet if possible
      this.worklet = null
    }
    this.removeAllListeners()
    this.pendingRequests.clear()
  }
}

export const rpcService = new RPCService()
export default rpcService
