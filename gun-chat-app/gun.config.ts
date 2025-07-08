import Gun from 'gun';
import 'react-native-get-random-values'; // Required for Gun.js crypto
import { Platform } from 'react-native';

// Import AsyncStorage for React Native
let AsyncStorage: any;
if (Platform.OS !== 'web') {
  try {
    // Try to import AsyncStorage for React Native
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // Import gun-asyncstorage adapter
    require('gun-asyncstorage');
  } catch (error) {
    console.warn('AsyncStorage not available, using memory storage');
  }
}

// Configure Gun.js for cross-platform use
let gun: any;
let connectionStatus = 'disconnected';
let connectionListeners: Set<(status: string) => void> = new Set();

// Connection status management
export const getConnectionStatus = () => connectionStatus;
export const onConnectionStatusChange = (callback: (status: string) => void) => {
  connectionListeners.add(callback);
  return () => connectionListeners.delete(callback);
};

const updateConnectionStatus = (status: string) => {
  if (connectionStatus !== status) {
    connectionStatus = status;
    console.log('Gun connection status:', status);
    connectionListeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });
  }
};

try {
  // Start with a minimal, reliable configuration
  const gunConfig: any = {
    // Start with no peers - we'll add them manually for better control
    peers: [],
    // Improved storage configuration
    localStorage: Platform.OS === 'web' ? true : false,
    AsyncStorage: Platform.OS !== 'web' ? AsyncStorage : undefined,
    // Disable radisk initially to avoid conflicts
    radisk: false,
    // Disable WebRTC initially
    WebRTC: false,
    // Shorter timeout for faster feedback
    timeout: 5000,
    // Enable debug mode for better error tracking
    debug: __DEV__
  };

  gun = Gun(gunConfig);

  // Test if Gun is working locally first
  console.log('Testing Gun local functionality...');
  gun.get('local-test').put({ timestamp: Date.now(), test: 'local-connection' });

  gun.get('local-test').once((data: any) => {
    if (data && data.timestamp) {
      console.log('✅ Gun local functionality working');
      updateConnectionStatus('connected');

      // Now try to add peers one by one
      addPeersGradually();
    } else {
      console.error('❌ Gun local functionality failed');
      updateConnectionStatus('disconnected');
    }
  });

  // Function to add peers gradually
  const addPeersGradually = () => {
    const reliablePeers = [
      'https://gun-manhattan.herokuapp.com/gun',
      'https://peer.wallie.io/gun'
    ];

    console.log('Adding peers gradually...');

    reliablePeers.forEach((peerUrl, index) => {
      setTimeout(() => {
        try {
          console.log(`Attempting to connect to peer: ${peerUrl}`);
          gun.opt({ peers: [peerUrl] });
        } catch (error) {
          console.error(`Failed to add peer ${peerUrl}:`, error);
        }
      }, index * 2000); // Add each peer with 2 second delay
    });
  };

  // Set initial status
  updateConnectionStatus('connecting');

  // Monitor peer connections with improved tracking
  let connectedPeers = 0;
  let hasLocalConnection = false;

  // Track peer connection status with longer debouncing for stability
  let connectionStatusTimeout: NodeJS.Timeout | null = null;

  const updateConnectionStatusDebounced = (status: string) => {
    if (connectionStatusTimeout) {
      clearTimeout(connectionStatusTimeout);
    }

    connectionStatusTimeout = setTimeout(() => {
      // Only update if we have a meaningful change
      if (status === 'connected' && (hasLocalConnection || connectedPeers > 0)) {
        updateConnectionStatus('connected');
      } else if (status === 'disconnected' && !hasLocalConnection && connectedPeers === 0) {
        updateConnectionStatus('disconnected');
      }
    }, 3000); // 3 second debounce for more stability
  };

  // Monitor peer connections
  gun.on('hi', (peer: any) => {
    connectedPeers++;
    console.log(`✅ Connected to peer: ${peer.url || 'unknown'} (${connectedPeers} total)`);
    updateConnectionStatusDebounced('connected');
  });

  gun.on('bye', (peer: any) => {
    connectedPeers = Math.max(0, connectedPeers - 1);
    console.log(`❌ Disconnected from peer: ${peer.url || 'unknown'} (${connectedPeers} remaining)`);

    if (connectedPeers === 0) {
      updateConnectionStatusDebounced('disconnected');
    }
  });

  // Periodic connection health check
  const healthCheckInterval = setInterval(() => {
    try {
      const testId = 'health-check-' + Date.now();
      gun.get(testId).put({ timestamp: Date.now() });

      gun.get(testId).once((data: any) => {
        if (data && data.timestamp) {
          if (!hasLocalConnection) {
            hasLocalConnection = true;
            console.log('✅ Gun local connection established');
            updateConnectionStatus('connected');
          }
        } else {
          if (hasLocalConnection) {
            hasLocalConnection = false;
            console.log('❌ Gun local connection lost');
            if (connectedPeers === 0) {
              updateConnectionStatus('disconnected');
            }
          }
        }
      });
    } catch (error) {
      console.error('Health check failed:', error);
      hasLocalConnection = false;
      if (connectedPeers === 0) {
        updateConnectionStatus('disconnected');
      }
    }
  }, 10000); // Check every 10 seconds

  console.log('Gun initialized successfully with gradual peer connection strategy');
} catch (error) {
  console.error('Gun initialization error:', error);
  updateConnectionStatus('disconnected');

  // Fallback to basic Gun instance for offline use
  try {
    console.log('Attempting fallback Gun initialization...');
    gun = Gun({
      localStorage: Platform.OS === 'web' ? true : false,
      AsyncStorage: Platform.OS !== 'web' ? AsyncStorage : undefined
    });

    // Test if fallback Gun works
    gun.get('fallback-test').put({ timestamp: Date.now() });
    gun.get('fallback-test').once((data: any) => {
      if (data && data.timestamp) {
        console.log('✅ Fallback Gun working in offline mode');
        updateConnectionStatus('connected');
      } else {
        console.log('❌ Fallback Gun failed');
        updateConnectionStatus('offline');
      }
    });

  } catch (fallbackError) {
    console.error('Fallback Gun initialization failed:', fallbackError);
    // Create absolute minimal Gun instance
    gun = Gun();
    updateConnectionStatus('offline');
  }
}

