#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function resetVendor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');

    console.log('🔄 Resetting vendor for new registration...\n');

    const Vendor = require('../models/Vendor');
    const Product = require('../models/Product');

    // Delete current vendor and all their products
    const currentVendor = await Vendor.findOne({ status: 'approved' });
    if (currentVendor) {
      console.log(`🗑️  Deleting current vendor: ${currentVendor.vendorName}`);
      await Vendor.deleteMany({});
      console.log('✅ Current vendor deleted');
    }

    const deletedProducts = await Product.deleteMany({});
    console.log(`🗑️  Deleted ${deletedProducts.deletedCount} products`);

    await mongoose.disconnect();
    console.log('\n🎉 Ready for new vendor registration!');
    console.log('📝 Go to: http://localhost:3000/vendor-register');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

resetVendor();
