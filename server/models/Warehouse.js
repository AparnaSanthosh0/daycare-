const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, unique: true },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    contact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Warehouse', warehouseSchema);