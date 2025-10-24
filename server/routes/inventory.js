const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const Warehouse = require('../models/Warehouse');
const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');

const router = express.Router();

// Admin-only Inventory & Warehouse Management
router.use(auth, authorize('admin'));

// Get vendor stock updates and e-commerce product stock
router.get('/vendor-stock', async (req, res) => {
  try {
    const Product = require('../models/Product');
    const Vendor = require('../models/Vendor');
    const StockMovement = require('../models/StockMovement');
    
    // Get all products with vendor information and stock movements
    const products = await Product.find()
      .populate('vendor', 'name email phone')
      .sort({ updatedAt: -1 });

    // Get recent stock movements from vendors
    const recentMovements = await StockMovement.find()
      .populate('product', 'name image')
      .populate('performedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get stock summary by vendor
    const vendorStockSummary = await Product.aggregate([
      {
        $match: { vendor: { $exists: true } }
      },
      {
        $group: {
          _id: '$vendor',
          totalProducts: { $sum: 1 },
          inStockProducts: {
            $sum: { $cond: [{ $eq: ['$inStock', true] }, 1, 0] }
          },
          outOfStockProducts: {
            $sum: { $cond: [{ $eq: ['$inStock', false] }, 1, 0] }
          },
          averagePrice: { $avg: '$price' },
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      {
        $unwind: '$vendorInfo'
      },
      {
        $project: {
          vendorName: '$vendorInfo.name',
          vendorEmail: '$vendorInfo.email',
          totalProducts: 1,
          inStockProducts: 1,
          outOfStockProducts: 1,
          averagePrice: 1,
          totalValue: 1,
          stockHealth: {
            $cond: [
              { $eq: ['$outOfStockProducts', 0] },
              'excellent',
              {
                $cond: [
                  { $lt: ['$outOfStockProducts', { $divide: ['$totalProducts', 4] }] },
                  'good',
                  'needs_attention'
                ]
              }
            ]
          }
        }
      }
    ]);

    // Get detailed product stock with vendor info
    const detailedProducts = await Product.find()
      .populate('vendor', 'name email phone')
      .sort({ updatedAt: -1 });

    res.json({
      products: products.map(p => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        inStock: p.inStock,
        vendor: p.vendor,
        category: p.category,
        updatedAt: p.updatedAt
      })),
      detailedProducts: detailedProducts.map(p => ({
        _id: p._id,
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stockQty,
        originalStock: p.originalStockQty,
        inStock: p.inStock,
        category: p.category,
        image: p.image,
        vendor: p.vendor,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        lastStockUpdate: p.updatedAt,
        stockStatus: p.stockQty > 0 ? (p.stockQty < 10 ? 'low' : 'good') : 'out',
        vendorStockUpdates: p.vendorStockUpdates || [],
        stockChange: p.originalStockQty - p.stockQty, // Positive means stock decreased
        stockChangePercentage: p.originalStockQty > 0 ? 
          Math.round(((p.stockQty - p.originalStockQty) / p.originalStockQty) * 100) : 0
      })),
      recentMovements,
      vendorStockSummary,
      summary: {
        totalProducts: products.length,
        inStockProducts: products.filter(p => p.inStock).length,
        outOfStockProducts: products.filter(p => !p.inStock).length,
        totalVendors: vendorStockSummary.length
      }
    });
  } catch (error) {
    console.error('Error fetching vendor stock:', error);
    res.status(500).json({ message: 'Error fetching vendor stock data', error: error.message });
  }
});

// Warehouses
router.get('/warehouses', async (req, res) => {
  const list = await Warehouse.find({}).sort({ createdAt: -1 });
  res.json({ warehouses: list });
});

router.post('/warehouses',
  body('name').trim().notEmpty(),
  body('code').trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const wh = await Warehouse.create({
      name: req.body.name,
      code: req.body.code,
      address: req.body.address || {},
      contact: req.body.contact || {},
      isActive: req.body.isActive !== undefined ? !!req.body.isActive : true,
    });
    res.status(201).json({ warehouse: wh });
  }
);

router.put('/warehouses/:id', async (req, res) => {
  const wh = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!wh) return res.status(404).json({ message: 'Warehouse not found' });
  res.json({ warehouse: wh });
});

router.delete('/warehouses/:id', async (req, res) => {
  await Warehouse.findByIdAndDelete(req.params.id);
  res.json({ message: 'Warehouse deleted' });
});

// Inventory listing with filters
router.get('/items', async (req, res) => {
  const { productId, warehouseId, lowStock } = req.query || {};
  const filter = {};
  if (productId) filter.product = productId;
  if (warehouseId) filter.warehouse = warehouseId;
  if (lowStock === 'true') filter.$expr = { $lt: ['$quantity', '$reorderPoint'] };

  const items = await InventoryItem.find(filter)
    .populate('product', 'name category price')
    .populate('warehouse', 'name code')
    .sort({ updatedAt: -1 });
  res.json({ items });
});

