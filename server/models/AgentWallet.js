const mongoose = require('mongoose');

const agentWalletSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Balance
  currentBalance: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  pendingClearance: {
    type: Number,
    default: 0
  },

  // Transactions
  transactions: [{
    type: {
      type: String,
      enum: ['credit', 'debit', 'withdrawal', 'bonus', 'penalty']
    },
    amount: Number,
    balanceAfter: Number,
    source: mongoose.Schema.Types.ObjectId, // AgentPayout or other
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Withdrawal history
  withdrawals: [{
    amount: Number,
    bankAccount: String,
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    requestedAt: Date,
    completedAt: Date,
    failureReason: String
  }],

  // Limits
  dailyWithdrawalLimit: {
    type: Number,
    default: 5000
  },
  minimumWithdrawalAmount: {
    type: Number,
    default: 100
  },

  // Last updated
  lastUpdated: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

// Update lastUpdated on save
agentWalletSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Indexes
agentWalletSchema.index({ agent: 1 });

module.exports = mongoose.model('AgentWallet', agentWalletSchema);
