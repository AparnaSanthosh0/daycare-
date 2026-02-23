/**
 * Clear Incorrect 3D Model Assignments
 * 
 * This removes 3D models that don't match the actual products
 * Products will show photos only until correct 3D models are added
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function clearIncorrectModels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    console.log('🧹 Clearing incorrect 3D model assignments...\n');

    // Remove generic models that don't match products
    const updates = [
      // Remove toy-car from footwear products (shoes shouldn't show cars!)
      {
        filter: { category: /footwear/i, model3DUrl: /toy-car/i },
        description: 'Footwear with toy-car models'
      },
      // Remove baby-onesie from all fashion items (each dress needs its own model!)
      {
        filter: { 
          $or: [
            { category: /girl fashion/i, model3DUrl: /baby-onesie/i },
            { category: /boy fashion/i, model3DUrl: /baby-onesie/i }
          ]
        },
        description: 'Fashion items with generic onesie models'
      },
      // Remove toy-car from non-toy categories
      {
        filter: { 
          category: { $not: /toys/i },
          model3DUrl: /toy-car/i
        },
        description: 'Non-toy products with toy-car models'
      }
    ];

    let totalCleared = 0;

    for (const update of updates) {
      const result = await Product.updateMany(
        update.filter,
        { $unset: { model3DUrl: "" } }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Removed ${result.modifiedCount} incorrect models: ${update.description}`);
        totalCleared += result.modifiedCount;
      }
    }

    console.log(`\n📊 Total Models Cleared: ${totalCleared}`);
    console.log('\n✅ Done! Products now show photos only until correct 3D models are added.\n');

    // Show what models are still assigned
    const remaining = await Product.find({ 
      model3DUrl: { $ne: null, $exists: true } 
    }).select('name category model3DUrl');

    if (remaining.length > 0) {
      console.log('📦 Remaining 3D Model Assignments:\n');
      remaining.forEach(p => {
        console.log(`   ✓ ${p.name} (${p.category})`);
        console.log(`     → ${p.model3DUrl}\n`);
      });
    } else {
      console.log('ℹ️  No 3D models assigned. All products will show photos only.\n');
    }

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearIncorrectModels();
