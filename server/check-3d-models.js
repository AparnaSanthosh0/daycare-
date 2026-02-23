// Check which products have 3D models assigned
const mongoose = require('mongoose');
require('dotenv').config();

async function check3DModels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // Get all products with 3D models
    const productsWithModels = await Product.find({ 
      model3DUrl: { $ne: null, $exists: true },
      isActive: true 
    }).select('name category model3DUrl');

    // Get all products without 3D models
    const productsWithoutModels = await Product.find({ 
      $or: [
        { model3DUrl: null }, 
        { model3DUrl: { $exists: false } }
      ],
      isActive: true 
    }).select('name category');

    console.log('═══════════════════════════════════════════════════');
    console.log('📊 3D MODEL STATUS REPORT');
    console.log('═══════════════════════════════════════════════════\n');

    console.log(`✅ Products WITH 3D Models: ${productsWithModels.length}`);
    if (productsWithModels.length > 0) {
      console.log('\n Products with 3D models:');
      productsWithModels.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name}`);
        console.log(`      Category: ${p.category}`);
        console.log(`      3D Model: ${p.model3DUrl}\n`);
      });
    }

    console.log(`\n❌ Products WITHOUT 3D Models: ${productsWithoutModels.length}`);
    if (productsWithoutModels.length > 0 && productsWithoutModels.length <= 20) {
      console.log('\n Products without 3D models:');
      productsWithoutModels.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (${p.category})`);
      });
    } else if (productsWithoutModels.length > 20) {
      console.log(`   (Too many to list - ${productsWithoutModels.length} products)`);
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('💡 RECOMMENDATIONS:');
    console.log('═══════════════════════════════════════════════════\n');

    if (productsWithoutModels.length > 0) {
      console.log('⚠️  Some products don\'t have 3D models assigned.');
      console.log('   To assign 3D models to all products, run:');
      console.log('   node server/add-3d-to-all-products.js\n');
    } else {
      console.log('✅ All active products have 3D models!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

check3DModels();
