const mongoose = require('mongoose');

const feeAddonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
}, { _id: false });

const feeStructureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  program: {
    type: String,
    enum: ['all', 'toddler', 'preschool', 'prekindergarten'],
    default: 'all',
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'one_time'],
    default: 'monthly',
  },
  baseAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  includedServices: [{
    type: String,
    trim: true,
  }],
  optionalAddons: [feeAddonSchema],
  isPublished: {
    type: Boolean,
    default: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

feeStructureSchema.index({ name: 1, program: 1 }, { unique: true });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
