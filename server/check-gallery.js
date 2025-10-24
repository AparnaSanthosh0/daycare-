const mongoose = require('mongoose');
const Child = require('./models/Child');

const connectDb = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/tinytots');
    console.log('Connected to MongoDB');

    // Check if any children have gallery data
    const children = await Child.find({ 'gallery.0': { $exists: true } }).limit(5);
    if (children.length > 0) {
      console.log('Children with gallery data found:');
      children.forEach(child => {
        console.log(`- ${child.firstName} ${child.lastName}: ${child.gallery.length} photos`);
        child.gallery.forEach((photo, idx) => {
          console.log(`  Photo ${idx + 1}: ${photo.url} (uploaded by ${photo.uploadedBy})`);
        });
      });
    } else {
      console.log('No children with gallery data found');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
};

connectDb();
