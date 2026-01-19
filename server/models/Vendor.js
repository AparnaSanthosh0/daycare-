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

    // NEW: Warehouse/Store location for pickup
    warehouseLocation: {
      address: { type: String, default: '' },
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      coordinates: {
        lat: Number,
        lng: Number
      },
      zone: String,
      contactPerson: String,
      contactPhone: String,
      operatingHours: {
        open: String,
        close: String
      }
    },

    // NEW: Commission settings
    commissionRate: {
      type: Number,
      default: 15 // 15% default commission
    },
    categoryCommissionRates: {
      type: Map,
      of: Number
    },

    // NEW: Financial stats
    stats: {
      totalSales: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      totalCommissionPaid: { type: Number, default: 0 },
      pendingPayout: { type: Number, default: 0 },
      lastPayoutDate: Date
    },

    // NEW: Bank details for payout
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      bankName: String,
      branchName: String,
      accountType: { type: String, enum: ['savings', 'current'] },
      verified: { type: Boolean, default: false }
    },

    // NEW: Payout preferences
    payoutSettings: {
      schedule: { type: String, enum: ['weekly', 'bi-weekly', 'monthly'], default: 'weekly' },
      preferredDay: { type: String, default: 'Friday' },
      minimumPayout: { type: Number, default: 500 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vendor', vendorSchema);