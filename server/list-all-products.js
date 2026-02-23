const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/tinytots')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    // Get ALL products
    const products = await Product.find({}).select('_id name image category').limit(20);
    
    console.log('=== ALL PRODUCTS (First 20) ===\n');
    products.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name}`);
      console.log(`   ID: ${p._id}`);
      console.log(`   Category: ${p.category}`);
      console.log(`   URL: http://localhost:3000/product/${p._id}`);
      console.log('');
    });
    
    console.log(`Total products found: ${products.length}`);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
