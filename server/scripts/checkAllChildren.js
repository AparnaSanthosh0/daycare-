const mongoose = require('mongoose');
const Child = require('../models/Child');
const User = require('../models/User');
require('dotenv').config();

async function checkAllChildren() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/daycare');
    console.log('Connected to MongoDB\n');

    const children = await Child.find({})
      .populate('parents', 'firstName lastName email')
      .populate('assignedStaff', 'firstName lastName email');
    
    console.log(`Total children in database: ${children.length}\n`);
    
    if (children.length === 0) {
      console.log('No children found in database!');
    } else {
      console.log('Children list:');
      children.forEach((c, i) => {
        const parentName = c.parents?.[0] ? `${c.parents[0].firstName} ${c.parents[0].lastName}` : 'None';
        const parentEmail = c.parents?.[0]?.email || 'None';
        const staffName = c.assignedStaff ? `${c.assignedStaff.firstName} ${c.assignedStaff.lastName}` : 'Not assigned';
        const staffEmail = c.assignedStaff?.email || 'None';
        
        console.log(`${i + 1}. ${c.firstName} ${c.lastName}`);
        console.log(`   Parent: ${parentName} (${parentEmail})`);
        console.log(`   Staff: ${staffName} (${staffEmail})`);
        console.log(`   Active: ${c.isActive ? 'Yes' : 'No'}\n`);
      });
    }

    // Check how many teachers exist
    const teachers = await User.find({ role: 'staff' }).select('firstName lastName email');
    console.log(`\nTotal teachers: ${teachers.length}`);
    teachers.forEach(t => {
      console.log(`- ${t.firstName} ${t.lastName} (${t.email})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllChildren();
