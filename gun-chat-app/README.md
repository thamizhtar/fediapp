# Gun Chat App

A real-time chat application built with React Native, Expo, and Gun.js that works on both web and mobile platforms.

## Features

- ✅ Real-time messaging using Gun.js
- ✅ Cross-platform support (Web, Android, iOS)
- ✅ Offline message support with local caching
- ✅ User presence tracking
- ✅ Responsive UI design
- ✅ Error handling and loading states
- ✅ Message persistence
- ✅ Toast notifications

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- For mobile: Expo Go app on your device

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gun-chat-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open the app:
   - **Web**: Press `w` or visit `http://localhost:8081`
   - **Android**: Press `a` or scan QR code with Expo Go
   - **iOS**: Press `i` or scan QR code with Camera app

## Platform-Specific Features

### Web
- Uses localStorage for message caching
- Network status detection
- Keyboard shortcuts support

### Mobile (Android/iOS)
- Uses AsyncStorage for message caching
- Edge-to-edge display on Android
- Optimized touch targets
- Keyboard avoidance

## Architecture

### Components
- `App.tsx` - Main app component with user management
- `ChatScreen.tsx` - Main chat interface
- `MessageList.tsx` - Scrollable message list
- `MessageInput.tsx` - Message input with send functionality
- `MessageItem.tsx` - Individual message display
- `UserSetup.tsx` - Username setup screen
- `ErrorBoundary.tsx` - Error handling wrapper
- `Toast.tsx` - Notification component

### Services
- `ChatService.ts` - Core chat functionality and Gun.js integration
- `gun.config.ts` - Gun.js configuration and types

## Configuration

### Gun.js Peers
The app uses public Gun.js peers for real-time synchronization:
- `https://gun-manhattan.herokuapp.com/gun`
- `https://peer.wallie.io/gun`
- `https://gunjs.herokuapp.com/gun`

### Storage
- **Web**: localStorage for message caching
- **Mobile**: AsyncStorage for message caching
- **Offline**: Messages stored locally and synced when online

## Troubleshooting

### Common Issues

1. **Chat not working on Android**
   - Ensure you have internet connection
   - Check if Expo Go is updated
   - Try restarting the Metro bundler

2. **Messages not appearing**
   - Check browser console for errors
   - Verify Gun.js peer connections
   - Clear app cache and restart

3. **UI appears clumsy on mobile**
   - Ensure you're using the latest version
   - Check device orientation
   - Restart the app

### Debug Mode

1. Open browser developer tools
2. Check console for error messages
3. Monitor network requests
4. Use the test script: `node test-chat.js`

### Performance Tips

- The app caches last 100 messages locally
- User presence updates every 15 seconds
- Offline messages are synced when connection restored

## Development

### Scripts
- `npm start` - Start development server
- `npm run web` - Start web-only development
- `npm run android` - Start Android development
- `npm run ios` - Start iOS development

### Building for Production
```bash
# Web build
expo build:web

# Android build
expo build:android

# iOS build
expo build:ios
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both web and mobile
5. Submit a pull request

## License

MIT License - see LICENSE file for details
