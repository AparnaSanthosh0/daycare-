#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function createSampleProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');

    console.log('📦 Creating sample products...\n');

    const Vendor = require('../models/Vendor');
    const Product = require('../models/Product');

    // Get the approved vendor
    const vendor = await Vendor.findOne({ status: 'approved' });
    if (!vendor) {
      console.log('❌ No approved vendor found. Run: npm run setup:vendor first');
      return;
    }

    console.log(`🏪 Using vendor: ${vendor.vendorName} (${vendor.companyName})\n`);

    // Sample products to create
    const sampleProducts = [
      {
        name: 'Festive Kurta Set',
        price: 1299,
        category: 'Fashion',
        description: 'Comfortable cotton kurta for kids - perfect for festive occasions',
        inStock: true,
        stockQty: 50,
        isNew: true,
        isBestseller: false,
        isActive: true,
        sizes: ['2-3Y', '3-4Y', '4-5Y', '5-6Y'],
        vendor: vendor._id
      },
      {
        name: 'Embroidered Lehenga',
        price: 1899,
        category: 'Fashion',
        description: 'Beautiful embroidered lehenga set for celebrations',
        inStock: true,
        stockQty: 30,
        isNew: false,
        isBestseller: true,
        isActive: true,
        sizes: ['2-3Y', '3-4Y', '4-5Y', '5-6Y'],
        vendor: vendor._id
      },
      {
        name: 'Wooden Puzzle Set',
        price: 499,
        category: 'Toys',
        description: 'Educational wooden puzzles for age 3+ - helps develop problem-solving skills',
        inStock: true,
        stockQty: 100,
        isNew: false,
        isBestseller: false,
        isActive: true,
        sizes: ['Standard'],
        vendor: vendor._id
      },
      {
        name: 'STEM Robotics Kit',
        price: 2599,
        category: 'Learning',
        description: 'DIY robotics kit for kids - build and program your own robot',
        inStock: true,
        stockQty: 25,
        isNew: true,
        isBestseller: false,
        isActive: true,
        sizes: ['Standard'],
        vendor: vendor._id
      },
      {
        name: 'Nursery Bedsheet Set',
        price: 699,
        category: 'Nursery',
        description: 'Soft and breathable cotton bedsheet set - perfect for little ones',
        inStock: true,
        stockQty: 75,
        isNew: false,
        isBestseller: false,
        isActive: true,
        sizes: ['Single'],
        vendor: vendor._id
      },
      {
        name: 'Kids Sports Shoes',
        price: 1499,
        category: 'Footwear',
        description: 'Lightweight and comfortable sports shoes for play time',
        inStock: true,
        stockQty: 60,
        isNew: false,
        isBestseller: true,
        isActive: true,
        sizes: ['20', '21', '22', '23', '24', '25'],
        vendor: vendor._id
      }
    ];

    // Create products
    const createdProducts = [];
    for (const productData of sampleProducts) {
      const product = new Product(productData);
      await product.save();
      createdProducts.push(product);
      console.log(`✅ Created: ${product.name} - ₹${product.price} (${product.category})`);
    }

    console.log(`\n🎉 Successfully created ${createdProducts.length} products!`);
    console.log('\n📋 Product Summary:');
    createdProducts.forEach(p => {
      console.log(`  - ${p.name} (${p.category}) - Active: ${p.isActive} - Stock: ${p.inStock}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

createSampleProducts();
