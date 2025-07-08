# How to Test P2P Chat Between Two Users

## Current Status

✅ **Working Features:**
- React Native UI connected to P2P backend
- RPC communication between frontend and backend
- Real Hyperswarm, Autobase, and Corestore dependencies installed
- Unique user identities generated
- Chat room joining functionality
- Message sending and receiving

⚠️ **Limitations:**
- Currently using fallback backend (not full P2P yet)
- Need to complete Hyperswarm peer discovery
- Need to implement real Autobase message synchronization

## How to Test Current Implementation

### 1. Start the App
```bash
cd PearChat
npm start
# Then press 'w' for web or scan QR for mobile
```

### 2. Test Basic Functionality (Single User)
1. Open http://localhost:8082 in browser
2. Wait for "P2P Ready" status in header
3. Note your unique User ID (first 8 characters shown)
4. Default room is `demo-chat-room`
5. Send a message - it should echo back

### 3. Test Multi-User Chat (Simulated P2P)
1. Open http://localhost:8082 in first browser window
2. Open http://localhost:8082 in second browser window (or incognito mode)
3. Each window shows different User ID
4. Both are in `demo-chat-room` by default

### 4. Test Room Management
1. **Copy Room ID**: Click "📋 Copy Room ID" to copy current room ID
2. **Join Specific Room**:
   - Click "🚪 Join Room"
   - Enter a room ID (e.g., `test-room-123`)
   - Click "Join"
3. **Create New Room**: Click "➕ New Room" to create and join a new room

### 5. Test Cross-Window Communication
1. Have both browser windows join the same room ID
2. Send messages from one window
3. Currently shows echo-back (real P2P sync coming next)

## Next Steps to Enable Real P2P

### 1. Complete Hyperswarm Integration
- Fix peer discovery mechanism
- Implement proper connection handling
- Add NAT traversal support

### 2. Complete Autobase Integration  
- Set up multi-writer message synchronization
- Implement real-time message updates between peers
- Add conflict resolution

### 3. Add Chat Room Discovery
- Implement topic-based chat room discovery
- Add ability to share chat room IDs
- Enable users to join specific rooms

### 4. Test on Different Networks
- Test between different devices
- Test across different network conditions
- Verify NAT traversal works

## Current Architecture

```
Browser 1 (User A)     Browser 2 (User B)
     ↓                       ↓
React Native UI         React Native UI
     ↓                       ↓
RPC Service            RPC Service
     ↓                       ↓
Bare Runtime           Bare Runtime
     ↓                       ↓
[Fallback Backend]     [Fallback Backend]
     ↓                       ↓
(Future: Hyperswarm P2P Network)
```

## Target Architecture

```
Device 1 (User A)      Device 2 (User B)
     ↓                       ↓
React Native UI         React Native UI
     ↓                       ↓
RPC Service            RPC Service
     ↓                       ↓
Bare Runtime           Bare Runtime
     ↓                       ↓
Hyperswarm             Hyperswarm
     ↓                       ↓
     └─── P2P Network ───────┘
           (Direct Connection)
```

## Testing Real P2P (When Complete)

1. **Same Network Test:**
   - Run app on two devices on same WiFi
   - Join same chat room ID
   - Send messages between devices

2. **Different Network Test:**
   - Run app on devices on different networks
   - Use same chat room ID
   - Verify NAT traversal works

3. **Mobile Test:**
   - Build Android APK with `expo build:android`
   - Install on Android devices
   - Test P2P connectivity

## Troubleshooting

### Common Issues:
1. **App not loading:** Check if Metro bundler is running
2. **Messages not sending:** Check browser console for errors
3. **RPC errors:** Verify Bare runtime initialization

### Debug Steps:
1. Open browser developer tools
2. Check console for error messages
3. Verify RPC service initialization
4. Check network connectivity

## Development Commands

```bash
# Start development server
npm start

# Build for Android
expo build:android

# Build for web
expo build:web

# Clear cache
expo start --clear

# Run tests
npm test
```
