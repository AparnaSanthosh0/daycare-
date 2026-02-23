const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'product-images-for-3d', 'MANIFEST.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  🎯 TOP 10 PRODUCTS TO PRIORITIZE FOR 3D MODELS      ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Prioritization logic:
// 1. Diverse categories (show off 3D across store)
// 2. Visual products (clothing, toys benefit most from 3D)
// 3. One representative per category

const priorities = [
  // 1. GIRL FASHION (most visual, high impact)
  { 
    product: manifest.find(p => p.productName === 'Herr' && p.category === 'girl fashion'),
    reason: '👗 Girl dress - High visual impact, fashion category showcase',
    priority: 'HIGHEST'
  },
  
  // 2. BOY FASHION
  {
    product: manifest.find(p => p.productName === 'Hiss' && p.category === 'boy fashion'),
    reason: '👕 Boy clothing - Represents boy fashion category',
    priority: 'HIGH'
  },
  
  // 3. TOYS (very 3D-friendly)
  {
    product: manifest.find(p => p.productName === 'dreamtoys' && p.category === 'toys'),
    reason: '🧸 Toy - 3D models work great for toys, engaging for customers',
    priority: 'HIGHEST'
  },
  
  // 4. BABY CARE (popular category)
  {
    product: manifest.find(p => p.productName === 'Aveeno Baby'),
    reason: '🧴 Baby lotion - Popular brand, recognizable product',
    priority: 'HIGH'
  },
  
  // 5. FEEDING
  {
    product: manifest.find(p => p.productName === 'feedzz' && p.category === 'feeding'),
    reason: '🍼 Feeding product - Essential category, practical 3D view',
    priority: 'MEDIUM'
  },
  
  // 6. FOOTWEAR
  {
    product: manifest.find(p => p.productName === 'walkzz' && p.category === 'footwear'),
    reason: '👟 Baby footwear - 3D helps customers see shoe details',
    priority: 'HIGH'
  },
  
  // 7. DIAPERING (necessary category)
  {
    product: manifest.find(p => p.productName === 'Pampers'),
    reason: '🧷 Pampers - Well-known brand, essential product',
    priority: 'MEDIUM'
  },
  
  // 8. GEAR (Unique item)
  {
    product: manifest.find(p => p.productName === 'Cradle'),
    reason: '🛏️ Cradle - Large item, impressive in 3D',
    priority: 'HIGH'
  },
  
  // 9. BATH
  {
    product: manifest.find(p => p.productName === 'Mama & Bird'),
    reason: '🛁 Bath product - Completes category coverage',
    priority: 'MEDIUM'
  },
  
  // 10. Another GIRL FASHION (second variant)
  {
    product: manifest.find(p => p.productName === 'Babyhugg'),
    reason: '👗 Baby clothing - Shows variety in fashion category',
    priority: 'MEDIUM'
  }
];

console.log('📊 RECOMMENDED PRIORITY ORDER:\n');
console.log('Upload these to Meshy.ai first for maximum impact:\n');

let uploadOrder = [];

priorities.forEach((item, index) => {
  if (!item.product) return;
  
  console.log(`${index + 1}. ${item.product.productName.toUpperCase()}`);
  console.log(`   Category: ${item.product.category}`);
  console.log(`   Priority: ${item.priority}`);
  console.log(`   Why: ${item.reason}`);
  console.log(`   Image: ${item.product.imageFile}`);
  console.log(`   Product ID: ${item.product.productId}\n`);
  
  uploadOrder.push({
    order: index + 1,
    name: item.product.productName,
    imageFile: item.product.imageFile,
    category: item.product.category,
    productId: item.product.productId,
    modelPath: item.product.suggestedModelPath
  });
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📋 YOUR UPLOAD CHECKLIST:\n');

uploadOrder.forEach(item => {
  console.log(`☐ ${item.order}. ${item.name} (${item.category})`);
  console.log(`   📁 Upload: ${item.imageFile}`);
  console.log(`   💾 Save as: ${item.modelPath.split('/').pop()}`);
  console.log(`   📍 Place in: client/public${item.modelPath.substring(0, item.modelPath.lastIndexOf('/'))}/\n`);
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('⏱️  TIME ESTIMATE: 10 products × 5 minutes = 50 minutes\n');
console.log('💰 COST: FREE (Meshy.ai free tier = 20 models/month)\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('🚀 GETTING STARTED:\n');
console.log('1. Open: server/product-images-for-3d/');
console.log('2. Go to: https://www.meshy.ai (sign up free)');
console.log('3. Click: "Image to 3D"');
console.log('4. Upload: First image from list above');
console.log('5. Wait: 3-5 minutes');
console.log('6. Download: GLB file');
console.log('7. Repeat for all 10!\n');

console.log('💡 TIP: Do 2-3 per day = Done in 4 days!\n');

// Save the priority list
const priorityFile = path.join(__dirname, 'product-images-for-3d', 'PRIORITY-10.json');
fs.writeFileSync(priorityFile, JSON.stringify(uploadOrder, null, 2));
console.log('✅ Priority list saved: server/product-images-for-3d/PRIORITY-10.json\n');
