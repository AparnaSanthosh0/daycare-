/**
 * Generate 3D Models from Product Images
 * 
 * This script helps you create actual 3D models for your products using AI services.
 * 
 * Supported Services:
 * 1. Meshy.ai - Free tier available, good quality
 * 2. Tripo3D - Free tier available
 * 3. CSM.ai (Common Sense Machines) - High quality
 * 
 * Usage:
 *   node generate-3d-models.js [productId]
 *   node generate-3d-models.js --all
 *   node generate-3d-models.js --category "girl fashion"
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
require('dotenv').config();

// ============================================
// CONFIGURATION - Add your API keys here
// ============================================
const CONFIG = {
  // Meshy.ai API (https://www.meshy.ai/) - Recommended
  // Sign up at meshy.ai and get API key from dashboard
  MESHY_API_KEY: process.env.MESHY_API_KEY || '',
  
  // Tripo3D API (https://tripo3d.ai/)
  TRIPO_API_KEY: process.env.TRIPO_API_KEY || '',
  
  // Server URL for accessing product images (must be publicly accessible for API)
  // For local development, you'll need to use a tunneling service like ngrok
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:5000',
  
  // Output directory for generated models
  OUTPUT_DIR: path.join(__dirname, '..', 'client', 'public', 'models', 'generated'),
};

// Create output directory if it doesn't exist
if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
  fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
}

/**
 * Download a file from URL
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Convert local image file to base64 data URL
 */
function imageToBase64(imagePath) {
  const absolutePath = path.join(__dirname, '..', 'client', 'public', imagePath);
  
  // Also check if it's in uploads folder (server-side)
  let finalPath = absolutePath;
  if (!fs.existsSync(absolutePath)) {
    finalPath = path.join(__dirname, '..', imagePath);
  }
  if (!fs.existsSync(finalPath)) {
    finalPath = path.join(__dirname, imagePath.replace(/^\//, ''));
  }
  
  if (!fs.existsSync(finalPath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }
  
  const imageBuffer = fs.readFileSync(finalPath);
  const base64 = imageBuffer.toString('base64');
  
  // Determine MIME type
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  const mimeType = mimeTypes[ext] || 'image/jpeg';
  
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Generate 3D model using Meshy.ai API
 * Documentation: https://docs.meshy.ai/
 */
async function generateWithMeshy(imagePathOrUrl, productName) {
  if (!CONFIG.MESHY_API_KEY) {
    throw new Error('MESHY_API_KEY not configured. Get one at https://www.meshy.ai/');
  }

  console.log(`   📤 Uploading to Meshy.ai...`);

  let requestBody;
  
  // Check if it's a local path or URL
  if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {
    // Use URL directly
    requestBody = {
      image_url: imagePathOrUrl,
      enable_pbr: true,
      ai_model: 'meshy-4',
      topology: 'triangle',
      target_polycount: 30000,
    };
  } else {
    // Convert local file to base64
    console.log(`   📁 Reading local image: ${imagePathOrUrl}`);
    const base64Image = imageToBase64(imagePathOrUrl);
    console.log(`   ✅ Converted to base64 (${(base64Image.length / 1024).toFixed(0)} KB)`);
    
    requestBody = {
      image_url: base64Image,
      enable_pbr: true,
      ai_model: 'meshy-4',
      topology: 'triangle',
      target_polycount: 30000,
    };
  }

  // Step 1: Create image-to-3D task
  const createResponse = await fetch('https://api.meshy.ai/v2/image-to-3d', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.MESHY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Meshy API error: ${error}`);
  }

  const { result: taskId } = await createResponse.json();
  console.log(`   ⏳ Task created: ${taskId}`);

  // Step 2: Poll for completion
  let attempts = 0;
  const maxAttempts = 120; // 10 minutes max (5 sec intervals)
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    const statusResponse = await fetch(`https://api.meshy.ai/v2/image-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${CONFIG.MESHY_API_KEY}`,
      },
    });

    const status = await statusResponse.json();
    
    if (status.status === 'SUCCEEDED') {
      console.log(`   ✅ 3D model generated!`);
      return status.model_urls.glb; // Return GLB download URL
    } else if (status.status === 'FAILED') {
      throw new Error(`Meshy generation failed: ${status.message || status.error || 'Unknown error'}`);
    }
    
    console.log(`   ⏳ Processing... (${status.progress || 0}%)`);
    attempts++;
  }

  throw new Error('Meshy generation timed out');
}

/**
 * Generate 3D model using Tripo3D API
 * Documentation: https://platform.tripo3d.ai/docs
 */
async function generateWithTripo(imageUrl, productName) {
  if (!CONFIG.TRIPO_API_KEY) {
    throw new Error('TRIPO_API_KEY not configured. Get one at https://tripo3d.ai/');
  }

  console.log(`   📤 Uploading to Tripo3D...`);

  // Step 1: Create task
  const createResponse = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.TRIPO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'image_to_model',
      file: {
        type: 'url',
        url: imageUrl,
      },
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Tripo API error: ${error}`);
  }

  const { data: { task_id: taskId } } = await createResponse.json();
  console.log(`   ⏳ Task created: ${taskId}`);

  // Step 2: Poll for completion
  let attempts = 0;
  const maxAttempts = 60;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusResponse = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${CONFIG.TRIPO_API_KEY}`,
      },
    });

    const { data: status } = await statusResponse.json();
    
    if (status.status === 'success') {
      console.log(`   ✅ 3D model generated!`);
      return status.output.model; // Return GLB download URL
    } else if (status.status === 'failed') {
      throw new Error(`Tripo generation failed: ${status.error}`);
    }
    
    console.log(`   ⏳ Processing... (${status.progress || 0}%)`);
    attempts++;
  }

  throw new Error('Tripo generation timed out');
}

