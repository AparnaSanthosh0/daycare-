// Intelligently map products to 3D models based on their category
const mongoose = require('mongoose');
require('dotenv').config();

// Category-based model mapping
const categoryModelMap = {
  // Toy-related categories
  'Toys': '/models/toys/toy-1.glb',
  'Toy': '/models/toys/toy-1.glb',
  'Educational': '/models/toys/toy-1.glb',
  'Games': '/models/toys/toy-1.glb',
  
  // Food/Feeding-related categories
  'Feeding': '/models/food/food-1.glb',
  'Food': '/models/food/food-1.glb',
  'Nutrition': '/models/food/food-1.glb',
  'Bottles': '/models/food/food-1.glb',
  
  // Default fallback for other categories
  'default': '/models/toys/toy-2.glb'
};

// Additional keyword-based mapping for product names
function getModelByKeywords(productName, category) {
  const name = productName.toLowerCase();
  
  // Toy-related keywords
  if (name.includes('toy') || name.includes('game') || name.includes('play') || 
      name.includes('puzzle') || name.includes('block') || name.includes('doll')) {
    return '/models/toys/toy-1.glb';
  }
  
  // Food/feeding-related keywords
  if (name.includes('food') || name.includes('feed') || name.includes('bottle') || 
      name.includes('meal') || name.includes('nutrition')) {
    return '/models/food/food-1.glb';
  }
  
  // Fall back to category mapping
  return categoryModelMap[category] || categoryModelMap['default'];
}

async function mapProductsToModels() {
  try {
    console.log('🎨 Intelligently Mapping Products to 3D Models...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // Get all active products
    const allProducts = await Product.find({ isActive: true });
    
    console.log(`📦 Found ${allProducts.length} active products\n`);
    console.log('🔄 Assigning appropriate 3D models based on category and name...\n');

    let updated = 0;
    const modelStats = {
      'toy-1': 0,
      'toy-2': 0,
      'food-1': 0
    };
    
    for (const product of allProducts) {
      // Get the appropriate model based on category and name
      const oldModel = product.model3DUrl;
      const newModel = getModelByKeywords(product.name, product.category);
      
      // Update if different or if no model exists
      if (!oldModel || oldModel !== newModel) {
        product.model3DUrl = newModel;
        await product.save();
        
        console.log(`   ✅ ${product.name}`);
        console.log(`      Category: ${product.category || 'N/A'}`);
        console.log(`      Old Model: ${oldModel || 'None'}`);
        console.log(`      New Model: ${newModel}\n`);
        
        updated++;
      }
      
      // Track statistics
      if (newModel.includes('toy-1')) modelStats['toy-1']++;
      else if (newModel.includes('toy-2')) modelStats['toy-2']++;
      else if (newModel.includes('food-1')) modelStats['food-1']++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 3D MODEL MAPPING COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📊 Statistics:`);
    console.log(`   • Products updated: ${updated}`);
    console.log(`   • Total products: ${allProducts.length}\n`);
    console.log(`📈 Model Distribution:`);
    console.log(`   • toy-1.glb (BoomBox - Toys): ${modelStats['toy-1']} products`);
    console.log(`   • toy-2.glb (Duck - Default): ${modelStats['toy-2']} products`);
    console.log(`   • food-1.glb (Avocado - Food): ${modelStats['food-1']} products\n`);
    console.log('🎯 Products now have category-appropriate 3D models!\n');
    console.log('📱 Visit: http://localhost:3000/shop');
    console.log('   Products will show models matching their category\n');
    console.log('💡 TIP: To add product-specific models:');
    console.log('   1. Download GLB models for your products');
    console.log('   2. Place them in client/public/models/');
    console.log('   3. Update specific products manually or extend this script\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

mapProductsToModels();
