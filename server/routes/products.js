const express = require('express');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// Ensure upload directory exists: server/uploads/products
const uploadsRoot = path.join(__dirname, '..', 'uploads');
const productUploadsDir = path.join(uploadsRoot, 'products');
fs.mkdirSync(productUploadsDir, { recursive: true });

// Multer storage for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, productUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

// Public: list active products with filters, sorting, and pagination
router.get('/', async (req, res) => {
  const {
    q,
    category,
    sizes,          // comma separated string or array
    inStock,        // 'true' | 'false'
    minPrice,       // number
    maxPrice,       // number
    sort = 'newest',// newest | price_asc | price_desc | rating_desc | rating_asc
    page = 1,
    limit = 20,
    all
  } = req.query || {};

  const filter = {};
  const listAll = String(all).toLowerCase() === 'true';
  if (!listAll) {
    filter.isActive = true;
  }
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ];
  }
  if (category) {
    filter.category = { $regex: String(category), $options: 'i' };
  }
  if (inStock !== undefined) {
    if (inStock === 'true' || inStock === true) filter.inStock = true;
    if (inStock === 'false' || inStock === false) filter.inStock = false;
  }
  const priceFilter = {};
  if (minPrice !== undefined) priceFilter.$gte = Number(minPrice);
  if (maxPrice !== undefined) priceFilter.$lte = Number(maxPrice);
  if (Object.keys(priceFilter).length) filter.price = priceFilter;

  // sizes can be array or comma-separated string
  let sizeList = [];
  if (Array.isArray(sizes)) sizeList = sizes;
  else if (typeof sizes === 'string' && sizes.trim()) sizeList = sizes.split(',').map(s => s.trim()).filter(Boolean);
  if (sizeList.length) {
    filter.sizes = { $in: sizeList };
  }

  // Sorting map
  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating_desc: { rating: -1 },
    rating_asc: { rating: 1 },
  };
  const sortSpec = sortMap[String(sort)] || sortMap.newest;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(60, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  if (listAll) {
    // Return all matching products without pagination
    const products = await Product.find(filter).sort(sortSpec);
    res.json({
      products,
      total: products.length,
      page: 1,
      pages: 1,
      limit: products.length,
    });
    return;
  }

  // Paginated response when not listing all
  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort(sortSpec).skip(skip).limit(limitNum)
  ]);

  res.json({
    products,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    limit: limitNum,
  });
});

// Public: get distinct active categories
router.get('/categories/list', async (req, res) => {
  const categories = await Product.distinct('category', { isActive: true });
  res.json({ categories: categories.sort() });
});

// Vendor: upload a product image -> returns URL under /uploads/products
router.post('/upload', auth, authorize('vendor', 'admin'), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  const url = `/uploads/products/${req.file.filename}`;
  const absoluteUrl = `${req.protocol}://${req.get('host')}${url}`;
  res.status(201).json({ message: 'Uploaded', url, absoluteUrl });
});

// Vendor: create product
router.post(
  '/',
  auth,
  authorize('vendor', 'admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be > 0'),
    body('category').optional().isString(),
    body('description').optional().isString(),
    body('image').optional().isString(),
    body('sizes').optional(),
    body('imageFit').optional().isIn(['cover', 'contain', 'fill', 'scale-down', 'none']),
    body('imageFocalX').optional().isInt({ min: 0, max: 100 }),
    body('imageFocalY').optional().isInt({ min: 0, max: 100 }),
    body('inStock').optional().isBoolean(),
    body('stockQty').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Ensure a vendor exists and is approved
    const vendor = await Vendor.findOne({ status: 'approved' });
    if (!vendor) return res.status(400).json({ message: 'No approved vendor configured' });

    const stockQty = req.body.stockQty ?? 0;
    const payload = {
      name: req.body.name,
      price: req.body.price,
      category: req.body.category || 'General',
      description: req.body.description || '',
      image: req.body.image || null,
      images: Array.isArray(req.body.images) ? req.body.images : [],
      imageFit: req.body.imageFit || 'cover',
      imageFocalX: req.body.imageFocalX ?? 50,
      imageFocalY: req.body.imageFocalY ?? 50,
      inStock: req.body.inStock !== undefined ? !!req.body.inStock : true,
      stockQty: stockQty,
      originalStockQty: stockQty, // Track original stock set by vendor
      vendorStockUpdates: [{
        updatedAt: new Date(),
        previousStock: 0,
        newStock: stockQty,
        updatedBy: vendor._id,
        reason: 'Initial stock upload'
      }],
      isNew: !!req.body.isNew,
      isBestseller: !!req.body.isBestseller,
      isActive: req.body.isActive !== undefined ? !!req.body.isActive : true,
      vendor: vendor._id,
    };

    // Parse sizes from array or comma-separated string
    const rawSizes = req.body.sizes;
    if (Array.isArray(rawSizes)) {
      payload.sizes = rawSizes.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof rawSizes === 'string') {
      payload.sizes = rawSizes.split(',').map(s => s.trim()).filter(Boolean);
    }

    const product = await Product.create(payload);
    res.status(201).json({ message: 'Product created', product });
  }
);

