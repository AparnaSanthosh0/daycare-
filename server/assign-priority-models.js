// Quick batch assignment for your top 10 priority products
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function assignPriorityModels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    const Product = require('./models/Product');
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  🎨 ASSIGN 3D MODELS TO PRIORITY PRODUCTS            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    // Load priority list
    const priorityFile = path.join(__dirname, 'product-images-for-3d', 'PRIORITY-10.json');
    const priorities = JSON.parse(fs.readFileSync(priorityFile, 'utf8'));
    
    console.log('🔍 Checking which models are ready...\n');
    
    let assigned = 0;
    let missing = [];
    
    for (const item of priorities) {
      const modelPath = item.modelPath;
      const fullPath = path.join(__dirname, '..', 'client', 'public', modelPath);
      
      // Check if GLB file exists
      if (fs.existsSync(fullPath)) {
        // Assign to product
        const product = await Product.findById(item.productId);
        if (product) {
          product.model3DUrl = modelPath;
          await product.save();
          
          console.log(`✅ ${item.order}. ${item.name}`);
          console.log(`   Model: ${modelPath}`);
          console.log(`   Status: ASSIGNED ✓\n`);
          assigned++;
        }
      } else {
        console.log(`⏳ ${item.order}. ${item.name}`);
        console.log(`   Model: ${modelPath}`);
        console.log(`   Status: WAITING (upload GLB file here)\n`);
        missing.push(item);
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✨ RESULTS:\n`);
    console.log(`✅ Assigned: ${assigned}/10 products`);
    console.log(`⏳ Pending: ${missing.length}/10 products\n`);
    
    if (assigned > 0) {
      console.log('🎉 SUCCESS! Your products now have 3D models!');
      console.log('🌐 Refresh browser (Ctrl+F5) to see them!\n');
    }
    
    if (missing.length > 0) {
      console.log('📋 STILL NEED GLB FILES FOR:\n');
      missing.forEach(item => {
        console.log(`${item.order}. ${item.name}`);
        console.log(`   Image: ${item.imageFile}`);
        console.log(`   Save GLB as: client/public${item.modelPath}\n`);
      });
    }
    
    if (assigned === 10) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🏆 COMPLETE! All 10 priority products have 3D models!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

assignPriorityModels();
