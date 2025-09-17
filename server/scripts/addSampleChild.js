const mongoose = require('mongoose');
const User = require('../models/User');
const Child = require('../models/Child');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function addSampleChild() {
  try {
    // Find a parent user
    const parent = await User.findOne({ role: 'parent' });
    if (!parent) {
      console.log('No parent found. Please create a parent user first.');
      return;
    }

    console.log('Found parent:', parent.email);

    // Create sample child data
    const sampleChild = {
      firstName: 'Emma',
      lastName: 'Johnson',
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
          name: 'Sarah Johnson',
          phone: '5551234567',
          relationship: 'Mother',
          canPickup: true
        },
        {
          name: 'John Johnson',
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
    const existingChild = await Child.findOne({ 
      firstName: sampleChild.firstName, 
      lastName: sampleChild.lastName,
      parents: parent._id 
    });

    if (existingChild) {
      console.log('Child already exists:', existingChild.firstName, existingChild.lastName);
      return;
    }

    // Create the child
    const child = await Child.create(sampleChild);
    console.log('Sample child created successfully:', child.firstName, child.lastName);
    console.log('Child ID:', child._id);
    console.log('Age:', child.age, 'years old');

    // Add some sample attendance records
    const Attendance = require('../models/Attendance');
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

    await Attendance.insertMany(attendanceRecords);
    console.log('Sample attendance records added');

    // Add some sample activities
    const Activity = require('../models/Activity');
    const activities = [
      {
        title: 'Art and Craft Time',
        description: 'Painting and drawing activities',
        date: today,
        children: [child._id],
        duration: 60,
        category: 'Creative'
      },
      {
        title: 'Outdoor Play',
        description: 'Playground activities and games',
        date: yesterday,
        children: [child._id],
        duration: 45,
        category: 'Physical'
      }
    ];

    await Activity.insertMany(activities);
    console.log('Sample activities added');

    // Add some sample milestones
    const Milestone = require('../models/Milestone');
    const milestones = [
      {
        title: 'Can count to 10',
        description: 'Child can count from 1 to 10',
        child: child._id,
        category: 'Cognitive',
        targetDate: new Date('2024-06-01'),
        status: 'completed',
        completedDate: new Date('2024-05-15')
      },
      {
        title: 'Can write their name',
        description: 'Child can write their first name legibly',
        child: child._id,
        category: 'Fine Motor',
        targetDate: new Date('2024-08-01'),
        status: 'pending'
      }
    ];

    await Milestone.insertMany(milestones);
    console.log('Sample milestones added');

    console.log('\nSample data created successfully!');
    console.log('You can now login as parent:', parent.email);
    console.log('Password: (use the password you set during registration)');

  } catch (error) {
    console.error('Error creating sample child:', error);
  } finally {
    mongoose.connection.close();
  }
}

addSampleChild();
