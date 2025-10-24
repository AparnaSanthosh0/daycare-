const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Child = require('../models/Child');
const mongoose = require('mongoose');

// Normalize date to start of day
function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Parse time string HH:MM to Date on today's date
function toTodayTime(timeStr) {
  const [h, m] = (timeStr || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// Config: fixed late pickup time fallback (HH:MM)
const LATE_PICKUP_TIME = process.env.LATE_PICKUP_TIME || '18:00';

// Helper: resolve entity (allow raw id or username/email for convenience)
async function resolveEntity(entityType, entityIdRaw) {
  const entityId = String(entityIdRaw || '').trim();
  if (!entityId) return { ok: false, status: 400, message: 'entityId is required' };

  // If looks like ObjectId, try direct lookup; otherwise try username/email for staff, or by name for child (fallback)
  const isObjectId = mongoose.isValidObjectId(entityId);

  if (entityType === 'child') {
    let child = null;
    if (isObjectId) {
      child = await Child.findById(entityId).select('_id firstName lastName parents');
    } else {
      // Attempt to find by "firstName lastName" or by firstName if single token
      const parts = entityId.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        child = await Child.findOne({ firstName: new RegExp(`^${parts[0]}$`, 'i'), lastName: new RegExp(`^${parts.slice(1).join(' ')}$`, 'i') }).select('_id firstName lastName parents');
      } else {
        child = await Child.findOne({ firstName: new RegExp(`^${entityId}$`, 'i') }).select('_id firstName lastName parents');
      }
    }
    return child ? { ok: true, doc: child } : { ok: false, status: 404, message: 'Child not found' };
  }

  if (entityType === 'staff') {
    let staff = null;
    if (isObjectId) {
      staff = await User.findById(entityId).select('_id firstName lastName role username email');
    } else {
      // Try by username or email
      staff = await User.findOne({ $or: [{ username: entityId }, { email: entityId }] }).select('_id firstName lastName role username email');
    }
    if (!staff || staff.role !== 'staff') return { ok: false, status: 404, message: 'Staff not found' };
    return { ok: true, doc: staff };
  }
  return { ok: false, status: 400, message: 'Invalid entityType' };
}

// Check-in
router.post('/check-in', auth, async (req, res) => {
  try {
    const { entityType, entityId, when, notes } = req.body || {};
    const entity = await resolveEntity(entityType, entityId);
    if (!entity.ok) return res.status(entity.status).json({ message: entity.message });

    const date = startOfDay(when ? new Date(when) : new Date());
    const now = when ? new Date(when) : new Date();

    const doc = await Attendance.findOneAndUpdate(
      { entityType, entityId: entity.doc._id, date },
      {
        $setOnInsert: { status: 'present', createdBy: req.user.userId },
        $set: { checkInAt: now, notes: notes || '', updatedBy: req.user.userId }
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ message: 'Checked in', attendance: doc });
  } catch (e) {
    console.error('Check-in error:', e);
    return res.status(500).json({ message: 'Server error during check-in' });
  }
});

// Check-out
router.post('/check-out', auth, async (req, res) => {
  try {
    const { entityType, entityId, when, notes } = req.body || {};
    const entity = await resolveEntity(entityType, entityId);
    if (!entity.ok) return res.status(entity.status).json({ message: entity.message });

    const date = startOfDay(when ? new Date(when) : new Date());
    const now = when ? new Date(when) : new Date();

    const doc = await Attendance.findOneAndUpdate(
      { entityType, entityId: entity.doc._id, date },
      { $set: { checkOutAt: now, notes: notes || '', updatedBy: req.user.userId } },
      { new: true }
    );

    if (!doc) return res.status(404).json({ message: 'No check-in found for today' });

    // Late pickup detection
    const lateCutoff = toTodayTime(LATE_PICKUP_TIME);
    if (entityType === 'child' && lateCutoff && now > lateCutoff) {
      doc.status = 'late';
      await doc.save();
      // TODO: send parent notification (email/whatsapp) via utils when configured
    }

    return res.status(200).json({ message: 'Checked out', attendance: doc });
  } catch (e) {
    console.error('Check-out error:', e);
    return res.status(500).json({ message: 'Server error during check-out' });
  }
});

// Mark absence for a date
router.post('/mark-absence', auth, async (req, res) => {
  try {
    const { entityType, entityId, date, notes } = req.body || {};
    const entity = await resolveEntity(entityType, entityId);
    if (!entity.ok) return res.status(entity.status).json({ message: entity.message });

    const day = startOfDay(date ? new Date(date) : new Date());

    const doc = await Attendance.findOneAndUpdate(
      { entityType, entityId: entity.doc._id, date: day },
      { $set: { status: 'absent', notes: notes || '', updatedBy: req.user.userId }, $setOnInsert: { createdBy: req.user.userId } },
      { upsert: true, new: true }
    );

    return res.status(200).json({ message: 'Marked absent', attendance: doc });
  } catch (e) {
    return res.status(500).json({ message: 'Server error during absence mark' });
  }
});

// Report with filters
router.get('/report', auth, async (req, res) => {
  try {
    const { from, to, entityType, entityId, status, staffOnly } = req.query || {};
    const q = {};
    if (entityType) q.entityType = entityType;
    if (entityId) q.entityId = entityId;
    if (status) q.status = status;

    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = startOfDay(new Date(from));
      if (to) q.date.$lte = startOfDay(new Date(to));
    }

    // If staffOnly is requested, restrict to records created by staff users
    if (String(staffOnly).toLowerCase() === 'true' || staffOnly === '1') {
      // Default to child entityType if not already constrained
      if (!q.entityType) q.entityType = 'child';
      const staffUsers = await User.find({ role: 'staff' }).select('_id');
      const staffIds = staffUsers.map(u => u._id);
      q.createdBy = { $in: staffIds };
    }

    const records = await Attendance.find(q).sort({ date: -1 });
    return res.json({ records });
  } catch (e) {
    console.error('Today summary error:', e);
    return res.status(500).json({ message: 'Server error fetching today summary' });
  }
});

