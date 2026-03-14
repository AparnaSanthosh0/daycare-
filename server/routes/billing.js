const express = require('express');
const { body, validationResult } = require('express-validator');
const Child = require('../models/Child');
const FeeStructure = require('../models/FeeStructure');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

const router = express.Router();

function isDoctorMealSubscriptionActive(subscription = {}) {
  if (subscription.preference !== 'doctor_recommended' || subscription.status !== 'active') return false;
  const now = new Date();
  const startDate = subscription.startDate ? new Date(subscription.startDate) : null;
  const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
  if (startDate && startDate > now) return false;
  if (subscription.durationType === 'specific_period' && endDate && endDate < now) return false;
  return true;
}

// Admin middleware
const adminOnly = [auth, authorize('admin')];

const normalizeStringList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeAddonList = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((addon) => ({
      name: String(addon?.name || '').trim(),
      amount: Number(addon?.amount || 0),
      description: String(addon?.description || '').trim(),
    }))
    .filter((addon) => addon.name);
};

async function verifyParentChildAccess(user, childId) {
  const child = await Child.findById(childId);
  if (!child) return { allowed: false, child: null, reason: 'Child not found' };
  if (user.role === 'parent') {
    const allowed = Array.isArray(child.parents) && child.parents.some((parentId) => parentId.toString() === user.userId);
    if (!allowed) return { allowed: false, child: null, reason: 'Access denied' };
  }
  return { allowed: true, child, reason: '' };
}

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

