const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {

    vendorName: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    businessLicenseNumber: { type: String, required: true, trim: true },
    licenseUrl: { type: String, default: null },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
    },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Link to the login account created upon approval
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vendor', vendorSchema);