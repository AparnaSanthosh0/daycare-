const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  orderNumber: { type: String, unique: true, required: false },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Made optional for test orders
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    name: String,
    image: String,
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' } // Vendor for this specific item
  }],
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  subtotal: { type: Number, required: true },
  shipping: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: { type: String, enum: ['card', 'paypal', 'cash_on_delivery', 'upi', 'netbanking', 'online'] },
  paymentId: String, // Razorpay payment ID for successful payments
  trackingNumber: String,
  notes: String,

  // Order flow tracking
  assignedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }], // Vendors assigned to fulfill this order
  vendorConfirmations: [{
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    status: { type: String, enum: ['pending', 'confirmed', 'rejected'] },
    confirmedAt: Date,
    notes: String
  }],

  // Admin management
  adminConfirmed: { type: Boolean, default: false },
  adminConfirmedAt: Date,
  adminConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Vendor fulfillment
  vendorPaid: { type: Boolean, default: false },
  vendorPaidAt: Date,
  vendorPaymentAmount: Number,

  // Customer communication
  customerNotified: { type: Boolean, default: false },
  estimatedDelivery: Date,

  // Reviews (for completed orders)
  reviewable: { type: Boolean, default: false },
  reviewedAt: Date
}, { timestamps: true });

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    try {
      const count = await mongoose.model('Order').countDocuments();
      this.orderNumber = `TT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
      console.log(`📝 Generated order number: ${this.orderNumber}`);
    } catch (error) {
      console.error('❌ Error generating order number:', error);
      this.orderNumber = `TT-${new Date().getFullYear()}-${Date.now()}`;
    }
  }
  next();
});

// Index for efficient queries
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ 'vendorConfirmations.vendor': 1, 'vendorConfirmations.status': 1 });
orderSchema.index({ status: 1, adminConfirmed: 1 });

module.exports = mongoose.model('Order', orderSchema);
