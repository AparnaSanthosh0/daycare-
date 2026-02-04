const mongoose = require('mongoose');

const doctorPaymentSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  totalAmount: { type: Number, required: true },
  commissionRate: { type: Number, default: 10 },
  commissionAmount: { type: Number, required: true },
  payoutAmount: { type: Number, required: true },

  status: {
    type: String,
    enum: ['pending', 'payment_held', 'parent_confirmed', 'admin_approved', 'paid', 'failed'],
    default: 'pending'
  },

  paymentId: String, // Razorpay payment ID
  paymentReceivedAt: Date,
  paymentHeldAt: Date,
  parentConfirmedAt: Date,
  adminApprovedAt: Date,
  paidAt: Date,

  payoutMethod: { type: String, enum: ['bank_transfer', 'upi', 'wallet'], default: 'bank_transfer' },
  payoutDetails: {
    bankAccount: String,
    ifscCode: String,
    upiId: String,
    walletId: String
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  payoutTransactionId: String,
  payoutNotes: String,

  parentConfirmation: {
    confirmed: { type: Boolean, default: false },
    confirmedAt: Date,
    rating: Number,
    feedback: String,
    issues: String
  }
}, { timestamps: true });

doctorPaymentSchema.pre('save', function(next) {
  if (this.totalAmount && this.commissionRate && !this.commissionAmount) {
    this.commissionAmount = Math.round((this.totalAmount * this.commissionRate / 100) * 100) / 100;
    this.payoutAmount = Math.round((this.totalAmount - this.commissionAmount) * 100) / 100;
  }
  next();
});

module.exports = mongoose.model('DoctorPayment', doctorPaymentSchema);
