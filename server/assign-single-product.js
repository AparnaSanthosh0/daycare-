// Quickly assign a 3D model to a single product
const mongoose = require('mongoose');
require('dotenv').config();

async function assignModel(productId, modelPath) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    const Product = require('./models/Product');
    
    const product = await Product.findById(productId);
    
    if (!product) {
      console.log('❌ Product not found with ID:', productId);
      return;
    }
    
    const oldModel = product.model3DUrl;
    product.model3DUrl = modelPath;
    await product.save();
    
    console.log('\n✅ SUCCESS!\n');
    console.log(`Product: ${product.name}`);
    console.log(`Old Model: ${oldModel || 'NONE'}`);
    console.log(`New Model: ${modelPath}\n`);
    console.log('🎯 Refresh browser to see changes!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

const productId = process.argv[2];
const modelPath = process.argv[3];

if (!productId || !modelPath) {
  console.log('\n❌ Usage: node assign-single-product.js <product-id> <model-path>\n');
  console.log('Example:');
  console.log('  node assign-single-product.js 68e5ff6c8911b207bb3 /models/festival-offer/dreamtoys.glb\n');
  process.exit(1);
}

assignModel(productId, modelPath);
