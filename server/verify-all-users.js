const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function verifyAllUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🔗 Connection URI:', process.env.MONGODB_URI ? 'Using .env (Atlas)' : 'Using localhost');
    console.log('');

    // Get all users
    const allUsers = await User.find({}).select('firstName lastName email role staff isActive phone').lean();
    
    console.log(`\n📊 Total Users in Database: ${allUsers.length}\n`);
    
    // Group by role
    const byRole = {};
    allUsers.forEach(user => {
      const role = user.role || 'unknown';
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(user);
    });

    // Display by role
    for (const [role, users] of Object.entries(byRole)) {
      console.log(`\n=== ${role.toUpperCase()} (${users.length}) ===`);
      users.forEach((user, idx) => {
        console.log(`${idx + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Phone: ${user.phone || 'N/A'}`);
        if (role === 'staff') {
          console.log(`   Staff Type: ${user.staff?.staffType || 'NOT SET'}`);
        }
        console.log(`   Status: ${user.isActive ? 'Active' : 'Pending'}`);
        console.log('');
      });
    }

    // Check for the specific nanny from the screenshot
    console.log('\n🔍 Looking for Mary John (aparnappzzz000@gmail.com)...');
    const maryJohn = await User.findOne({ email: 'aparnappzzz000@gmail.com' });
    if (maryJohn) {
      console.log('✅ FOUND!');
      console.log(`   Name: ${maryJohn.firstName} ${maryJohn.lastName}`);
      console.log(`   Role: ${maryJohn.role}`);
      console.log(`   Staff Type: ${maryJohn.staff?.staffType}`);
      console.log(`   Is Active: ${maryJohn.isActive}`);
    } else {
      console.log('❌ NOT FOUND in database!');
      console.log('   This suggests the admin panel is showing data from a different database');
      console.log('   or the database connection is incorrect.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

verifyAllUsers();
