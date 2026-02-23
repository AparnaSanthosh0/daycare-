const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/tinytots')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Search for products with "Bottle" in name
    const bottles = await Product.find({ name: /bottle/i });
    console.log('\n=== Products with "Bottle" in name ===');
    console.log(JSON.stringify(bottles.map(p => ({
      id: p._id,
      name: p.name,
      image: p.image,
      images: p.images,
      category: p.category
    })), null, 2));
    
    // Search for feeding category products
    const feeding = await Product.find({ category: /feeding/i });
    console.log('\n=== Feeding Category Products ===');
    console.log(JSON.stringify(feeding.map(p => ({
      id: p._id,
      name: p.name,
      image: p.image,
      category: p.category
    })), null, 2));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
