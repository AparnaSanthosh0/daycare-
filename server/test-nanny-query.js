const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testNannyQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB');

    // Find all staff members with staffType = 'nanny'
    console.log('\n=== Looking for nannies ===');
    
    const allNannies = await User.find({
      role: 'staff',
      'staff.staffType': 'nanny'
    }).select('firstName lastName email role staff isActive');
    
    console.log(`Total nannies found: ${allNannies.length}`);
    console.log('\nAll nannies:');
    allNannies.forEach((nanny, index) => {
      console.log(`${index + 1}. ${nanny.firstName} ${nanny.lastName}`);
      console.log(`   Email: ${nanny.email}`);
      console.log(`   Role: ${nanny.role}`);
      console.log(`   Staff Type: ${nanny.staff?.staffType}`);
      console.log(`   Is Active: ${nanny.isActive}`);
      console.log('---');
    });

    // Find active nannies (what the route returns)
    const activeNannies = await User.find({
      role: 'staff',
      'staff.staffType': 'nanny',
      isActive: true
    }).select('firstName lastName phone staff.yearsOfExperience staff.qualification');
    
    console.log(`\nActive nannies (shown to parents): ${activeNannies.length}`);
    activeNannies.forEach((nanny, index) => {
      console.log(`${index + 1}. ${nanny.firstName} ${nanny.lastName} - Phone: ${nanny.phone}`);
    });

    // Find pending nannies
    const pendingNannies = await User.find({
      role: 'staff',
      'staff.staffType': 'nanny',
      isActive: false
    }).select('firstName lastName email isActive');
    
    console.log(`\nPending nannies (need approval): ${pendingNannies.length}`);
    pendingNannies.forEach((nanny, index) => {
      console.log(`${index + 1}. ${nanny.firstName} ${nanny.lastName} - ${nanny.email}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testNannyQuery();
