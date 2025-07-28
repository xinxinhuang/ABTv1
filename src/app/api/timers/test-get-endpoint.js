// Simple test script to verify the GET endpoint
// Run with: node test-get-endpoint.js

const http = require('http');

// Test the GET endpoint with mock authentication
function testGetTimers() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/timers',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Add authentication cookie or token here if needed
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);
      
      try {
        const jsonData = JSON.parse(data);
        console.log('Response:', JSON.stringify(jsonData, null, 2));
        
        // Validate response structure
        if (jsonData.success && jsonData.data) {
          console.log('✅ Response structure is valid');
          console.log('📊 Summary:', jsonData.data.summary);
          console.log('🎯 Active timers:', jsonData.data.activeTimers?.length || 0);
          console.log('⏳ Queued timers:', jsonData.data.queuedTimers?.length || 0);
        } else {
          console.log('❌ Invalid response structure');
        }
      } catch (error) {
        console.log('❌ Error parsing JSON:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });

  req.end();
}

console.log('🧪 Testing GET /api/timers endpoint...');
console.log('Make sure the development server is running: npm run dev');
testGetTimers();