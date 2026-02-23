const mongoose = require('mongoose');
require('dotenv').config();

async function findDreamtoys() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
  const Product = require('./models/Product');
  
  const products = await Product.find({ 
    name: /dreamtoys/i,
    isActive: true 
  }).select('_id name category image model3DUrl');
  
  console.log('\n📦 Found Dreamtoys products:\n');
  products.forEach(p => {
    console.log(`ID: ${p._id}`);
    console.log(`Name: ${p.name}`);
    console.log(`Category: ${p.category}`);
    console.log(`Image: ${p.image}`);
    console.log(`Current 3D: ${p.model3DUrl || 'NONE'}`);
    console.log(`URL: http://localhost:3000/product/${p._id}\n`);
  });
  
  await mongoose.disconnect();
}

findDreamtoys();
