const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    batchNo: { type: String, default: '' },
    type: { type: String, enum: ['IN', 'OUT', 'ADJUST'], required: true },
    quantity: { type: Number, required: true, min: 0 },
    reference: { type: String, default: '' }, // PO#, SO#, Return#, etc.
    note: { type: String, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockMovement', stockMovementSchema);