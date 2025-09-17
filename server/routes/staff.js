const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const User = require('../models/User');
const StaffSchedule = require('../models/StaffSchedule');
const StaffPerformance = require('../models/StaffPerformance');
const StaffTraining = require('../models/StaffTraining');
const Payroll = require('../models/Payroll');

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