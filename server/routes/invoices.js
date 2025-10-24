const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

// Generate invoice for an order
router.post('/generate/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('customer')
      .populate('items.product')
      .populate('items.vendor');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ order: order._id });
    if (existingInvoice) {
      return res.json({
        message: 'Invoice already exists',
        invoice: existingInvoice
      });
    }

    // Create invoice
    const invoice = new Invoice({
      order: order._id,
      customer: order.customer._id,
      items: order.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        vendor: item.vendor
      })),
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      billingAddress: order.billingAddress,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.paymentStatus === 'paid' ? 'paid' : 'sent',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes: 'Thank you for your purchase!',
      terms: 'Payment due within 30 days of invoice date.'
    });

    await invoice.save();
    await invoice.populate('customer order items.product items.vendor');

    res.json({
      message: 'Invoice generated successfully',
      invoice
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ message: 'Error generating invoice', error: error.message });
  }
});

// Get invoice by ID
router.get('/:invoiceId', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId)
      .populate('customer order items.product items.vendor');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: 'Error fetching invoice', error: error.message });
  }
});

// Get invoices for a customer
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ customer: req.params.customerId })
      .populate('order')
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    res.status(500).json({ message: 'Error fetching invoices', error: error.message });
  }
});

// Get all invoices (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const invoices = await Invoice.find()
      .populate('customer order')
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Error fetching invoices', error: error.message });
  }
});

// Update invoice status
router.patch('/:invoiceId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.invoiceId,
      { 
        status,
        ...(status === 'paid' && { paidAt: new Date() })
      },
      { new: true }
    ).populate('customer order');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json({
      message: 'Invoice status updated',
      invoice
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ message: 'Error updating invoice status', error: error.message });
  }
});

// Auto-generate invoice for paid orders
router.post('/auto-generate', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Find paid orders without invoices
    const paidOrders = await Order.find({
      paymentStatus: 'paid',
      status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
    }).populate('customer');

    const generatedInvoices = [];

    for (const order of paidOrders) {
      const existingInvoice = await Invoice.findOne({ order: order._id });
      if (existingInvoice) continue;

      const invoice = new Invoice({
        order: order._id,
        customer: order.customer._id,
        items: order.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          vendor: item.vendor
        })),
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        total: order.total,
        billingAddress: order.billingAddress,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: 'paid',
        paidAt: order.updatedAt,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: 'Thank you for your purchase!',
        terms: 'Payment due within 30 days of invoice date.'
      });

      await invoice.save();
      generatedInvoices.push(invoice);
    }

    res.json({
      message: `Generated ${generatedInvoices.length} invoices`,
      invoices: generatedInvoices
    });
  } catch (error) {
    console.error('Error auto-generating invoices:', error);
    res.status(500).json({ message: 'Error auto-generating invoices', error: error.message });
  }
});

module.exports = router;
