const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/tinytots')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    // Update ALL feeding products with colorful bottles image
    const colorfulImage = '/baby-bottles-colorful.png';
    
    const result = await Product.updateMany(
      { category: /feeding/i },
      {
        $set: {
          name: 'Baby Bottle',
          image: colorfulImage,
          images: [colorfulImage],
          description: 'Colorful silicone baby bottles with handles - safe, easy to hold, and available in multiple colors!'
        },
        $unset: { model3DUrl: "" }
      }
    );
    
    console.log('=== UPDATED ALL FEEDING PRODUCTS ===');
    console.log(`✅ Updated ${result.modifiedCount} products`);
    console.log('Image: /baby-bottles-colorful.png');
    console.log('\n🔄 Now do HARD REFRESH (Ctrl+Shift+R)');
    
    // List updated products
    const feedingProducts = await Product.find({ category: /feeding/i });
    console.log('\n=== All Feeding Products Now Have: ===');
    feedingProducts.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name} - ${p.image}`);
      console.log(`   URL: http://localhost:3000/product/${p._id}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
