const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const User = require('../models/User');
const Child = require('../models/Child');
const Invoice = require('../models/Invoice');
const StaffSchedule = require('../models/StaffSchedule');
const StaffPerformance = require('../models/StaffPerformance');
const StaffTraining = require('../models/StaffTraining');
const Payroll = require('../models/Payroll');

// Staff activity logging endpoints
router.post('/safetyCheck', auth, authorize('staff'), async (req, res) => {
  try {
    const { childId, checkType, notes, timestamp } = req.body;
    const staffId = req.user.userId;
    
    // Log safety check (in a real app, you'd save to a SafetyCheck model)
    console.log('Safety check logged:', { staffId, childId, checkType, notes, timestamp });
    
    res.json({ 
      message: 'Safety check recorded successfully',
      data: { staffId, childId, checkType, notes, timestamp }
    });
  } catch (error) {
    console.error('Safety check error:', error);
    res.status(500).json({ message: 'Server error recording safety check' });
  }
});

router.post('/hygieneLog', auth, authorize('staff'), async (req, res) => {
  try {
    const { childId, activity, notes, timestamp } = req.body;
    const staffId = req.user.userId;
    
    console.log('Hygiene activity logged:', { staffId, childId, activity, notes, timestamp });
    
    res.json({ 
      message: 'Hygiene activity recorded successfully',
      data: { staffId, childId, activity, notes, timestamp }
    });
  } catch (error) {
    console.error('Hygiene log error:', error);
    res.status(500).json({ message: 'Server error recording hygiene activity' });
  }
});

router.post('/healthAlert', auth, authorize('staff'), async (req, res) => {
  try {
    const { childId, issueType, severity, description, actionTaken, timestamp } = req.body;
    const staffId = req.user.userId;
    
    console.log('Health alert logged:', { staffId, childId, issueType, severity, description, actionTaken, timestamp });
    
    // In a real app, you might want to notify parents/admin for high severity issues
    if (severity === 'urgent' || severity === 'high') {
      console.log('URGENT: High severity health issue reported');
    }
    
    res.json({ 
      message: 'Health alert recorded successfully',
      data: { staffId, childId, issueType, severity, description, actionTaken, timestamp }
    });
  } catch (error) {
    console.error('Health alert error:', error);
    res.status(500).json({ message: 'Server error recording health alert' });
  }
});

router.post('/activity', auth, authorize('staff'), async (req, res) => {
  try {
    const { title, type, description, participants, duration, timestamp } = req.body;
    const staffId = req.user.userId;
    
    console.log('Activity started:', { staffId, title, type, description, participants, duration, timestamp });
    
    res.json({ 
      message: 'Activity recorded successfully',
      data: { staffId, title, type, description, participants, duration, timestamp }
    });
  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ message: 'Server error recording activity' });
  }
});

router.post('/progress', auth, authorize('staff'), async (req, res) => {
  try {
    const { childId, skill, level, notes, timestamp } = req.body;
    const staffId = req.user.userId;
    
    console.log('Progress tracked:', { staffId, childId, skill, level, notes, timestamp });
    
    res.json({ 
      message: 'Progress recorded successfully',
      data: { staffId, childId, skill, level, notes, timestamp }
    });
  } catch (error) {
    console.error('Progress tracking error:', error);
    res.status(500).json({ message: 'Server error recording progress' });
  }
});

router.post('/event', auth, authorize('staff'), async (req, res) => {
  try {
    const { title, type, date, description, participants, timestamp } = req.body;
    const staffId = req.user.userId;
    
    console.log('Event planned:', { staffId, title, type, date, description, participants, timestamp });
    
    res.json({ 
      message: 'Event planned successfully',
      data: { staffId, title, type, date, description, participants, timestamp }
    });
  } catch (error) {
    console.error('Event planning error:', error);
    res.status(500).json({ message: 'Server error planning event' });
  }
});

router.post('/participation', auth, authorize('staff'), async (req, res) => {
  try {
    const { childId, activityId, participation, notes, timestamp } = req.body;
    const staffId = req.user.userId;
    
    console.log('Participation recorded:', { staffId, childId, activityId, participation, notes, timestamp });
    
    res.json({ 
      message: 'Participation recorded successfully',
      data: { staffId, childId, activityId, participation, notes, timestamp }
    });
  } catch (error) {
    console.error('Participation recording error:', error);
    res.status(500).json({ message: 'Server error recording participation' });
  }
});

router.post('/allergyCheck', auth, authorize('staff'), async (req, res) => {
  try {
    const { childId, allergens, mealType, notes, timestamp } = req.body;
    const staffId = req.user.userId;
    
    console.log('Allergy check performed:', { staffId, childId, allergens, mealType, notes, timestamp });
    
    res.json({ 
      message: 'Allergy check recorded successfully',
      data: { staffId, childId, allergens, mealType, notes, timestamp }
    });
  } catch (error) {
    console.error('Allergy check error:', error);
    res.status(500).json({ message: 'Server error recording allergy check' });
  }
});

router.post('/healthRecord', auth, authorize('staff'), async (req, res) => {
  try {
    const { childId, issue, treatment, medication, notes, timestamp } = req.body;
    const staffId = req.user.userId;
    
    console.log('Health record logged:', { staffId, childId, issue, treatment, medication, notes, timestamp });
    
    res.json({ 
      message: 'Health record recorded successfully',
      data: { staffId, childId, issue, treatment, medication, notes, timestamp }
    });
  } catch (error) {
    console.error('Health record error:', error);
    res.status(500).json({ message: 'Server error recording health record' });
  }
});

