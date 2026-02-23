// Create or update "Baby lotion" product with correct 3D model
const mongoose = require('mongoose');
require('dotenv').config();

async function createBabyLotion() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');
    console.log('✅ Connected to MongoDB\n');

    const Product = require('./models/Product');

    // First check if "Baby lotion" already exists
    let product = await Product.findOne({ name: 'Baby lotion' });

    if (product) {
      console.log('📦 Found existing "Baby lotion" product\n');
      console.log(`   ID: ${product._id}`);
      console.log(`   Current Model: ${product.model3DUrl}\n`);
      
      // Update it
      product.category = 'baby care';
      product.model3DUrl = '/models/babycare/lotion-bottle.glb';
      product.price = product.price || 1000;
      product.description = product.description || 'Gentle moisturizing lotion for baby\'s delicate skin';
      product.isActive = true;
      
    } else {
      console.log('✨ Creating new "Baby lotion" product\n');
      
      // Create new product
      product = new Product({
        name: 'Baby lotion',
        category: 'baby care',
        price: 1000,
        description: 'Gentle moisturizing lotion for baby\'s delicate skin. Hypoallergenic and dermatologist tested.',
        model3DUrl: '/models/babycare/lotion-bottle.glb',
        image: '/images/baby-lotion.jpg',
        inStock: true,
        stockQty: 50,
        rating: 4.5,
        reviews: 0,
        isActive: true,
        isNew: true
      });
    }

    await product.save();

    console.log('✅ Baby lotion product saved!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Name: ${product.name}`);
    console.log(`   ID: ${product._id}`);
    console.log(`   Category: ${product.category}`);
    console.log(`   Price: ₹${product.price}`);
    console.log(`   3D Model: ${product.model3DUrl}`);
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('🎯 Now visit the shop and click on Baby lotion product!');
    console.log('   URL: http://localhost:3000/shop\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createBabyLotion();
