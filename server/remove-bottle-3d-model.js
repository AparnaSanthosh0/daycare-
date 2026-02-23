const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/tinytots')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    // Remove model3DUrl so it uses Image3DViewer instead
    const productId = '68f92d716cb414c12151c9c2';
    const result = await Product.findByIdAndUpdate(
      productId,
      {
        $unset: { model3DUrl: "" }  // Remove the 3D model URL
      },
      { new: true }
    );
    
    console.log('=== FIXED BABY BOTTLE PRODUCT ===');
    console.log('ID:', result._id);
    console.log('Name:', result.name);
    console.log('Image:', result.image);
    console.log('model3DUrl:', result.model3DUrl);
    console.log('\n✅ Now it will use Image3DViewer with the colorful bottles image!');
    console.log('🔄 Refresh the page and click 3D VIEW');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