// Vendor: Suggest a discount (creates a pending discount request)
router.post('/:id/suggest-discount',
  auth,
  authorize('vendor', 'admin'),
  [
    body('discount').isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
    body('reason').optional().isString(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });

      // Check if vendor owns this product
      // Allow all vendors to suggest discounts (vendor ownership is optional)
      // Admins can always suggest discounts for any product
      
      // Optional: If you want to enforce vendor ownership, uncomment this:
      /*
      if (req.user.role === 'vendor' && product.vendor) {
        const productVendorId = product.vendor.toString();
        const userVendorId = req.user.vendorId?.toString();
        
        if (productVendorId !== userVendorId) {
          return res.status(403).json({ message: 'Access denied. You can only suggest discounts for your own products.' });
        }
      }
      */

      const { discount, reason = '', startDate, endDate } = req.body;
      
      // Update product with suggested discount
      product.suggestedDiscount = discount;
      product.discountReason = reason;
      product.discountStatus = 'suggested';
      product.suggestedBy = req.user.vendorId || product.vendor;
      
      if (startDate) product.discountStartDate = new Date(startDate);
      if (endDate) product.discountEndDate = new Date(endDate);
      
      // Populate suggestedBy
      await product.save();
      await product.populate('suggestedBy', 'vendorName companyName email');

      res.json({
        message: 'Discount suggestion submitted for admin approval',
        product: {
          _id: product._id,
          name: product.name,
          suggestedDiscount: product.suggestedDiscount,
          discountStatus: product.discountStatus,
          suggestedBy: product.suggestedBy
        }
      });
    } catch (error) {
      console.error('Error suggesting discount:', error);
      res.status(500).json({ message: 'Error suggesting discount', error: error.message });
    }
  }
);

// Vendor: update product
router.put(
  '/:id',
  auth,
  authorize('vendor', 'admin'),
  [
    body('name').optional().trim().notEmpty(),
    body('price').optional().isFloat({ gt: 0 }),
    body('category').optional().isString(),
    body('description').optional().isString(),
    body('image').optional().isString(),
    body('sizes').optional(),
    body('imageFit').optional().isIn(['cover', 'contain', 'fill', 'scale-down', 'none']),
    body('imageFocalX').optional().isInt({ min: 0, max: 100 }),
    body('imageFocalY').optional().isInt({ min: 0, max: 100 }),
    body('inStock').optional().isBoolean(),
    body('stockQty').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res) => {
    const updates = { ...req.body };
    if (updates.sizes !== undefined) {
      const rs = updates.sizes;
      if (Array.isArray(rs)) {
        updates.sizes = rs.map(s => String(s).trim()).filter(Boolean);
      } else if (typeof rs === 'string') {
        updates.sizes = rs.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        updates.sizes = [];
      }
    }
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product updated', product });
  }
);

// Vendor: delete product
router.delete(
  '/:id',
  auth,
  authorize('vendor', 'admin'),
  async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  }
);

