// Search for product with price 1000 (from screenshot)
const mongoose = require('mongoose');
require('dotenv').config();

async function findBabyLotion() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // Search for products around ₹1000
    const products = await Product.find({
      price: { $gte: 900, $lte: 1100 },
      isActive: true
    }).select('name category price model3DUrl _id description');

    console.log('🔍 Products priced around ₹1000:\n');
    console.log('═══════════════════════════════════════════════════\n');

    products.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   ID: ${p._id}`);
      console.log(`   Category: ${p.category}`);
      console.log(`   Price: ₹${p.price}`);
      console.log(`   3D Model: ${p.model3DUrl || 'NONE'}`);
      console.log(`   Description: ${p.description?.substring(0, 50) || 'N/A'}...`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════\n');
    
    // Also search for anything with "lotion" or "baby" in name
    console.log('🔍 Products with "baby" or "lotion" in name:\n');
    
    const babyProducts = await Product.find({
      $or: [
        { name: /baby/i },
        { name: /lotion/i }
      ],
      isActive: true
    }).select('name category price model3DUrl _id').limit(10);
    
    babyProducts.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} - ₹${p.price} - ${p.model3DUrl || 'NO MODEL'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

findBabyLotion();
