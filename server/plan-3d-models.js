const mongoose = require('mongoose');
require('dotenv').config();

async function showProductsForModeling() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    const Product = require('./models/Product');
    
    const products = await Product.find({ isActive: true })
      .select('name category image model3DUrl')
      .sort('category name');
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  📦 YOUR PRODUCTS - 3D MODEL ASSIGNMENT PLANNER               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    // Group by category
    const byCategory = {};
    products.forEach(p => {
      const cat = p.category || 'General';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(p);
    });
    
    console.log('📊 SUMMARY:\n');
    Object.entries(byCategory).forEach(([cat, prods]) => {
      console.log(`   ${cat}: ${prods.length} product(s)`);
    });
    
    console.log('\n' + '━'.repeat(65) + '\n');
    console.log('📋 DETAILED LIST:\n');
    
    Object.entries(byCategory).forEach(([cat, prods]) => {
      console.log(`\n🏷️  ${cat.toUpperCase()}`);
      console.log('─'.repeat(65));
      
      prods.forEach((p, i) => {
        console.log(`\n${i + 1}. ${p.name}`);
        console.log(`   Current Model: ${p.model3DUrl || 'NONE'}`);
        console.log(`   Image: ${p.image || 'No image'}`);
        console.log(`   Suggested 3D: /models/${cat.toLowerCase().replace(' ', '-')}/${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.glb`);
      });
      
      console.log('\n');
    });
    
    console.log('━'.repeat(65));
    console.log('\n🎯 RECOMMENDED ACTION PLAN:\n');
    console.log('1. PRIORITY 1 (Do First): Top 5 best-selling products');
    console.log('   → Use Meshy.ai to convert photos to 3D models\n');
    
    console.log('2. PRIORITY 2 (Do Next): Unique/flagship products');
    console.log('   → These make your store stand out\n');
    
    console.log('3. PRIORITY 3 (Do Eventually): All remaining products');
    console.log('   → Or keep using category-based models\n');
    
    console.log('━'.repeat(65));
    console.log('\n📖 NEXT STEPS:\n');
    console.log('1. Read: PRODUCT_SPECIFIC_3D_GUIDE.md');
    console.log('2. Go to: https://www.meshy.ai (free account)');
    console.log('3. Upload product photos (one at a time)');
    console.log('4. Download GLB files');
    console.log('5. Edit: server/assign-specific-models.js');
    console.log('6. Run: node server/assign-specific-models.js\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

showProductsForModeling();
