const mongoose = require('mongoose');
const Child = require('../models/Child');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots';

async function checkChildren() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const children = await Child.find({}, '_id firstName lastName age interests').limit(10);
    console.log(`\n📊 Found ${children.length} children in database:`);
    
    if (children.length === 0) {
      console.log('❌ No children found in database');
      console.log('💡 You may need to run the sample data script first');
    } else {
      children.forEach((child, index) => {
        console.log(`${index + 1}. ID: ${child._id}`);
        console.log(`   Name: ${child.firstName} ${child.lastName}`);
        console.log(`   Age: ${child.age || 'N/A'}`);
        console.log(`   Interests: ${child.interests?.join(', ') || 'None'}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkChildren();
