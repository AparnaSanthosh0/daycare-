const mongoose = require('mongoose');
require('dotenv').config();

async function verifyModels() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
  const Product = require('./models/Product');
  
  const products = await Product.find({ isActive: true }).select('name category model3DUrl').limit(10);
  
  console.log('\n🔍 VERIFYING 3D MODEL ASSIGNMENTS:\n');
  products.forEach(p => {
    console.log(`${p.name}`);
    console.log(`   Category: ${p.category || 'N/A'}`);
    console.log(`   Model: ${p.model3DUrl || 'NONE'}\n`);
  });
  
  process.exit();
}

verifyModels();