// Vendor: Update product stock
router.patch('/:id/stock', 
  auth,
  authorize('vendor', 'admin'),
  [
    body('stockQty').isInt({ min: 0 }).withMessage('Stock quantity must be >= 0'),
    body('reason').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { stockQty, reason = 'Stock update' } = req.body;
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check if vendor owns this product or user is admin
      if (req.user.role !== 'admin' && product.vendor.toString() !== req.user.vendorId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const previousStock = product.stockQty;
      
      // Update stock and track the change
      product.stockQty = stockQty;
      product.inStock = stockQty > 0;
      
      // Add stock update to history
      product.vendorStockUpdates.push({
        updatedAt: new Date(),
        previousStock: previousStock,
        newStock: stockQty,
        updatedBy: req.user.vendorId || product.vendor,
        reason: reason
      });

      await product.save();
      await product.populate('vendor', 'name email phone');

      res.json({
        message: 'Stock updated successfully',
        product: {
          _id: product._id,
          name: product.name,
          stockQty: product.stockQty,
          originalStockQty: product.originalStockQty,
          inStock: product.inStock,
          vendorStockUpdates: product.vendorStockUpdates.slice(-5) // Last 5 updates
        }
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      res.status(500).json({ message: 'Error updating stock', error: error.message });
    }
  }
);

// Admin: Approve or reject discount
router.post('/:id/discount-approval',
  auth,
  authorize('admin'),
  [
    body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
    body('reason').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });

      const { action, reason = '' } = req.body;

      if (action === 'approve') {
        product.activeDiscount = product.suggestedDiscount;
        product.discountStatus = 'active';
        product.approvedBy = req.user._id;
        product.approvedAt = new Date();
        
        // If suggested discount is applied, keep dates from suggestion
        if (product.discountStartDate) {
          // Keep the dates as-is
        }
        
        res.json({
          message: 'Discount approved and activated',
          product: await product.populate(['suggestedBy', 'approvedBy'], 'firstName lastName vendorName companyName email')
        });
      } else {
        product.discountStatus = 'rejected';
        product.rejectionReason = reason;
        product.approvedBy = req.user._id;
        product.approvedAt = new Date();
        
        res.json({
          message: 'Discount rejected',
          product: await product.populate(['suggestedBy', 'approvedBy'], 'firstName lastName vendorName companyName email')
        });
      }

      await product.save();
    } catch (error) {
      console.error('Error processing discount approval:', error);
      res.status(500).json({ message: 'Error processing discount approval', error: error.message });
    }
  }
);

// Admin: Apply discount directly (bypass vendor suggestion)
router.post('/:id/apply-discount',
  auth,
  authorize('admin'),
  [
    body('discount').isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
    body('reason').optional().isString(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });

      const { discount, reason = '', startDate, endDate } = req.body;

      product.activeDiscount = discount;
      product.discountStatus = 'active';
      product.discountReason = reason;
      product.approvedBy = req.user._id;
      product.approvedAt = new Date();
      
      if (startDate) product.discountStartDate = new Date(startDate);
      if (endDate) product.discountEndDate = new Date(endDate);

      await product.save();
      
      res.json({
        message: 'Discount applied successfully',
        product: await product.populate('approvedBy', 'firstName lastName email')
      });
    } catch (error) {
      console.error('Error applying discount:', error);
      res.status(500).json({ message: 'Error applying discount', error: error.message });
    }
  }
);

// Admin: Remove discount
router.post('/:id/remove-discount',
  auth,
  authorize('admin'),
  [
    body('reason').optional().isString()
  ],
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });

      const { reason = '' } = req.body;

      product.activeDiscount = 0;
      product.discountStatus = 'none';
      product.discountReason = reason;
      product.approvedBy = req.user._id;
      product.approvedAt = new Date();
      
      // Clear dates
      product.discountStartDate = null;
      product.discountEndDate = null;

      await product.save();
      
      res.json({
        message: 'Discount removed successfully',
        product
      });
    } catch (error) {
      console.error('Error removing discount:', error);
      res.status(500).json({ message: 'Error removing discount', error: error.message });
    }
  }
);

module.exports = router;