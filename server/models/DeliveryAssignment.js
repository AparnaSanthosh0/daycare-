const mongoose = require('mongoose');

const deliveryAssignmentSchema = new mongoose.Schema({
  // Links
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  deliveryAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },

  // Items in this delivery
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    quantity: Number,
    price: Number,
    image: String
  }],

  // Pickup location (vendor)
  pickupLocation: {
    vendorName: String,
    address: String,
    city: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    zone: String,
    contactPerson: String,
    contactPhone: String
  },

  // Delivery location (customer)
  deliveryLocation: {
    address: String,
    city: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    zone: String,
    customerName: String,
    customerPhone: String,
    deliveryInstructions: String
  },

  // Assignment details
  assignmentType: {
    type: String,
    enum: ['auto', 'manual', 'reassigned'],
    default: 'manual'
  },
  assignmentScore: Number,
  assignmentReason: String,
  assignmentAttempts: {
    type: Number,
    default: 0
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'assigned', 'accepted', 'rejected', 'picked_up', 'in_transit', 'delivered', 'failed'],
    default: 'pending'
  },

  // Agent response
  agentResponse: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  rejectionReason: String,
  responseDeadline: Date,

  // Financial
  deliveryFee: Number,
  platformShare: Number,
  agentShare: Number,
  agentEarnings: Number,

  // Distance & time
  estimatedDistance: Number,
  estimatedDuration: Number,
  actualDistance: Number,
  actualDuration: Number,

  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  scheduledPickupTime: Date,
  estimatedDeliveryTime: Date,

  // Timestamps
  assignedAt: Date,
  acceptedAt: Date,
  pickedUpAt: Date,
  inTransitAt: Date,
  deliveredAt: Date,

  // Verification
  pickupVerification: {
    verificationCode: String,
    vendorSignature: String,
    timestamp: Date,
    photo: String
  },

  deliveryVerification: {
    method: String, // 'signature', 'otp', 'photo'
    customerSignature: String,
    otp: String,
    photo: String,
    timestamp: Date
  },

  // GPS tracking
  currentLocation: {
    coordinates: {
      lat: Number,
      lng: Number
    },
    updatedAt: Date
  },

  // Notes
  notes: String,
  issues: String,
  customerFeedback: String,
  customerRating: Number

}, { timestamps: true });

// Indexes for performance
deliveryAssignmentSchema.index({ order: 1, vendor: 1 });
deliveryAssignmentSchema.index({ deliveryAgent: 1, status: 1 });
deliveryAssignmentSchema.index({ status: 1, createdAt: -1 });
deliveryAssignmentSchema.index({ 'deliveryLocation.zone': 1, status: 1 });

module.exports = mongoose.model('DeliveryAssignment', deliveryAssignmentSchema);
