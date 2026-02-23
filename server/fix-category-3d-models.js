// Fix 3D models - assign category-appropriate models to products
const mongoose = require('mongoose');
require('dotenv').config();

// Map categories to their appropriate 3D models
const categoryModelMap = {
  'baby care': '/models/babycare/lotion-bottle.glb',
  'babycare': '/models/babycare/lotion-bottle.glb',
  'bath': '/models/bath/bath-tub.glb',
  'diapering': '/models/diapering/diaper-pack.glb',
  'toys': '/models/toys/toy-car.glb',
  'gear': '/models/gear/cradle.glb',
  'feeding': '/models/babycare/baby-bottle.glb',
  'food': '/models/food/food-1.glb',
  'footwear': '/models/toys/toy-1.glb', // Use toy as placeholder
  'fashion': '/models/toys/toy-1.glb', // Use toy as placeholder
  'clothing': '/models/toys/toy-1.glb', // Use toy as placeholder
};

async function fixCategoryModels() {
  try {
    console.log('🔧 Fixing 3D Models - Assigning Category-Appropriate Models...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // Get all active products
    const allProducts = await Product.find({ isActive: true });
    
    console.log(`📦 Found ${allProducts.length} active products\n`);
    console.log('🔄 Assigning category-appropriate 3D models...\n');

    let updated = 0;
    let byCategory = {};
    
    for (const product of allProducts) {
      const category = (product.category || 'general').toLowerCase().trim();
      
      // Find appropriate model for this category
      let modelUrl = categoryModelMap[category];
      
      // If no exact match, try partial matches
      if (!modelUrl) {
        for (const [key, value] of Object.entries(categoryModelMap)) {
          if (category.includes(key) || key.includes(category)) {
            modelUrl = value;
            break;
          }
        }
      }
      
      // Default fallback
      if (!modelUrl) {
        modelUrl = '/models/toys/toy-1.glb';
      }
      
      // Update if different
      if (product.model3DUrl !== modelUrl) {
        product.model3DUrl = modelUrl;
        await product.save();
        
        console.log(`   ✅ ${product.name}`);
        console.log(`      Category: ${product.category}`);
        console.log(`      OLD: ${product.model3DUrl || 'none'}`);
        console.log(`      NEW: ${modelUrl}\n`);
        
        updated++;
        byCategory[product.category] = (byCategory[product.category] || 0) + 1;
      } else {
        console.log(`   ⏭️  ${product.name} - Already correct (${modelUrl})`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 3D MODEL FIX COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📊 Statistics:`);
    console.log(`   • Products updated: ${updated}`);
    console.log(`   • Total products: ${allProducts.length}\n`);
    
    if (Object.keys(byCategory).length > 0) {
      console.log('📋 Updates by Category:');
      for (const [cat, count] of Object.entries(byCategory)) {
        console.log(`   • ${cat}: ${count} products`);
      }
      console.log('');
    }
    
    console.log('🎯 Now products show category-appropriate 3D models!\n');
    console.log('📱 Test it:');
    console.log('   1. Visit: http://localhost:3000/shop');
    console.log('   2. Click on Baby lotion product');
    console.log('   3. Toggle to "3D View"');
    console.log('   4. Should see lotion bottle model! 🧴\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixCategoryModels();
