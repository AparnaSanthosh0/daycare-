#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function checkProductsAndVendors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');

    console.log('🔍 Checking products and vendors...\n');

    const Vendor = require('../models/Vendor');
    const Product = require('../models/Product');

    // Check vendors
    const vendors = await Vendor.find();
    console.log('📋 Vendors found:', vendors.length);
    vendors.forEach(v => {
      console.log(`  - ${v.vendorName || v.companyName} - Status: ${v.status}`);
    });

    // Check products
    const products = await Product.find();
    console.log('\n📦 Products found:', products.length);
    products.forEach(p => {
      console.log(`  - ${p.name} - Active: ${p.isActive} - Stock: ${p.inStock} - Vendor: ${p.vendor || 'No vendor'}`);
    });

    // Check active products only
    const activeProducts = await Product.find({ isActive: true });
    console.log('\n✅ Active products:', activeProducts.length);
    activeProducts.forEach(p => {
      console.log(`  - ${p.name} - ₹${p.price} - ${p.category}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

checkProductsAndVendors();
