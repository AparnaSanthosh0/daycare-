const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Activity = require('../models/Activity');
const Milestone = require('../models/Milestone');

// File uploads for activity/milestone photos
const uploadDir = path.join(__dirname, '..', 'uploads', 'children');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  },
});
const upload = multer({ storage });

// Create activity (daily planning, educational programs, etc.)
router.post('/activities', auth, async (req, res) => {
  try {
    const { child, program = 'general', date, title, description = '', category = 'other' } = req.body || {};
    if (!date || !title) return res.status(400).json({ message: 'date and title are required' });

    const activity = await Activity.create({
      child: child || null,
      program,
      date: new Date(date),
      title,
      description,
      category,
      photos: [],
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    });
    res.status(201).json({ message: 'Activity created', activity });
  } catch (e) {
    console.error('Create activity error:', e);
    res.status(500).json({ message: 'Server error creating activity' });
  }
});

// Upload photo to an activity
router.post('/activities/:id/photos', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = `/uploads/children/${req.file.filename}`;
    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      { $push: { photos: url }, $set: { updatedBy: req.user.userId } },
      { new: true }
    );
    if (!activity) return res.status(404).json({ message: 'Activity not found' });
    res.status(201).json({ message: 'Photo added', activity });
  } catch (e) {
    console.error('Upload activity photo error:', e);
    res.status(500).json({ message: 'Server error uploading photo' });
  }
});

// List activities (parent reports: filter by child and date range)
router.get('/activities', auth, async (req, res) => {
  try {
    const { child, from, to, program, category } = req.query || {};
    const q = {};
    if (child) q.child = child;
    if (program) q.program = program;
    if (category) q.category = category;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }
    const items = await Activity.find(q).sort({ date: -1 });
    res.json({ items });
  } catch (e) {
    console.error('List activities error:', e);
    res.status(500).json({ message: 'Server error fetching activities' });
  }
});

// Create milestone (milestone tracking)
router.post('/milestones', auth, async (req, res) => {
  try {
    const { child, date, category = 'other', title, description = '' } = req.body || {};
    if (!child || !date || !title) return res.status(400).json({ message: 'child, date and title are required' });

    const milestone = await Milestone.create({
      child,
      date: new Date(date),
      category,
      title,
      description,
      photos: [],
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    });
    res.status(201).json({ message: 'Milestone created', milestone });
  } catch (e) {
    console.error('Create milestone error:', e);
    res.status(500).json({ message: 'Server error creating milestone' });
  }
});

// Upload milestone photo
router.post('/milestones/:id/photos', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = `/uploads/children/${req.file.filename}`;
    const milestone = await Milestone.findByIdAndUpdate(
      req.params.id,
      { $push: { photos: url }, $set: { updatedBy: req.user.userId } },
      { new: true }
    );
    if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
    res.status(201).json({ message: 'Photo added', milestone });
  } catch (e) {
    console.error('Upload milestone photo error:', e);
    res.status(500).json({ message: 'Server error uploading photo' });
  }
});

// List milestones (for parent reports)
router.get('/milestones', auth, async (req, res) => {
  try {
    const { child, from, to, category } = req.query || {};
    const q = {};
    if (child) q.child = child;
    if (category) q.category = category;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }
    const items = await Milestone.find(q).sort({ date: -1 });
    res.json({ items });
  } catch (e) {
    console.error('List milestones error:', e);
    res.status(500).json({ message: 'Server error fetching milestones' });
  }
});

module.exports = router;