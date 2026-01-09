const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    visitorName: {
      type: String,
      required: true,
      trim: true
    },
    purpose: {
      type: String,
      required: true,
      enum: [
        'Parent Meeting',
        'Delivery',
        'Maintenance',
        'Inspection',
        'Guest Speaker',
        'Authorized Pickup',
        'Interview',
        'Tour',
        'Other'
      ]
    },
    purposeDetails: {
      type: String,
      trim: true
    },
    contactNumber: {
      type: String,
      trim: true
    },
    idProofType: {
      type: String,
      enum: ['Aadhar', 'Passport', 'Driving License', 'Voter ID', 'Other', ''],
      default: ''
    },
    idProofNumber: {
      type: String,
      trim: true
    },
    checkInTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    checkOutTime: {
      type: Date,
      default: null
    },
    staffName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    relatedChild: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      default: null
    },
    authorizedPickup: {
      type: Boolean,
      default: false
    },
    pickupVerified: {
      type: Boolean,
      default: false
    },
    verificationNotes: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['checked-in', 'checked-out'],
      default: 'checked-in'
    },
    photoUrl: {
      type: String,
      default: ''
    },
    temperature: {
      type: Number,
      default: null
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
visitorSchema.index({ checkInTime: -1 });
visitorSchema.index({ staffName: 1 });
visitorSchema.index({ status: 1 });

module.exports = mongoose.model('Visitor', visitorSchema);