// Create or update an inventory item (upsert by product+warehouse+batch)
router.post('/items',
  body('product').notEmpty(),
  body('warehouse').notEmpty(),
  body('quantity').isInt({ min: 0 }),
  body('reorderPoint').optional().isInt({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { product, warehouse, batchNo = '', quantity, reorderPoint = 0, expiryDate, locationCode = '' } = req.body;

    const existing = await InventoryItem.findOne({ product, warehouse, batchNo });
    let item;
    if (existing) {
      existing.quantity = quantity;
      existing.reorderPoint = reorderPoint;
      existing.expiryDate = expiryDate || null;
      existing.locationCode = locationCode;
      item = await existing.save();
    } else {
      item = await InventoryItem.create({ product, warehouse, batchNo, quantity, reorderPoint, expiryDate: expiryDate || null, locationCode });
    }

    await StockMovement.create({ product, warehouse, batchNo, type: 'ADJUST', quantity, reference: 'Manual Upsert', performedBy: req.user.userId });

    res.status(201).json({ item });
  }
);

// Adjust stock via movement (IN/OUT)
router.post('/movements',
  body('product').notEmpty(),
  body('warehouse').notEmpty(),
  body('type').isIn(['IN', 'OUT', 'ADJUST']),
  body('quantity').isInt({ gt: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { product, warehouse, batchNo = '', type, quantity, reference = '', note = '' } = req.body;
    let item = await InventoryItem.findOne({ product, warehouse, batchNo });
    if (!item) item = await InventoryItem.create({ product, warehouse, batchNo, quantity: 0 });

    if (type === 'IN') item.quantity += quantity;
    if (type === 'OUT') item.quantity = Math.max(0, item.quantity - quantity);

    await item.save();
    const mv = await StockMovement.create({ product, warehouse, batchNo, type, quantity, reference, note, performedBy: req.user.userId });

    // Auto-alert if this item is now below reorder point
    try {
      if (item.reorderPoint > 0 && item.quantity < item.reorderPoint) {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const { sendMail } = require('../utils/mailer');
        const prod = await Product.findById(product);
        const wh = await Warehouse.findById(warehouse);
        const html = `
          <p>Low stock after movement:</p>
          <p><b>Product:</b> ${prod?.name || product}<br/>
          <b>Warehouse:</b> ${wh?.name || warehouse}<br/>
          <b>Batch:</b> ${batchNo || '-'}<br/>
          <b>Quantity:</b> ${item.quantity}<br/>
          <b>Reorder Point:</b> ${item.reorderPoint}</p>
        `;
        const text = `Low stock after movement: ${prod?.name || product} @ ${wh?.name || warehouse} batch ${batchNo || '-'} => ${item.quantity}/${item.reorderPoint}`;
        await sendMail({ to: adminEmail, subject: 'Low Stock Alert (Movement)', html, text });
      }
    } catch (e) {
      console.warn('Auto low-stock email failed:', e?.message || e);
    }

    res.status(201).json({ movement: mv, item });
  }
);

// Low stock report
router.get('/alerts/low-stock', async (req, res) => {
  const items = await InventoryItem.find({ $expr: { $lt: ['$quantity', '$reorderPoint'] } })
    .populate('product', 'name category')
    .populate('warehouse', 'name code');
  res.json({ items });
});

// Movements list
router.get('/movements', async (req, res) => {
  const { productId, warehouseId } = req.query || {};
  const filter = {};
  if (productId) filter.product = productId;
  if (warehouseId) filter.warehouse = warehouseId;
  const list = await StockMovement.find(filter)
    .populate('product', 'name category')
    .populate('warehouse', 'name code')
    .populate('performedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(500);
  res.json({ movements: list });
});

// Send low-stock email alert (manual trigger now; can be scheduled later)
router.post('/alerts/low-stock/send', async (req, res) => {
  try {
    const items = await InventoryItem.find({ $expr: { $lt: ['$quantity', '$reorderPoint'] } })
      .populate('product', 'name category')
      .populate('warehouse', 'name code');

    if (!items.length) return res.json({ sent: false, message: 'No low-stock items' });

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const htmlRows = items.map(it => `<tr><td>${it.product?.name}</td><td>${it.product?.category || '-'}</td><td>${it.warehouse?.name}</td><td>${it.quantity}</td><td>${it.reorderPoint}</td></tr>`).join('');
    const html = `
      <p>Low-stock items detected:</p>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead><tr><th>Product</th><th>Category</th><th>Warehouse</th><th>Qty</th><th>Reorder</th></tr></thead>
        <tbody>${htmlRows}</tbody>
      </table>
    `;
    const text = items.map(it => `${it.product?.name} @ ${it.warehouse?.name}: ${it.quantity}/${it.reorderPoint}`).join('\n');

    const { sendMail } = require('../utils/mailer');
    await sendMail({ to: adminEmail, subject: 'TinyTots Low Stock Alert', html, text });

    res.json({ sent: true, count: items.length });
  } catch (e) {
    console.error('Low-stock alert email failed:', e);
    res.status(500).json({ sent: false, message: 'Failed to send alert' });
  }
});

module.exports = router;