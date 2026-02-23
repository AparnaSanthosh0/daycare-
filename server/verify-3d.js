// Quick verification script
const mongoose = require('mongoose');
require('dotenv').config();

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    const Product = require('./models/Product');
    
    const productsWithModels = await Product.find({ 
      model3DUrl: { $ne: null, $exists: true } 
    }).select('name model3DUrl _id');

    console.log('\n✅ Products with 3D Models:\n');
    productsWithModels.forEach(p => {
      console.log(`📦 ${p.name}`);
      console.log(`   Model: ${p.model3DUrl}`);
      console.log(`   URL: http://localhost:3000/product/${p._id}\n`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

verify();
