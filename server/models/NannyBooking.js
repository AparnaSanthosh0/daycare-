const mongoose = require('mongoose');

const nannyBookingSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentName: String,
  parentPhone: String,
  parentAddress: String,
  
  nanny: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  nannyName: String,
  
  child: {
    name: { type: String, required: true },
    age: Number,
    specialNeeds: String,
    allergies: String,
    medicalInfo: String
  },
  
  serviceDate: {
    type: Date,
    required: true
  },
  
  startTime: {
    type: String,
    required: true
  },
  
  endTime: {
    type: String,
    required: true
  },
  
  hours: {
    type: Number,
    required: true
  },
  
  hourlyRate: {
    type: Number,
    default: 15
  },
  
  totalAmount: Number,
  
  // Service Type & Category
  serviceType: {
    type: String,
    enum: [
      'regular-care',           // Daily/Weekly/Monthly
      'educational',            // Educational & Development Support
      'health-safety',          // Health & Safety Support
      'short-term',             // Short-Term / On-Demand
      'after-school',           // After-School Services
      'subscription'            // Subscription-Based Plans
    ],
    default: 'regular-care'
  },
  serviceCategory: {
    type: String,
    enum: [
      // Regular Care
      'full-day-care',
      'part-time-supervision',
      'feeding-meal-assistance',
      'bathing-hygiene',
      'sleep-routine',
      'playtime-engagement',
      // Educational
      'homework-assistance',
      'reading-storytelling',
      'activity-learning',
      'language-practice',
      'motor-skills',
      // Health & Safety
      'first-aid',
      'medication-reminders',
      'health-monitoring',
      'emergency-support',
      // Short-Term
      'babysitting-hours',
      'emergency-care',
      'weekend-care',
      'holiday-care',
      // After-School
      'school-pickup',
      'homework-supervision',
      'evening-care'
    ]
  },
  
  // Subscription Plan (if serviceType is 'subscription')
  subscriptionPlan: {
    planType: {
      type: String,
      enum: ['weekly', 'monthly', 'custom']
    },
    fixedHours: Number,
    fixedNanny: { type: Boolean, default: true },
    discountPercentage: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    recurring: { type: Boolean, default: false }
  },
  
  status: {
    type: String,
    enum: ['pending', 'admin-approved', 'accepted', 'rejected', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Payment & Escrow System
  payment: {
    status: {
      type: String,
      enum: ['pending', 'paid', 'payment_held', 'parent_confirmed', 'admin_approved', 'paid_to_nanny'],
      default: 'pending'
    },
    amount: Number,                    // Total amount paid by parent
    commissionRate: { type: Number, default: 10 }, // Platform commission percentage
    commissionAmount: Number,          // Calculated commission
    nannyPayoutAmount: Number,        // Amount to be paid to nanny
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'upi', 'wallet', 'cash']
    },
    paymentId: String,                 // Payment gateway transaction ID
    paidAt: Date,                      // When parent paid
    heldAt: Date,                      // When payment was held by admin
    parentConfirmedAt: Date,          // When parent confirmed service completion
    adminApprovedAt: Date,            // When admin approved payout
    paidToNannyAt: Date,              // When nanny received payment
    payoutMethod: String,             // How nanny will receive payment
    payoutDetails: {                  // Nanny payment details
      bankAccount: String,
      ifscCode: String,
      upiId: String,
      walletId: String
    },
    parentConfirmation: {
      confirmed: { type: Boolean, default: false },
      confirmedAt: Date,
      rating: Number,
      feedback: String,
      issues: String                  // Any complaints/issues
    }
  },
  
  parentInstructions: String,
  safetyGuidelines: String,
  
  // Service tracking
  actualStartTime: Date,
  actualEndTime: Date,
  actualHours: Number,
  
  // Service notes and updates
  serviceNotes: [{
    note: String,
    timestamp: { type: Date, default: Date.now },
    addedBy: String
  }],
  
  activityUpdates: [{
    activity: String,
    timestamp: { type: Date, default: Date.now },
    photos: [String]
  }],
  
  // Rating and review
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: String,
  reviewDate: Date,
  
  // Communication
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
  
  // Emergency contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  
  cancellationReason: String,
  cancelledBy: String,
  cancelledAt: Date
}, {
  timestamps: true
});

// Calculate total amount before saving
nannyBookingSchema.pre('save', function(next) {
  if (this.hours && this.hourlyRate) {
    this.totalAmount = this.hours * this.hourlyRate;
  }
  
  if (this.actualStartTime && this.actualEndTime) {
    const diffMs = this.actualEndTime - this.actualStartTime;
    this.actualHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    if (this.hourlyRate) {
      this.totalAmount = this.actualHours * this.hourlyRate;
    }
  }
  
  next();
});

module.exports = mongoose.model('NannyBooking', nannyBookingSchema);
