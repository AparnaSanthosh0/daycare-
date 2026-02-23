/**
 * Assign 3D Models to Your 4 Specific Products
 * 
 * INSTRUCTIONS:
 * 1. Generate 4 GLB files using Meshy.ai
 * 2. Save them to client/public/models/
 * 3. Update the assignments array below with your product IDs and model paths
 * 4. Run: node server/assign-my-4-products.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function assignModels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  🎯 ASSIGNING 3D MODELS TO YOUR 4 PRODUCTS                    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // ⚙️ CONFIGURE THIS: Update with your actual product IDs and model paths
    const assignments = [
      {
        productId: 'PRODUCT_ID_1',  // Replace with actual product ID
        modelPath: '/models/feeding/your-model-1.glb',  // Replace with actual GLB filename
        description: 'Feeding bottle product 1'
      },
      {
        productId: 'PRODUCT_ID_2',
        modelPath: '/models/feeding/your-model-2.glb',
        description: 'Feeding bottle product 2'
      },
      {
        productId: 'PRODUCT_ID_3',
        modelPath: '/models/footwear/your-model-3.glb',
        description: 'Baby shoes product 1'
      },
      {
        productId: 'PRODUCT_ID_4',
        modelPath: '/models/footwear/your-model-4.glb',
        description: 'Baby shoes product 2'
      }
    ];

    console.log('📋 Assignment Plan:\n');
    assignments.forEach((a, i) => {
      console.log(`${i + 1}. ${a.description}`);
      console.log(`   Product ID: ${a.productId}`);
      console.log(`   3D Model: ${a.modelPath}\n`);
    });

    console.log('─'.repeat(66) + '\n');
    console.log('🔄 Processing...\n');

    let successCount = 0;
    let failCount = 0;

    for (const assignment of assignments) {
      try {
        const result = await Product.updateOne(
          { _id: assignment.productId },
          { $set: { model3DUrl: assignment.modelPath } }
        );

        if (result.modifiedCount > 0) {
          console.log(`✅ ${assignment.description}`);
          console.log(`   → 3D model assigned: ${assignment.modelPath}\n`);
          successCount++;
        } else {
          console.log(`⚠️  ${assignment.description}`);
          console.log(`   → No changes (product not found or already has same model)\n`);
          failCount++;
        }
      } catch (error) {
        console.log(`❌ ${assignment.description}`);
        console.log(`   → Error: ${error.message}\n`);
        failCount++;
      }
    }

    console.log('═'.repeat(66));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Success: ${successCount} products`);
    console.log(`   ❌ Failed: ${failCount} products\n`);

    if (successCount > 0) {
      console.log('🎉 Done! Your products now have 3D models!\n');
      console.log('🧪 TEST IT:');
      console.log('   1. Go to: http://localhost:3000/shop');
      console.log('   2. Click on one of your products');
      console.log('   3. Click "3D View" button');
      console.log('   4. See your EXACT product in 3D! 🚀\n');
    }

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

assignModels();
