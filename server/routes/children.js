const express = require('express');
const router = express.Router();
const Child = require('../models/Child');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Activity = require('../models/Activity');
const Milestone = require('../models/Milestone');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Storage for child photo uploads
const uploadDir = path.join(__dirname, '..', 'uploads', 'child_photos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  },
});
const upload = multer({ storage });

// Helper: ensure parent owns the child or is admin
async function canAccessChild(req, childId) {
  const child = await Child.findById(childId).select('_id parents');
  if (!child) return { ok: false, status: 404, message: 'Child not found' };
  if (req.user.role === 'admin') return { ok: true, child };
  const isParent = req.user.role === 'parent' && child.parents.some(p => String(p) === req.user.userId);
  return isParent ? { ok: true, child } : { ok: false, status: 403, message: 'Not authorized' };
}

// Get child by id (parent can view their child; admin can view any)
router.get('/:id', auth, async (req, res) => {
  try {
    const { ok, status, message } = await canAccessChild(req, req.params.id);
    if (!ok) return res.status(status).json({ message });

    const child = await Child.findById(req.params.id)
      .select('-__v')
      .populate('assignedStaff', 'firstName lastName email phone profileImage role');
    res.json(child);
  } catch (error) {
    console.error('Get child error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update child: allow parents to edit medical/emergency/authorizedPickup; admin can edit anything
router.put('/:id', auth, async (req, res) => {
  try {
    const access = await canAccessChild(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    let update = {};
    if (req.user.role === 'admin') {
      update = req.body || {};
      // Allow assigning staff by admin
      if (update.assignedStaff) {
        // Ensure the user is a staff
        const staffUser = await User.findById(update.assignedStaff);
        if (!staffUser || staffUser.role !== 'staff') {
          return res.status(400).json({ message: 'assignedStaff must be a valid staff user' });
        }
      }
    } else {
      // Parent-limited fields
      const { medicalConditions, allergies, emergencyContacts, authorizedPickup, notes } = req.body || {};
      if (Array.isArray(medicalConditions)) update.medicalConditions = medicalConditions;
      if (Array.isArray(allergies)) update.allergies = allergies;
      if (Array.isArray(emergencyContacts)) update.emergencyContacts = emergencyContacts;
      if (Array.isArray(authorizedPickup)) update.authorizedPickup = authorizedPickup;
      if (typeof notes === 'string') update.notes = notes;
    }

    const child = await Child.findByIdAndUpdate(req.params.id, update, { new: true }).select('-__v');
    res.json({ message: 'Child updated', child });
  } catch (error) {
    console.error('Update child error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Gallery: list
router.get('/:id/gallery', auth, async (req, res) => {
  try {
    const access = await canAccessChild(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const child = await Child.findById(req.params.id).select('gallery');
    res.json(child.gallery || []);
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Gallery: upload (parent of child or admin)
router.post('/:id/gallery', auth, upload.single('photo'), async (req, res) => {
  try {
    const access = await canAccessChild(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const url = `/uploads/child_photos/${req.file.filename}`;
    const caption = (req.body && req.body.caption) || '';

    const child = await Child.findByIdAndUpdate(
      req.params.id,
      {
        $push: { gallery: { url, caption, uploadedBy: req.user.userId, uploadedAt: new Date() } },
        $setOnInsert: {}
      },
      { new: true }
    ).select('gallery');

    // If no profile image, set the first uploaded gallery photo as profile image
    if (!child.profileImage && child.gallery && child.gallery.length > 0) {
      await Child.findByIdAndUpdate(req.params.id, { profileImage: child.gallery[child.gallery.length - 1].url });
    }

    res.status(201).json({ message: 'Photo added', photo: child.gallery[child.gallery.length - 1] });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Gallery: set a gallery photo as profile image (admin or parent of child)
router.post('/:id/gallery/:photoId/set-profile', auth, async (req, res) => {
  try {
    const access = await canAccessChild(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const child = await Child.findById(req.params.id).select('gallery profileImage');
    if (!child) return res.status(404).json({ message: 'Child not found' });
    const photo = child.gallery.id(req.params.photoId);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });

    child.profileImage = photo.url;
    await child.save();
    res.json({ message: 'Profile image updated', profileImage: child.profileImage });
  } catch (error) {
    console.error('Set profile image error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Gallery: delete
router.delete('/:id/gallery/:photoId', auth, async (req, res) => {
  try {
    const access = await canAccessChild(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const child = await Child.findById(req.params.id).select('gallery');
    if (!child) return res.status(404).json({ message: 'Child not found' });

    const photo = child.gallery.id(req.params.photoId);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });

    // Only admin or uploader can delete
    if (req.user.role !== 'admin' && String(photo.uploadedBy) !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this photo' });
    }

    child.gallery.pull(req.params.photoId);
    await child.save();

    res.json({ message: 'Photo removed' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Simple notification polling endpoints (stubs)
router.get('/:id/attendance', auth, async (req, res) => {
  try {
    const access = await canAccessChild(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const childId = req.params.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime());
    todayEnd.setHours(23, 59, 59, 999);

    const Attendance = require('../models/Attendance');

    // Today's record
    const todayRecord = await Attendance.findOne({
      entityType: 'child',
      entityId: childId,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    // Last 30 days history
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const history = await Attendance.find({
      entityType: 'child',
      entityId: childId,
      date: { $gte: thirtyDaysAgo, $lte: todayEnd }
    }).sort({ date: -1 });

    res.json({
      today: todayRecord ? {
        status: todayRecord.status,
        checkIn: todayRecord.checkInAt,
        checkOut: todayRecord.checkOutAt
      } : { status: 'absent', checkIn: null, checkOut: null },
      history
    });
  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/activities', auth, async (req, res) => {
  try {
    const access = await canAccessChild(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    // List activities for this child for the last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent = await Activity.find({
      child: req.params.id,
      date: { $gte: since }
    }).sort({ date: -1 }).limit(20).select('title date description photos');
    const count = await Activity.countDocuments({ child: req.params.id });
    res.json({ recent, count });
  } catch (error) {
    console.error('Activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/meals', auth, async (req, res) => {
  try {
    const access = await canAccessChild(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    // TODO: integrate meal plan
    res.json({ plan: [], weekOf: new Date() });
  } catch (error) {
    console.error('Meals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get parent-specific reports for child
router.get('/:id/reports', auth, async (req, res) => {
  try {
    const access = await canAccessChild(req, req.params.id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const childId = req.params.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get attendance data for the last 30 days
    const attendanceRecords = await Attendance.find({
      entityId: childId,
      entityType: 'child',
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 });

    // Calculate attendance summary
    const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
    const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
    const totalDays = presentDays + absentDays;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    
    const thisMonthRecords = attendanceRecords.filter(r => r.date >= startOfMonth);
    const thisMonthPresent = thisMonthRecords.filter(r => r.status === 'present').length;

    // Get recent activities (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const recentActivities = await Activity.find({
      children: childId,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: -1 }).limit(10);

    // Get milestones for this child
    const milestones = await Milestone.find({
      child: childId
    }).sort({ targetDate: 1 });

    const completedMilestones = milestones.filter(m => m.status === 'completed');
    const upcomingMilestones = milestones.filter(m => m.status === 'pending' && m.targetDate > now).slice(0, 3);

    // Mock nutrition data (in real app, this would come from meal tracking)
    const nutritionData = {
      consumption: [
        { type: 'Breakfast', consumption: 85 },
        { type: 'Lunch', consumption: 92 },
        { type: 'Snack', consumption: 78 },
        { type: 'Dinner', consumption: 88 }
      ],
      preferences: ['Fruits', 'Vegetables', 'Cheese', 'Yogurt']
    };

    // Activity participation trends
    const activityParticipation = recentActivities.map(activity => ({
      name: activity.title || 'Activity',
      participation: Math.random() > 0.3 ? 'Active' : 'Limited', // Mock data
      date: activity.date
    }));

    const reports = {
      attendance: {
        summary: {
          presentDays,
          absentDays,
          attendanceRate,
          thisMonth: thisMonthPresent
        },
        history: attendanceRecords.slice(0, 10).map(r => ({
          date: r.date,
          status: r.status,
          checkIn: r.checkInAt,
          checkOut: r.checkOutAt
        }))
      },
      activities: {
        participation: activityParticipation,
        trends: activityParticipation.length > 3 ? 'Increasing' : 'Stable'
      },
      milestones: {
        completed: completedMilestones.map(m => ({
          name: m.title,
          achievedDate: m.completedDate || m.date,
          category: m.category
        })),
        upcoming: upcomingMilestones.map(m => ({
          name: m.title,
          targetDate: m.targetDate,
          category: m.category
        }))
      },
      nutrition: nutritionData
    };

    res.json(reports);
  } catch (error) {
    console.error('Child reports error:', error);
    res.status(500).json({ message: 'Server error generating reports' });
  }
});

// Get all children (placeholder kept for admin screen)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.json({ message: 'Children routes working', children: [] });
    const children = await Child.find().select('-__v').sort({ createdAt: -1 });
    res.json(children);
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new child (admin only)
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const body = req.body || {};
    const firstName = (body.firstName || '').trim();
    const lastName = (body.lastName || '').trim();
    const dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    const gender = (body.gender || '').toLowerCase();
    const parents = Array.isArray(body.parents) ? body.parents : (body.parentId ? [body.parentId] : []);
    const program = (body.program || '').toLowerCase();
    const tuitionRate = Number(body.tuitionRate);
    const allergies = Array.isArray(body.allergies) ? body.allergies : [];
    const medicalConditions = Array.isArray(body.medicalConditions)
      ? body.medicalConditions.map(m => (typeof m === 'string' ? { condition: m } : m)).filter(m => m && m.condition)
      : [];
    const emergencyContacts = Array.isArray(body.emergencyContacts)
      ? body.emergencyContacts.map(ec => ({
          name: (ec.name || '').trim(),
          phone: (ec.phone || '').trim(),
          relationship: (ec.relationship || 'Emergency').trim(),
          canPickup: !!ec.canPickup
        })).filter(ec => ec.name && ec.phone && ec.relationship)
      : [];
    const authorizedPickup = Array.isArray(body.authorizedPickup)
      ? body.authorizedPickup.map(ap => ({
          name: (ap.name || '').trim(),
          phone: (ap.phone || '').trim(),
          relationship: (ap.relationship || '').trim(),
          photoId: ap.photoId || ''
        })).filter(ap => ap.name || ap.phone)
      : [];
    const schedule = typeof body.schedule === 'object' && body.schedule ? body.schedule : {};

    if (!firstName || !lastName || !dateOfBirth || isNaN(dateOfBirth.getTime()) || !['male','female'].includes(gender) || !program) {
      return res.status(400).json({ message: 'Missing or invalid required fields' });
    }
    if (!Array.isArray(parents) || parents.length === 0) {
      return res.status(400).json({ message: 'At least one parent is required' });
    }
    // Tuition is optional; default to 0 if not provided or invalid
    const normalizedTuition = Number.isFinite(tuitionRate) ? tuitionRate : 0;

    // Validate parent IDs exist and are parent role
    const parentUsers = await User.find({ _id: { $in: parents } });
    if (!parentUsers.length) {
      return res.status(400).json({ message: 'Invalid parent ID(s)' });
    }

    const child = await Child.create({
      firstName,
      lastName,
      dateOfBirth,
      gender,
      parents: parentUsers.map(p => p._id),
      program,
      tuitionRate: normalizedTuition,
      allergies,
      medicalConditions,
      emergencyContacts,
      authorizedPickup,
      schedule
    });

    res.status(201).json({ message: 'Child created successfully', child });
  } catch (error) {
    console.error('Create child error:', error);
    res.status(500).json({ message: 'Server error creating child' });
  }
});

module.exports = router;