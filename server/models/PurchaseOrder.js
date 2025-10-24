const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, unique: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'confirmed', 'partial_received', 'received', 'cancelled'],
      default: 'draft'
    },
    expectedDate: { type: Date, default: null },
    receivedDate: { type: Date, default: null },
    notes: { type: String, default: '' },
    attachments: [{ url: String, name: String }],
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        receivedQty: { type: Number, default: 0, min: 0 }
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    contractRef: { type: String, default: '' }
  },
  { timestamps: true }
);

purchaseOrderSchema.virtual('subtotal').get(function () {
  return (this.items || []).reduce((sum, it) => sum + (Number(it.unitPrice) * Number(it.quantity)), 0);
});

purchaseOrderSchema.virtual('received').get(function () {
  const totals = (this.items || []).reduce((acc, it) => {
    acc.qty += Number(it.quantity || 0);
    acc.recv += Number(it.receivedQty || 0);
    return acc;
  }, { qty: 0, recv: 0 });
  return { totalQty: totals.qty, totalReceived: totals.recv };
});

purchaseOrderSchema.pre('save', async function(next) {
  if (!this.poNumber) {
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    this.poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
