// Check baby care products specifically
const mongoose = require('mongoose');
require('dotenv').config();

async function checkBabyCareProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // Find all baby care products
    const babyCare = await Product.find({ 
      category: /baby|lotion|care/i,
      isActive: true 
    }).select('name category model3DUrl _id');

    console.log('🧴 BABY CARE / LOTION PRODUCTS:\n');
    console.log('═══════════════════════════════════════════════════\n');

    babyCare.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   ID: ${p._id}`);
      console.log(`   Category: ${p.category}`);
      console.log(`   3D Model: ${p.model3DUrl || 'NONE'}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkBabyCareProducts();
