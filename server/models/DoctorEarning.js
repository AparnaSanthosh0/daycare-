const mongoose = require('mongoose');

const doctorEarningSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child'
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  consultationFee: {
    type: Number,
    required: true
  },
  commissionRate: {
    type: Number,
    default: 30 // 30% platform commission, 70% doctor share
  },
  commissionAmount: {
    type: Number,
    required: true
  },
  netEarning: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'credited', 'paid_out', 'on_hold'],
    default: 'credited'
  },
  consultationDate: {
    type: Date,
    required: true
  },
  creditedAt: {
    type: Date,
    default: Date.now
  },
  paidOutAt: {
    type: Date
  },
  payoutTransactionId: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
doctorEarningSchema.index({ doctor: 1, createdAt: -1 });
doctorEarningSchema.index({ appointment: 1 });
doctorEarningSchema.index({ status: 1 });

module.exports = mongoose.model('DoctorEarning', doctorEarningSchema);
