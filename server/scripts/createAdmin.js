const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createOrUpdateAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminUsername = process.env.ADMIN_USERNAME || 'Aparna';
    const adminEmail = process.env.ADMIN_EMAIL || 'aparna@tinytots.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Aparna123@';
    const adminFirstName = process.env.ADMIN_FIRSTNAME || 'Aparna';
    const adminLastName = process.env.ADMIN_LASTNAME || 'Admin';

    // Find by username or email
    let user = await User.findOne({
      $or: [
        { email: adminEmail },
        { username: adminUsername }
      ]
    });

    if (user) {
      console.log('ℹ️ Admin user exists — updating credentials and role');
      user.firstName = user.firstName || adminFirstName;
      user.lastName = user.lastName || adminLastName;
      user.username = adminUsername; // may adjust below if conflict
      user.email = adminEmail;
      user.password = adminPassword; // will be hashed by pre-save
      user.role = 'admin';
      user.isActive = true;

      try {
        await user.save();
      } catch (e) {
        // Handle possible username duplicate from a different record
        if (e && e.code === 11000 && e.keyPattern && e.keyPattern.username) {
          user.username = `${adminUsername}${Math.floor(Math.random() * 1000)}`;
          await user.save();
          console.log(`⚠️ Username conflict. Assigned new username: ${user.username}`);
        } else {
          throw e;
        }
      }

      console.log('✅ Admin user updated successfully');
      console.log(`👤 Username: ${user.username}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔑 Password: ${adminPassword}`);
      return;
    }

    // Create admin user
    const adminUser = new User({
      firstName: adminFirstName,
      lastName: adminLastName,
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      phone: '+1234567890',
      isActive: true,
      address: {
        street: 'Admin Street',
        city: 'Admin City',
        state: 'Admin State',
        zipCode: '12345'
      }
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log(`👤 Username: ${adminUsername}`);
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);

  } catch (error) {
    console.error('❌ Error creating/updating admin user:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createOrUpdateAdminUser();