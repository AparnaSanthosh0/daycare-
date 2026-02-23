// Auto-generated script to assign 3D model
const mongoose = require('mongoose');
require('dotenv').config();

async function assignModel() {
  const productId = '68e3ff56c891b2107b4bb383';
  const modelPath = '/models/festival-offer/dreamtoys.glb';
  
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
  const Product = require('./models/Product');
  
  const product = await Product.findById(productId);
  product.model3DUrl = modelPath;
  await product.save();
  
  console.log('✅ Updated Dreamtoys');
  console.log('   3D Model: ' + modelPath);
  
  await mongoose.disconnect();
}

assignModel();
