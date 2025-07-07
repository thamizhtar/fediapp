// Type definitions for the P2P Chat App

export interface ChatMessage {
  id: string
  content: string
  author: string
  authorName?: string
  timestamp: number
  type: 'text' | 'file' | 'image'
  chatId: string
}

export interface UserProfile {
  publicKey: string
  displayName: string
  avatar?: string
  createdAt: number
  updatedAt: number
}

export interface ChatRoom {
  id: string
  name: string
  participants: string[] // Array of public keys
  createdAt: number
  lastMessage?: ChatMessage
  isGroup: boolean
}

export interface PeerInfo {
  publicKey: string
  displayName?: string
  isOnline: boolean
  lastSeen: number
}

export interface RPCRequest {
  command: string
  data?: any
  id?: string
}

export interface RPCResponse {
  success: boolean
  data?: any
  error?: string
  id?: string
}

// App state interfaces
export interface AppState {
  user: UserProfile | null
  chats: ChatRoom[]
  messages: { [chatId: string]: ChatMessage[] }
  peers: { [publicKey: string]: PeerInfo }
  isConnected: boolean
  isLoading: boolean
}

// Navigation types
export type RootStackParamList = {
  Home: undefined
  Chat: { chatId: string; chatName: string }
  Profile: undefined
  CreateChat: undefined
  Settings: undefined
}
