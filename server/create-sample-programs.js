// Test script to create sample after school programs
// Run: node server/create-sample-programs.js

const mongoose = require('mongoose');
require('dotenv').config();

const AfterSchoolProgram = require('./models/AfterSchoolProgram');

const samplePrograms = [
  {
    programName: "Homework Help Club",
    programType: "Homework Help",
    description: "Get assistance with daily homework assignments from qualified tutors. Small group setting ensures individual attention.",
    ageGroup: { min: 6, max: 12 },
    schedule: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startTime: '15:30',
      endTime: '17:00',
      duration: 90
    },
    fees: { amount: 150, frequency: 'monthly' },
    capacity: 15,
    assignedStaff: [],
    status: 'active',
    startDate: new Date('2026-01-13'),
    location: 'Room 101, Main Building',
    requirements: 'Bring school homework and supplies',
    maxAbsences: 3,
    enrolledChildren: [],
    sessions: [],
    announcements: []
  },
  {
    programName: "Creative Dance",
    programType: "Dance",
    description: "Learn basic dance movements, coordination, and express creativity through movement. Fun and energetic!",
    ageGroup: { min: 4, max: 8 },
    schedule: {
      days: ['Wednesday', 'Friday'],
      startTime: '16:00',
      endTime: '17:00',
      duration: 60
    },
    fees: { amount: 120, frequency: 'monthly' },
    capacity: 12,
    assignedStaff: [],
    status: 'active',
    startDate: new Date('2026-01-15'),
    location: 'Dance Studio, Building B',
    requirements: 'Comfortable clothing and dance shoes',
    maxAbsences: 2,
    enrolledChildren: [],
    sessions: [],
    announcements: []
  },
  {
    programName: "Junior Sports League",
    programType: "Sports",
    description: "Introduction to various sports including soccer, basketball, and volleyball. Focus on teamwork and physical fitness.",
    ageGroup: { min: 7, max: 12 },
    schedule: {
      days: ['Monday', 'Thursday'],
      startTime: '15:00',
      endTime: '16:30',
      duration: 90
    },
    fees: { amount: 100, frequency: 'monthly' },
    capacity: 20,
    assignedStaff: [],
    status: 'active',
    startDate: new Date('2026-01-13'),
    location: 'Sports Field / Gymnasium',
    requirements: 'Sports attire, water bottle, and athletic shoes',
    maxAbsences: 3,
    enrolledChildren: [],
    sessions: [],
    announcements: []
  },
  {
    programName: "Art & Crafts Workshop",
    programType: "Art & Craft",
    description: "Explore creativity through painting, drawing, sculpting, and various craft projects. Take home your masterpieces!",
    ageGroup: { min: 5, max: 10 },
    schedule: {
      days: ['Tuesday', 'Thursday'],
      startTime: '16:00',
      endTime: '17:30',
      duration: 90
    },
    fees: { amount: 0, frequency: 'free' },
    capacity: 10,
    assignedStaff: [],
    status: 'active',
    startDate: new Date('2026-01-14'),
    location: 'Art Room, Building C',
    requirements: 'Apron or old clothes (can get messy!)',
    maxAbsences: 3,
    enrolledChildren: [],
    sessions: [],
    announcements: []
  },
  {
    programName: "Coding for Kids",
    programType: "Coding",
    description: "Introduction to programming using kid-friendly platforms like Scratch. Learn logic, problem-solving, and create games!",
    ageGroup: { min: 8, max: 12 },
    schedule: {
      days: ['Monday', 'Wednesday'],
      startTime: '16:00',
      endTime: '17:30',
      duration: 90
    },
    fees: { amount: 180, frequency: 'monthly' },
    capacity: 12,
    assignedStaff: [],
    status: 'active',
    startDate: new Date('2026-01-13'),
    location: 'Computer Lab, Building A',
    requirements: 'No prior experience needed',
    maxAbsences: 2,
    enrolledChildren: [],
    sessions: [],
    announcements: []
  }
];

async function createSamplePrograms() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/daycare', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find an admin user to set as creator
    const User = require('./models/User');
    const admin = await User.findOne({ role: 'admin' });
    
    if (!admin) {
      console.log('❌ No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    console.log(`Using admin: ${admin.firstName} ${admin.lastName}`);

    // Add creator to each program
    const programsWithCreator = samplePrograms.map(program => ({
      ...program,
      createdBy: admin._id
    }));

    // Clear existing programs (optional - comment out if you want to keep existing)
    await AfterSchoolProgram.deleteMany({});
    console.log('Cleared existing programs');

    // Insert sample programs
    const created = await AfterSchoolProgram.insertMany(programsWithCreator);
    console.log(`✅ Created ${created.length} sample after school programs:`);
    
    created.forEach((program, index) => {
      console.log(`${index + 1}. ${program.programName} (${program.programType}) - ${program.fees.amount === 0 ? 'FREE' : `$${program.fees.amount}/${program.fees.frequency}`}`);
    });

    console.log('\n✅ Sample programs created successfully!');
    console.log('Parents can now browse and enroll in these programs from the Parent Dashboard.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample programs:', error);
    process.exit(1);
  }
}

createSamplePrograms();
