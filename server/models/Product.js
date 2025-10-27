const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, default: 'General', trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: null, min: 0 },
    // Discount Management
    suggestedDiscount: { type: Number, default: 0, min: 0, max: 100 }, // Vendor suggested discount percentage
    activeDiscount: { type: Number, default: 0, min: 0, max: 100 }, // Admin approved discount percentage
    discountReason: { type: String, default: '' }, // Reason for discount (optional)
    discountStartDate: { type: Date, default: null }, // When discount starts
    discountEndDate: { type: Date, default: null }, // When discount expires
    discountStatus: { 
      type: String, 
      enum: ['none', 'suggested', 'pending', 'active', 'expired', 'rejected'], 
      default: 'none' 
    }, // Discount status
    suggestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, // Vendor who suggested
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who approved
    approvedAt: { type: Date, default: null }, // When admin approved/rejected
    rejectionReason: { type: String, default: '' }, // Why discount was rejected
    image: { type: String, default: null }, // URL to image
    images: [{ type: String }],
    // Image presentation options
    imageFit: { type: String, enum: ['cover', 'contain', 'fill', 'scale-down', 'none'], default: 'cover' },
    imageFocalX: { type: Number, min: 0, max: 100, default: 50 },
    imageFocalY: { type: Number, min: 0, max: 100, default: 50 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0, min: 0 },
    inStock: { type: Boolean, default: true },
    stockQty: { type: Number, default: 0, min: 0 },
    originalStockQty: { type: Number, default: 0, min: 0 }, // Original stock set by vendor during upload
    vendorStockUpdates: [{ // Track vendor stock updates
      updatedAt: { type: Date, default: Date.now },
      previousStock: { type: Number, min: 0 },
      newStock: { type: Number, min: 0 },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
      reason: { type: String, default: 'Stock update' }
    }],
    isNew: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Optional size options (e.g., S, M, L or 200ml, 500ml)
    sizes: [{ type: String, trim: true }],

    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: false },
  },
  { timestamps: true }
);

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function() {
  if (this.activeDiscount > 0) {
    return Math.round(this.price * (1 - this.activeDiscount / 100) * 100) / 100;
  }
  return this.price;
});

// Virtual for savings amount
productSchema.virtual('savingsAmount').get(function() {
  if (this.activeDiscount > 0) {
    return Math.round((this.price - this.discountedPrice) * 100) / 100;
  }
  return 0;
});

module.exports = mongoose.model('Product', productSchema);