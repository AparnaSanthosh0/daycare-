const mongoose = require('mongoose');
require('dotenv').config();

async function listProducts() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
  const Product = require('./models/Product');
  const products = await Product.find({ isActive: true }).select('name category');
  
  console.log('\n📦 CURRENT PRODUCTS:\n');
  products.forEach(p => {
    console.log(`${(p.category || 'General').padEnd(20)} | ${p.name}`);
  });
  
  process.exit();
}

listProducts();
