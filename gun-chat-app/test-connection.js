// Test script to verify Gun.js connection
// Run this in the browser console to test the connection

console.log('🔧 Testing Gun Chat Connection...');

// Test 1: Check Gun initialization
try {
  // Import gun from the config
  import('./gun.config.ts').then(({ default: gun, getConnectionStatus, onConnectionStatusChange }) => {
    console.log('✅ Gun imported successfully');
    
    // Test 2: Check connection status
    const status = getConnectionStatus();
    console.log('📡 Current connection status:', status);
    
    // Test 3: Listen for connection changes
    const unsubscribe = onConnectionStatusChange((newStatus) => {
      console.log('🔄 Connection status changed to:', newStatus);
    });
    
    // Test 4: Try to send a test message
    const testMessage = {
      id: 'test-' + Date.now(),
      text: 'Connection test message',
      user: 'TestUser',
      timestamp: Date.now()
    };
    
    gun.get('chat-messages').get(testMessage.id).put(testMessage, (ack) => {
      if (ack.err) {
        console.error('❌ Test message failed:', ack.err);
      } else {
        console.log('✅ Test message sent successfully');
      }
    });
    
    // Test 5: Try to read messages
    gun.get('chat-messages').map().on((data, key) => {
      if (data && data.text && data.user) {
        console.log('📨 Message received:', data.text, 'from', data.user);
      }
    });
    
    // Clean up after 10 seconds
    setTimeout(() => {
      unsubscribe();
      console.log('🧹 Test cleanup completed');
    }, 10000);
    
  }).catch(error => {
    console.error('❌ Failed to import gun config:', error);
  });
  
} catch (error) {
  console.error('❌ Test failed:', error);
}

// Test 6: Check localStorage
try {
  const testKey = 'gun-test-' + Date.now();
  localStorage.setItem(testKey, 'test-value');
  const value = localStorage.getItem(testKey);
  if (value === 'test-value') {
    console.log('✅ localStorage working');
    localStorage.removeItem(testKey);
  } else {
    console.error('❌ localStorage not working properly');
  }
} catch (error) {
  console.error('❌ localStorage test failed:', error);
}

console.log('🏁 Connection test script loaded. Check console for results.');
