const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const PurchaseOrder = require('../models/PurchaseOrder');
const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');

const router = express.Router();

// Admin-only
router.use(auth, authorize('admin'));

// List POs with filters
router.get('/', async (req, res) => {
  const { status, vendor, warehouse } = req.query || {};
  const q = {};
  if (status) q.status = status;
  if (vendor) q.vendor = vendor;
  if (warehouse) q.warehouse = warehouse;

  const list = await PurchaseOrder.find(q)
    .populate('vendor', 'vendorName companyName email')
    .populate('warehouse', 'name code')
    .populate('items.product', 'name category')
    .sort({ createdAt: -1 });
  res.json({ purchaseOrders: list });
});

// Create PO
router.post(
  '/',
  [
    body('vendor').notEmpty(),
    body('warehouse').notEmpty(),
    body('items').isArray({ min: 1 }),
    body('items.*.product').notEmpty(),
    body('items.*.quantity').isInt({ gt: 0 }),
    body('items.*.unitPrice').isFloat({ gte: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const payload = {
      vendor: req.body.vendor,
      warehouse: req.body.warehouse,
      expectedDate: req.body.expectedDate || null,
      notes: req.body.notes || '',
      items: req.body.items,
      createdBy: req.user.userId,
      status: req.body.status || 'draft',
      contractRef: req.body.contractRef || ''
    };
    const po = await PurchaseOrder.create(payload);
    res.status(201).json({ purchaseOrder: po });
  }
);

// Update PO (only editable in draft/sent)
router.put('/:id', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.status(404).json({ message: 'PO not found' });
  if (!['draft', 'sent'].includes(po.status)) {
    return res.status(400).json({ message: 'Only draft/sent POs can be updated' });
  }

  const fields = ['vendor', 'warehouse', 'expectedDate', 'notes', 'items', 'status', 'contractRef'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) po[f] = req.body[f];
  });
  po.updatedBy = req.user.userId;
  await po.save();
  res.json({ purchaseOrder: po });
});

// Mark PO as sent/confirmed/cancelled
router.post('/:id/transition', async (req, res) => {
  const { status } = req.body || {};
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.status(404).json({ message: 'PO not found' });
  const allowed = ['sent', 'confirmed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status transition' });
  if (po.status === 'received') return res.status(400).json({ message: 'PO already received' });
  po.status = status;
  po.updatedBy = req.user.userId;
  await po.save();
  res.json({ purchaseOrder: po });
});

// Receive items against PO (partial or full)
router.post(
  '/:id/receive',
  [
    body('items').isArray({ min: 1 }),
    body('items.*.product').notEmpty(),
    body('items.*.batchNo').optional().isString(),
    body('items.*.quantity').isInt({ gt: 0 }),
    body('items.*.expiryDate').optional().isISO8601()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'PO not found' });
    if (['cancelled', 'received'].includes(po.status)) return res.status(400).json({ message: `Cannot receive for status ${po.status}` });

    // Update received quantities and create stock IN movements
    for (const rcv of req.body.items) {
      const line = (po.items || []).find((it) => String(it.product) === String(rcv.product));
      if (!line) continue;
      line.receivedQty = Number(line.receivedQty || 0) + Number(rcv.quantity);

      // Upsert inventory and create movement
      let item = await InventoryItem.findOne({ product: rcv.product, warehouse: po.warehouse, batchNo: rcv.batchNo || '' });
      if (!item) {
        item = await InventoryItem.create({ product: rcv.product, warehouse: po.warehouse, batchNo: rcv.batchNo || '', quantity: 0 });
      }
      item.quantity += Number(rcv.quantity);
      if (rcv.expiryDate) item.expiryDate = new Date(rcv.expiryDate);
      await item.save();

      await StockMovement.create({
        product: rcv.product,
        warehouse: po.warehouse,
        batchNo: rcv.batchNo || '',
        type: 'IN',
        quantity: Number(rcv.quantity),
        reference: po.poNumber,
        note: 'PO Receive',
        performedBy: req.user.userId
      });
    }

    // Update PO overall status
    const totalQty = po.items.reduce((s, it) => s + Number(it.quantity || 0), 0);
    const recvQty = po.items.reduce((s, it) => s + Number(it.receivedQty || 0), 0);
    if (recvQty === 0) {
      // no change
    } else if (recvQty < totalQty) {
      po.status = 'partial_received';
    } else {
      po.status = 'received';
      po.receivedDate = new Date();
    }

    po.updatedBy = req.user.userId;
    await po.save();

    res.json({ purchaseOrder: po });
  }
);

// Get single PO
router.get('/:id', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id)
    .populate('vendor', 'vendorName companyName email')
    .populate('warehouse', 'name code')
    .populate('items.product', 'name category');
  if (!po) return res.status(404).json({ message: 'PO not found' });
  res.json({ purchaseOrder: po });
});

module.exports = router;
