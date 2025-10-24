const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // Order this review is for
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, // Vendor who supplied the product

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: String,
  review: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // Review status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,

  // Admin/Vendor feedback
  adminNotes: String,
  vendorResponse: String,
  vendorResponseAt: Date,

  // Visibility
  isPublic: { type: Boolean, default: false },
  helpful: { type: Number, default: 0 }, // Number of people who found this helpful

  // Review verification
  verifiedPurchase: { type: Boolean, default: true },
  photos: [String], // URLs to review photos
  video: String
}, { timestamps: true });

// Index for efficient queries
reviewSchema.index({ customer: 1, product: 1 });
reviewSchema.index({ vendor: 1, status: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
