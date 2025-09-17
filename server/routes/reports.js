const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Child = require('../models/Child');
const User = require('../models/User');
const Payroll = require('../models/Payroll');
const StaffPerformance = require('../models/StaffPerformance');
const mongoose = require('mongoose');

// Attendance summary
router.get('/attendance', auth, async (req, res) => {
  try {
    const { from, to, entityType, entityId } = req.query || {};
    const q = {};
    if (entityType) q.entityType = entityType;
    if (entityId) q.entityId = entityId;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }
    const records = await Attendance.find(q);
    const totals = records.reduce((acc, r) => {
      acc.count++;
      acc.status[r.status] = (acc.status[r.status] || 0) + 1;
      return acc;
    }, { count: 0, status: {} });
    res.json({ totals, records });
  } catch (e) {
    console.error('Attendance report error:', e);
    res.status(500).json({ message: 'Server error generating attendance report' });
  }
});

// Enrollment statistics
router.get('/enrollment', auth, async (req, res) => {
  try {
    const byProgram = await Child.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$program', count: { $sum: 1 } } },
      { $project: { program: '$_id', count: 1, _id: 0 } },
      { $sort: { program: 1 } }
    ]);

    const monthly = await Child.aggregate([
      { $group: { _id: { y: { $year: '$enrollmentDate' }, m: { $month: '$enrollmentDate' } }, count: { $sum: 1 } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]);

    res.json({ byProgram, monthly });
  } catch (e) {
    console.error('Enrollment report error:', e);
    res.status(500).json({ message: 'Server error generating enrollment stats' });
  }
});

// Financial report (simplified using Payroll model)
router.get('/financial', auth, async (req, res) => {
  try {
    const { from, to, status } = req.query || {};
    const q = {};
    if (status) q.status = status;
    if (from || to) {
      q.periodStart = q.periodStart || {};
      q.periodEnd = q.periodEnd || {};
      if (from) q.periodStart.$gte = new Date(from);
      if (to) q.periodEnd.$lte = new Date(to);
    }
    const payrolls = await Payroll.find(q);
    const totals = payrolls.reduce((acc, p) => {
      acc.count++;
      acc.gross += (p.baseRate || 0) + (p.earnings || []).reduce((s, e) => s + e.amount, 0);
      acc.deductions += (p.deductions || []).reduce((s, d) => s + d.amount, 0);
      acc.net += (p.netPay || 0);
      return acc;
    }, { count: 0, gross: 0, deductions: 0, net: 0 });
    res.json({ totals, payrolls });
  } catch (e) {
    console.error('Financial report error:', e);
    res.status(500).json({ message: 'Server error generating financial report' });
  }
});

// Staff performance report
router.get('/staff-performance', auth, async (req, res) => {
  try {
    const { staff, from, to } = req.query || {};
    const q = {};
    if (staff) q.staff = staff;
    if (from || to) {
      q.periodStart = q.periodStart || {};
      q.periodEnd = q.periodEnd || {};
      if (from) q.periodStart.$gte = new Date(from);
      if (to) q.periodEnd.$lte = new Date(to);
    }
    const reviews = await StaffPerformance.find(q).populate('staff', 'firstName lastName');
    const avg = reviews.reduce((acc, r) => {
      acc.count++;
      acc.overall += (r.overallRating || 0);
      return acc;
    }, { count: 0, overall: 0 });
    const averageRating = avg.count ? (avg.overall / avg.count) : 0;
    res.json({ averageRating, count: avg.count, reviews });
  } catch (e) {
    console.error('Staff performance report error:', e);
    res.status(500).json({ message: 'Server error generating staff performance report' });
  }
});

// Custom report endpoint: accepts Mongo-like filters for whitelisted collections
router.post('/custom', auth, async (req, res) => {
  try {
    const { type, filter = {}, sort = { createdAt: -1 }, limit = 200 } = req.body || {};
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 1000);
    let data = [];
    switch (type) {
      case 'attendance':
        data = await Attendance.find(filter).sort(sort).limit(safeLimit);
        break;
      case 'children':
        data = await Child.find(filter).sort(sort).limit(safeLimit);
        break;
      case 'users':
        data = await User.find(filter).sort(sort).limit(safeLimit);
        break;
      case 'payroll':
        data = await Payroll.find(filter).sort(sort).limit(safeLimit);
        break;
      case 'staffPerformance':
        data = await StaffPerformance.find(filter).sort(sort).limit(safeLimit);
        break;
      default:
        return res.status(400).json({ message: 'Invalid custom report type' });
    }
    res.json({ count: data.length, data });
  } catch (e) {
    console.error('Custom report error:', e);
    res.status(500).json({ message: 'Server error generating custom report' });
  }
});

module.exports = router;
 
// Seed demo data for reports (development helper)
router.post('/seed-demo', auth, async (req, res) => {
  try {
    const now = new Date();
    const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

    // Ensure at least one child and one staff user
    const child = (await Child.findOne()) || await Child.create({
      firstName: 'Alex', lastName: 'Morris', gender: 'male',
      dateOfBirth: daysAgo(1200), program: 'preschool',
      enrollmentDate: daysAgo(60), isActive: true
    });
    const staffUser = (await User.findOne({ role: 'staff' })) || await User.create({
      firstName: 'Jamie', lastName: 'Lee', username: `staff_demo_${Date.now()}`, password: 'Password@123', role: 'staff', email: `staff_demo_${Date.now()}@mail.com`
    });

    // Attendance last 5 days
    const attendanceDocs = [];
    for (let i = 0; i < 5; i++) {
      attendanceDocs.push({
        entityType: 'child',
        entityId: child._id,
        date: daysAgo(i + 1),
        checkInAt: daysAgo(i + 1),
        checkOutAt: daysAgo(i + 1),
        status: i % 4 === 0 ? 'absent' : 'present',
        notes: i % 4 === 0 ? 'Sick leave' : 'On time'
      });
    }
    await Attendance.insertMany(attendanceDocs);

    // Payroll sample
    await Payroll.create({
      staff: staffUser._id,
      periodStart: daysAgo(30),
      periodEnd: daysAgo(1),
      baseRate: 1500,
      earnings: [{ label: 'Overtime', amount: 120 }],
      deductions: [{ label: 'Tax', amount: 180 }],
      netPay: 1440,
      status: 'paid'
    });

    // Staff performance sample
    await StaffPerformance.create({
      staff: staffUser._id,
      periodStart: daysAgo(30),
      periodEnd: daysAgo(1),
      overallRating: 4.5,
      notes: 'Great engagement with children'
    });

    res.json({ message: 'Demo data seeded' });
  } catch (e) {
    console.error('Seed demo error:', e);
    res.status(500).json({ message: 'Failed to seed demo data' });
  }
});