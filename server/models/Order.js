const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  orderNumber: { type: String, unique: true, required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    name: String,
    image: String
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
  paymentMethod: { type: String, enum: ['card', 'paypal', 'cash_on_delivery'] },
  trackingNumber: String,
  notes: String,
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }
}, { timestamps: true });

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `TT-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
