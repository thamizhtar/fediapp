// Simple test script to verify chat functionality
// Run this in the browser console to test the chat

console.log('Testing Gun Chat App...');

// Test 1: Check if Gun is initialized
try {
  const gun = require('./gun.config.ts').default;
  console.log('✓ Gun initialized successfully');
} catch (error) {
  console.error('✗ Gun initialization failed:', error);
}

// Test 2: Check if ChatService is working
try {
  const ChatService = require('./services/ChatService.ts').default;
  console.log('✓ ChatService loaded successfully');
  
  // Test setting user
  ChatService.setCurrentUser('TestUser');
  console.log('✓ User set successfully');
  
  // Test sending a message
  ChatService.sendMessage('Test message from script')
    .then(() => console.log('✓ Message sent successfully'))
    .catch(error => console.error('✗ Message send failed:', error));
    
} catch (error) {
  console.error('✗ ChatService test failed:', error);
}

// Test 3: Check local storage
try {
  localStorage.setItem('test-key', 'test-value');
  const value = localStorage.getItem('test-key');
  if (value === 'test-value') {
    console.log('✓ Local storage working');
    localStorage.removeItem('test-key');
  } else {
    console.error('✗ Local storage not working');
  }
} catch (error) {
  console.error('✗ Local storage test failed:', error);
}

console.log('Test completed. Check the app UI for functionality.');
