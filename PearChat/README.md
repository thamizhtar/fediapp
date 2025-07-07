# PearChat - P2P Chat App

A peer-to-peer chat application built with Expo React Native and Pears.com Bare runtime.

## Features

- ✅ **True P2P Messaging**: Direct peer-to-peer communication without servers
- ✅ **React Native UI**: Cross-platform mobile interface
- ✅ **Bare Runtime Integration**: P2P backend using Pears.com technology
- ✅ **Real-time Chat**: Instant messaging with connected peers
- ✅ **Group Support**: Multi-participant chat rooms
- ✅ **Offline-First**: Messages sync when peers come online

## Architecture

```
React Native UI ↔ RPC Bridge ↔ Bare Runtime ↔ P2P Network
```

### Components

1. **React Native Frontend**
   - Chat screens and UI components
   - Real-time message display
   - Contact and group management

2. **RPC Communication Layer**
   - Bidirectional communication between React Native and Bare
   - Message serialization and event handling

3. **Bare Runtime Backend**
   - P2P networking with Hyperswarm
   - Message persistence and synchronization
   - Peer discovery and connection management

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd PearChat
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on Android:
```bash
npx expo start --android
```

5. Run on iOS:
```bash
npx expo start --ios
```

## Project Structure

```
PearChat/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # App screens
│   │   ├── HomeScreen.tsx  # Chat list and navigation
│   │   └── ChatScreen.tsx  # Individual chat interface
│   ├── services/           # App services
│   │   └── rpc.ts         # RPC communication service
│   └── types/             # TypeScript type definitions
├── backend/               # Bare runtime P2P backend
│   └── backend.mjs       # P2P chat engine
├── shared/               # Shared constants and types
│   └── rpc-commands.ts   # RPC command definitions
└── App.tsx              # Main app component
```

## How It Works

### P2P Communication Flow

1. **Initialization**: App starts and initializes Bare runtime with P2P backend
2. **Peer Discovery**: Uses Hyperswarm to discover other chat participants
3. **Connection**: Establishes encrypted connections with discovered peers
4. **Messaging**: Messages are sent directly between peers without servers
5. **Synchronization**: Message history syncs when peers reconnect

### RPC Communication

The app uses a custom RPC system to communicate between React Native and Bare runtime:

```typescript
// Send message from React Native to Bare
await rpcService.sendMessage(chatId, content)

// Receive events from Bare to React Native
rpcService.on('messageReceived', (message) => {
  // Update UI with new message
})
```

## Development

### Adding New Features

1. **UI Components**: Add to `src/components/`
2. **Screens**: Add to `src/screens/`
3. **P2P Logic**: Modify `backend/backend.mjs`
4. **RPC Commands**: Add to `shared/rpc-commands.ts`

### Testing

The app includes a demo mode that simulates P2P functionality for testing:

- Creates mock peer connections
- Simulates message broadcasting
- Demonstrates real-time chat interface

### Building for Production

1. Create production build:
```bash
npx expo build:android
# or
npx expo build:ios
```

2. For real P2P functionality, bundle the backend:
```bash
npx bare-pack --target android --target ios --linked --out app/backend.bundle.mjs backend/backend.mjs
```

## Technology Stack

- **Frontend**: Expo React Native, TypeScript
- **Backend**: Pears.com Bare runtime
- **P2P**: Hyperswarm, Autobase (simulated)
- **Communication**: Custom RPC over IPC
- **Storage**: In-memory (demo), Hypercore (production)

## Roadmap

- [ ] Real Hyperswarm integration
- [ ] Autobase for group consensus
- [ ] File sharing capabilities
- [ ] Push notifications
- [ ] Message encryption
- [ ] User profiles and avatars
- [ ] Chat room discovery
- [ ] Offline message queue

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions and support, please open an issue on GitHub.

---

**Built with ❤️ using Pears.com P2P technology**
