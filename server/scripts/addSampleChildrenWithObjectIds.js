const mongoose = require('mongoose');
const Child = require('../models/Child');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots';

const sampleChildren = [
  {
    firstName: 'Emma',
    lastName: 'Johnson',
    dateOfBirth: new Date('2020-03-15'),
    gender: 'female',
    program: 'preschool',
    interests: ['arts_crafts', 'reading', 'music', 'drawing', 'storytelling'],
    isActive: true
  },
  {
    firstName: 'Liam',
    lastName: 'Smith',
    dateOfBirth: new Date('2020-05-22'),
    gender: 'male',
    program: 'preschool',
    interests: ['building_blocks', 'outdoor_play', 'sports', 'running', 'technology'],
    isActive: true
  },
  {
    firstName: 'Sophia',
    lastName: 'Brown',
    dateOfBirth: new Date('2020-01-10'),
    gender: 'female',
    program: 'preschool',
    interests: ['arts_crafts', 'music', 'dancing', 'singing', 'pretend_play'],
    isActive: true
  },
  {
    firstName: 'Noah',
    lastName: 'Davis',
    dateOfBirth: new Date('2020-07-08'),
    gender: 'male',
    program: 'preschool',
    interests: ['building_blocks', 'puzzles', 'science', 'technology', 'board_games'],
    isActive: true
  },
  {
    firstName: 'Olivia',
    lastName: 'Wilson',
    dateOfBirth: new Date('2020-04-30'),
    gender: 'female',
    program: 'preschool',
    interests: ['reading', 'storytelling', 'pretend_play', 'animals', 'cooking'],
    isActive: true
  }
];

async function addSampleChildren() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing sample children
    await Child.deleteMany({ firstName: { $in: ['Emma', 'Liam', 'Sophia', 'Noah', 'Olivia'] } });
    console.log('🗑️ Cleared existing sample children');
    
    // Add new sample children
    const createdChildren = await Child.insertMany(sampleChildren);
    console.log(`✅ Added ${createdChildren.length} sample children:`);
    
    createdChildren.forEach((child, index) => {
      console.log(`${index + 1}. ${child.firstName} ${child.lastName} (ID: ${child._id})`);
    });
    
    console.log('\n🎯 Sample children ready for KNN testing!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addSampleChildren();
