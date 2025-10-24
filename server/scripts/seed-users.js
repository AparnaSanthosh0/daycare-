/* eslint-disable no-console */
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots';

async function upsertUser({ firstName, lastName, email, password, role }) {
  const existing = await User.findOne({ email });
  if (existing) {
    existing.firstName = firstName;
    existing.lastName = lastName;
    existing.role = role;
    existing.isActive = true;
    existing.emailVerified = true;
    // Only set password if provided; pre-save hook will hash
    if (password) existing.password = password;
    await existing.save();
    console.log(`🔁 Updated ${role} user: ${email}`);
    return existing;
  }

  const user = new User({
    firstName,
    lastName,
    email,
    password, // hashed by pre-save
    role,
    isActive: true,
    emailVerified: true
  });
  await user.save();
  console.log(`✅ Created ${role} user: ${email}`);
  return user;
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Credentials provided by the user
  const seedUsers = [
    {
      firstName: 'Vendor',
      lastName: 'User',
      email: 'dreamtoys0023@gmail.com',
      password: 'Lucajohn14@',
      role: 'vendor'
    },
    {
      firstName: 'Parent',
      lastName: 'User',
      email: 'shijinthomas2026@maca.ajce.in',
      password: 'Shijin14@',
      role: 'parent'
    },
    {
      firstName: 'Staff',
      lastName: 'User',
      email: 'gmail-aparnasanthosh009@gmail.com',
      password: 'Aparna14@',
      role: 'staff'
    }
  ];

  try {
    for (const u of seedUsers) {
      await upsertUser(u);
    }
    console.log('\n🎯 Seeding complete');
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main();



