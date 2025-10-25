const mongoose = require('mongoose');
const Child = require('../models/Child');
require('dotenv').config();

const sampleChildren = [
  {
    firstName: 'Emma',
    lastName: 'Johnson',
    dateOfBirth: new Date('2020-03-15'),
    gender: 'female',
    program: 'preschool',
    interests: ['arts_crafts', 'reading', 'music', 'drawing', 'storytelling'],
    isActive: true,
    parents: []
  },
  {
    firstName: 'Liam',
    lastName: 'Smith',
    dateOfBirth: new Date('2020-05-22'),
    gender: 'male',
    program: 'preschool',
    interests: ['building_blocks', 'outdoor_play', 'sports', 'running', 'technology'],
    isActive: true,
    parents: []
  },
  {
    firstName: 'Sophia',
    lastName: 'Brown',
    dateOfBirth: new Date('2020-01-10'),
    gender: 'female',
    program: 'preschool',
    interests: ['arts_crafts', 'music', 'dancing', 'singing', 'pretend_play'],
    isActive: true,
    parents: []
  },
  {
    firstName: 'Noah',
    lastName: 'Davis',
    dateOfBirth: new Date('2020-07-08'),
    gender: 'male',
    program: 'preschool',
    interests: ['building_blocks', 'puzzles', 'science', 'technology', 'board_games'],
    isActive: true,
    parents: []
  },
  {
    firstName: 'Olivia',
    lastName: 'Wilson',
    dateOfBirth: new Date('2020-04-30'),
    gender: 'female',
    program: 'preschool',
    interests: ['reading', 'storytelling', 'pretend_play', 'animals', 'cooking'],
    isActive: true,
    parents: []
  },
  {
    firstName: 'William',
    lastName: 'Miller',
    dateOfBirth: new Date('2019-11-12'),
    gender: 'male',
    program: 'preschool',
    interests: ['building_blocks', 'puzzles', 'science', 'technology', 'board_games'],
    isActive: true,
    parents: []
  },
  {
    firstName: 'Ava',
    lastName: 'Garcia',
    dateOfBirth: new Date('2020-08-25'),
    gender: 'female',
    program: 'preschool',
    interests: ['arts_crafts', 'music', 'dancing', 'drawing', 'singing'],
    isActive: true,
    parents: []
  },
  {
    firstName: 'James',
    lastName: 'Martinez',
    dateOfBirth: new Date('2020-02-18'),
    gender: 'male',
    program: 'preschool',
    interests: ['outdoor_play', 'sports', 'running', 'swimming', 'animals'],
    isActive: true,
    parents: []
  }
];

async function addSampleChildren() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing children
    await Child.deleteMany({});
    console.log('Cleared existing children');

    // Add sample children
    const children = await Child.insertMany(sampleChildren);
    console.log(`Added ${children.length} sample children`);

    // Calculate and update ages
    for (let child of children) {
      const age = calculateAge(child.dateOfBirth);
      await Child.findByIdAndUpdate(child._id, { age: age });
    }

    console.log('Updated ages for all children');
    console.log('Sample data added successfully!');

  } catch (error) {
    console.error('Error adding sample children:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

function calculateAge(dateOfBirth) {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Run the script
addSampleChildren();
