#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

async function setupVendor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots');

    console.log('🏪 Setting up vendor...\n');

    const Vendor = require('../models/Vendor');
    const User = require('../models/User');

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne();
    if (existingVendor) {
      console.log('📋 Vendor already exists:');
      console.log(`  - ${existingVendor.vendorName} (${existingVendor.companyName})`);
      console.log(`  - Status: ${existingVendor.status}`);

      if (existingVendor.status === 'pending') {
        console.log('\n🔄 Approving vendor...');
        existingVendor.status = 'approved';
        existingVendor.approvedAt = new Date();
        await existingVendor.save();
        console.log('✅ Vendor approved successfully!');
      } else {
        console.log('✅ Vendor is already approved');
      }

      await mongoose.disconnect();
      return;
    }

    // Create a new vendor
    console.log('🆕 Creating new vendor...');
    const vendor = new Vendor({
      vendorName: 'Sample Vendor',
      companyName: 'TinyTots Vendor',
      email: 'vendor@tinytots.com',
      phone: '+919876543210',
      businessLicenseNumber: 'LIC123456',
      address: {
        street: '123 Business Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001'
      },
      status: 'approved', // Approve immediately for testing
      approvedAt: new Date()
    });

    await vendor.save();
    console.log('✅ Vendor created and approved successfully!');
    console.log(`📋 Vendor: ${vendor.vendorName} (${vendor.companyName})`);
    console.log(`📧 Email: ${vendor.email}`);
    console.log(`📱 Phone: ${vendor.phone}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

setupVendor();
