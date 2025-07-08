# Quick P2P Test Guide

## Test Real-Time Messaging (2 minutes)

### Method 1: React App Test
1. Run `npm start` and press 'w'
2. Open http://localhost:8082 in TWO browser windows
3. Send message in Window 1 -> should appear in Window 2
4. Check browser console for debug logs

### Method 2: Simple HTML Test  
1. Open `test-messaging.html` in TWO browser windows
2. Send messages between windows
3. Watch real-time synchronization

## Expected Console Logs

**When sending message:**
```
=== SENDING MESSAGE ===
Room: demo-p2p-room
Content: hello
User: a399cjjp
Message sent successfully: 1234567890-abc123
Message stored in P2P network: 1234567890-abc123
Storage event dispatched
Total messages now: 1
```

**When receiving message:**
```
Storage event received: pearchat-p2p-network has data
Received P2P message from network: {...}
Adding message to chat: demo-p2p-room
```

**Peer detection:**
```
Found real peers: 1
Peer connected: pk-mcufbjbw-g4rssjr0muq-b8f2ji
Peer count changed from 0 to 1
Active peers in room: [g4rssjr0]
```

## Troubleshooting

**No messages syncing?**
- Check if both windows are in same room
- Look for "Storage event received" in console
- Try the HTML test file for isolation

**Peer count always 0?**
- Check localStorage in DevTools
- Look for peer registration logs
- Try refreshing both windows

**App not working?**
- Ensure npm start is running
- Check for TypeScript errors
- Clear browser cache and localStorage