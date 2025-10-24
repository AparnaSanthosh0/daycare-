const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test users to create
    const testUsers = [
      {
        firstName: 'Luca',
        lastName: 'John',
        email: 'gmail-dreamtoys0023@gmail.com',
        password: 'Lucajohn14@',
        role: 'vendor',
        username: 'luca_john',
        phone: '+1234567890',
        isActive: true,
        address: {
          street: 'Vendor Street 123',
          city: 'Vendor City',
          state: 'Vendor State',
          zipCode: '12345'
        }
      },
      {
        firstName: 'Shijin',
        lastName: 'Thomas',
        email: 'gmail-shijinthomas2022@mac.ajce.in',
        password: 'Shijin14@',
        role: 'parent',
        username: 'shijin_thomas',
        phone: '+1234567891',
        isActive: true,
        address: {
          street: 'Parent Street 456',
          city: 'Parent City',
          state: 'Parent State',
          zipCode: '12346'
        }
      },
      {
        firstName: 'Aparna',
        lastName: 'Santhosh',
        email: 'gmail-aparnasanthosh@gmail.com',
        password: 'Aparna14@',
        role: 'staff',
        username: 'aparna_santhosh',
        phone: '+1234567892',
        isActive: true,
        address: {
          street: 'Staff Street 789',
          city: 'Staff City',
          state: 'Staff State',
          zipCode: '12347'
        },
        // Staff specific fields
        staff: {
          yearsOfExperience: 5,
          qualification: 'Bachelor in Early Childhood Education',
          certificateUrl: null
        }
      }
    ];

    console.log('🚀 Creating test users...\n');

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });

      if (existingUser) {
        console.log(`ℹ️ User ${userData.email} exists — updating credentials and role`);
        // Update existing user
        existingUser.firstName = userData.firstName;
        existingUser.lastName = userData.lastName;
        existingUser.email = userData.email;
        existingUser.password = userData.password; // Will be hashed by pre-save hook
        existingUser.role = userData.role;
        existingUser.username = userData.username;
        existingUser.phone = userData.phone;
        existingUser.address = userData.address;
        existingUser.isActive = userData.isActive;

        // Add staff-specific fields if it's a staff user
        if (userData.role === 'staff' && userData.staff) {
          existingUser.staff = userData.staff;
        }

        try {
          await existingUser.save();
          console.log(`✅ User ${userData.email} updated successfully`);
        } catch (error) {
          if (error.code === 11000) {
            console.log(`⚠️ Username conflict for ${userData.email}. Trying different username...`);
            existingUser.username = `${userData.username}_${Math.floor(Math.random() * 1000)}`;
            await existingUser.save();
            console.log(`✅ User ${userData.email} updated with new username: ${existingUser.username}`);
          } else {
            throw error;
          }
        }
      } else {
        // Create new user
        const newUser = new User(userData);

        // Add staff-specific fields if it's a staff user
        if (userData.role === 'staff' && userData.staff) {
          newUser.staff = userData.staff;
        }

        await newUser.save();
        console.log(`✅ User ${userData.email} created successfully`);
      }

      console.log(`👤 Username: ${userData.username}`);
      console.log(`📧 Email: ${userData.email}`);
      console.log(`🔑 Password: ${userData.password}`);
      console.log(`👥 Role: ${userData.role}`);
      console.log('─'.repeat(50));
    }

    console.log('\n🎉 All test users created/updated successfully!');
    console.log('\n📋 Summary:');
    testUsers.forEach(user => {
      console.log(`✅ ${user.role}: ${user.email} / ${user.password}`);
    });

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createTestUsers();
