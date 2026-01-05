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
  
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
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
