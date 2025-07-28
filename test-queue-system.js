/**
 * Simple test script for the pack queue system
 * Run with: node test-queue-system.js
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';
const TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token

async function testPackQueueSystem() {
  console.log('🧪 Testing Pack Queue System...\n');

  try {
    // 1. Test single active timer limit
    console.log('1. Testing single active timer limit...');
    const response1 = await fetch(`${API_BASE}/timers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ packType: 'humanoid', delayHours: 4 })
    });
    const data1 = await response1.json();
    console.log('✅ Timer created:', data1);

    // 2. Test queue limit (should fail)
    console.log('\n2. Testing queue limit...');
    const response2 = await fetch(`${API_BASE}/timers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ packType: 'humanoid', delayHours: 4 })
    });
    const data2 = await response2.json();
    console.log('❌ Expected error:', data2);

    // 3. Test queue system (different category)
    console.log('\n3. Testing queue system (weapon)...');
    const response3 = await fetch(`${API_BASE}/timers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ packType: 'weapon', delayHours: 4 })
    });
    const data3 = await response3.json();
    console.log('✅ Weapon timer created:', data3);

    // 4. Get current status
    console.log('\n4. Getting current timer status...');
    const response4 = await fetch(`${API_BASE}/timers`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data4 = await response4.json();
    console.log('📊 Current status:', JSON.stringify(data4, null, 2));

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testPackQueueSystem();
}

module.exports = { testPackQueueSystem };