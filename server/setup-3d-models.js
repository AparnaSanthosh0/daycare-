const https = require('https');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Free GLB models from public sources (direct download links)
const modelDownloads = [
  {
    name: 'Teddy Bear',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoomBox/glTF-Binary/BoomBox.glb',
    filename: 'toy-1.glb',
    category: 'Toys'
  },
  {
    name: 'Duck Toy',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
    filename: 'toy-2.glb',
    category: 'Toys'
  },
  {
    name: 'Avocado',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb',
    filename: 'food-1.glb',
    category: 'Food'
  }
];

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve(destPath);
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(destPath);
        });
      }
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}); // Delete partial file
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function setup3DModels() {
  console.log('🎨 Starting 3D Model Setup for TinyTots...\n');

  // Create directories
  const modelsDir = path.join(__dirname, '..', 'client', 'public', 'models');
  const toysDir = path.join(modelsDir, 'toys');
  const foodDir = path.join(modelsDir, 'food');

  [modelsDir, toysDir, foodDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${path.relative(process.cwd(), dir)}`);
    }
  });

  // Download models
  console.log('\n📥 Downloading 3D models from GitHub...\n');
  
  const downloaded = [];
  
  for (const model of modelDownloads) {
    const destDir = model.category === 'Toys' ? toysDir : foodDir;
    const destPath = path.join(destDir, model.filename);
    
    try {
      console.log(`   Downloading ${model.name}...`);
      await downloadFile(model.url, destPath);
      
      const stats = fs.statSync(destPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`   ✅ ${model.name} (${sizeKB} KB) → ${model.filename}`);
      
      downloaded.push({
        filename: model.filename,
        path: `/models/${model.category.toLowerCase()}/${model.filename}`,
        category: model.category,
        name: model.name
      });
    } catch (error) {
      console.error(`   ❌ Failed to download ${model.name}:`, error.message);
    }
  }

  if (downloaded.length === 0) {
    console.log('\n❌ No models downloaded. Check your internet connection.');
    process.exit(1);
  }

  // Connect to database and update products
  console.log('\n📊 Connecting to database...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // Get products from toy category
    const toyProducts = await Product.find({ 
      category: { $regex: /toy|cloth|fashion|baby/i },
      isActive: true 
    }).limit(downloaded.length);

    console.log('🎯 Updating products with 3D models...\n');

    let updated = 0;
    for (let i = 0; i < Math.min(toyProducts.length, downloaded.length); i++) {
      const product = toyProducts[i];
      const model = downloaded[i];

      product.model3DUrl = model.path;
      await product.save();

      console.log(`   ✅ ${product.name}`);
      console.log(`      → ${model.path}`);
      console.log(`      → http://localhost:3000/product/${product._id}\n`);
      
      updated++;
    }

    console.log(`\n✨ Successfully updated ${updated} products with 3D models!\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 3D VIEWER SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📱 View your 3D products:');
    console.log('   1. Go to http://localhost:3000/shop');
    console.log('   2. Click on any updated product');
    console.log('   3. Toggle to "3D View" at the top\n');
    console.log('🎨 View the demo page:');
    console.log('   → http://localhost:3000/demo-3d\n');

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the setup
setup3DModels().catch(console.error);
