#!/usr/bin/env node

/**
 * Test MongoDB connection for Render deployment
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots';

console.log('🔍 Testing MongoDB connection...');
console.log('📍 MongoDB URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials

async function testConnection() {
  try {
    console.log('🔄 Attempting to connect...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    });
    
    console.log('✅ MongoDB connected successfully!');
    console.log('📊 Database name:', mongoose.connection.db.databaseName);
    console.log('🔗 Connection state:', mongoose.connection.readyState);
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 DNS resolution failed. Check your MongoDB Atlas cluster URL.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Connection refused. Check your MongoDB Atlas network access settings.');
    } else if (error.code === 'EAUTH') {
      console.log('💡 Authentication failed. Check your username and password.');
    }
    
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed.');
  }
}

testConnection();
