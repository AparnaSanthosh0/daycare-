/**
 * Find Product Images for the 4 Products
 * 
 * This script will show you which image files to upload to Meshy.ai
 */

const mongoose = require('mongoose');
require('dotenv').config();
const path = require('path');

async function findProductImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  📸 PRODUCT IMAGES FOR 3D GENERATION                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Find the 4 products based on rough prices and categories
    const products = [
      { name: 'Dreamtoys', category: 'feeding', priceRange: [900, 1100] },
      { name: 'Baby Bottle', category: 'Feeding', priceRange: [500, 700] },
      { name: 'Dreamtoys', category: 'footwear', priceRange: [150, 250] },
      { name: 'Dreamtoys', category: 'footwear', priceRange: [700, 900] }
    ];

    console.log('🎯 TARGET PRODUCTS:\n');

    let count = 1;
    for (const target of products) {
      const found = await Product.findOne({
        name: new RegExp(target.name, 'i'),
        category: new RegExp(target.category, 'i'),
        price: { $gte: target.priceRange[0], $lte: target.priceRange[1] }
      });

      if (found) {
        console.log(`${count}. ${found.name} (${found.category}) - ₹${found.price}`);
        console.log(`   Product ID: ${found._id}`);
        console.log(`   📸 IMAGE FILE: ${found.image}`);
        
        // Extract just the filename
        const imagePath = found.image;
        const fullPath = path.join(__dirname, '..', 'client', 'public', imagePath);
        
        console.log(`   📁 Full path: ${fullPath}`);
        console.log(`   \n   ▶️ UPLOAD THIS IMAGE TO MESHY.AI\n`);
        count++;
      } else {
        console.log(`${count}. ⚠️ Could not find: ${target.name} (${target.category}) ~₹${target.priceRange[0]}`);
        console.log(`   Try searching manually in database\n`);
        count++;
      }
    }

    console.log('═'.repeat(66));
    console.log('\n💡 NEXT STEPS:\n');
    console.log('1. Find these image files in: client/public/uploads/products/');
    console.log('2. Upload each image to https://www.meshy.ai');
    console.log('3. Select "Image to 3D" mode');
    console.log('4. Wait for generation (2-5 min each)');
    console.log('5. Download as GLB format');
    console.log('6. Save to appropriate folder in models/');
    console.log('7. Run: node server/assign-4-product-models.js\n');

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findProductImages();
