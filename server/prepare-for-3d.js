// Get product image and prepare for 3D conversion
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function prepareProductFor3D(productId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    const Product = require('./models/Product');
    
    const product = await Product.findById(productId);
    
    if (!product) {
      console.log('❌ Product not found');
      return;
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  🎨 PREPARE PRODUCT FOR 3D MODEL GENERATION           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('📦 Product Details:\n');
    console.log(`   Name: ${product.name}`);
    console.log(`   Category: ${product.category}`);
    console.log(`   ID: ${product._id}`);
    console.log(`   Current 3D Model: ${product.model3DUrl || 'NONE'}\n`);
    
    console.log('🖼️  Product Image:\n');
    console.log(`   Path: ${product.image}`);
    
    if (product.image) {
      const imagePath = product.image.replace(/^\/uploads\//, '');
      const fullPath = path.join(__dirname, 'uploads', imagePath);
      
      if (fs.existsSync(fullPath)) {
        console.log(`   ✅ Image file exists: ${fullPath}`);
        console.log(`   📁 Copy this image to use for 3D generation\n`);
      } else {
        console.log(`   ⚠️  Image file not found locally`);
        console.log(`   🌐 Image served from: http://localhost:5000${product.image}\n`);
      }
    }
    
    const modelFileName = product.name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const suggestedModelPath = `/models/${product.category.toLowerCase().replace(/[^a-z]/g, '-')}/${modelFileName}.glb`;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 STEP-BY-STEP INSTRUCTIONS:\n');
    console.log('1️⃣  SAVE THE PRODUCT IMAGE');
    console.log(`   → Right-click on product image in browser`);
    console.log(`   → Save as: ${modelFileName}.jpg\n`);
    
    console.log('2️⃣  CONVERT TO 3D MODEL (Choose one method):\n');
    console.log('   METHOD A: Meshy.ai (RECOMMENDED - FREE)');
    console.log('   ────────────────────────────────────');
    console.log('   1. Go to: https://www.meshy.ai');
    console.log('   2. Sign up (free account)');
    console.log('   3. Click "Image to 3D"');
    console.log(`   4. Upload: ${modelFileName}.jpg`);
    console.log('   5. Wait 3-5 minutes');
    console.log('   6. Download as GLB format');
    console.log(`   7. Rename to: ${modelFileName}.glb\n`);
    
    console.log('   METHOD B: CSM AI (FREE)');
    console.log('   ────────────────────────');
    console.log('   1. Go to: https://3d.csm.ai');
    console.log(`   2. Upload: ${modelFileName}.jpg`);
    console.log('   3. Generate 3D model');
    console.log(`   4. Download as: ${modelFileName}.glb\n`);
    
    console.log('   METHOD C: Luma AI (FREE TRIAL)');
    console.log('   ────────────────────────────');
    console.log('   1. Go to: https://lumalabs.ai');
    console.log('   2. Try "Genie" - image to 3D');
    console.log(`   3. Upload: ${modelFileName}.jpg\n`);
    
    console.log('3️⃣  PLACE THE 3D MODEL FILE');
    const targetDir = path.join(__dirname, '..', 'client', 'public', 'models', product.category.toLowerCase().replace(/[^a-z]/g, '-'));
    console.log(`   → Create folder if needed: ${targetDir}`);
    console.log(`   → Copy ${modelFileName}.glb to folder`);
    console.log(`   → Final path: ${suggestedModelPath}\n`);
    
    console.log('4️⃣  UPDATE DATABASE');
    console.log('   → Run this command:\n');
    console.log(`   node server/assign-single-product.js "${product._id}" "${suggestedModelPath}"\n`);
    
    console.log('5️⃣  REFRESH BROWSER');
    console.log('   → Press Ctrl+F5 to reload');
    console.log('   → Click "3D VIEW" to see YOUR model!\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 QUICK TIP:');
    console.log('   The AI tools work best with:');
    console.log('   • Clear, well-lit images');
    console.log('   • Single product (no background clutter)');
    console.log('   • Side or 3/4 angle view (not flat front)\n');
    
    console.log('⏱️  TIME ESTIMATE:');
    console.log('   • Save image: 1 minute');
    console.log('   • AI conversion: 3-5 minutes');
    console.log('   • Place file + update: 2 minutes');
    console.log('   • TOTAL: ~10 minutes per product\n');
    
    // Create the script to assign this specific model
    const assignScript = `// Auto-generated script to assign 3D model
const mongoose = require('mongoose');
require('dotenv').config();

async function assignModel() {
  const productId = '${product._id}';
  const modelPath = '${suggestedModelPath}';
  
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
  const Product = require('./models/Product');
  
  const product = await Product.findById(productId);
  product.model3DUrl = modelPath;
  await product.save();
  
  console.log('✅ Updated ${product.name}');
  console.log('   3D Model: ' + modelPath);
  
  await mongoose.disconnect();
}

assignModel();
`;

    const scriptPath = path.join(__dirname, `assign-${modelFileName}.js`);
    fs.writeFileSync(scriptPath, assignScript);
    
    console.log(`📝 Created assignment script: ${scriptPath}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Get product ID from command line or use default
const productId = process.argv[2] || '68e5ff6c8911b207bb3';

prepareProductFor3D(productId);