/**
 * Generate 3D model for a product
 */
async function generateModelForProduct(product, service = 'meshy') {
  const productId = product._id.toString();
  const productName = product.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const outputPath = path.join(CONFIG.OUTPUT_DIR, `${productId}.glb`);
  const modelUrl = `/models/generated/${productId}.glb`;

  // Check if model already exists
  if (fs.existsSync(outputPath)) {
    console.log(`   ⏭️  Model already exists: ${outputPath}`);
    return modelUrl;
  }

  // Get product image path
  let imagePath = product.image;
  if (!imagePath) {
    throw new Error('Product has no image');
  }

  console.log(`   🖼️  Image path: ${imagePath}`);

  let glbUrl;
  
  try {
    if (service === 'meshy') {
      // Pass local image path - will be converted to base64
      glbUrl = await generateWithMeshy(imagePath, productName);
    } else if (service === 'tripo') {
      // Tripo needs URL, construct one
      const baseUrl = CONFIG.SERVER_URL;
      const imageUrl = `${baseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
      glbUrl = await generateWithTripo(imageUrl, productName);
    } else {
      throw new Error(`Unknown service: ${service}`);
    }

    // Download the GLB file
    console.log(`   📥 Downloading GLB file...`);
    await downloadFile(glbUrl, outputPath);
    
    const stats = fs.statSync(outputPath);
    console.log(`   💾 Saved: ${outputPath} (${(stats.size / 1024).toFixed(2)} KB)`);

    return modelUrl;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎨 3D MODEL GENERATOR FOR TINYTOTS PRODUCTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check API keys
  if (!CONFIG.MESHY_API_KEY && !CONFIG.TRIPO_API_KEY) {
    console.log('❌ No API keys configured!\n');
    console.log('To generate 3D models, you need an API key from one of these services:\n');
    console.log('1. Meshy.ai (Recommended)');
    console.log('   - Sign up at: https://www.meshy.ai/');
    console.log('   - Free tier: 200 credits/month');
    console.log('   - Add to .env: MESHY_API_KEY=your_key_here\n');
    console.log('2. Tripo3D');
    console.log('   - Sign up at: https://tripo3d.ai/');
    console.log('   - Free tier available');
    console.log('   - Add to .env: TRIPO_API_KEY=your_key_here\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📝 MANUAL ALTERNATIVE:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('You can manually generate 3D models using these free web tools:\n');
    console.log('1. Meshy.ai Web App: https://www.meshy.ai/');
    console.log('   - Upload product image');
    console.log('   - Download GLB file');
    console.log('   - Place in: client/public/models/generated/\n');
    console.log('2. Luma AI: https://lumalabs.ai/genie');
    console.log('   - Text-to-3D or Image-to-3D');
    console.log('   - Export as GLB\n');
    console.log('3. Kaedim: https://www.kaedim3d.com/');
    console.log('   - Professional quality');
    console.log('   - Export as GLB\n');
    
    // Show products that need 3D models
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📦 PRODUCTS NEEDING 3D MODELS:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
      const Product = require('./models/Product');
      
      const fashionProducts = await Product.find({
        isActive: true,
        category: { $regex: /fashion|clothing|dress/i }
      }).select('_id name category image');
      
      console.log(`Found ${fashionProducts.length} fashion products:\n`);
      
      fashionProducts.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   ID: ${p._id}`);
        console.log(`   Category: ${p.category}`);
        console.log(`   Image: ${p.image}`);
        console.log(`   Save 3D model as: client/public/models/generated/${p._id}.glb\n`);
      });
      
      await mongoose.disconnect();
    } catch (e) {
      console.error('Could not connect to database:', e.message);
    }
    
    return;
  }

  // Connect to database
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }

  const Product = require('./models/Product');
  const service = CONFIG.MESHY_API_KEY ? 'meshy' : 'tripo';
  
  let products = [];

  if (args.includes('--all')) {
    // Generate for all products
    products = await Product.find({ isActive: true });
    console.log(`📦 Processing ALL ${products.length} products...\n`);
  } else if (args.includes('--category')) {
    // Generate for specific category
    const categoryIndex = args.indexOf('--category');
    const category = args[categoryIndex + 1];
    products = await Product.find({ 
      isActive: true,
      category: { $regex: new RegExp(category, 'i') }
    });
    console.log(`📦 Processing ${products.length} products in category "${category}"...\n`);
  } else if (args[0]) {
    // Generate for specific product ID
    const product = await Product.findById(args[0]);
    if (product) {
      products = [product];
      console.log(`📦 Processing single product: ${product.name}\n`);
    } else {
      console.error(`❌ Product not found: ${args[0]}`);
      process.exit(1);
    }
  } else {
    // Default: generate for fashion products only
    products = await Product.find({ 
      isActive: true,
      category: { $regex: /fashion|clothing|dress/i }
    });
    console.log(`📦 Processing ${products.length} fashion products...\n`);
  }

  let success = 0;
  let failed = 0;

  for (const product of products) {
    console.log(`\n🎯 ${product.name} (${product.category})`);
    console.log(`   ID: ${product._id}`);
    
    try {
      const modelUrl = await generateModelForProduct(product, service);
      
      // Update product in database
      product.model3DUrl = modelUrl;
      await product.save();
      
      console.log(`   ✅ Updated model3DUrl: ${modelUrl}`);
      success++;
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 GENERATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Models saved to: ${CONFIG.OUTPUT_DIR}\n`);

  await mongoose.disconnect();
}

main().catch(console.error);

