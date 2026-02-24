/**
 * Assign a manually created 3D model to a product
 * 
 * Usage:
 *   node assign-manual-3d-model.js <productId> <glbFilePath>
 * 
 * Example:
 *   node assign-manual-3d-model.js 68e400b9c891b2107b4bb38e "C:\Downloads\dress-model.glb"
 * 
 * The script will:
 * 1. Copy the GLB file to client/public/models/generated/
 * 2. Rename it to {productId}.glb
 * 3. Update the product's model3DUrl in the database
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const OUTPUT_DIR = path.join(__dirname, '..', 'client', 'public', 'models', 'generated');

async function assignModel(productId, sourcePath) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎨 ASSIGN 3D MODEL TO PRODUCT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Validate source file
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ File not found: ${sourcePath}`);
    process.exit(1);
  }

  const stats = fs.statSync(sourcePath);
  if (!sourcePath.toLowerCase().endsWith('.glb') && !sourcePath.toLowerCase().endsWith('.gltf')) {
    console.error('❌ File must be a .glb or .gltf file');
    process.exit(1);
  }

  console.log(`📁 Source file: ${sourcePath}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB\n`);

  // Connect to database
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }

  const Product = require('./models/Product');

  // Find product
  const product = await Product.findById(productId);
  if (!product) {
    console.error(`❌ Product not found: ${productId}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`🎯 Product: ${product.name}`);
  console.log(`   Category: ${product.category}`);
  console.log(`   Current 3D Model: ${product.model3DUrl || 'None'}\n`);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Copy file to output directory with product ID as filename
  const ext = path.extname(sourcePath).toLowerCase();
  const destFilename = `${productId}${ext}`;
  const destPath = path.join(OUTPUT_DIR, destFilename);
  const modelUrl = `/models/generated/${destFilename}`;

  console.log(`📥 Copying file...`);
  fs.copyFileSync(sourcePath, destPath);
  console.log(`   ✅ Copied to: ${destPath}\n`);

  // Update product in database
  product.model3DUrl = modelUrl;
  await product.save();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ SUCCESS!');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Product: ${product.name}`);
  console.log(`3D Model URL: ${modelUrl}`);
  console.log(`File location: ${destPath}\n`);
  console.log(`🌐 View it at: http://localhost:3000/product/${productId}`);
  console.log('   Click "3D VIEW" to see the model!\n');

  await mongoose.disconnect();
}

// Main
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node assign-manual-3d-model.js <productId> <glbFilePath>\n');
  console.log('Example:');
  console.log('  node assign-manual-3d-model.js 68e400b9c891b2107b4bb38e "C:\\Downloads\\dress.glb"\n');
  console.log('Steps to create a 3D model:');
  console.log('1. Go to https://www.meshy.ai/ and sign up (free)');
  console.log('2. Click "Image to 3D"');
  console.log('3. Upload your product image');
  console.log('4. Wait for generation (2-5 minutes)');
  console.log('5. Download the GLB file');
  console.log('6. Run this script with the downloaded file path\n');
  process.exit(1);
}

assignModel(args[0], args[1]).catch(console.error);

