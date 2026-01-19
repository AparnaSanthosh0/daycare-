const mongoose = require('mongoose');

const agentPayoutSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agentName: String,
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryAssignment'
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },

  // Delivery details
  deliveryDate: Date,
  deliveryNumber: String,

  // Earnings breakdown
  grossDeliveryFee: Number,
  platformShare: Number,
  agentShare: Number,

  // Bonuses & penalties
  bonuses: [{
    type: String, // 'on-time', 'rating', 'peak-hour'
    amount: Number,
    reason: String
  }],
  penalties: [{
    type: String, // 'late', 'customer-complaint'
    amount: Number,
    reason: String
  }],
  totalBonus: {
    type: Number,
    default: 0
  },
  totalPenalty: {
    type: Number,
    default: 0
  },

  // Final earnings
  netEarnings: Number,

  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'withdrawn', 'held'],
    default: 'completed'
  },

  paidAt: Date,
  withdrawnAt: Date,

  // Wallet transaction
  walletTransactionId: String,

  // Performance
  deliveryRating: Number,
  deliveryTime: Number, // minutes
  onTimeDelivery: Boolean

}, { timestamps: true });

// Indexes
agentPayoutSchema.index({ agent: 1, status: 1 });
agentPayoutSchema.index({ deliveryDate: -1 });
agentPayoutSchema.index({ assignment: 1 });

module.exports = mongoose.model('AgentPayout', agentPayoutSchema);
