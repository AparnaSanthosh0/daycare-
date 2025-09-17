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

// Public: list active products
router.get('/', async (req, res) => {
  const { q } = req.query || {};
  const filter = { isActive: true };
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ];
  }
  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json({ products });
});

// Vendor: upload a product image -> returns URL under /uploads/products
router.post('/upload', auth, authorize('vendor', 'admin'), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  const url = `/uploads/products/${req.file.filename}`;
  res.status(201).json({ message: 'Uploaded', url });
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
      inStock: req.body.inStock !== undefined ? !!req.body.inStock : true,
      stockQty: req.body.stockQty ?? 0,
      isNew: !!req.body.isNew,
      isBestseller: !!req.body.isBestseller,
      isActive: req.body.isActive !== undefined ? !!req.body.isActive : true,
      vendor: vendor._id,
    };

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
    body('inStock').optional().isBoolean(),
    body('stockQty').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res) => {
    const updates = req.body;
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