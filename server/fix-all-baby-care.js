// Update ALL baby care products to use lotion bottle model
const mongoose = require('mongoose');
require('dotenv').config();

async function fixAllBabyCareModels() {
  try {
    console.log('🧴 Fixing Baby Care Product Models...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // Find ALL products that could be baby care/lotion related
    const babyCareProducts = await Product.find({
      $or: [
        { category: /baby.*care/i },
        { category: /care/i },
        { name: /lotion/i },
        { name: /johnson/i },
        { name: /aveeno/i },
        { name: /noodle/i },
        { description: /lotion/i }
      ],
      isActive: true
    });

    console.log(`📦 Found ${babyCareProducts.length} baby care products\n`);

    const correctModel = '/models/babycare/lotion-bottle.glb';
    let updated = 0;

    for (const product of babyCareProducts) {
      if (product.model3DUrl !== correctModel) {
        console.log(`   Updating: ${product.name}`);
        console.log(`   From: ${product.model3DUrl || 'none'}`);
        console.log(`   To: ${correctModel}\n`);
        
        product.model3DUrl = correctModel;
        await product.save();
        updated++;
      } else {
        console.log(`   ✓ ${product.name} - already correct`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✨ Updated ${updated} products`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🔄 Please refresh your browser (Ctrl+F5)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixAllBabyCareModels();
