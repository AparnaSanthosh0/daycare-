const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/tinytots')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Update the Baby Bottle product with colorful bottles image
    const productId = '68f92d716cb414c12151c9c2';
    const colorfulBottlesImage = 'https://i.ibb.co/qYWLZ3h/baby-bottles-colorful.jpg';
    
    const result = await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          name: 'Baby Bottle',
          image: colorfulBottlesImage,
          images: [colorfulBottlesImage],
          description: 'Colorful silicone baby bottles with handles - safe, easy to hold, and available in multiple colors!'
        }
      },
      { new: true }
    );
    
    console.log('\n✅ Updated Baby Bottle product:');
    console.log({
      id: result._id,
      name: result.name,
      image: result.image,
      images: result.images,
      category: result.category
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
