const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema({
  // Route Information
  routeName: {
    type: String,
    required: true,
    trim: true
  },
  routeType: {
    type: String,
    enum: ['home-to-daycare', 'daycare-to-home', 'school-to-daycare', 'daycare-to-school'],
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    vehicleNumber: { type: String, trim: true },
    vehicleType: { type: String, trim: true },
    capacity: { type: Number, default: 0 }
  },
  
  // Schedule
  schedule: {
    monday: { enabled: Boolean, pickupTime: String, dropoffTime: String },
    tuesday: { enabled: Boolean, pickupTime: String, dropoffTime: String },
    wednesday: { enabled: Boolean, pickupTime: String, dropoffTime: String },
    thursday: { enabled: Boolean, pickupTime: String, dropoffTime: String },
    friday: { enabled: Boolean, pickupTime: String, dropoffTime: String },
    saturday: { enabled: Boolean, pickupTime: String, dropoffTime: String },
    sunday: { enabled: Boolean, pickupTime: String, dropoffTime: String }
  },
  
  // Assigned Children
  assignedChildren: [{
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true
    },
    pickupAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: { lat: Number, lng: Number }
    },
    dropoffAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: { lat: Number, lng: Number }
    },
    authorizedGuardians: [{
      name: String,
      phone: String,
      relationship: String,
      photoId: String
    }],
    isActive: { type: Boolean, default: true }
  }],
  
  // Daily Trip Tracking
  dailyTrips: [{
    date: { type: Date, required: true },
    tripType: {
      type: String,
      enum: ['pickup', 'dropoff'],
      required: true
    },
    scheduledTime: String,
    actualTime: String,
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'delayed', 'cancelled'],
      default: 'scheduled'
    },
    children: [{
      child: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child'
      },
      boardingStatus: {
        type: String,
        enum: ['pending', 'boarded', 'not-boarded', 'otp-verified'],
        default: 'pending'
      },
      boardingTime: Date,
      boardingOTP: String,
      boardingOTPExpiry: Date,
      boardingVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      deboardingStatus: {
        type: String,
        enum: ['pending', 'deboarded', 'not-deboarded', 'otp-verified'],
        default: 'pending'
      },
      deboardingTime: Date,
      deboardingOTP: String,
      deboardingOTPExpiry: Date,
      deboardingVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      guardianVerified: {
        name: String,
        phone: String,
        verifiedAt: Date
      }
    }],
    gpsLocations: [{
      latitude: Number,
      longitude: Number,
      timestamp: { type: Date, default: Date.now },
      speed: Number,
      heading: Number
    }],
    incidents: [{
      type: {
        type: String,
        enum: ['delay', 'accident', 'breakdown', 'traffic', 'weather', 'other']
      },
      description: String,
      reportedAt: { type: Date, default: Date.now },
      resolved: { type: Boolean, default: false }
    }],
    vehicleIssues: [{
      issueType: String,
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      },
      reportedAt: { type: Date, default: Date.now },
      resolved: { type: Boolean, default: false }
    }],
    notes: String,
    completedAt: Date
  }],
  
  // Vehicle Log
  vehicleLogs: [{
    date: { type: Date, required: true },
    startMileage: Number,
    endMileage: Number,
    fuelLevel: {
      type: String,
      enum: ['full', 'three-quarter', 'half', 'quarter', 'low', 'empty']
    },
    maintenanceIssues: [String],
    driverNotes: String,
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Compliance Reports
  complianceReports: [{
    month: Number,
    year: Number,
    totalTrips: Number,
    onTimeTrips: Number,
    delayedTrips: Number,
    cancelledTrips: Number,
    incidents: Number,
    vehicleIssues: Number,
    averageDelay: Number, // in minutes
    complianceScore: Number, // percentage
    generatedAt: { type: Date, default: Date.now }
  }],
  
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

transportSchema.index({ driver: 1, date: 1 });
transportSchema.index({ 'assignedChildren.child': 1 });

module.exports = mongoose.model('Transport', transportSchema);