// Get fee structures
router.get('/fee-structures', auth, async (req, res) => {
  try {
    const { program, active, published } = req.query;
    const query = {};

    if (program) {
      query.program = program;
    }

    if (req.user.role === 'admin') {
      if (active !== undefined) query.isActive = active === 'true';
      if (published !== undefined) query.isPublished = published === 'true';
    } else {
      query.isActive = true;
      query.isPublished = true;
    }

    const feeStructures = await FeeStructure.find(query)
      .sort({ baseAmount: 1, createdAt: -1 });

    res.json(feeStructures);
  } catch (error) {
    console.error('Error fetching fee structures:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create fee structure (admin only)
router.post('/fee-structures', adminOnly, [
  body('name').notEmpty().withMessage('Name is required'),
  body('baseAmount').isNumeric().withMessage('Base amount must be numeric')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const payload = {
      name: String(req.body.name || '').trim(),
      description: String(req.body.description || '').trim(),
      program: req.body.program || 'all',
      billingCycle: req.body.billingCycle || 'monthly',
      baseAmount: Number(req.body.baseAmount || 0),
      includedServices: normalizeStringList(req.body.includedServices),
      optionalAddons: normalizeAddonList(req.body.optionalAddons),
      isPublished: req.body.isPublished !== false,
      isActive: req.body.isActive !== false,
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    };

    const existing = await FeeStructure.findOne({ name: payload.name, program: payload.program });
    if (existing) {
      return res.status(409).json({ message: 'A fee structure with this name and program already exists' });
    }

    const feeStructure = await FeeStructure.create(payload);
    res.status(201).json({ message: 'Fee structure created successfully', feeStructure });
  } catch (error) {
    console.error('Error creating fee structure:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update fee structure (admin only)
router.put('/fee-structures/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const feeStructure = await FeeStructure.findById(id);

    if (!feeStructure) {
      return res.status(404).json({ message: 'Fee structure not found' });
    }

    const nextName = req.body.name !== undefined ? String(req.body.name || '').trim() : feeStructure.name;
    const nextProgram = req.body.program !== undefined ? req.body.program : feeStructure.program;
    if (nextName !== feeStructure.name || nextProgram !== feeStructure.program) {
      const duplicate = await FeeStructure.findOne({
        _id: { $ne: id },
        name: nextName,
        program: nextProgram,
      });
      if (duplicate) {
        return res.status(409).json({ message: 'A fee structure with this name and program already exists' });
      }
    }

    if (req.body.name !== undefined) feeStructure.name = nextName;
    if (req.body.description !== undefined) feeStructure.description = String(req.body.description || '').trim();
    if (req.body.program !== undefined) feeStructure.program = nextProgram;
    if (req.body.billingCycle !== undefined) feeStructure.billingCycle = req.body.billingCycle;
    if (req.body.baseAmount !== undefined) feeStructure.baseAmount = Number(req.body.baseAmount || 0);
    if (req.body.includedServices !== undefined) feeStructure.includedServices = normalizeStringList(req.body.includedServices);
    if (req.body.optionalAddons !== undefined) feeStructure.optionalAddons = normalizeAddonList(req.body.optionalAddons);
    if (req.body.isPublished !== undefined) feeStructure.isPublished = Boolean(req.body.isPublished);
    if (req.body.isActive !== undefined) feeStructure.isActive = Boolean(req.body.isActive);
    feeStructure.updatedBy = req.user.userId;

    await feeStructure.save();
    res.json({ message: 'Fee structure updated successfully', feeStructure });
  } catch (error) {
    console.error('Error updating fee structure:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Deactivate fee structure (admin only)
router.delete('/fee-structures/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const feeStructure = await FeeStructure.findById(id);

    if (!feeStructure) {
      return res.status(404).json({ message: 'Fee structure not found' });
    }

    feeStructure.isActive = false;
    feeStructure.isPublished = false;
    feeStructure.updatedBy = req.user.userId;
    await feeStructure.save();

    res.json({ message: 'Fee structure deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating fee structure:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get fee options for a child (parent/admin)
router.get('/fee-structures/child/:childId/options', auth, async (req, res) => {
  try {
    const { childId } = req.params;
    const access = await verifyParentChildAccess(req.user, childId);
    if (!access.allowed) {
      return res.status(access.reason === 'Child not found' ? 404 : 403).json({ message: access.reason });
    }

    const child = access.child;
    const options = await FeeStructure.find({
      isActive: true,
      isPublished: true,
      program: { $in: [child.program, 'all'] },
    }).sort({ baseAmount: 1, createdAt: -1 });

    res.json({
      childId,
      childName: `${child.firstName} ${child.lastName}`,
      program: child.program,
      currentSelection: child.feeStructureSelection || null,
      options,
    });
  } catch (error) {
    console.error('Error fetching child fee options:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Select fee structure for a child (parent/admin)
router.put('/fee-structures/child/:childId/select', auth, [
  body('feeStructureId').notEmpty().withMessage('Fee structure ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { childId } = req.params;
    const { feeStructureId } = req.body;

    const access = await verifyParentChildAccess(req.user, childId);
    if (!access.allowed) {
      return res.status(access.reason === 'Child not found' ? 404 : 403).json({ message: access.reason });
    }

    const feeStructure = await FeeStructure.findOne({ _id: feeStructureId, isActive: true, isPublished: true });
    if (!feeStructure) {
      return res.status(404).json({ message: 'Fee structure not found or unavailable' });
    }

    const child = access.child;
    if (feeStructure.program !== 'all' && feeStructure.program !== child.program) {
      return res.status(400).json({ message: 'Selected fee structure is not available for this child program' });
    }

    child.feeStructureSelection = {
      feeStructureId: feeStructure._id,
      feeName: feeStructure.name,
      billingCycle: feeStructure.billingCycle,
      baseAmount: Number(feeStructure.baseAmount || 0),
      includedServices: feeStructure.includedServices || [],
      optionalAddons: feeStructure.optionalAddons || [],
      selectedAt: new Date(),
      selectedBy: req.user.userId,
    };
    child.tuitionRate = Number(feeStructure.baseAmount || 0);
    await child.save();

    res.json({
      message: 'Fee structure selected successfully',
      selection: child.feeStructureSelection,
      tuitionRate: child.tuitionRate,
    });
  } catch (error) {
    console.error('Error selecting fee structure:', error);
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

    const selectedFeeStructure = child.feeStructureSelection || null;
    const hasSelectedFee = Boolean(selectedFeeStructure?.feeStructureId && selectedFeeStructure?.feeName);
    const tuitionAmount = Number(hasSelectedFee ? selectedFeeStructure.baseAmount : (child.tuitionRate || 500));
    const hasActiveDoctorMealSubscription = isDoctorMealSubscriptionActive(child.mealSubscription || {});
    const mealSubscriptionFee = hasActiveDoctorMealSubscription ? Number(child.mealSubscription?.extraFee || 0) : 0;
    const invoiceItems = [
      {
        name: hasSelectedFee
          ? `${selectedFeeStructure.feeName} (${selectedFeeStructure.billingCycle || 'monthly'})`
          : `Monthly tuition for ${child.firstName} ${child.lastName}`,
        amount: tuitionAmount,
      }
    ];

    if (hasSelectedFee && Array.isArray(selectedFeeStructure.includedServices) && selectedFeeStructure.includedServices.length > 0) {
      selectedFeeStructure.includedServices.forEach((serviceName) => {
        invoiceItems.push({
          name: `Included: ${serviceName}`,
          amount: 0,
        });
      });
    }

    if (hasActiveDoctorMealSubscription && mealSubscriptionFee > 0) {
      invoiceItems.push({
        name: `Doctor meal subscription${child.mealSubscription?.selectedPlanTitle ? ` - ${child.mealSubscription.selectedPlanTitle}` : ''}`,
        amount: mealSubscriptionFee,
      });
    }

    const invoices = [{
      _id: `inv_${childId}`,
      invoiceNumber: 'INV-001',
      childId: childId,
      amount: invoiceItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'pending',
      description: hasActiveDoctorMealSubscription
        ? `Monthly tuition and doctor meal subscription for ${child.firstName} ${child.lastName}`
        : `Monthly tuition for ${child.firstName} ${child.lastName}`,
      items: invoiceItems,
      feeStructureSelection: selectedFeeStructure,
      mealSubscription: child.mealSubscription || null,
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