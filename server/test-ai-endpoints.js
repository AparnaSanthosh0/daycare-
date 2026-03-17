const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// Test MongoDB connection
async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
    
    // Test User model
    const User = require('./models/User');
    const users = await User.find({ role: 'staff' }).limit(5);
    console.log(`📋 Found ${users.length} staff users:`);
    users.forEach(user => {
      console.log(`  - ${user.email} | Role: ${user.role} | StaffType: ${user.staff?.staffType || 'undefined'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection error:', error);
    process.exit(1);
  }
}

testConnection();
