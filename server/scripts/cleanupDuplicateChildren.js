const mongoose = require('mongoose');
const Child = require('../models/Child');
require('dotenv').config();

async function cleanupDuplicateChildren() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Get all children
    const allChildren = await Child.find({});
    console.log(`\n📊 Found ${allChildren.length} total children`);

    // Group children by first name and last name
    const childrenMap = new Map();
    
    allChildren.forEach(child => {
      const key = `${child.firstName.trim().toLowerCase()}_${(child.lastName || '').trim().toLowerCase()}`;
      
      if (!childrenMap.has(key)) {
        childrenMap.set(key, []);
      }
      childrenMap.get(key).push(child);
    });

    // Find duplicates
    const duplicates = [];
    let totalDuplicates = 0;
    
    childrenMap.forEach((children, key) => {
      if (children.length > 1) {
        // Sort by creation date to keep the oldest one
        children.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        // Keep the first (oldest) child, mark others as duplicates
        const toDelete = children.slice(1);
        duplicates.push({
          name: key,
          keep: children[0],
          delete: toDelete
        });
        totalDuplicates += toDelete.length;
      }
    });

    if (duplicates.length === 0) {
      console.log('\n✨ No duplicate children found!');
      await mongoose.connection.close();
      return;
    }

    console.log(`\n🔍 Found ${duplicates.length} duplicate groups with ${totalDuplicates} children to delete:`);
    
    // Display what will be deleted
    duplicates.forEach((group, index) => {
      console.log(`\n${index + 1}. ${group.name.replace('_', ' ')}:`);
      console.log(`   ✅ KEEPING: ${group.keep.firstName} ${group.keep.lastName || ''} (Created: ${new Date(group.keep.createdAt).toLocaleDateString()})`);
      group.delete.forEach(child => {
        console.log(`   ❌ DELETING: ${child.firstName} ${child.lastName || ''} (ID: ${child._id}, Created: ${new Date(child.createdAt).toLocaleDateString()})`);
      });
    });

    // Ask for confirmation in Node.js script
    console.log('\n⚠️  About to delete', totalDuplicates, 'duplicate children...');
    console.log('Starting deletion in 3 seconds... (Ctrl+C to cancel)\n');
    
    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete duplicates
    let deletedCount = 0;
    for (const group of duplicates) {
      for (const child of group.delete) {
        await Child.findByIdAndDelete(child._id);
        deletedCount++;
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} duplicate children!`);
    console.log(`📊 Remaining children: ${await Child.countDocuments({})}`);

    // List remaining children
    const remaining = await Child.find({}).sort({ firstName: 1 });
    console.log('\n📋 Remaining children:');
    remaining.forEach((child, index) => {
      console.log(`${index + 1}. ${child.firstName} ${child.lastName || ''} - ${child.program} - Age: ${child.age || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔚 Database connection closed');
    process.exit(0);
  }
}

// Run the cleanup
cleanupDuplicateChildren();

