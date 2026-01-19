const mongoose = require('mongoose');

const vendorPayoutSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  vendorName: String,

  // Batch details
  payoutBatch: String, // 'BATCH-2026-W03'
  period: {
    startDate: Date,
    endDate: Date
  },

  // Orders in this payout
  orders: [{
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    orderNumber: String,
    orderDate: Date,
    grossAmount: Number,
    platformFee: Number,
    netAmount: Number
  }],

  // Amounts
  totalGrossAmount: Number,
  totalPlatformFee: Number,
  totalNetAmount: Number,

  // Deductions
  deductions: [{
    type: String, // 'refund', 'penalty', 'adjustment'
    amount: Number,
    reason: String
  }],
  totalDeductions: {
    type: Number,
    default: 0
  },

  // Final payout
  finalPayoutAmount: Number,

  // Status
  status: {
    type: String,
    enum: ['scheduled', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'scheduled'
  },
  scheduledDate: Date,
  processedDate: Date,
  completedDate: Date,

  // Bank transfer
  bankAccount: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String
  },
  transactionId: String,
  referenceNumber: String,

  // Notes
  notes: String,
  failureReason: String

}, { timestamps: true });

// Indexes
vendorPayoutSchema.index({ vendor: 1, status: 1 });
vendorPayoutSchema.index({ scheduledDate: 1 });
vendorPayoutSchema.index({ payoutBatch: 1 });

module.exports = mongoose.model('VendorPayout', vendorPayoutSchema);
