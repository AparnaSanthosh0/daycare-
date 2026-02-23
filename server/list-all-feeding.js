const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/tinytots')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    // Get ALL feeding products
    const feeding = await Product.find({ category: /feeding/i });
    
    console.log('=== ALL FEEDING PRODUCTS ===\n');
    feeding.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name}`);
      console.log(`   ID: ${p._id}`);
      console.log(`   Image: ${p.image}`);
      console.log(`   model3DUrl: ${p.model3DUrl || 'none'}`);
      console.log('');
    });
    
    console.log(`Total: ${feeding.length} products`);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
