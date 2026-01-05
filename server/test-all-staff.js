const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkAllStaff() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB');

    // Find ALL staff members
    console.log('\n=== All Staff Members ===');
    
    const allStaff = await User.find({
      role: 'staff'
    }).select('firstName lastName email role staff isActive');
    
    console.log(`Total staff members: ${allStaff.length}`);
    
    if (allStaff.length > 0) {
      console.log('\nStaff details:');
      allStaff.forEach((staff, index) => {
        console.log(`\n${index + 1}. ${staff.firstName} ${staff.lastName}`);
        console.log(`   Email: ${staff.email}`);
        console.log(`   Role: ${staff.role}`);
        console.log(`   Staff Object:`, staff.staff);
        console.log(`   Staff Type: ${staff.staff?.staffType || 'NOT SET'}`);
        console.log(`   Is Active: ${staff.isActive}`);
      });
    } else {
      console.log('\nNo staff members found in database!');
    }

    // Check if there are any users at all
    const totalUsers = await User.countDocuments();
    console.log(`\n\nTotal users in database: ${totalUsers}`);

    // Show breakdown by role
    const roles = ['admin', 'staff', 'parent', 'vendor', 'customer', 'doctor'];
    console.log('\nUsers by role:');
    for (const role of roles) {
      const count = await User.countDocuments({ role });
      if (count > 0) {
        console.log(`  ${role}: ${count}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkAllStaff();
