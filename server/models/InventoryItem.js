const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    batchNo: { type: String, default: '' },
    expiryDate: { type: Date, default: null },
    quantity: { type: Number, default: 0, min: 0 },
    reorderPoint: { type: Number, default: 0, min: 0 },
    locationCode: { type: String, default: '' }, // aisle/bin or shelf
  },
  { timestamps: true }
);

inventoryItemSchema.index({ product: 1, warehouse: 1, batchNo: 1 }, { unique: false });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);