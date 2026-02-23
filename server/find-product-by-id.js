// Find product by ID from URL
const mongoose = require('mongoose');
require('dotenv').config();

async function findProductById() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // The ID from the user's screenshot URL
    const productId = '68c7ed1a4dc36b2e3e4225a0';

    const product = await Product.findById(productId);

    if (product) {
      console.log('🔍 PRODUCT FOUND:\n');
      console.log('═══════════════════════════════════════════════════\n');
      console.log(`Name: ${product.name}`);
      console.log(`Category: ${product.category}`);
      console.log(`Price: ₹${product.price}`);
      console.log(`Description: ${product.description || 'N/A'}`);
      console.log(`Current 3D Model: ${product.model3DUrl || 'NONE'}`);
      console.log(`\nID: ${product._id}`);
      console.log('\n═══════════════════════════════════════════════════\n');
      
      // Suggest correct model
      const category = (product.category || '').toLowerCase();
      let suggestedModel = null;
      
      if (category.includes('baby') || category.includes('care') || category.includes('lotion')) {
        suggestedModel = '/models/babycare/lotion-bottle.glb';
      } else if (category.includes('toy')) {
        suggestedModel = '/models/toys/toy-car.glb';
      } else if (category.includes('bath')) {
        suggestedModel = '/models/bath/bath-tub.glb';
      } else if (category.includes('diaper')) {
        suggestedModel = '/models/diapering/diaper-pack.glb';
      }
      
      if (suggestedModel && product.model3DUrl !== suggestedModel) {
        console.log(`💡 RECOMMENDATION:`);
        console.log(`   Current: ${product.model3DUrl}`);
        console.log(`   Suggested: ${suggestedModel}`);
        console.log(`\n   To fix, run:`);
        console.log(`   node server/assign-single-product.js ${productId} ${suggestedModel}\n`);
      } else if (suggestedModel) {
        console.log(`✅ Model is already correct for this category!\n`);
      }
      
    } else {
      console.log('❌ Product not found with ID:', productId);
      console.log('\nSearching for products with "Baby lotion" in name...\n');
      
      const products = await Product.find({ 
        name: /baby.*lotion/i,
        isActive: true 
      }).select('name category model3DUrl _id');
      
      if (products.length > 0) {
        console.log('Found matching products:');
        products.forEach((p, i) => {
          console.log(`\n${i + 1}. ${p.name}`);
          console.log(`   ID: ${p._id}`);
          console.log(`   Category: ${p.category}`);
          console.log(`   3D Model: ${p.model3DUrl || 'NONE'}`);
        });
      } else {
        console.log('No products found with "Baby lotion" in name.');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

findProductById();
