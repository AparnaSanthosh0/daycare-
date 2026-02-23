/**
 * List All Products to Identify the 4 from Screenshot
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function listAllProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // Get feeding products named Dreamtoys or Baby Bottle
    console.log('═══ FEEDING CATEGORY ═══\n');
    const feeding = await Product.find({
      category: /feeding/i
    }).select('name price image category').sort({ price: -1 });

    feeding.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} - ₹${p.price}`);
      console.log(`   Category: ${p.category}`);
      console.log(`   Image: ${p.image}`);
      console.log(`   ID: ${p._id}\n`);
    });

    // Get footwear products
    console.log('\n═══ FOOTWEAR CATEGORY ═══\n');
    const footwear = await Product.find({
      category: /footwear/i
    }).select('name price image category').sort({ price: -1 });

    footwear.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} - ₹${p.price}`);
      console.log(`   Category: ${p.category}`);
      console.log(`   Image: ${p.image}`);
      console.log(`   ID: ${p._id}\n`);
    });

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listAllProducts();
