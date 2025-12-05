const express = require('express');
const { body, validationResult } = require('express-validator');
const Child = require('../models/Child');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// Admin middleware
const adminOnly = [auth, authorize('admin')];

// Get billing stats (admin only)
router.get('/stats', adminOnly, async (req, res) => {
  try {
    // Generate sample billing stats
    const stats = {
      totalRevenue: 15000.00,
      paidInvoices: 12500.00,
      pendingPayments: 2500.00,
      overdueAmount: 500.00
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching billing stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all invoices (admin only)
router.get('/invoices', adminOnly, async (req, res) => {
  try {
    // Generate sample invoices
    const invoices = [
      {
        _id: '1',
        invoiceNumber: 'INV-001',
        parentId: 'parent1',
        childId: 'child1',
        amount: 500,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
        description: 'Monthly tuition fee'
      }
    ];
    
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all payments (admin only)
router.get('/payments', adminOnly, async (req, res) => {
  try {
    // Generate sample payments
    const payments = [];
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tuition rates (admin only)
router.get('/tuition-rates', adminOnly, async (req, res) => {
  try {
    const children = await Child.find({})
      .populate('parents', 'firstName lastName email')
      .select('firstName lastName program tuitionRate parents')
      .sort({ firstName: 1 });
    
    const tuitionRates = children.map(child => ({
      _id: child._id,
      childId: child._id,
      childName: `${child.firstName} ${child.lastName}`,
      program: child.program,
      monthlyRate: child.tuitionRate || 0,
      parentName: child.parents?.[0] ? `${child.parents[0].firstName} ${child.parents[0].lastName}` : 'N/A',
      parentEmail: child.parents?.[0]?.email || 'N/A',
      effectiveDate: child.createdAt || new Date(),
      status: 'active'
    }));
    
    res.json(tuitionRates);
  } catch (error) {
    console.error('Error fetching tuition rates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create/Update tuition rate (admin only)
router.post('/tuition-rates', adminOnly, [
  body('childId').notEmpty().withMessage('Child ID is required'),
  body('monthlyRate').isNumeric().withMessage('Monthly rate must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { childId, monthlyRate, program, effectiveDate, notes } = req.body;
    
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Update child's tuition rate
    child.tuitionRate = parseFloat(monthlyRate);
    if (program) child.program = program;
    await child.save();

    res.json({ 
      message: 'Tuition rate updated successfully',
      tuitionRate: {
        childId: child._id,
        monthlyRate: child.tuitionRate,
        program: child.program,
        effectiveDate: effectiveDate || new Date(),
        notes: notes || ''
      }
    });
  } catch (error) {
    console.error('Error creating/updating tuition rate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update tuition rate (admin only)
router.put('/tuition-rates/:childId', adminOnly, [
  body('monthlyRate').isNumeric().withMessage('Monthly rate must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { childId } = req.params;
    const { monthlyRate, program, effectiveDate, notes } = req.body;
    
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Update child's tuition rate
    child.tuitionRate = parseFloat(monthlyRate);
    if (program) child.program = program;
    await child.save();

    res.json({ 
      message: 'Tuition rate updated successfully',
      tuitionRate: {
        childId: child._id,
        monthlyRate: child.tuitionRate,
        program: child.program,
        effectiveDate: effectiveDate || new Date(),
        notes: notes || ''
      }
    });
  } catch (error) {
    console.error('Error updating tuition rate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get invoices for a specific child (parent accessible)
router.get('/invoices/child/:childId', auth, async (req, res) => {
  try {
    const { childId } = req.params;
    
    // Verify parent can access this child
    if (req.user.role === 'parent') {
      const child = await Child.findById(childId).populate('parents');
      if (!child || !child.parents.some(p => p._id.toString() === req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Generate sample invoice for the child
    const invoices = [{
      _id: `inv_${childId}`,
      invoiceNumber: 'INV-001',
      childId: childId,
      amount: child.tuitionRate || 500,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'pending',
      description: `Monthly tuition for ${child.firstName} ${child.lastName}`,
      createdAt: new Date()
    }];
    
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching child invoices:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payments for a specific child (parent accessible)
router.get('/payments/child/:childId', auth, async (req, res) => {
  try {
    const { childId } = req.params;
    
    // Verify parent can access this child
    if (req.user.role === 'parent') {
      const child = await Child.findById(childId).populate('parents');
      if (!child || !child.parents.some(p => p._id.toString() === req.user.userId)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    // For now, return empty payments array (would be populated from a payments collection)
    const payments = [];
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching child payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate invoice (admin only)
router.post('/invoices', adminOnly, [
  body('parentId').notEmpty().withMessage('Parent ID is required'),
  body('childId').notEmpty().withMessage('Child ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { parentId, childId, amount, dueDate, description } = req.body;
    
    // Verify parent and child exist
    const [parent, child] = await Promise.all([
      User.findById(parentId),
      Child.findById(childId)
    ]);
    
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Generate invoice (in a real app, this would be saved to database)
    const invoice = {
      _id: Date.now().toString(),
      invoiceNumber: `INV-${Date.now()}`,
      parentId,
      childId,
      amount: parseFloat(amount),
      dueDate: new Date(dueDate),
      status: 'pending',
      description: description || 'Tuition fee',
      createdAt: new Date()
    };
    
    res.json({ message: 'Invoice generated successfully', invoice });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record payment (admin only)
router.post('/payments', adminOnly, [
  body('invoiceId').notEmpty().withMessage('Invoice ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { invoiceId, amount, paymentMethod, paymentDate, notes } = req.body;
    
    // Record payment (in a real app, this would be saved to database)
    const payment = {
      _id: Date.now().toString(),
      invoiceId,
      amount: parseFloat(amount),
      paymentMethod,
      paymentDate: new Date(paymentDate || Date.now()),
      status: 'completed',
      notes: notes || '',
      recordedBy: req.user.userId,
      createdAt: new Date()
    };
    
    res.json({ message: 'Payment recorded successfully', payment });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;