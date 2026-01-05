const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function updateStaffToNanny() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    // List all active staff members
    const allStaff = await User.find({
      role: 'staff',
      isActive: true
    }).select('firstName lastName email staff.staffType');
    
    if (allStaff.length === 0) {
      console.log('❌ No active staff members found!');
      return;
    }

    console.log('Active Staff Members:');
    allStaff.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.firstName} ${staff.lastName} (${staff.email})`);
      console.log(`   Current Staff Type: ${staff.staff?.staffType || 'NOT SET'}\n`);
    });

    // Ask which one to update (for now, let's update the first one)
    // In a real scenario, you'd get user input here
    console.log('\n=== INSTRUCTIONS ===');
    console.log('To update a staff member to nanny, edit this script and:');
    console.log('1. Replace YOUR_STAFF_EMAIL with the email of the staff member');
    console.log('2. Run this script again\n');
    
    // UPDATE THIS EMAIL TO THE STAFF MEMBER YOU WANT TO CHANGE TO NANNY
    const emailToUpdate = 'YOUR_STAFF_EMAIL'; // CHANGE THIS!
    
    if (emailToUpdate === 'YOUR_STAFF_EMAIL') {
      console.log('⚠️  Please edit this script and replace YOUR_STAFF_EMAIL with the actual email address');
      return;
    }

    const staffToUpdate = await User.findOne({ email: emailToUpdate, role: 'staff' });
    
    if (!staffToUpdate) {
      console.log(`❌ No staff member found with email: ${emailToUpdate}`);
      return;
    }

    console.log(`\n📝 Updating ${staffToUpdate.firstName} ${staffToUpdate.lastName}...`);
    console.log(`   Current staffType: ${staffToUpdate.staff?.staffType}`);
    
    // Update to nanny
    staffToUpdate.staff.staffType = 'nanny';
    
    // Optional: Add nanny-specific fields if needed
    if (!staffToUpdate.staff.serviceArea) {
      staffToUpdate.staff.serviceArea = 'Local Area'; // Default value
    }
    if (!staffToUpdate.staff.availability) {
      staffToUpdate.staff.availability = 'Full-time'; // Default value
    }
    
    await staffToUpdate.save();
    
    console.log(`✅ Successfully updated to nanny!`);
    console.log(`   New staffType: ${staffToUpdate.staff.staffType}`);
    console.log(`   Service Area: ${staffToUpdate.staff.serviceArea}`);
    console.log(`   Availability: ${staffToUpdate.staff.availability}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

updateStaffToNanny();
