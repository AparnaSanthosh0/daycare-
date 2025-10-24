const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const User = require('../models/User');

// Submit a review (customer)
router.post('/', auth, async (req, res) => {
  try {
    const { productId, rating, title, review, productName } = req.body;

    if (!productId || !rating || !review) {
      return res.status(400).json({ message: 'Product ID, rating, and review are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const customerId = req.user.customerId || req.user.userId;

    // Check if customer has purchased this product
    const hasPurchased = await Order.findOne({
      customer: customerId,
      'items.product': productId,
      status: { $in: ['delivered', 'completed'] }
    });

    if (!hasPurchased) {
      return res.status(400).json({ message: 'You can only review products you have purchased' });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      customer: customerId,
      product: productId
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Get product and vendor info
    const product = await Product.findById(productId).populate('vendor');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create review
    const newReview = new Review({
      customer: customerId,
      product: productId,
      vendor: product.vendor?._id,
      order: hasPurchased._id,
      rating,
      title,
      review: review.trim(),
      status: 'pending' // Admin needs to approve
    });

    await newReview.save();

    // Update order to mark as reviewed
    await Order.findByIdAndUpdate(hasPurchased._id, {
      $set: { reviewable: false, reviewedAt: new Date() }
    });

    // Send notification to admin and vendor
    try {
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        // TODO: Send notification email to admin
        console.log(`New review submitted for product ${productName} - notify admin ${admin.email}`);
      }

      if (product.vendor) {
        // TODO: Send notification email to vendor
        console.log(`New review submitted for product ${productName} - notify vendor ${product.vendor.email}`);
      }
    } catch (notificationError) {
      console.warn('Review notification failed:', notificationError.message);
    }

    res.status(201).json({
      message: 'Review submitted successfully! It will be visible after admin approval.',
      review: newReview
    });

  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ message: 'Server error submitting review' });
  }
});

// Get reviews for a product (public)
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({
      product: productId,
      status: 'approved',
      isPublic: true
    })
    .populate('customer', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Review.countDocuments({
      product: productId,
      status: 'approved',
      isPublic: true
    });

    // Calculate average rating
    const ratingStats = await Review.aggregate([
      { $match: { product: productId, status: 'approved', isPublic: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      ratingStats: ratingStats[0] || { averageRating: 0, totalReviews: 0, ratingDistribution: [] }
    });

  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer reviews
router.get('/customer', auth, async (req, res) => {
  try {
    const customerId = req.user.customerId || req.user.userId;
    const reviews = await Review.find({ customer: customerId })
      .populate('product', 'name image')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Get customer reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all reviews for approval
router.get('/admin/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const reviews = await Review.find({ status: 'pending' })
      .populate('customer', 'firstName lastName email')
      .populate('product', 'name image')
      .populate('vendor', 'name email')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Approve/reject review
router.put('/admin/:reviewId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, adminNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      {
        status,
        approvedBy: req.user.userId,
        approvedAt: new Date(),
        adminNotes,
        isPublic: status === 'approved'
      },
      { new: true }
    ).populate('customer', 'firstName lastName email')
     .populate('product', 'name')
     .populate('vendor', 'name email');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Notify customer about review status
    try {
      // TODO: Send email notification to customer
      console.log(`Review ${status} for customer ${review.customer.email}`);
    } catch (e) {
      console.warn('Review status notification failed:', e.message);
    }

    res.json(review);
  } catch (error) {
    console.error('Update review status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Vendor: Get reviews for vendor's products
router.get('/vendor', auth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const vendorId = req.user.vendorId || req.user.userId;
    const reviews = await Review.find({ vendor: vendorId })
      .populate('customer', 'firstName lastName email')
      .populate('product', 'name image')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Get vendor reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Vendor: Respond to review
router.put('/vendor/:reviewId/respond', auth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { response } = req.body;
    if (!response || !response.trim()) {
      return res.status(400).json({ message: 'Response is required' });
    }

    const vendorId = req.user.vendorId || req.user.userId;
    const review = await Review.findOneAndUpdate(
      { _id: req.params.reviewId, vendor: vendorId },
      {
        vendorResponse: response.trim(),
        vendorResponseAt: new Date()
      },
      { new: true }
    ).populate('customer', 'firstName lastName email');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Notify customer about vendor response
    try {
      // TODO: Send email notification to customer
      console.log(`Vendor responded to review from ${review.customer.email}`);
    } catch (e) {
      console.warn('Vendor response notification failed:', e.message);
    }

    res.json(review);
  } catch (error) {
    console.error('Vendor respond to review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
