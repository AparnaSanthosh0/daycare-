// Extract all product images for 3D conversion
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function exportProductImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    const Product = require('./models/Product');
    
    const products = await Product.find({ isActive: true })
      .select('_id name category image')
      .sort('category name');
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  📸 PRODUCT IMAGES FOR 3D CONVERSION                  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    // Create export directory
    const exportDir = path.join(__dirname, 'product-images-for-3d');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Create a manifest file
    const manifest = [];
    
    console.log(`📊 Found ${products.length} products\n`);
    console.log('📁 Copying images to: server/product-images-for-3d/\n');
    
    for (const product of products) {
      const imagePath = product.image;
      if (!imagePath) continue;
      
      const sourceFile = path.join(__dirname, imagePath.replace(/^\/uploads\//, 'uploads/'));
      const category = product.category.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const productName = product.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const targetFileName = `${category}_${productName}_${product._id}.jpg`;
      const targetFile = path.join(exportDir, targetFileName);
      
      try {
        if (fs.existsSync(sourceFile)) {
          fs.copyFileSync(sourceFile, targetFile);
          console.log(`✅ ${product.name}`);
          console.log(`   → ${targetFileName}\n`);
          
          manifest.push({
            productId: product._id.toString(),
            productName: product.name,
            category: product.category,
            imageFile: targetFileName,
            suggestedModelPath: `/models/${category}/${productName}.glb`
          });
        } else {
          console.log(`⚠️  ${product.name} - Image not found`);
        }
      } catch (err) {
        console.log(`❌ ${product.name} - Error: ${err.message}`);
      }
    }
    
    // Save manifest
    const manifestFile = path.join(exportDir, 'MANIFEST.json');
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    
    // Create instructions file
    const instructions = `
# 3D MODEL CONVERSION INSTRUCTIONS

## You have ${manifest.length} product images ready for conversion!

All images are in: server/product-images-for-3d/

## BATCH CONVERSION PROCESS:

### Step 1: Upload to AI Service
Go to: https://www.meshy.ai
- Upload images ONE BY ONE (or use their API for bulk)
- Each takes 3-5 minutes to convert

### Step 2: Download GLB Files
- Download each generated 3D model
- Rename to match the product (see MANIFEST.json)

### Step 3: Organize Files
Place downloaded GLB files in client/public/models/[category]/

### Step 4: Auto-Assign
Run this script to auto-assign all models:
  node server/batch-assign-3d-models.js

## MANIFEST FILE:
MANIFEST.json contains:
- Product ID (for database update)
- Product name
- Category
- Image filename
- Suggested model path

## TIPS FOR FASTER WORKFLOW:

1. Do 5-10 products per day (don't burn out)
2. Start with best-sellers first
3. Group by category for easier organization
4. Use Meshy.ai Pro ($30/month) for faster processing

## TIME ESTIMATE:
- ${manifest.length} products × 5 minutes = ${Math.ceil(manifest.length * 5 / 60)} hours
- Spread over 1 week = ~${Math.ceil(manifest.length / 7)} products/day = comfortable pace!
`;
    
    fs.writeFileSync(path.join(exportDir, 'README.txt'), instructions);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ EXPORT COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📁 Location: server/product-images-for-3d/`);
    console.log(`📄 Images: ${manifest.length} files`);
    console.log(`📋 Manifest: MANIFEST.json`);
    console.log(`📖 Instructions: README.txt\n`);
    console.log('🚀 NEXT STEPS:\n');
    console.log('1. Open: server/product-images-for-3d/');
    console.log('2. Read: README.txt');
    console.log('3. Start uploading images to Meshy.ai');
    console.log('4. Download GLB files');
    console.log('5. Run batch assignment script\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

exportProductImages();
