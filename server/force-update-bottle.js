const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/tinytots')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    // Update Baby Bottle to use the colorful bottles image
    const productId = '68f92d716cb414c12151c9c2';
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
    
    console.log('=== UPDATED BABY BOTTLE ===');
    console.log('ID:', result._id);
    console.log('Name:', result.name);
    console.log('Image:', result.image);
    console.log('Images:', result.images);
    console.log('model3DUrl:', result.model3DUrl);
    console.log('\n✅ Updated to colorful bottles image!');
    console.log('Image path: C:\\Users\\HP\\TinyTots\\client\\public' + colorfulImage);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
