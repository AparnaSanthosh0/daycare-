const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, default: 'General', trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: null, min: 0 },
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
    isNew: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Optional size options (e.g., S, M, L or 200ml, 500ml)
    sizes: [{ type: String, trim: true }],

    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);