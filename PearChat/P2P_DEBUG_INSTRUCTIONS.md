# 🔧 P2P Debug Instructions

## Quick Test for Real-Time Chat

### Method 1: Using Test HTML File
1. Open `test-p2p.html` in your browser
2. Open the same file in another browser window
3. Send messages between windows
4. Check browser console for debug logs

### Method 2: Using React App
1. Run `npm start` and open http://localhost:8082
2. Open the same URL in another browser window/incognito
3. Check browser console (F12) for these logs:

**Expected Console Logs:**
```
P2P Service initialized with identity: pk-...
Setting up P2P network communication...
Joining P2P room: demo-p2p-room
Message stored in P2P network: ...
Storage event received: pearchat-p2p-network has data
Received P2P message from network: ...
```

### Method 3: Manual localStorage Test
Open browser console and run:
```javascript
// Check if P2P data exists
console.log('P2P Network:', localStorage.getItem('pearchat-p2p-network'))
console.log('P2P Peers:', localStorage.getItem('pearchat-p2p-peers'))

// Manually trigger a message
const message = {
  id: Date.now().toString(),
  content: 'Test message',
  author: 'test-user',
  authorName: 'Test User',
  timestamp: Date.now(),
  type: 'text',
  chatId: 'demo-p2p-room'
}

const networkData = JSON.parse(localStorage.getItem('pearchat-p2p-network') || '{}')
if (!networkData['demo-p2p-room']) networkData['demo-p2p-room'] = []
networkData['demo-p2p-room'].push(message)
localStorage.setItem('pearchat-p2p-network', JSON.stringify(networkData))
```

## Debugging Steps

1. **Check P2P Service Initialization**
   - Look for "P2P Service initialized" in console
   - Verify unique user ID is generated

2. **Check Network Setup**
   - Look for "Setting up P2P network communication"
   - Verify storage event listeners are attached

3. **Check Message Storage**
   - Look for "Message stored in P2P network"
   - Check localStorage in DevTools

4. **Check Cross-Window Communication**
   - Look for "Storage event received"
   - Look for "Received P2P message from network"

5. **Check Peer Detection**
   - Look for "Found real peers" or "No real peers found"
   - Check peer count updates

## Common Issues

**No messages syncing between windows:**
- Check if localStorage is enabled
- Verify both windows are in same room
- Check browser console for errors

**Peer count always 0:**
- Check if peer registration is working
- Verify localStorage peer data
- Try refreshing both windows

**App not loading:**
- Check if npm start is running
- Verify no TypeScript errors
- Clear browser cache