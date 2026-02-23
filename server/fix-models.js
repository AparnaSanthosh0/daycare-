const mongoose = require('mongoose');
require('dotenv').config();

async function assignModels() {
  try {
    console.log('\n🔧 FIXING 3D MODEL ASSIGNMENTS...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');
    
    // Get all active products
    const products = await Product.find({ isActive: true });
    console.log(`📦 Found ${products.length} products\n`);

    let updated = 0;

    for (const product of products) {
      const category = (product.category || '').toLowerCase();
      const name = (product.name || '').toLowerCase();
      
      let modelPath = null;
      
      // CLOTHING - all fashion items
      if (category.includes('fashion') || category.includes('cloth') || 
          name.includes('onesie') || name.includes('shirt') || name.includes('sweatshirt')) {
        modelPath = '/models/clothing/baby-onesie.glb';
      }
      // FEEDING/BOTTLES
      else if (category.includes('feed') || name.includes('bottle')) {
        modelPath = '/models/babycare/baby-bottle.glb';
      }
      // BABY CARE
      else if (category.includes('care') || name.includes('lotion') || name.includes('aveeno')) {
        modelPath = '/models/babycare/lotion-bottle.glb';
      }
      // TOYS
      else if (category.includes('toy') || name.includes('toy')) {
        modelPath = '/models/toys/toy-car.glb';
      }
      // FOOTWEAR
      else if (category.includes('footwear') || category.includes('shoe')) {
        modelPath = '/models/toys/toy-car.glb'; // Fallback to toy-car
      }
      // DIAPERING
      else if (category.includes('diaper') || name.includes('pampers')) {
        modelPath = '/models/diapering/diaper-pack.glb';
      }
      // GEAR
      else if (category.includes('gear') || name.includes('cradle')) {
        modelPath = '/models/gear/cradle.glb';
      }
      // BATH
      else if (category.includes('bath')) {
        modelPath = '/models/bath/bath-tub.glb';
      }
      // FALLBACK
      else {
        modelPath = '/models/toys/toy-2.glb'; // Duck as fallback
      }
      
      // Update the product
      product.model3DUrl = modelPath;
      await product.save();
      
      console.log(`✅ ${product.name}`);
      console.log(`   → ${modelPath}\n`);
      updated++;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✨ SUCCESS! Updated ${updated} products`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Done!\n');
  }
}

assignModels();
