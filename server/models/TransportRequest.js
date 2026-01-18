const mongoose = require('mongoose');

const transportRequestSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  childName: {
    type: String,
    required: true
  },
  parentName: {
    type: String,
    required: true
  },
  pickupAddress: {
    type: String,
    required: true,
    trim: true
  },
  pickupTime: {
    type: String,
    required: true
  },
  dropoffTime: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  specialInstructions: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'on-hold'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewDate: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  assignedRoute: {
    type: String
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  monthlyFee: {
    type: Number,
    default: 50
  },
  startDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
transportRequestSchema.index({ status: 1, requestDate: -1 });
transportRequestSchema.index({ parentId: 1, childId: 1 });

module.exports = mongoose.model('TransportRequest', transportRequestSchema);
