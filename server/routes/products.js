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
      stockQty: req.body.stockQty ?? 0,
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

module.exports = router;