/**
 * Assign 3D models to products based on their category
 * This script maps the correct 3D model to each product category
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Category to 3D model mapping
// Each category can have multiple models to rotate through
// NOTE: Order matters - more specific categories should come first
const categoryModelMap = {
  // Baby Care (must come before general fashion to match "baby care" category)
  'baby care': ['/models/babycare/baby-bottle.glb', '/models/babycare/lotion-bottle.glb'],
  'babycare': ['/models/babycare/baby-bottle.glb', '/models/babycare/lotion-bottle.glb'],
  'skincare': ['/models/babycare/lotion-bottle.glb'],
  'lotion': ['/models/babycare/lotion-bottle.glb'],
  'cream': ['/models/babycare/lotion-bottle.glb'],
  'oil': ['/models/babycare/lotion-bottle.glb'],
  'bottle': ['/models/babycare/baby-bottle.glb'],
  'feeding': ['/models/babycare/baby-bottle.glb'],
  
  // Clothing & Fashion
  'clothing': ['/models/clothing/baby-onesie.glb', '/models/clothing/baby-shirt.glb'],
  'clothes': ['/models/clothing/baby-onesie.glb', '/models/clothing/baby-shirt.glb'],
  'dress': ['/models/festival-offer/pink-dress-demo.glb'],
  'dresses': ['/models/festival-offer/pink-dress-demo.glb'],
  'fashion': ['/models/clothing/baby-onesie.glb', '/models/clothing/baby-shirt.glb'],
  'onesie': ['/models/clothing/baby-onesie.glb'],
  'shirt': ['/models/clothing/baby-shirt.glb'],
  'romper': ['/models/clothing/baby-onesie.glb'],
  'bodysuit': ['/models/clothing/baby-onesie.glb'],
  
  // Footwear
  'footwear': ['/models/footwear/baby-shoes.glb'],
  'shoes': ['/models/footwear/baby-shoes.glb'],
  'boots': ['/models/footwear/baby-shoes.glb'],
  'sandals': ['/models/footwear/baby-shoes.glb'],
  'socks': ['/models/footwear/baby-shoes.glb'],
  
  // Toys
  'toys': ['/models/toys/teddy-bear.glb', '/models/toys/toy-1.glb', '/models/toys/toy-2.glb', '/models/toys/toy-car.glb'],
  'toy': ['/models/toys/teddy-bear.glb', '/models/toys/toy-1.glb', '/models/toys/toy-2.glb', '/models/toys/toy-car.glb'],
  'plush': ['/models/toys/teddy-bear.glb'],
  'teddy': ['/models/toys/teddy-bear.glb'],
  'stuffed': ['/models/toys/teddy-bear.glb'],
  'car': ['/models/toys/toy-car.glb'],
  'vehicle': ['/models/toys/toy-car.glb'],
  
  // Bath
  'bath': ['/models/bath/bath-tub.glb'],
  'bathing': ['/models/bath/bath-tub.glb'],
  'tub': ['/models/bath/bath-tub.glb'],
  
  // Diapering
  'diaper': ['/models/diapering/diaper-pack.glb'],
  'diapering': ['/models/diapering/diaper-pack.glb'],
  'diapers': ['/models/diapering/diaper-pack.glb'],
  'nappy': ['/models/diapering/diaper-pack.glb'],
  
  // Food & Nutrition
  'food': ['/models/food/food-1.glb'],
  'nutrition': ['/models/food/food-1.glb'],
  'snacks': ['/models/food/food-1.glb'],
  'meal': ['/models/food/food-1.glb'],
  
  // Gear & Equipment
  'gear': ['/models/gear/cradle.glb'],
  'equipment': ['/models/gear/cradle.glb'],
  'furniture': ['/models/gear/cradle.glb'],
  'cradle': ['/models/gear/cradle.glb'],
  'crib': ['/models/gear/cradle.glb'],
  'bed': ['/models/gear/cradle.glb'],
  'stroller': ['/models/gear/cradle.glb'],
  
  // Festival/Special
  'festival': ['/models/festival-offer/pink-dress-demo.glb'],
  'special': ['/models/festival-offer/pink-dress-demo.glb'],
  'offer': ['/models/festival-offer/pink-dress-demo.glb'],
  'party': ['/models/festival-offer/pink-dress-demo.glb'],
};

// Default models to use when no specific category match is found
const defaultModels = [
  '/models/toys/toy-1.glb',
  '/models/toys/toy-2.glb',
  '/models/babycare/baby-bottle.glb'
];

/**
 * Find the best 3D model for a product based on its category and name
 */
