const mongoose = require('mongoose');

const platformCommissionSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: String,

  // Date tracking
  date: {
    type: Date,
    default: Date.now
  },
  month: String, // 'Jan-2026'
  year: Number,

  // Vendor commissions
  vendorCommissions: [{
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    },
    vendorName: String,
    salesAmount: Number,
    commissionRate: Number,
    commissionAmount: Number,
    category: String
  }],

  // Delivery commissions
  deliveryCommissions: [{
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryAssignment'
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    agentName: String,
    deliveryFee: Number,
    platformShare: Number,
    agentShare: Number
  }],

  // Totals
  totalVendorCommission: Number,
  totalDeliveryCommission: Number,
  totalRevenue: Number,

  // Payment gateway
  paymentGatewayFee: Number,
  netRevenue: Number,

  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'reversed'],
    default: 'pending'
  }

}, { timestamps: true });

// Indexes
platformCommissionSchema.index({ order: 1 });
platformCommissionSchema.index({ date: -1 });
platformCommissionSchema.index({ month: 1, year: 1 });
platformCommissionSchema.index({ status: 1 });

module.exports = mongoose.model('PlatformCommission', platformCommissionSchema);
