/**
 * 3D Display Debug Script
 * 
 * Run this to check your 3D setup and troubleshoot issues
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         3D DISPLAY DIAGNOSTIC - TinyTots                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Check 1: Verify model files exist
console.log('📦 Checking 3D Model Files...\n');

const modelsDir = path.join(__dirname, '..', 'client', 'public', 'models');
const categories = ['toys', 'clothing', 'footwear', 'babycare', 'diapering', 'bath', 'gear', 'food', 'festival-offer'];

let totalModels = 0;
let modelsByCategory = {};

categories.forEach(cat => {
  const catPath = path.join(modelsDir, cat);
  if (fs.existsSync(catPath)) {
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.glb') || f.endsWith('.gltf'));
    if (files.length > 0) {
      modelsByCategory[cat] = files;
      totalModels += files.length;
      console.log(`✅ ${cat.toUpperCase()}: ${files.length} model(s)`);
      files.forEach(f => {
        const filePath = path.join(catPath, f);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`   📄 ${f} (${sizeMB} MB)`);
      });
    }
  }
});

console.log(`\n📊 Total Models Found: ${totalModels}\n`);

// Check 2: Verify Product3DViewer component exists
console.log('🔍 Checking Components...\n');

const viewerPath = path.join(__dirname, '..', 'client', 'src', 'components', 'Product3DViewer.jsx');
if (fs.existsSync(viewerPath)) {
  console.log('✅ Product3DViewer component exists');
  const content = fs.readFileSync(viewerPath, 'utf8');
  
  // Check for key features
  const features = [
    { name: 'ModelErrorBoundary', pattern: /class\s+ModelErrorBoundary/i },
    { name: 'Error handling', pattern: /handleModelError/i },
    { name: 'Loading state', pattern: /loading.*setLoading/i },
    { name: 'Fullscreen support', pattern: /isFullscreen/i },
    { name: 'Zoom controls', pattern: /handleZoom/i },
  ];
  
  features.forEach(feature => {
    if (feature.pattern.test(content)) {
      console.log(`   ✅ ${feature.name} implemented`);
    } else {
      console.log(`   ⚠️  ${feature.name} not found`);
    }
  });
} else {
  console.log('❌ Product3DViewer component NOT FOUND!');
}

// Check 3: Verify dependencies
console.log('\n📦 Checking Dependencies...\n');

const packageJsonPath = path.join(__dirname, '..', 'client', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = packageJson.dependencies || {};
  
  const required = ['three', '@react-three/fiber', '@react-three/drei'];
  required.forEach(dep => {
    if (deps[dep]) {
      console.log(`✅ ${dep}: ${deps[dep]}`);
    } else {
      console.log(`❌ ${dep}: NOT INSTALLED`);
    }
  });
}

// Check 4: Check .env file
console.log('\n⚙️  Checking Configuration...\n');

const envPath = path.join(__dirname, '..', 'client', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('GENERATE_SOURCEMAP')) {
    console.log('✅ Source map configuration found');
  } else {
    console.log('⚠️  GENERATE_SOURCEMAP not set (source map warnings may appear)');
  }
} else {
  console.log('⚠️  .env file not found');
}

// Check 5: Verify ProductDetail integration
console.log('\n🔗 Checking Integration...\n');

const detailPath = path.join(__dirname, '..', 'client', 'src', 'components', 'Ecommerce', 'ProductDetail.jsx');
if (fs.existsSync(detailPath)) {
  const content = fs.readFileSync(detailPath, 'utf8');
  
  if (content.includes('Product3DViewer')) {
    console.log('✅ Product3DViewer imported in ProductDetail');
  } else {
    console.log('❌ Product3DViewer NOT imported in ProductDetail');
  }
  
  if (content.includes('model3DUrl')) {
    console.log('✅ model3DUrl field used in ProductDetail');
  } else {
    console.log('❌ model3DUrl field NOT found in ProductDetail');
  }
  
  if (content.includes('view3D') || content.includes('3D View')) {
    console.log('✅ 3D toggle button implemented');
  } else {
    console.log('❌ 3D toggle button NOT found');
  }
}

// Summary
console.log('\n' + '═'.repeat(66));
console.log('\n📋 DIAGNOSTIC SUMMARY\n');

const issues = [];
if (totalModels === 0) issues.push('No 3D models found');
if (!fs.existsSync(viewerPath)) issues.push('Product3DViewer component missing');

if (issues.length === 0) {
  console.log('✅ All checks passed! Your 3D setup looks good.\n');
  console.log('Next Steps:');
  console.log('1. Restart your development server (to apply .env changes)');
  console.log('2. Run: node server/verify-3d.js (to check database)');
  console.log('3. Visit: http://localhost:3000/shop');
  console.log('4. Click on a product with a 3D model');
  console.log('5. Toggle to "3D View"\n');
} else {
  console.log('⚠️  Issues Found:\n');
  issues.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue}`);
  });
  console.log('\nPlease fix these issues and run this script again.\n');
}

console.log('═'.repeat(66) + '\n');

// Model assignment suggestions
if (totalModels > 0) {
  console.log('💡 Model Assignment Tips:\n');
  console.log('Run these commands to assign models to products:\n');
  console.log('   cd server');
  console.log('   node verify-3d.js     # See current assignments');
  console.log('   node plan-3d-models.js # See all products\n');
  console.log('Or use the batch script:');
  console.log('   ASSIGN-3D-MODELS.bat\n');
}
