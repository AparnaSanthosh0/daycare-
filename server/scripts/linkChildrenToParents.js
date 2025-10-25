const mongoose = require('mongoose');
const User = require('../models/User');
const Child = require('../models/Child');
require('dotenv').config();

async function linkChildrenToParents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Get some parent users
    const parents = await User.find({ role: 'parent' }).limit(8);
    console.log('Found parent users:', parents.length);

    // Get all children
    const children = await Child.find({});
    console.log('Found children:', children.length);

    // Link each child to a parent
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const parent = parents[i % parents.length]; // Cycle through parents if we have more children than parents
      
      child.parents = [parent._id];
      await child.save();
      
      console.log(`Linked ${child.firstName} ${child.lastName} to ${parent.firstName} ${parent.lastName}`);
    }

    console.log('Successfully linked all children to parents!');

    // Verify the links
    const updatedChildren = await Child.find({}).populate('parents', 'firstName lastName email');
    console.log('\nUpdated children with parents:');
    updatedChildren.forEach(child => {
      console.log(`- ${child.firstName} ${child.lastName} -> ${child.parents.map(p => `${p.firstName} ${p.lastName}`).join(', ')}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

linkChildrenToParents();
