/**
 * Sample script to add 3D model URLs to products
 * 
 * This script demonstrates how to update your product database
 * to include 3D model URLs for the Product3DViewer.
 * 
 * Run this script after:
 * 1. Installing Three.js dependencies
 * 2. Placing 3D model files in /client/public/models/
 * 3. Testing models with the Product3DViewerDemo component
 */

const mongoose = require('mongoose');
const Product = require('./models/Product'); // Adjust path to your Product model

// Sample products with 3D models
const productsWithModels = [
  {
    name: 'Colorful Building Blocks',
    model3DUrl: '/models/toys/building-blocks.glb'
  },
  {
    name: 'Wooden Puzzle Set',
    model3DUrl: '/models/toys/wooden-puzzle.glb'
  },
  {
    name: 'Teddy Bear - Medium',
    model3DUrl: '/models/toys/teddy-bear.glb'
  },
  {
    name: 'Educational Globe',
    model3DUrl: '/models/toys/globe.glb'
  },
  {
    name: 'Toy Car Collection',
    model3DUrl: '/models/toys/toy-car.glb'
  },
  {
    name: 'Stacking Rings',
    model3DUrl: '/models/toys/stacking-rings.glb'
  }
];

/**
 * Update products with 3D model URLs
 */
async function addModelUrlsToProducts() {
  try {
    // Connect to MongoDB (update with your connection string)
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB');

    let updatedCount = 0;
    let notFoundCount = 0;

    // Update each product
    for (const productData of productsWithModels) {
      const result = await Product.findOneAndUpdate(
        { name: { $regex: new RegExp(productData.name, 'i') } },
        { $set: { model3DUrl: productData.model3DUrl } },
        { new: true }
      );

      if (result) {
        console.log(`✅ Updated: ${result.name} → ${productData.model3DUrl}`);
        updatedCount++;
      } else {
        console.log(`⚠️  Not found: ${productData.name}`);
        notFoundCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Updated: ${updatedCount} products`);
    console.log(`   Not Found: ${notFoundCount} products`);
    console.log('\n✨ Done! Products now have 3D model URLs.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

/**
 * Alternative: Direct MongoDB update using updateMany
 * Use this if you want to add model3DUrl field to all products at once
 */
async function addModelFieldToAllProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB');

    // Add model3DUrl field with null value to all products that don't have it
    const result = await Product.updateMany(
      { model3DUrl: { $exists: false } },
      { $set: { model3DUrl: null } }
    );

    console.log(`✅ Added model3DUrl field to ${result.modifiedCount} products`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * Get all products and show which ones have 3D models
 */
async function listProductsWith3DModels() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB');

    const productsWithModels = await Product.find({ model3DUrl: { $ne: null } });
    const productsWithoutModels = await Product.find({ $or: [{ model3DUrl: null }, { model3DUrl: { $exists: false } }] });

    console.log('\n📦 Products WITH 3D models:');
    productsWithModels.forEach(p => {
      console.log(`   ✅ ${p.name} → ${p.model3DUrl}`);
    });

    console.log(`\n📦 Products WITHOUT 3D models: ${productsWithoutModels.length}`);
    console.log('   (First 10 shown)');
    productsWithoutModels.slice(0, 10).forEach(p => {
      console.log(`   ⚪ ${p.name}`);
    });

    console.log(`\n📊 Summary:`);
    console.log(`   With 3D: ${productsWithModels.length}`);
    console.log(`   Without 3D: ${productsWithoutModels.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// Export functions
module.exports = {
  addModelUrlsToProducts,
  addModelFieldToAllProducts,
  listProductsWith3DModels
};

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'update';

  switch (command) {
    case 'update':
      addModelUrlsToProducts();
      break;
    case 'add-field':
      addModelFieldToAllProducts();
      break;
    case 'list':
      listProductsWith3DModels();
      break;
    default:
      console.log('Usage:');
      console.log('  node add-3d-models.js update     - Update products with 3D model URLs');
      console.log('  node add-3d-models.js add-field  - Add model3DUrl field to all products');
      console.log('  node add-3d-models.js list       - List products with/without 3D models');
  }
}
