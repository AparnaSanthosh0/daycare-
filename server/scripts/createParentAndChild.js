const mongoose = require('mongoose');
const User = require('../models/User');
const Child = require('../models/Child');
const Attendance = require('../models/Attendance');
const Activity = require('../models/Activity');
const Milestone = require('../models/Milestone');
require('dotenv').config();

const createParentAndChild = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB');

    // Create parent user
    const parentData = {
      firstName: 'Fathima',
      lastName: 'Ahmed',
      username: 'fathima.ahmed',
      email: 'fathima@example.com',
      password: 'password123',
      role: 'parent',
      phone: '+1234567890',
      isActive: true,
      address: {
        street: '123 Main Street',
        city: 'Sample City',
        state: 'Sample State',
        zipCode: '12345'
      }
    };

    // Check if parent already exists
    let parent = await User.findOne({ email: parentData.email });
    if (parent) {
      console.log('ℹ️ Parent user already exists:', parent.email);
    } else {
      parent = new User(parentData);
      await parent.save();
      console.log('✅ Parent user created successfully');
      console.log(`👤 Email: ${parentData.email}`);
      console.log(`🔑 Password: ${parentData.password}`);
    }

    // Create child data
    const childData = {
      firstName: 'Emma',
      lastName: 'Ahmed',
      dateOfBirth: new Date('2020-03-15'), // 3 years old
      gender: 'female',
      parents: [parent._id],
      program: 'preschool',
      allergies: ['Peanuts', 'Dairy'],
      medicalConditions: [
        {
          condition: 'Asthma',
          medication: 'Inhaler',
          instructions: 'Use inhaler before physical activities'
        }
      ],
      emergencyContacts: [
        {
          name: 'Fathima Ahmed',
          phone: '5551234567',
          relationship: 'Mother',
          canPickup: true
        },
        {
          name: 'Ahmed Hassan',
          phone: '5559876543',
          relationship: 'Father',
          canPickup: true
        }
      ],
      authorizedPickup: [
        {
          name: 'Grandma Mary',
          phone: '5555551234',
          relationship: 'Grandmother'
        }
      ],
      schedule: {
        monday: { start: '08:00', end: '17:00', enrolled: true },
        tuesday: { start: '08:00', end: '17:00', enrolled: true },
        wednesday: { start: '08:00', end: '17:00', enrolled: true },
        thursday: { start: '08:00', end: '17:00', enrolled: true },
        friday: { start: '08:00', end: '17:00', enrolled: true }
      },
      tuitionRate: 1200,
      isActive: true,
      notes: 'Emma loves arts and crafts. She is very social and enjoys playing with other children.'
    };

    // Check if child already exists
    let child = await Child.findOne({ 
      firstName: childData.firstName, 
      lastName: childData.lastName,
      parents: parent._id 
    });

    if (child) {
      console.log('ℹ️ Child already exists:', child.firstName, child.lastName);
    } else {
      child = new Child(childData);
      await child.save();
      console.log('✅ Child created successfully:', child.firstName, child.lastName);
      console.log('Child ID:', child._id);
      console.log('Age:', child.age, 'years old');
    }

    // Add sample attendance records
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

    const attendanceRecords = [
      {
        entityId: child._id,
        entityType: 'child',
        date: today,
        checkInAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 30),
        checkOutAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 45),
        status: 'present',
        notes: 'Happy and energetic today'
      },
      {
        entityId: child._id,
        entityType: 'child',
        date: yesterday,
        checkInAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 15),
        checkOutAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 0),
        status: 'present',
        notes: 'Great day at daycare'
      },
      {
        entityId: child._id,
        entityType: 'child',
        date: twoDaysAgo,
        checkInAt: null,
        checkOutAt: null,
        status: 'absent',
        notes: 'Sick day'
      }
    ];

    // Clear existing attendance records for this child
    await Attendance.deleteMany({ entityId: child._id });
    await Attendance.insertMany(attendanceRecords);
    console.log('✅ Sample attendance records added');

    // Add sample activities
    const activities = [
      {
        title: 'Art and Craft Time',
        description: 'Painting and drawing activities',
        date: today,
        child: child._id,
        category: 'education'
      },
      {
        title: 'Outdoor Play',
        description: 'Playground activities and games',
        date: yesterday,
        child: child._id,
        category: 'outdoor'
      }
    ];

    // Clear existing activities for this child
    await Activity.deleteMany({ child: child._id });
    await Activity.insertMany(activities);
    console.log('✅ Sample activities added');

    // Add sample milestones
    const milestones = [
      {
        title: 'Can count to 10',
        description: 'Child can count from 1 to 10',
        child: child._id,
        category: 'cognitive',
        date: new Date('2024-05-15')
      },
      {
        title: 'Can write their name',
        description: 'Child can write their first name legibly',
        child: child._id,
        category: 'motor',
        date: new Date('2024-08-01')
      }
    ];

    // Clear existing milestones for this child
    await Milestone.deleteMany({ child: child._id });
    await Milestone.insertMany(milestones);
    console.log('✅ Sample milestones added');

    console.log('\n🎉 Sample data created successfully!');
    console.log('You can now login as parent:');
    console.log(`📧 Email: ${parentData.email}`);
    console.log(`🔑 Password: ${parentData.password}`);

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createParentAndChild();
