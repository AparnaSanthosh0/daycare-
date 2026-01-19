const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  // Commission settings
  commission: {
    vendor: {
      defaultRate: {
        type: Number,
        default: 15 // 15%
      },
      minimumRate: {
        type: Number,
        default: 5
      },
      maximumRate: {
        type: Number,
        default: 30
      },
      categoryRates: {
        type: Map,
        of: Number,
        default: {
          'Baby Food': 12,
          'Diapers': 10,
          'Toys': 18,
          'Clothing': 15,
          'Medicine': 8
        }
      }
    },
    delivery: {
      platformShare: {
        type: Number,
        default: 20 // 20%
      },
      agentShare: {
        type: Number,
        default: 80 // 80%
      },
      bonuses: {
        onTimeDelivery: { type: Number, default: 5 },
        highRating: { type: Number, default: 10 },
        peakHourMultiplier: { type: Number, default: 1.5 }
      },
      penalties: {
        lateDelivery: { type: Number, default: 10 },
        customerComplaint: { type: Number, default: 20 },
        orderCancellation: { type: Number, default: 50 }
      }
    }
  },

  // Delivery fee structure
  deliveryFees: {
    baseCalculation: {
      type: String,
      enum: ['fixed', 'distance-based'],
      default: 'fixed'
    },
    baseFee: {
      type: Number,
      default: 30
    },
    perKmCharge: {
      type: Number,
      default: 5
    },
    freeDeliveryAbove: {
      type: Number,
      default: 500
    },
    surgePricing: {
      enabled: { type: Boolean, default: true },
      peakHours: [{
        start: String,
        end: String
      }],
      surgeMultiplier: { type: Number, default: 1.5 }
    },
    multiVendorStrategy: {
      type: String,
      enum: ['split', 'single', 'per-vendor'],
      default: 'split'
    },
    consolidationDiscount: {
      type: Number,
      default: 10
    }
  },

  // Delivery zones
  zones: [{
    name: String,
    zipCodes: [String],
    coverage: String,
    baseDeliveryTime: Number, // minutes
    active: { type: Boolean, default: true }
  }],

  // Auto-assignment settings
  autoAssignment: {
    enabled: {
      type: Boolean,
      default: false // Start with manual, enable later
    },
    algorithm: {
      type: String,
      enum: ['nearest', 'load-balanced', 'zone-based-smart'],
      default: 'zone-based-smart'
    },
    weights: {
      distance: { type: Number, default: 30 },
      workload: { type: Number, default: 40 },
      rating: { type: Number, default: 20 },
      successRate: { type: Number, default: 10 }
    },
    assignmentTimeout: {
      type: Number,
      default: 300 // 5 minutes
    },
    reassignmentAttempts: {
      type: Number,
      default: 3
    },
    fallbackToManual: {
      type: Boolean,
      default: true
    },
    notifyAdminAfter: {
      type: Number,
      default: 600 // 10 minutes
    }
  },

  // Payout settings
  payouts: {
    vendors: {
      schedule: {
        type: String,
        enum: ['weekly', 'bi-weekly', 'monthly'],
        default: 'weekly'
      },
      payoutDay: {
        type: String,
        default: 'Friday'
      },
      holdingPeriod: {
        type: Number,
        default: 7 // days
      },
      minimumPayout: {
        type: Number,
        default: 500
      },
      processingTime: {
        type: String,
        default: '1-2 business days'
      }
    },
    agents: {
      schedule: {
        type: String,
        enum: ['instant', 'daily', 'weekly'],
        default: 'instant'
      },
      minimumWithdrawal: {
        type: Number,
        default: 100
      },
      dailyWithdrawalLimit: {
        type: Number,
        default: 5000
      },
      processingTime: {
        type: String,
        default: '24-48 hours'
      }
    }
  },

  // Payment gateway
  paymentGateway: {
    provider: {
      type: String,
      enum: ['razorpay', 'stripe', 'paytm'],
      default: 'razorpay'
    },
    merchantId: String,
    apiKey: String,
    webhookSecret: String,
    fee: {
      type: Number,
      default: 2.5 // 2.5%
    },
    feeAbsorbedBy: {
      type: String,
      enum: ['platform', 'customer', 'vendor'],
      default: 'platform'
    }
  },

  // Notifications
  notifications: {
    sms: {
      enabled: { type: Boolean, default: false },
      provider: String
    },
    email: {
      enabled: { type: Boolean, default: true },
      provider: String
    },
    push: {
      enabled: { type: Boolean, default: true },
      provider: String
    }
  },

  // Meta
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true });

// Create default settings if none exist
platformSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      zones: [
        {
          name: 'Downtown',
          zipCodes: ['10001', '10002', '10003'],
          coverage: 'City center, 5km radius',
          baseDeliveryTime: 30,
          active: true
        },
        {
          name: 'North Zone',
          zipCodes: ['10010', '10011', '10012'],
          coverage: 'North suburbs, 8km radius',
          baseDeliveryTime: 45,
          active: true
        },
        {
          name: 'South Zone',
          zipCodes: ['10020', '10021', '10022'],
          coverage: 'South suburbs, 8km radius',
          baseDeliveryTime: 45,
          active: true
        },
        {
          name: 'East Zone',
          zipCodes: ['10030', '10031', '10032'],
          coverage: 'East suburbs, 10km radius',
          baseDeliveryTime: 50,
          active: true
        },
        {
          name: 'West Zone',
          zipCodes: ['10040', '10041', '10042'],
          coverage: 'West suburbs, 10km radius',
          baseDeliveryTime: 50,
          active: true
        }
      ],
      'deliveryFees.surgePricing.peakHours': [
        { start: '12:00', end: '14:00' },
        { start: '19:00', end: '21:00' }
      ]
    });
    console.log('✅ Created default platform settings');
  }
  return settings;
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