// Admin summary for today's attendance
router.get('/admin-summary', auth, authorize('admin'), async (req, res) => {
  try {
    const { date } = req.query || {};
    const targetDate = date ? startOfDay(new Date(date)) : startOfDay(new Date());

    const todayStart = targetDate;
    const todayEnd = new Date(todayStart.getTime());
    todayEnd.setHours(23, 59, 59, 999);

    // Get all attendance records for today
    const todayRecords = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd }
    });

    // Calculate summary
    const summary = {
      present: todayRecords.filter(r => r.status === 'present').length,
      absent: todayRecords.filter(r => r.status === 'absent').length,
      late: todayRecords.filter(r => r.status === 'late').length,
      total: todayRecords.length
    };

    res.json(summary);
  } catch (e) {
    console.error('Admin summary error:', e);
    res.status(500).json({ message: 'Server error fetching admin summary' });
  }
});

// Recent attendance activity for admin dashboard
router.get('/recent-activity', auth, authorize('admin'), async (req, res) => {
  try {
    // Get recent attendance records (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentRecords = await Attendance.find({
      updatedAt: { $gte: twentyFourHoursAgo }
    })
    .populate('entityId', 'firstName lastName')
    .sort({ updatedAt: -1 })
    .limit(10);

    // Format activity data
    const activities = recentRecords.map(record => ({
      entityType: record.entityType,
      entityName: record.entityId ? `${record.entityId.firstName} ${record.entityId.lastName}` : 'Unknown',
      action: record.checkInAt ? 'Check-in' : record.checkOutAt ? 'Check-out' : 'Status Update',
      status: record.status,
      timestamp: record.updatedAt
    }));

    res.json(activities);
  } catch (e) {
    console.error('Recent activity error:', e);
    res.status(500).json({ message: 'Server error fetching recent activity' });
  }
});

module.exports = router;