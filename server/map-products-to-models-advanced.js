// Advanced intelligent mapping of products to 3D models
// This script will automatically detect available models and map products appropriately
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Dynamically scan available models
function scanAvailableModels() {
  const modelsDir = path.join(__dirname, '../client/public/models');
  const models = {
    toys: [],
    food: [],
    clothing: [],
    babycare: [],
    footwear: [],
    bath: [],
    accessories: []
  };

  try {
    // Scan each category directory
    for (const category of Object.keys(models)) {
      const categoryPath = path.join(modelsDir, category);
      if (fs.existsSync(categoryPath)) {
        const files = fs.readdirSync(categoryPath)
          .filter(file => file.endsWith('.glb') || file.endsWith('.gltf'));
        models[category] = files.map(file => `/models/${category}/${file}`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not scan models directory:', error.message);
  }

  return models;
}

// Enhanced category mapping with fallbacks
function getCategoryMapping(category, productName, availableModels) {
  const cat = (category || '').toLowerCase();
  const name = (productName || '').toLowerCase();

  // TOYS - Toy models preferred
  if (cat.includes('toy') || name.includes('toy') || name.includes('game') || 
      name.includes('play') || name.includes('puzzle') || name.includes('block') ||
      name.includes('doll') || name.includes('teddy') || name.includes('plush')) {
    if (availableModels.toys.length > 0) {
      return { category: 'toys', models: availableModels.toys };
    }
  }

  // FEEDING/FOOD - Food models preferred
  if (cat.includes('feed') || cat.includes('food') || cat.includes('nutrition') ||
      cat.includes('bottle') || name.includes('bottle') || name.includes('feed') ||
      name.includes('food') || name.includes('milk') || name.includes('formula')) {
    if (availableModels.food.length > 0) {
      return { category: 'food', models: availableModels.food };
    }
  }

  // CLOTHING - Clothing models preferred
  if (cat.includes('fashion') || cat.includes('cloth') || cat.includes('apparel') ||
      cat.includes('wear') || cat.includes('boy') || cat.includes('girl') ||
      name.includes('shirt') || name.includes('pant') || name.includes('dress') ||
      name.includes('onesie') || name.includes('romper')) {
    if (availableModels.clothing.length > 0) {
      return { category: 'clothing', models: availableModels.clothing };
    }
  }

  // FOOTWEAR - Footwear models preferred
  if (cat.includes('footwear') || cat.includes('shoe') || name.includes('shoe') ||
      name.includes('sandal') || name.includes('boot') || name.includes('slipper')) {
    if (availableModels.footwear.length > 0) {
      return { category: 'footwear', models: availableModels.footwear };
    }
  }

  // BABY CARE - Baby care models preferred
  if (cat.includes('care') || cat.includes('hygiene') || cat.includes('diaper') ||
      name.includes('lotion') || name.includes('cream') || name.includes('powder') ||
      name.includes('wipe') || name.includes('shampoo') || name.includes('soap')) {
    if (availableModels.babycare.length > 0) {
      return { category: 'babycare', models: availableModels.babycare };
    }
  }

  // BATH - Bath models preferred
  if (cat.includes('bath') || name.includes('bath') || name.includes('tub') ||
      name.includes('towel') || name.includes('wash')) {
    if (availableModels.bath.length > 0) {
      return { category: 'bath', models: availableModels.bath };
    }
  }

  // ACCESSORIES - Accessories models
  if (cat.includes('accessor') || name.includes('bib') || name.includes('blanket') ||
      name.includes('pacifier') || name.includes('hat')) {
    if (availableModels.accessories.length > 0) {
      return { category: 'accessories', models: availableModels.accessories };
    }
  }

  // FALLBACK HIERARCHY
  // 1. Try toys (most generic)
  if (availableModels.toys.length > 0) {
    return { category: 'toys (fallback)', models: availableModels.toys };
  }
  // 2. Try food
  if (availableModels.food.length > 0) {
    return { category: 'food (fallback)', models: availableModels.food };
  }
  // 3. Try any available model
  for (const [cat, models] of Object.entries(availableModels)) {
    if (models.length > 0) {
      return { category: `${cat} (fallback)`, models };
    }
  }

  // No models available
  return { category: 'none', models: [] };
}

async function advancedMapProducts() {
  try {
    console.log('🎨 Advanced 3D Model Mapping\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Scan available models
    console.log('📂 Scanning available 3D models...\n');
    const availableModels = scanAvailableModels();
    
    let totalModels = 0;
    for (const [category, models] of Object.entries(availableModels)) {
      if (models.length > 0) {
        console.log(`   ✅ ${category}: ${models.length} model(s)`);
        models.forEach(m => console.log(`      - ${m}`));
        totalModels += models.length;
      }
    }
    
    if (totalModels === 0) {
      console.log('\n❌ No 3D models found in client/public/models/');
      console.log('📖 See ADD_PRODUCT_SPECIFIC_3D_MODELS.md for how to add models\n');
      return;
    }

    console.log(`\n📊 Total models available: ${totalModels}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');
    const allProducts = await Product.find({ isActive: true });
    
    console.log(`📦 Found ${allProducts.length} active products\n`);
    console.log('🔄 Mapping products to appropriate models...\n');

    let updated = 0;
    const categoryStats = {};
    const modelUsage = {};
    
    // Create rotation index for each category
    const categoryRotation = {};

    for (const product of allProducts) {
      const mapping = getCategoryMapping(product.category, product.name, availableModels);
      
      if (mapping.models.length === 0) {
        console.log(`   ⚠️  ${product.name} - No suitable model found`);
        continue;
      }

      // Initialize rotation index for this category
      if (!categoryRotation[mapping.category]) {
        categoryRotation[mapping.category] = 0;
      }

      // Get model using rotation (so products in same category don't all get the same model)
      const modelIndex = categoryRotation[mapping.category] % mapping.models.length;
      const newModel = mapping.models[modelIndex];
      categoryRotation[mapping.category]++;

      const oldModel = product.model3DUrl;
      
      // Update if different or no model exists
      if (!oldModel || oldModel !== newModel) {
        product.model3DUrl = newModel;
        await product.save();
        
        console.log(`   ✅ ${product.name}`);
        console.log(`      Category: ${product.category || 'N/A'}`);
        console.log(`      Mapped to: ${mapping.category}`);
        console.log(`      Model: ${newModel}\n`);
        
        updated++;
      }

      // Track statistics
      categoryStats[mapping.category] = (categoryStats[mapping.category] || 0) + 1;
      modelUsage[newModel] = (modelUsage[newModel] || 0) + 1;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ ADVANCED MAPPING COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`📊 Update Statistics:`);
    console.log(`   • Products updated: ${updated}`);
    console.log(`   • Total products: ${allProducts.length}\n`);
    
    console.log(`📈 Category Distribution:`);
    for (const [category, count] of Object.entries(categoryStats)) {
      console.log(`   • ${category}: ${count} product(s)`);
    }
    
    console.log(`\n🎯 Model Usage:`);
    for (const [model, count] of Object.entries(modelUsage)) {
      console.log(`   • ${model}: ${count} product(s)`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Products mapped to category-appropriate models!');
    console.log('📱 Visit: http://localhost:3000/shop to see changes\n');
    console.log('💡 To add more models, see: ADD_PRODUCT_SPECIFIC_3D_MODELS.md\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

advancedMapProducts();
