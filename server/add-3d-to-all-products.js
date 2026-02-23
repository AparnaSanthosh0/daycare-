// Add 3D models to ALL products automatically
const mongoose = require('mongoose');
require('dotenv').config();

const modelRotation = [
  '/models/toys/toy-1.glb',
  '/models/toys/toy-2.glb',
  '/models/food/food-1.glb'
];

async function addModelsToAllProducts() {
  try {
    console.log('🎨 Adding 3D Models to ALL Products...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // Get all active products
    const allProducts = await Product.find({ isActive: true });
    
    console.log(`📦 Found ${allProducts.length} active products\n`);
    console.log('🔄 Assigning 3D models (rotating through available models)...\n');

    let updated = 0;
    
    for (let i = 0; i < allProducts.length; i++) {
      const product = allProducts[i];
      
      // Skip if already has a model
      if (product.model3DUrl) {
        console.log(`   ⏭️  ${product.name} - Already has 3D model`);
        continue;
      }
      
      // Rotate through available models
      const modelIndex = i % modelRotation.length;
      product.model3DUrl = modelRotation[modelIndex];
      
      await product.save();
      
      console.log(`   ✅ ${product.name}`);
      console.log(`      → ${product.model3DUrl}`);
      
      updated++;
    }

    // Count total products with 3D models
    const totalWith3D = await Product.countDocuments({ 
      model3DUrl: { $ne: null, $exists: true },
      isActive: true 
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 3D MODEL ASSIGNMENT COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📊 Statistics:`);
    console.log(`   • Products updated: ${updated}`);
    console.log(`   • Total with 3D models: ${totalWith3D}`);
    console.log(`   • Total products: ${allProducts.length}\n`);
    console.log('🎯 Now ALL products in your shop have 3D viewers!\n');
    console.log('📱 Visit: http://localhost:3000/shop');
    console.log('   Click any product → Toggle to "3D View"\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

addModelsToAllProducts();
