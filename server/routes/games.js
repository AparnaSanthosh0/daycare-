const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// ── Schemas ──────────────────────────────────────────────────────────────────
if (mongoose.models.Game) delete mongoose.models['Game'];
const gameSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  ageGroup:    { type: String, default: 'All Ages' },
  category:    { type: String, default: 'General' },
  gameRoute:   { type: String, default: '' },   // internal path e.g. /drag-match
  emoji:       { type: String, default: '🎮' },
  thumbnail:   { type: String, default: '' },
  isBuiltIn:   { type: Boolean, default: true },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now }
});
const Game = mongoose.model('Game', gameSchema);

if (mongoose.models.GameAssignment) delete mongoose.models['GameAssignment'];
const assignmentSchema = new mongoose.Schema({
  gameId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
  childId:      { type: mongoose.Schema.Types.ObjectId, required: true },
  childName:    { type: String },
  assignedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignerName: { type: String },
  assignedAt:   { type: Date, default: Date.now },
  lastPlayedAt: { type: Date },
  playCount:    { type: Number, default: 0 },
  completed:    { type: Boolean, default: false },
  completedAt:  { type: Date },
  notes:        { type: String, default: '' }
});
const GameAssignment = mongoose.model('GameAssignment', assignmentSchema);

// ── Seed built-in games ───────────────────────────────────────────────────────
const BUILTIN_GAMES = [
  {
    title: 'Drag & Match Game',
    description: 'Match shapes, colors, and objects to learn!',
    ageGroup: 'Toddlers (3-5)',
    category: 'Cognitive',
    gameRoute: '/drag-match',
    emoji: '🧩',
    isBuiltIn: true
  },
  {
    title: 'Virtual Body Learning',
    description: 'Explore body parts in 3D and learn their functions!',
    ageGroup: 'Preschool (4-6)',
    category: 'Science',
    gameRoute: '/virtual-body-learning',
    emoji: '🫁',
    isBuiltIn: true
  },
  {
    title: 'Interactive Explorer',
    description: 'Explore in 2D or 360°! Zoom, rotate, and click objects to learn.',
    ageGroup: 'All Ages (3-7)',
    category: 'Exploration',
    gameRoute: '/vr-360',
    emoji: '🔍',
    isBuiltIn: true
  },
  {
    title: 'VR Story Experience',
    description: 'Immersive storytelling adventures with voice narration!',
    ageGroup: 'Toddlers (3-6)',
    category: 'Language & Stories',
    gameRoute: '/vr-story',
    emoji: '📖',
    isBuiltIn: true
  }
];

const seedBuiltInGames = async () => {
  try {
    const count = await Game.countDocuments({ isBuiltIn: true });
    if (count === 0) {
      await Game.insertMany(BUILTIN_GAMES);
      console.log('✅ Built-in games seeded');
    }
  } catch (err) {
    console.error('⚠️ Games seed error:', err.message);
  }
};
setTimeout(seedBuiltInGames, 3000); // seed after DB connects

// ── GET /api/games ────────────────────────────────────────────────────────────
// List all active games
router.get('/', auth, async (req, res) => {
  try {
    const games = await Game.find({ isActive: true }).sort({ isBuiltIn: -1, createdAt: -1 });
    res.json({ success: true, games });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch games', error: err.message });
  }
});

// ── POST /api/games/assign ────────────────────────────────────────────────────
// Teacher/Admin assigns a game to a child
router.post('/assign', auth, async (req, res) => {
  try {
    const { role } = req.user;
    if (!['admin', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Only teachers/admins can assign games' });
    }

    const { gameId, childId, childName, notes } = req.body;
    if (!gameId || !childId) {
      return res.status(400).json({ message: 'gameId and childId are required' });
    }

    // Check if already assigned
    const existing = await GameAssignment.findOne({ gameId, childId });
    if (existing) {
      return res.status(409).json({ message: 'Game already assigned to this child' });
    }

    const assignment = new GameAssignment({
      gameId,
      childId,
      childName: childName || '',
      assignedBy: req.user._id || req.user.id,
      assignerName: req.user.name || req.user.email || 'Teacher',
      notes: notes || ''
    });
    await assignment.save();

    // Populate game details for response
    await assignment.populate('gameId');
    res.status(201).json({ success: true, assignment });
  } catch (err) {
    res.status(500).json({ message: 'Assignment failed', error: err.message });
  }
});

// ── DELETE /api/games/assign/:assignmentId ─────────────────────────────────
// Remove assignment
router.delete('/assign/:assignmentId', auth, async (req, res) => {
  try {
    const { role } = req.user;
    if (!['admin', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Only teachers/admins can remove assignments' });
    }
    await GameAssignment.findByIdAndDelete(req.params.assignmentId);
    res.json({ success: true, message: 'Assignment removed' });
  } catch (err) {
    res.status(500).json({ message: 'Remove failed', error: err.message });
  }
});

// ── GET /api/games/assigned/:childId ─────────────────────────────────────────
// Get all games assigned to a specific child (for parent view)
router.get('/assigned/:childId', auth, async (req, res) => {
  try {
    const assignments = await GameAssignment.find({ childId: req.params.childId })
      .populate('gameId')
      .sort({ assignedAt: -1 });

    const result = assignments
      .filter(a => a.gameId && a.gameId.isActive)
      .map(a => ({
        assignmentId: a._id,
        game:         a.gameId,
        assignedBy:   a.assignerName,
        assignedAt:   a.assignedAt,
        lastPlayedAt: a.lastPlayedAt,
        playCount:    a.playCount,
        completed:    a.completed,
        notes:        a.notes
      }));

    res.json({ success: true, assignments: result });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch assignments', error: err.message });
  }
});

// ── GET /api/games/assignments (teacher view — all assignments for their children)
router.get('/assignments', auth, async (req, res) => {
  try {
    const { role } = req.user;
    if (!['admin', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const teacherId = req.user._id || req.user.id;
    const assignments = await GameAssignment.find({ assignedBy: teacherId })
      .populate('gameId')
      .sort({ assignedAt: -1 });

    res.json({ success: true, assignments });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch assignments', error: err.message });
  }
});

// ── PUT /api/games/play/:assignmentId ─────────────────────────────────────────
// Parent marks game as played (increments play count)
router.put('/play/:assignmentId', auth, async (req, res) => {
  try {
    const assignment = await GameAssignment.findByIdAndUpdate(
      req.params.assignmentId,
      {
        $inc: { playCount: 1 },
        lastPlayedAt: new Date()
      },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ success: true, assignment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update play count', error: err.message });
  }
});

module.exports = router;