function findBestModel(product, index) {
  const category = (product.category || '').toLowerCase().trim();
  const name = (product.name || '').toLowerCase();
  
  // Priority-ordered category matching
  // First check for exact or close matches
  const priorityMatches = [
    'baby care', 'babycare', 'feeding', 'diaper', 'diapering', 'bath', 'bathing',
    'footwear', 'shoes', 'toys', 'toy', 'gear', 'festival', 'dress'
  ];
  
  for (const key of priorityMatches) {
    if (category.includes(key) && categoryModelMap[key]) {
      const models = categoryModelMap[key];
      return models[index % models.length];
    }
  }
  
  // Then check general fashion categories
  for (const [key, models] of Object.entries(categoryModelMap)) {
    if (category.includes(key)) {
      return models[index % models.length];
    }
  }
  
  // Try to match by product name keywords
  for (const [key, models] of Object.entries(categoryModelMap)) {
    if (name.includes(key)) {
      return models[index % models.length];
    }
  }
  
  // Fallback to default models
  return defaultModels[index % defaultModels.length];
}

async function assignCategoryModels() {
  console.log('🎨 Assigning Category-Specific 3D Models to Products...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // Get all active products
    const allProducts = await Product.find({ isActive: true });
    
    console.log(`📦 Found ${allProducts.length} active products\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let updated = 0;
    let skipped = 0;
    const categoryStats = {};
    
    for (let i = 0; i < allProducts.length; i++) {
      const product = allProducts[i];
      const category = product.category || 'General';
      
      // Track stats
      if (!categoryStats[category]) {
        categoryStats[category] = { count: 0, models: new Set() };
      }
      
      // Find the best model for this product
      const modelUrl = findBestModel(product, i);
      
      // Skip if already has this model
      if (product.model3DUrl === modelUrl) {
        console.log(`   ⏭️  ${product.name}`);
        console.log(`      Already has: ${modelUrl}\n`);
        skipped++;
        categoryStats[category].count++;
        categoryStats[category].models.add(modelUrl);
        continue;
      }
      
      // Update product
      product.model3DUrl = modelUrl;
      await product.save();
      
      console.log(`   ✅ ${product.name}`);
      console.log(`      Category: ${category}`);
      console.log(`      3D Model: ${modelUrl}\n`);
      
      updated++;
      categoryStats[category].count++;
      categoryStats[category].models.add(modelUrl);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 3D MODEL ASSIGNMENT COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📊 Statistics:');
    console.log(`   • Products updated: ${updated}`);
    console.log(`   • Products skipped (already set): ${skipped}`);
    console.log(`   • Total products: ${allProducts.length}\n`);
    
    console.log('📁 Category Breakdown:');
    for (const [cat, stats] of Object.entries(categoryStats)) {
      console.log(`   ${cat}: ${stats.count} products`);
      console.log(`      Models: ${Array.from(stats.models).join(', ')}`);
    }
    
    console.log('\n🎯 Now each product has a category-appropriate 3D model!');
    console.log('\n📱 Test your 3D views:');
    console.log('   1. Go to http://localhost:3000/shop');
    console.log('   2. Click on any product (e.g., a dress)');
    console.log('   3. Toggle to "3D View" at the top');
    console.log('   4. The 3D model should match the product category!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
assignCategoryModels();

