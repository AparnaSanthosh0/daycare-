const axios = require('axios');

async function testNannyAPI() {
  try {
    console.log('🧪 Testing Nanny API Endpoint...\n');
    
    const API_URL = 'http://localhost:5000';
    
    // First, login as a parent to get token
    console.log('1️⃣ Logging in as parent...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'appzzsanthosh014@gmail.com', // A parent from the database
      password: 'Aparna123@' // Try common password
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully!\n');
    
    // Test the nanny endpoint
    console.log('2️⃣ Fetching nannies from API...');
    const nannyResponse = await axios.get(`${API_URL}/api/nanny/nannies`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log(`✅ API returned ${nannyResponse.data.length} nannies\n`);
    
    if (nannyResponse.data.length > 0) {
      console.log('📋 Nanny Details:');
      nannyResponse.data.forEach((nanny, index) => {
        console.log(`\n${index + 1}. ${nanny.firstName} ${nanny.lastName}`);
        console.log(`   ID: ${nanny._id}`);
        console.log(`   Phone: ${nanny.phone}`);
        console.log(`   Experience: ${nanny.staff?.yearsOfExperience || 0} years`);
        console.log(`   Qualification: ${nanny.staff?.qualification || 'N/A'}`);
      });
    } else {
      console.log('❌ No nannies returned from API');
      console.log('   This means there might be an issue with the API endpoint or authentication');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n⚠️  Authentication failed. Try a different parent email/password');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Server is not running. Please start the server first:');
      console.log('   cd server && npm start');
    }
  }
}

testNannyAPI();
