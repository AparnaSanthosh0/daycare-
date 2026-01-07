const axios = require('axios');

async function quickTest() {
  try {
    console.log('Testing /api/nanny/nannies endpoint...\n');
    
    // Test 1: Login as parent
    console.log('Step 1: Login as parent (shijinthomas2026@mca.ajce.in)');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'shijinthomas2026@mca.ajce.in',
      password: 'Shijin14@'
    });
    
    if (!loginRes.data.token) {
      console.log('❌ No token received');
      return;
    }
    
    console.log('✅ Login successful\n');
    
    // Test 2: Call nanny API
    console.log('Step 2: Calling /api/nanny/nannies');
    const nannyRes = await axios.get('http://localhost:5000/api/nanny/nannies', {
      headers: { Authorization: `Bearer ${loginRes.data.token}` }
    });
    
    console.log(`✅ API Response: ${nannyRes.data.length} nannies found\n`);
    
    if (nannyRes.data.length > 0) {
      console.log('Nanny Details:');
      nannyRes.data.forEach((n, i) => {
        console.log(`${i + 1}. ${n.firstName} ${n.lastName}`);
        console.log(`   ID: ${n._id}`);
        console.log(`   Phone: ${n.phone}`);
        console.log(`   Experience: ${n.staff?.yearsOfExperience || 0} years`);
        console.log(`   Qualification: ${n.staff?.qualification || 'N/A'}\n`);
      });
    } else {
      console.log('❌ No nannies returned!');
      console.log('Checking database directly...\n');
      
      const mongoose = require('mongoose');
      const User = require('./models/User');
      require('dotenv').config();
      
      await mongoose.connect(process.env.MONGODB_URI);
      const dbNannies = await User.find({
        role: 'staff',
        'staff.staffType': 'nanny',
        isActive: true
      }).select('firstName lastName phone staff');
      
      console.log(`Database has ${dbNannies.length} active nannies:`);
      dbNannies.forEach(n => {
        console.log(`- ${n.firstName} ${n.lastName} (${n.phone})`);
      });
      
      await mongoose.disconnect();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

quickTest();
