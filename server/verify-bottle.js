const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/tinytots')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    // Get the Baby Bottle product
    const productId = '68f92d716cb414c12151c9c2';
    const product = await Product.findById(productId);
    
    console.log('=== BABY BOTTLE PRODUCT DATA ===');
    console.log('ID:', product._id);
    console.log('Name:', product.name);
    console.log('Category:', product.category);
    console.log('Image:', product.image);
    console.log('Images Array:', product.images);
    console.log('model3DUrl:', product.model3DUrl);
    console.log('\n✅ Image should be visible at: http://localhost:3000' + product.image);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
