// Manual Product-Specific 3D Model Assignment
// Use this to assign unique 3D models to individual products

const mongoose = require('mongoose');
require('dotenv').config();

// ===================================================================
// EDIT THIS SECTION: Map each product to its specific 3D model
// ===================================================================

const PRODUCT_MODEL_MAPPING = {
  // Example: 'Product Name': '/models/specific/product-model.glb'
  
  // CLOTHING - Each item gets its own model
  'Herr': '/models/clothing/girl-dress-red.glb',
  'Her': '/models/clothing/girl-dress-blue.glb',
  'hiss': '/models/clothing/boy-shirt-blue.glb',
  'Babyhugg': '/models/clothing/onesie-pink.glb',
  'Baby hugg': '/models/clothing/onesie-yellow.glb',
  'Hiss': '/models/clothing/boy-pants-black.glb',
  'herzss': '/models/clothing/girl-skirt-purple.glb',
  'Herss': '/models/clothing/girl-top-white.glb',
  'Hers': '/models/clothing/girl-dress-green.glb',
  
  // TOYS - Each toy gets its own model
  'dreamtoys': '/models/toys/teddy-bear-brown.glb',
  'dreamtoyss': '/models/toys/toy-car-red.glb',
  
  // FEEDING - Each feeding product gets its own model
  'feedzz': '/models/feeding/baby-bottle-blue.glb',
  
  // FOOTWEAR - Each shoe gets its own model
  'walkzz': '/models/footwear/baby-shoes-red.glb',
  'Walkzz': '/models/footwear/baby-shoes-blue.glb',
  'hersss': '/models/footwear/baby-sandals-pink.glb',
  'His walkzz': '/models/footwear/boy-shoes-black.glb',
  
  // BABY CARE - Each product gets its own model
  'Aveeno Baby': '/models/babycare/aveeno-lotion.glb',
  'Johnsons': '/models/babycare/johnson-shampoo.glb',
  'Noodle & Boo': '/models/babycare/noodle-boo-cream.glb',
  
  // DIAPERING
  'Pampers': '/models/diapering/pampers-pack.glb',
  'frapey': '/models/diapering/diaper-pack-huggies.glb',
  
  // BATH
  'Mama & Bird': '/models/bath/soap-bar.glb',
  'Loveli': '/models/bath/bath-towel.glb',
  
  // GEAR
  'Cradle': '/models/gear/wooden-cradle.glb',
};

// ===================================================================

async function assignSpecificModels() {
  try {
    console.log('\n🎨 ASSIGNING PRODUCT-SPECIFIC 3D MODELS\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');
    
    let updated = 0;
    let notFound = [];
    let missingModels = [];

    for (const [productName, modelPath] of Object.entries(PRODUCT_MODEL_MAPPING)) {
      // Find product by name
      const product = await Product.findOne({ 
        name: { $regex: new RegExp(`^${productName}$`, 'i') },
        isActive: true 
      });
      
      if (!product) {
        notFound.push(productName);
        console.log(`⚠️  Product not found: ${productName}`);
        continue;
      }
      
      // Check if model file exists (you'll need to add these files)
      const modelExists = false; // We'll mark all as needing to be added
      
      if (!modelExists && !modelPath.includes('toy-car') && !modelPath.includes('baby-onesie')) {
        missingModels.push(modelPath);
      }
      
      // Assign the model
      product.model3DUrl = modelPath;
      await product.save();
      
      console.log(`✅ ${product.name}`);
      console.log(`   → ${modelPath}`);
      console.log(`   ${modelExists ? '✓ Model exists' : '⚠️  Model file needs to be added'}\n`);
      
      updated++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✨ ASSIGNMENT COMPLETE!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📊 Statistics:`);
    console.log(`   • Products updated: ${updated}`);
    console.log(`   • Products not found: ${notFound.length}`);
    console.log(`   • Model files to add: ${missingModels.length}\n`);
    
    if (notFound.length > 0) {
      console.log(`⚠️  Products not found in database:`);
      notFound.forEach(name => console.log(`   - ${name}`));
      console.log();
    }
    
    if (missingModels.length > 0) {
      console.log(`📥 Model files you need to download/add:`);
      console.log(`   (Place these in client/public/ directory)\n`);
      [...new Set(missingModels)].forEach(path => console.log(`   - ${path}`));
      console.log();
    }
    
    console.log(`📖 NEXT STEPS:\n`);
    console.log(`1. For AUTOMATED 2D-to-3D conversion:`);
    console.log(`   → Use AI services like Meshy.ai, Kaedim, or Alpha3D`);
    console.log(`   → Upload product photos to generate 3D models\n`);
    
    console.log(`2. For MANUAL 3D model creation:`);
    console.log(`   → Use Blender (free) to create models`);
    console.log(`   → Export as GLB format\n`);
    
    console.log(`3. For FREE 3D models:`);
    console.log(`   → Download from Sketchfab, Free3D, TurboSquid`);
    console.log(`   → Search for similar products\n`);
    
    console.log(`4. To update this script:`);
    console.log(`   → Edit PRODUCT_MODEL_MAPPING in server/assign-specific-models.js`);
    console.log(`   → Run: node server/assign-specific-models.js\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

assignSpecificModels();
