const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const Invoice = require('../models/Invoice');

// Admin-only for now
router.use(auth, authorize('admin'));

// List invoices with filters
router.get('/invoices', async (req, res) => {
  const { status, customer, vendor, type, from, to } = req.query || {};
  const q = {};
  if (status) q.status = status;
  if (customer) q.customer = customer;
  if (vendor) q.vendor = vendor;
  if (type) q.type = type;
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) q.createdAt.$lte = new Date(to);
  }
  const list = await Invoice.find(q)
    .populate('customer', 'name email')
    .populate('vendor', 'vendorName companyName')
    .populate('items.product', 'name category')
    .sort({ createdAt: -1 });
  res.json({ invoices: list });
});

// Create invoice
router.post(
  '/invoices',
  [
    body('type').optional().isIn(['sale', 'subscription', 'purchase', 'service']),
    body('items').isArray({ min: 1 }),
    body('items.*.quantity').isInt({ gt: 0 }),
    body('items.*.unitPrice').isFloat({ gte: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const payload = {
      type: req.body.type || 'sale',
      customer: req.body.customer || null,
      vendor: req.body.vendor || null,
      items: req.body.items,
      tax: Number(req.body.tax || 0),
      total: Number(req.body.total || 0),
      dueDate: req.body.dueDate || null,
      referenceType: req.body.referenceType || null,
      referenceId: req.body.referenceId || null,
      notes: req.body.notes || '',
      createdBy: req.user.userId,
      status: req.body.status || 'issued'
    };
    const inv = await Invoice.create(payload);
    res.status(201).json({ invoice: inv });
  }
);

// Add payment
router.post(
  '/invoices/:id/pay',
  [
    body('amount').isFloat({ gt: 0 }),
    body('method').optional().isIn(['card', 'upi', 'bank_transfer', 'cash', 'paypal', 'other']),
    body('reference').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Invoice not found' });
    inv.payments = inv.payments || [];
    inv.payments.push({ amount: Number(req.body.amount), method: req.body.method || 'other', reference: req.body.reference || '' });

    const paid = inv.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    if (paid >= inv.total) inv.status = 'paid';
    await inv.save();
    res.json({ invoice: inv });
  }
);

// Add refund/adjustment
router.post(
  '/invoices/:id/adjust',
  [
    body('type').isIn(['refund', 'credit', 'debit']),
    body('amount').isFloat({ gt: 0 }),
    body('reason').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return res.status(404).json({ message: 'Invoice not found' });
    inv.adjustments = inv.adjustments || [];
    inv.adjustments.push({ type: req.body.type, amount: Number(req.body.amount), reason: req.body.reason || '' });
    if (req.body.type === 'refund') inv.status = 'refunded';
    await inv.save();
    res.json({ invoice: inv });
  }
);

// Get one invoice
router.get('/invoices/:id', async (req, res) => {
  const inv = await Invoice.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('vendor', 'vendorName companyName')
    .populate('items.product', 'name category');
  if (!inv) return res.status(404).json({ message: 'Invoice not found' });
  res.json({ invoice: inv });
});

module.exports = router;