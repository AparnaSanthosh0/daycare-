// Usage: node scripts/resetVendorPassword.js <vendorEmail>
// Creates or updates a vendor's linked User with a new temporary password and emails it.

require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const { sendMail, vendorApprovedEmail } = require('../utils/mailer');

async function main() {
  const email = (process.argv[2] || '').toLowerCase();
  if (!email) {
    console.error('Provide vendor email: node scripts/resetVendorPassword.js vendor@example.com');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots';
  await mongoose.connect(uri);

  try {
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      console.error('Vendor not found for email:', email);
      process.exit(2);
    }

    // Ensure vendor is approved (not strictly required, but typical for login)
    if (vendor.status !== 'approved') {
      console.warn(`Vendor status is '${vendor.status}'. Proceeding anyway to create/reset login.`);
    }

    // Create or link a User with role 'vendor'
    let user = null;
    if (vendor.user) {
      user = await User.findById(vendor.user);
    }
    if (!user) {
      user = await User.findOne({ email });
    }

    const tempPassword = Math.random().toString(36).slice(-10) + 'A@1';

    if (!user) {
      user = new User({
        firstName: vendor.vendorName,
        lastName: vendor.companyName || 'Vendor',
        email: vendor.email,
        password: tempPassword,
        role: 'vendor',
        phone: vendor.phone,
        address: vendor.address || {},
        isActive: true,
      });
      await user.save();
      vendor.user = user._id;
      await vendor.save();
    } else {
      // Reset password; ensure vendor role and activate
      user.password = tempPassword;
      user.role = 'vendor';
      user.isActive = true;
      await user.save();
    }

    const loginInfo = { email: vendor.email, password: tempPassword };

    // Email the login info using existing template
    try {
      const mail = vendorApprovedEmail(vendor.toObject(), loginInfo);
      await sendMail({ to: vendor.email, ...mail });
      console.log('Password reset email queued/sent. Check inbox or console preview URL.');
    } catch (e) {
      console.warn('Failed to send email:', e.message);
    }

    // Always log credentials for development convenience (remove in prod)
    console.log(`DEV: Vendor login -> ${vendor.email} / ${tempPassword}`);
    console.log('If no real SMTP is set, look for "Email preview URL" in server console.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(3); });