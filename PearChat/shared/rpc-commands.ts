// RPC Commands for communication between React Native and Bare runtime
export const RPC_COMMANDS = {
  // Chat operations
  SEND_MESSAGE: 'sendMessage',
  JOIN_CHAT: 'joinChat',
  CREATE_CHAT: 'createChat',
  LEAVE_CHAT: 'leaveChat',
  
  // User operations
  UPDATE_PROFILE: 'updateProfile',
  GET_PROFILE: 'getProfile',
  
  // Peer operations
  CONNECT_PEER: 'connectPeer',
  DISCONNECT_PEER: 'disconnectPeer',
  
  // Events from Bare to React Native
  MESSAGE_RECEIVED: 'messageReceived',
  PEER_CONNECTED: 'peerConnected',
  PEER_DISCONNECTED: 'peerDisconnected',
  CHAT_JOINED: 'chatJoined',
  CHAT_LEFT: 'chatLeft',
  
  // System events
  READY: 'ready',
  ERROR: 'error'
} as const

export type RPCCommand = typeof RPC_COMMANDS[keyof typeof RPC_COMMANDS]