// Add connection retry mechanism
let retryCount = 0;
const maxRetries = 3;

const retryConnection = () => {
  if (retryCount < maxRetries && connectionStatus === 'disconnected') {
    retryCount++;
    console.log(`🔄 Retrying connection (attempt ${retryCount}/${maxRetries})...`);

    setTimeout(() => {
      try {
        // Try to reconnect to a reliable peer
        gun.opt({ peers: ['https://gun-manhattan.herokuapp.com/gun'] });

        // Test connection
        const testId = 'retry-test-' + Date.now();
        gun.get(testId).put({ timestamp: Date.now() });

        setTimeout(() => {
          if (connectionStatus === 'disconnected') {
            retryConnection();
          } else {
            retryCount = 0; // Reset on successful connection
          }
        }, 5000);

      } catch (error) {
        console.error('Retry failed:', error);
        retryConnection();
      }
    }, 5000 * retryCount); // Exponential backoff
  } else if (retryCount >= maxRetries) {
    console.log('❌ Max retries reached, staying in offline mode');
    updateConnectionStatus('offline');
  }
};

// Start retry mechanism if disconnected after initial setup
setTimeout(() => {
  if (connectionStatus === 'disconnected') {
    retryConnection();
  }
}, 15000); // Wait 15 seconds before starting retries

export default gun;

// Export types for TypeScript
export interface Message {
  id: string;
  text: string;
  user: string;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  isOnline?: boolean;
  lastSeen?: number;
}