// Get assigned children for staff member (staff only)
router.get('/my-children', auth, authorize('staff'), async (req, res) => {
  try {
    const staffId = req.user.userId;
    
    // Get children assigned to this staff member
    const assignedChildren = await Child.find({ assignedStaff: staffId, isActive: true })
      .populate('parents', 'firstName lastName email phone')
      .select('firstName lastName dateOfBirth gender program parents allergies medicalConditions profileImage');
    
    res.json(assignedChildren);
  } catch (error) {
    console.error('Get assigned children error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get billing information for assigned children's parents
router.get('/billing', auth, authorize('staff'), async (req, res) => {
  try {
    const staffId = req.user.userId;
    
    // Get children assigned to this staff member
    const assignedChildren = await Child.find({ assignedStaff: staffId })
      .populate('parents', 'firstName lastName email phone')
      .select('firstName lastName parents');
    
    if (assignedChildren.length === 0) {
      return res.json({ 
        message: 'No children assigned to you',
        billingData: []
      });
    }
    
    // Get parent IDs
    const parentIds = [];
    assignedChildren.forEach(child => {
      if (child.parents && child.parents.length > 0) {
        parentIds.push(...child.parents.map(p => p._id));
      }
    });
    
    // Get invoices for these parents
    const invoices = await Invoice.find({ 
      customer: { $in: parentIds },
      type: 'subscription' // Daycare fees
    })
      .populate('customer', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Format billing data
    const billingData = assignedChildren.map(child => {
      const childInvoices = invoices.filter(inv => 
        child.parents.some(parent => parent._id.toString() === inv.customer._id.toString())
      );
      
      return {
        child: {
          id: child._id,
          name: `${child.firstName} ${child.lastName}`
        },
        parents: child.parents.map(parent => ({
          id: parent._id,
          name: `${parent.firstName} ${parent.lastName}`,
          email: parent.email,
          phone: parent.phone
        })),
        invoices: childInvoices.map(inv => ({
          id: inv._id,
          amount: inv.total,
          status: inv.status,
          dueDate: inv.dueDate,
          createdAt: inv.createdAt,
          description: inv.description || 'Daycare fees'
        }))
      };
    });
    
    res.json({
      message: 'Billing data retrieved successfully',
      billingData
    });
    
  } catch (error) {
    console.error('Staff billing error:', error);
    res.status(500).json({ message: 'Server error fetching billing data' });
  }
});

// Get all active staff (admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
  const staff = await User.find({ role: 'staff' }).select('-password');
  res.json(staff);
});

// ===== SCHEDULE =====
router.get('/:id/schedule', auth, authorize('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  // Staff can only view own schedule
  if (req.user.role === 'staff' && req.user.userId !== id) return res.status(403).json({ message: 'Forbidden' });
  const schedule = await StaffSchedule.findOne({ staff: id }) || { staff: id, shifts: [] };
  res.json(schedule);
});

router.put('/:id/schedule', auth, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  const { shifts = [] } = req.body || {};
  const updated = await StaffSchedule.findOneAndUpdate(
    { staff: id },
    { staff: id, shifts },
    { upsert: true, new: true }
  );
  res.json({ message: 'Schedule updated', schedule: updated });
});

// ===== PERFORMANCE =====
router.get('/:id/performance', auth, authorize('admin'), async (req, res) => {
  const items = await StaffPerformance.find({ staff: req.params.id }).sort({ periodEnd: -1 });
  res.json(items);
});

router.post('/:id/performance', auth, authorize('admin'), async (req, res) => {
  const payload = { ...req.body, staff: req.params.id, reviewedBy: req.user.userId };
  const created = await StaffPerformance.create(payload);
  res.status(201).json({ message: 'Performance review created', review: created });
});

// ===== TRAINING =====
router.get('/:id/training', auth, authorize('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  if (req.user.role === 'staff' && req.user.userId !== id) return res.status(403).json({ message: 'Forbidden' });
  const items = await StaffTraining.find({ staff: id }).sort({ createdAt: -1 });
  res.json(items);
});

router.post('/:id/training', auth, authorize('admin'), async (req, res) => {
  const created = await StaffTraining.create({ ...req.body, staff: req.params.id });
  res.status(201).json({ message: 'Training record added', training: created });
});

// ===== PAYROLL =====
router.get('/:id/payroll', auth, authorize('admin', 'staff'), async (req, res) => {
  const { id } = req.params;
  if (req.user.role === 'staff' && req.user.userId !== id) return res.status(403).json({ message: 'Forbidden' });
  const items = await Payroll.find({ staff: id }).sort({ periodEnd: -1 });
  res.json(items);
});

router.post('/:id/payroll', auth, authorize('admin'), async (req, res) => {
  const created = await Payroll.create({ ...req.body, staff: req.params.id });
  res.status(201).json({ message: 'Payroll created', payroll: created });
});

router.put('/payroll/:payrollId/status', auth, authorize('admin'), async (req, res) => {
  const { payrollId } = req.params;
  const { status } = req.body || {};
  const allowed = ['draft', 'approved', 'paid'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid payroll status' });
  const updated = await Payroll.findByIdAndUpdate(payrollId, { status }, { new: true });
  res.json({ message: 'Payroll status updated', payroll: updated });
});

module.exports = router;