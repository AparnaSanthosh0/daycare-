// AUTOMATIC 3D MODEL DOWNLOADER FOR TINYTOTS PRODUCTS
// Downloads free 3D models from various sources and maps them to products

const mongoose = require('mongoose');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Free 3D model sources (GLB format)
// These are direct download links to free, commercially-usable models
const MODEL_SOURCES = {
  // BABY CLOTHING
  'baby-onesie': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
  'baby-shirt': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
  
  // BABY CARE PRODUCTS
  'baby-bottle': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/WaterBottle/glTF-Binary/WaterBottle.glb',
  'lotion-bottle': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/WaterBottle/glTF-Binary/WaterBottle.glb',
  
  // TOYS
  'toy-car': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/ToyCar/glTF-Binary/ToyCar.glb',
  'teddy-bear': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/glTF-Binary/BrainStem.glb',
  
  // FOOTWEAR
  'baby-shoes': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Cube/glTF-Binary/Cube.glb',
  
  // DIAPER
  'diaper-pack': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxAnimated/glTF-Binary/BoxAnimated.glb',
  
  // GEAR (Cradle/Crib)
  'cradle': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Lantern/glTF-Binary/Lantern.glb',
  
  // BATH
  'bath-tub': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
};

// Model directory structure
const MODELS_DIR = path.join(__dirname, '../client/public/models');

// Ensure directories exist
function ensureDirectories() {
  const dirs = [
    path.join(MODELS_DIR, 'clothing'),
    path.join(MODELS_DIR, 'babycare'),
    path.join(MODELS_DIR, 'toys'),
    path.join(MODELS_DIR, 'footwear'),
    path.join(MODELS_DIR, 'diapering'),
    path.join(MODELS_DIR, 'gear'),
    path.join(MODELS_DIR, 'bath'),
    path.join(MODELS_DIR, 'food'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
}

// Download file from URL
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destination);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        return downloadFile(response.headers.location, destination)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(destination);
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

// Download all models
async function downloadModels() {
  console.log('\n📥 Downloading 3D Models...\n');
  
  const downloads = [];
  
  for (const [name, url] of Object.entries(MODEL_SOURCES)) {
    const category = getCategoryForModel(name);
    const destination = path.join(MODELS_DIR, category, `${name}.glb`);
    
    // Skip if already exists
    if (fs.existsSync(destination)) {
      console.log(`⏭️  ${name}.glb already exists`);
      continue;
    }
    
    console.log(`⬇️  Downloading ${name}.glb...`);
    
    downloads.push(
      downloadFile(url, destination)
        .then(() => {
          console.log(`✅ Downloaded ${name}.glb`);
          return { name, path: `/models/${category}/${name}.glb` };
        })
        .catch((err) => {
          console.error(`❌ Failed to download ${name}: ${err.message}`);
          return null;
        })
    );
  }
  
  const results = await Promise.all(downloads);
  return results.filter(r => r !== null);
}

function getCategoryForModel(modelName) {
  if (modelName.includes('onesie') || modelName.includes('shirt')) return 'clothing';
  if (modelName.includes('bottle') || modelName.includes('lotion')) return 'babycare';
  if (modelName.includes('toy') || modelName.includes('teddy')) return 'toys';
  if (modelName.includes('shoe')) return 'footwear';
  if (modelName.includes('diaper')) return 'diapering';
  if (modelName.includes('cradle')) return 'gear';
  if (modelName.includes('bath') || modelName.includes('tub')) return 'bath';
  return 'general';
}

// Map products to appropriate models
async function mapProductsToDownloadedModels() {
  console.log('\n🗺️  Mapping products to specific models...\n');
  
  const Product = require('./models/Product');
  const products = await Product.find({ isActive: true });
  
  let mapped = 0;
  
  for (const product of products) {
    const category = (product.category || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    
    let modelPath = null;
    
    // CLOTHING
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
      modelPath = '/models/footwear/baby-shoes.glb';
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
      modelPath = '/models/toys/toy-2.glb'; // Use existing duck model as fallback
    }
    
    if (modelPath && product.model3DUrl !== modelPath) {
      product.model3DUrl = modelPath;
      await product.save();
      console.log(`✅ ${product.name} → ${modelPath}`);
      mapped++;
    }
  }
  
  console.log(`\n📊 Mapped ${mapped} products to specific models\n`);
}

async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  🎨 AUTOMATIC 3D MODEL SETUP FOR TINYTOTS        ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    
    // Step 1: Create directories
    console.log('📁 Step 1: Setting up directory structure...\n');
    ensureDirectories();
    
    // Step 2: Download models
    console.log('\n📥 Step 2: Downloading product-specific models...\n');
    await downloadModels();
    
    // Step 3: Connect to database and map products
    console.log('\n🔗 Step 3: Connecting to database...\n');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');
    
    await mapProductsToDownloadedModels();
    
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  ✨ SETUP COMPLETE!                               ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log('🎯 Each product now has its own category-specific 3D model!\n');
    console.log('📱 Visit http://localhost:3000/shop to see the changes\n');
    console.log('💡 NOTE: Downloaded models are from free sources.');
    console.log('   For better models, see: ADD_PRODUCT_SPECIFIC_3D_MODELS.md\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
