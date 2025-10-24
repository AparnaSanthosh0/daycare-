const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['card', 'upi', 'bank_transfer', 'cash', 'paypal', 'other'], default: 'other' },
    reference: { type: String, default: '' },
    paidAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const adjustmentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['refund', 'credit', 'debit'], required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '' },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    number: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    type: { type: String, enum: ['sale', 'subscription', 'purchase', 'service'], default: 'sale' },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        description: { type: String, default: '' },
        quantity: { type: Number, default: 1, min: 0 },
        unitPrice: { type: Number, default: 0, min: 0 }
      }
    ],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'issued', 'paid', 'overdue', 'void', 'refunded'], default: 'draft' },
    dueDate: { type: Date, default: null },
    payments: [paymentSchema],
    adjustments: [adjustmentSchema],
    referenceType: { type: String, enum: ['Order', 'PurchaseOrder', 'Subscription', 'Manual', null], default: null },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

invoiceSchema.pre('save', async function(next) {
  if (!this.number) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  // compute totals if items set
  if (Array.isArray(this.items) && this.items.length) {
    const subtotal = this.items.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0);
    this.subtotal = subtotal;
    if (this.total === 0 || this.total === null || this.total === undefined) {
      this.total = subtotal + Number(this.tax || 0);
    }
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
