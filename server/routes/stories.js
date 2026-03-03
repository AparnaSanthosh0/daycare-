const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// ── Upload folder ────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'stories');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Multer config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `story-${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /mp4|webm|ogg|mov|avi|mkv/i;
    const ext = path.extname(file.originalname).replace('.', '');
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, webm, ogg, mov, avi, mkv)'));
    }
  }
});

// ── Mongoose Schema ──────────────────────────────────────────────────────────
const storySchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  ageGroup:    { type: String, default: 'All Ages' },
  category:    { type: String, default: 'General' },
  filename:    { type: String, required: true },
  originalName:{ type: String },
  fileSize:    { type: Number },
  mimeType:    { type: String },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploaderName:{ type: String },
  views:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now }
});

// Force-redefine to avoid stale cached schema
if (mongoose.models.Story) delete mongoose.models['Story'];
const Story = mongoose.model('Story', storySchema);

// ── POST /api/stories/upload ─────────────────────────────────────────────────
// Upload a new story video  (Admin / Staff only)
router.post('/upload', auth, upload.single('video'), async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      // Remove uploaded file if not authorised
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Admin or staff access required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    const { title, description, ageGroup, category } = req.body;
    if (!title || !title.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Story title is required' });
    }

    const story = new Story({
      title:        title.trim(),
      description:  description || '',
      ageGroup:     ageGroup || 'All Ages',
      category:     category || 'General',
      filename:     req.file.filename,
      originalName: req.file.originalname,
      fileSize:     req.file.size,
      mimeType:     req.file.mimetype,
      uploadedBy:   req.user.userId,
      uploaderName: req.user.name || req.user.email || 'Staff'
    });

    await story.save();

    res.status(201).json({
      success: true,
      message: 'Video story uploaded successfully!',
      story: {
        ...story.toObject(),
        videoUrl: `/uploads/stories/${story.filename}`
      }
    });

  } catch (err) {
    console.error('Story upload error:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// ── GET /api/stories ─────────────────────────────────────────────────────────
// Get all active stories  (any authenticated user)
router.get('/', auth, async (req, res) => {
  try {
    const stories = await Story.find({ isActive: true })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      stories: stories.map(s => ({
        ...s.toObject(),
        videoUrl: `/uploads/stories/${s.filename}`
      })),
      count: stories.length
    });
  } catch (err) {
    console.error('Story fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch stories', error: err.message });
  }
});

// ── GET /api/stories/:id ──────────────────────────────────────────────────────
// Get single story and increment view count
router.get('/:id', auth, async (req, res) => {
  try {
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!story || !story.isActive) {
      return res.status(404).json({ message: 'Story not found' });
    }
    res.json({
      success: true,
      story: {
        ...story.toObject(),
        videoUrl: `/uploads/stories/${story.filename}`
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PUT /api/stories/:id ──────────────────────────────────────────────────────
// Update story metadata  (Admin / Staff only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin or staff access required' });
    }
    const { title, description, ageGroup, category, isActive } = req.body;
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { title, description, ageGroup, category, isActive },
      { new: true, runValidators: true }
    );
    if (!story) return res.status(404).json({ message: 'Story not found' });
    res.json({ success: true, message: 'Story updated', story });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── DELETE /api/stories/:id ───────────────────────────────────────────────────
// Delete story  (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const story = await Story.findByIdAndDelete(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    // Remove file from disk
    const filePath = path.join(UPLOAD_DIR, story.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ success: true, message: 'Story deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
