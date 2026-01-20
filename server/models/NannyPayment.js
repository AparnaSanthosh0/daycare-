const mongoose = require('mongoose');

const nannyPaymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NannyBooking',
    required: true
  },
  nanny: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Payment Details
  totalAmount: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    default: 10
  },
  commissionAmount: {
    type: Number,
    required: true
  },
  payoutAmount: {
    type: Number,
    required: true
  },
  
  // Payment Status
  status: {
    type: String,
    enum: ['pending', 'payment_held', 'parent_confirmed', 'admin_approved', 'paid', 'failed'],
    default: 'pending'
  },
  
  // Payout Details
  payoutMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'wallet'],
    required: true
  },
  payoutDetails: {
    bankAccount: String,
    ifscCode: String,
    upiId: String,
    walletId: String
  },
  
  // Timestamps
  paymentReceivedAt: Date,        // When parent paid
  paymentHeldAt: Date,            // When admin held payment
  parentConfirmedAt: Date,        // When parent confirmed service
  adminApprovedAt: Date,          // When admin approved payout
  paidAt: Date,                   // When nanny received payment
  
  // Admin tracking
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  payoutTransactionId: String,    // External transaction ID
  payoutNotes: String,
  
  // Parent confirmation
  parentConfirmation: {
    confirmed: { type: Boolean, default: false },
    confirmedAt: Date,
    rating: Number,
    feedback: String,
    issues: String
  }
}, {
  timestamps: true
});

// Calculate payout amount before saving
nannyPaymentSchema.pre('save', function(next) {
  if (this.totalAmount && this.commissionRate) {
    this.commissionAmount = Math.round((this.totalAmount * this.commissionRate / 100) * 100) / 100;
    this.payoutAmount = Math.round((this.totalAmount - this.commissionAmount) * 100) / 100;
  }
  next();
});

module.exports = mongoose.model('NannyPayment', nannyPaymentSchema);
