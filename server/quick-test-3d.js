// Quick script to add 3D model URL to first product for testing
const mongoose = require('mongoose');
require('dotenv').config();

async function addTestModel() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB');

    const Product = require('./models/Product');
    
    // Get first product
    const product = await Product.findOne({ isActive: true });
    
    if (!product) {
      console.log('❌ No products found');
      process.exit(1);
    }

    // Add test 3D model URL
    product.model3DUrl = '/models/toys/teddy-bear.glb';
    await product.save();

    console.log('✅ Added 3D model URL to product:');
    console.log(`   Product: ${product.name}`);
    console.log(`   ID: ${product._id}`);
    console.log(`   Model URL: ${product.model3DUrl}`);
    console.log(`\n🎯 View it at: http://localhost:3000/product/${product._id}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

addTestModel();
