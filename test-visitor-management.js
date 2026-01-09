// Test script for Visitor Management API
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// You'll need to replace this with a valid JWT token from your system
const AUTH_TOKEN = 'your-jwt-token-here';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testVisitorManagement() {
  console.log('🧪 Testing Visitor Management System\n');

  try {
    // Test 1: Get today's visitors (empty initially)
    console.log('1️⃣ Fetching today\'s visitors...');
    const todayVisitors = await api.get('/visitors/today');
    console.log('✅ Today\'s visitors:', todayVisitors.data.stats);
    console.log('');

    // Test 2: Check in a visitor
    console.log('2️⃣ Checking in a visitor...');
    const checkInData = {
      visitorName: 'John Doe',
      purpose: 'Parent Meeting',
      purposeDetails: 'Discussing child progress',
      contactNumber: '9876543210',
      idProofType: 'Aadhar',
      idProofNumber: '1234-5678-9012',
      temperature: 98.6,
      notes: 'Test visitor check-in'
    };
    const checkInResult = await api.post('/visitors/check-in', checkInData);
    console.log('✅ Visitor checked in:', checkInResult.data.visitor.visitorName);
    const visitorId = checkInResult.data.visitor._id;
    console.log('   Visitor ID:', visitorId);
    console.log('');

    // Test 3: Get visitors again (should show 1)
    console.log('3️⃣ Fetching visitors after check-in...');
    const afterCheckIn = await api.get('/visitors/today');
    console.log('✅ Stats after check-in:', afterCheckIn.data.stats);
    console.log('');

    // Test 4: Check in another visitor (for authorized pickup)
    console.log('4️⃣ Checking in visitor for authorized pickup...');
    const pickupCheckIn = {
      visitorName: 'Jane Smith',
      purpose: 'Authorized Pickup',
      purposeDetails: 'Picking up child',
      contactNumber: '9876543211',
      authorizedPickup: true
    };
    const pickupResult = await api.post('/visitors/check-in', pickupCheckIn);
    console.log('✅ Pickup visitor checked in:', pickupResult.data.visitor.visitorName);
    console.log('');

    // Test 5: Get visitor statistics
    console.log('5️⃣ Getting visitor statistics...');
    const stats = await api.get('/visitors/stats');
    console.log('✅ Statistics:', stats.data.stats);
    console.log('');

    // Test 6: Check out the first visitor
    console.log('6️⃣ Checking out first visitor...');
    const checkOutResult = await api.put(`/visitors/${visitorId}/check-out`, {
      notes: 'Meeting completed successfully'
    });
    console.log('✅ Visitor checked out:', checkOutResult.data.visitor.visitorName);
    console.log('   Status:', checkOutResult.data.visitor.status);
    console.log('');

    // Test 7: Final visitor count
    console.log('7️⃣ Final visitor count...');
    const finalCount = await api.get('/visitors/today');
    console.log('✅ Final stats:', finalCount.data.stats);
    console.log('');

    console.log('🎉 All tests passed successfully!\n');
    console.log('📋 Summary:');
    console.log('   - Check-in: ✅');
    console.log('   - Check-out: ✅');
    console.log('   - Statistics: ✅');
    console.log('   - Today\'s visitors: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️  Authentication failed. Please:');
      console.log('   1. Login to get a valid JWT token');
      console.log('   2. Replace AUTH_TOKEN in this file');
      console.log('   3. Run the test again');
    }
  }
}

// Note: For authorized pickup verification test, you'll need:
// 1. A valid child ID from your database
// 2. The child's parent name or emergency contact name
async function testAuthorizedPickup(childId, pickupPersonName) {
  console.log('\n🧪 Testing Authorized Pickup Verification\n');
  
  try {
    const verifyData = {
      childId: childId,
      pickupPersonName: pickupPersonName,
      idProofType: 'Driving License',
      idProofNumber: 'DL-1234567'
    };

    const result = await api.post('/visitors/verify-pickup', verifyData);
    console.log('✅ Pickup verification result:');
    console.log('   Authorized:', result.data.authorized ? '✅ YES' : '❌ NO');
    console.log('   Child:', result.data.childInfo.name);
    console.log('   Program:', result.data.childInfo.program);
    console.log('   Authorized Pickups:', result.data.childInfo.authorizedPickups);
    
  } catch (error) {
    console.error('❌ Verification test failed:', error.response?.data || error.message);
  }
}

// Run the main test
testVisitorManagement();

// Uncomment and provide actual child ID and parent name to test pickup verification
// testAuthorizedPickup('child-id-here', 'Parent Name Here');

console.log('\n📝 Note: This test requires a valid JWT token.');
console.log('   To get a token:');
console.log('   1. Login through the UI');
console.log('   2. Open browser DevTools → Network tab');
console.log('   3. Look for Authorization header in API requests');
console.log('   4. Copy the token (without "Bearer " prefix)');
console.log('   5. Replace AUTH_TOKEN in this file\n');
