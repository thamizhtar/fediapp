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
      
      // Start the Bare worklet with our P2P backend
      this.worklet.start('/backend.bundle', await this.loadBackendBundle())
      
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

  private async loadBackendBundle(): Promise<string> {
    // Load the backend bundle
    // In production, this would be a pre-bundled file
    return `
// P2P Chat Backend using Pears.com Bare runtime
const { IPC } = BareKit

// Simple in-memory storage for demo
const state = {
  profile: null,
  chats: new Map(),
  messages: new Map(),
  peers: new Map()
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

// Initialize user profile
function initializeProfile() {
  if (!state.profile) {
    state.profile = {
      publicKey: 'demo-user-' + Date.now(),
      displayName: 'Demo User',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }
  return state.profile
}

// Send response back to React Native
function sendResponse(success, data, error, id) {
  const response = { success, data, error, id }
  IPC.write(Buffer.from(JSON.stringify(response)))
}

// Send event to React Native
function sendEvent(command, data) {
  const event = { success: true, data: { command, ...data } }
  IPC.write(Buffer.from(JSON.stringify(event)))
}

// Handle RPC requests
function handleRequest(request) {
  const { command, data, id } = request
  try {
    switch (command) {
      case RPC_COMMANDS.GET_PROFILE:
        const profile = initializeProfile()
        sendResponse(true, profile, null, id)
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
        sendResponse(true, newChat, null, id)
        break
      case RPC_COMMANDS.JOIN_CHAT:
        const joinChatId = data.chatId
        if (!state.chats.has(joinChatId)) {
          const demoChat = {
            id: joinChatId,
            name: 'Demo Chat',
            participants: [state.profile?.publicKey],
            createdAt: Date.now(),
            isGroup: false
          }
          state.chats.set(joinChatId, demoChat)
          state.messages.set(joinChatId, [])
        }
        sendResponse(true, { chatId: joinChatId }, null, id)
        sendEvent(RPC_COMMANDS.CHAT_JOINED, { chatId: joinChatId })
        break
      case RPC_COMMANDS.SEND_MESSAGE:
        const { chatId, content } = data
        const message = {
          id: 'msg-' + Date.now(),
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
        setTimeout(() => {
          sendEvent(RPC_COMMANDS.MESSAGE_RECEIVED, message)
        }, 100)
        break
      default:
        sendResponse(false, null, 'Unknown command: ' + command, id)
    }
  } catch (error) {
    sendResponse(false, null, error.message, id)
  }
}

// Listen for messages from React Native
IPC.on('data', (data) => {
  try {
    const request = JSON.parse(data.toString())
    handleRequest(request)
  } catch (error) {
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
