const mongoose = require('mongoose');
const User = require('../models/User');
const Child = require('../models/Child');
require('dotenv').config();

async function checkUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check parent users
    const parents = await User.find({ role: 'parent' });
    console.log('Parent users found:', parents.length);
    parents.forEach(parent => {
      console.log(`- ${parent.firstName} ${parent.lastName} (${parent.email}) - ID: ${parent._id}`);
    });

    // Check children
    const children = await Child.find({});
    console.log('\nChildren found:', children.length);
    children.forEach(child => {
      console.log(`- ${child.firstName} ${child.lastName} - Parents: ${child.parents}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

checkUsers();
