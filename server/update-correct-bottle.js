const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/tinytots')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    // Update the ACTUAL product being viewed
    const productId = '68c7ec904dc36b2e3e42259b';
    const colorfulImage = '/baby-bottles-colorful.png';
    
    const result = await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          name: 'Baby Bottle',
          image: colorfulImage,
          images: [colorfulImage],
          description: 'Colorful silicone baby bottles with handles - safe, easy to hold, and available in multiple colors!'
        },
        $unset: { model3DUrl: "" }
      },
      { new: true }
    );
    
    if (result) {
      console.log('=== UPDATED CORRECT PRODUCT ===');
      console.log('ID:', result._id);
      console.log('Name:', result.name);
      console.log('Image:', result.image);
      console.log('model3DUrl:', result.model3DUrl);
      console.log('\n✅ Updated! Now HARD REFRESH (Ctrl+Shift+R)');
    } else {
      console.log('❌ Product not found');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
