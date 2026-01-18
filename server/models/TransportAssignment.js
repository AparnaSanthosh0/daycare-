const mongoose = require('mongoose');

const transportAssignmentSchema = new mongoose.Schema({
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
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransportRequest',
    required: true
  },
  childName: {
    type: String,
    required: true
  },
  routeName: {
    type: String,
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverName: {
    type: String,
    required: true
  },
  driverPhone: {
    type: String,
    required: true
  },
  vehicleNumber: {
    type: String,
    required: true
  },
  pickupAddress: {
    type: String,
    required: true
  },
  pickupTime: {
    type: String,
    required: true
  },
  dropoffTime: {
    type: String,
    required: true
  },
  monthlyFee: {
    type: Number,
    required: true,
    default: 50
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'overdue'],
    default: 'pending'
  },
  lastPaymentDate: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
transportAssignmentSchema.index({ childId: 1, status: 1 });
transportAssignmentSchema.index({ driverId: 1, status: 1 });
transportAssignmentSchema.index({ status: 1 });

module.exports = mongoose.model('TransportAssignment', transportAssignmentSchema);
