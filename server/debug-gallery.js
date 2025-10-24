const mongoose = require('mongoose');
const Child = require('./models/Child');

const connectDb = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/tinytots');
    console.log('Connected to MongoDB');

    // Check all children and their gallery data
    const children = await Child.find({}).limit(10);
    console.log(`Total children found: ${children.length}`);

    children.forEach(child => {
      console.log(`\nChild: ${child.firstName} ${child.lastName}`);
      console.log(`Gallery length: ${child.gallery ? child.gallery.length : 0}`);
      if (child.gallery && child.gallery.length > 0) {
        child.gallery.forEach((photo, idx) => {
          console.log(`  Photo ${idx + 1}:`);
          console.log(`    URL: ${photo.url}`);
          console.log(`    Caption: ${photo.caption}`);
          console.log(`    Uploaded by: ${photo.uploadedBy}`);
          console.log(`    Uploaded at: ${photo.uploadedAt}`);
        });
      }
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
};

connectDb();
