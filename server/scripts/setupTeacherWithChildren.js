const mongoose = require('mongoose');
const User = require('../models/User');
const Child = require('../models/Child');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupTeacherWithChildren() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/daycare');
    console.log('Connected to MongoDB');

    // Create a parent user
    const parentPassword = await bcrypt.hash('parent123', 10);
    let parent = await User.findOne({ email: 'parent@test.com' });
    
    if (!parent) {
      parent = await User.create({
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'parent@test.com',
        password: parentPassword,
        role: 'parent',
        phone: '1234567890',
        isActive: true
      });
      console.log('✓ Created parent user: parent@test.com / parent123');
    } else {
      console.log('✓ Parent user already exists: parent@test.com');
    }

    // Create a teacher user
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    let teacher = await User.findOne({ email: 'teacher@test.com' });
    
    if (!teacher) {
      teacher = await User.create({
        firstName: 'Ms. Sarah',
        lastName: 'Williams',
        email: 'teacher@test.com',
        password: teacherPassword,
        role: 'staff',
        phone: '9876543210',
        isActive: true,
        staff: {
          staffType: 'teacher',
          qualification: 'Bachelor in Early Childhood Education',
          yearsOfExperience: 5,
          assignedClass: 'Toddlers Group'
        }
      });
      console.log('✓ Created teacher user: teacher@test.com / teacher123');
    } else {
      console.log('✓ Teacher user already exists: teacher@test.com');
    }

    // Delete existing sample children to avoid duplicates
    await Child.deleteMany({
      firstName: { $in: ['Emma', 'Liam', 'Sophia', 'Noah', 'Olivia', 'Lucas'] }
    });

    // Create sample children with parent assignment
    const children = [
      {
        firstName: 'Emma',
        lastName: 'Johnson',
        dateOfBirth: new Date('2022-03-15'),
        gender: 'female',
        program: 'toddler',
        parents: [parent._id],
        assignedStaff: teacher._id,
        isActive: true,
        allergies: ['peanuts'],
        medicalConditions: [],
        emergencyContacts: [
          {
            name: 'Sarah Johnson',
            phone: '1234567890',
            relationship: 'Mother',
            canPickup: true
          }
        ]
      },
      {
        firstName: 'Liam',
        lastName: 'Smith',
        dateOfBirth: new Date('2022-05-22'),
        gender: 'male',
        program: 'toddler',
        parents: [parent._id],
        assignedStaff: teacher._id,
        isActive: true,
        allergies: [],
        medicalConditions: [],
        emergencyContacts: [
          {
            name: 'Sarah Johnson',
            phone: '1234567890',
            relationship: 'Guardian',
            canPickup: true
          }
        ]
      },
      {
        firstName: 'Sophia',
        lastName: 'Brown',
        dateOfBirth: new Date('2022-01-10'),
        gender: 'female',
        program: 'toddler',
        parents: [parent._id],
        assignedStaff: teacher._id,
        isActive: true,
        allergies: [],
        medicalConditions: [{ condition: 'Asthma', severity: 'mild' }],
        emergencyContacts: [
          {
            name: 'Sarah Johnson',
            phone: '1234567890',
            relationship: 'Guardian',
            canPickup: true
          }
        ]
      },
      {
        firstName: 'Noah',
        lastName: 'Davis',
        dateOfBirth: new Date('2022-07-08'),
        gender: 'male',
        program: 'toddler',
        parents: [parent._id],
        assignedStaff: teacher._id,
        isActive: true,
        allergies: [],
        medicalConditions: [],
        emergencyContacts: [
          {
            name: 'Sarah Johnson',
            phone: '1234567890',
            relationship: 'Guardian',
            canPickup: true
          }
        ]
      },
      {
        firstName: 'Olivia',
        lastName: 'Wilson',
        dateOfBirth: new Date('2022-04-30'),
        gender: 'female',
        program: 'toddler',
        parents: [parent._id],
        assignedStaff: teacher._id,
        isActive: true,
        allergies: ['dairy'],
        medicalConditions: [],
        emergencyContacts: [
          {
            name: 'Sarah Johnson',
            phone: '1234567890',
            relationship: 'Guardian',
            canPickup: true
          }
        ]
      },
      {
        firstName: 'Lucas',
        lastName: 'Martinez',
        dateOfBirth: new Date('2022-09-12'),
        gender: 'male',
        program: 'toddler',
        parents: [parent._id],
        assignedStaff: teacher._id,
        isActive: true,
        allergies: [],
        medicalConditions: [],
        emergencyContacts: [
          {
            name: 'Sarah Johnson',
            phone: '1234567890',
            relationship: 'Guardian',
            canPickup: true
          }
        ]
      }
    ];

    const createdChildren = await Child.insertMany(children);
    console.log(`✓ Created ${createdChildren.length} children assigned to teacher`);

    console.log('\n=== Setup Complete ===');
    console.log('Teacher Login: teacher@test.com / teacher123');
    console.log('Parent Login: parent@test.com / parent123');
    console.log(`Children created: ${createdChildren.length}`);
    console.log('\nAll children are:');
    createdChildren.forEach(child => {
      console.log(`  - ${child.firstName} ${child.lastName} (${child.program})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setupTeacherWithChildren();
