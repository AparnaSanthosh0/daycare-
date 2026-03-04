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
  gameRoute:   { type: String, default: '' },
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
  bestScore:    { type: Number, default: 0 },
  totalScore:   { type: Number, default: 0 },
  stars:        { type: Number, default: 0, min: 0, max: 3 },
  completed:    { type: Boolean, default: false },
  completedAt:  { type: Date },
  notes:        { type: String, default: '' }
});
const GameAssignment = mongoose.model('GameAssignment', assignmentSchema);

// ── GameSession Schema ────────────────────────────────────────────────────────
if (mongoose.models.GameSession) delete mongoose.models['GameSession'];
const gameSessionSchema = new mongoose.Schema({
  childId:      { type: mongoose.Schema.Types.ObjectId, required: true },
  childName:    { type: String, default: '' },
  gameId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
  gameName:     { type: String, default: '' },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'GameAssignment' },
  score:        { type: Number, default: 0 },
  maxScore:     { type: Number, default: 100 },
  stars:        { type: Number, default: 0, min: 0, max: 3 },
  level:        { type: Number, default: 1 },
  gameType:     { type: String, default: '' },
  duration:     { type: Number, default: 0 },   // seconds
  mode:         { type: String, enum: ['practice', 'classroom'], default: 'practice' },
  completedAt:  { type: Date, default: Date.now }
});
const GameSession = mongoose.model('GameSession', gameSessionSchema);

// ── ClassroomSession Schema ───────────────────────────────────────────────────
if (mongoose.models.ClassroomSession) delete mongoose.models['ClassroomSession'];
const classroomSchema = new mongoose.Schema({
  gameId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
  gameName:     { type: String, default: '' },
  gameEmoji:    { type: String, default: '🎮' },
  gameRoute:    { type: String, default: '' },
  teacherId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teacherName:  { type: String, default: '' },
  ageGroup:     { type: String, default: 'All' },
  participants: [{
    childId:     { type: mongoose.Schema.Types.ObjectId },
    childName:   { type: String },
    performance: { type: String, enum: ['excellent', 'good', 'needs_practice', ''], default: '' }
  }],
  duration:     { type: Number, default: 0 },
  notes:        { type: String, default: '' },
  startTime:    { type: Date, default: Date.now },
  endTime:      { type: Date }
});
const ClassroomSession = mongoose.model('ClassroomSession', classroomSchema);

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
        bestScore:    a.bestScore || 0,
        totalScore:   a.totalScore || 0,
        stars:        a.stars || 0,
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
// Parent marks game as played — optionally saves score
router.put('/play/:assignmentId', auth, async (req, res) => {
  try {
    const { score, stars, level, gameType, duration } = req.body || {};
    const update = {
      $inc: { playCount: 1 },
      lastPlayedAt: new Date()
    };
    const assignment = await GameAssignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    if (score !== undefined) {
      update.$inc.totalScore = score;
      if (score > (assignment.bestScore || 0)) update.bestScore = score;
      const s = score >= 80 ? 3 : score >= 50 ? 2 : score > 0 ? 1 : 0;
      if (s > (assignment.stars || 0)) update.stars = s;
    }
    const updated = await GameAssignment.findByIdAndUpdate(req.params.assignmentId, update, { new: true });
    res.json({ success: true, assignment: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update play count', error: err.message });
  }
});

// ── POST /api/games/session ───────────────────────────────────────────────────
// Save a completed game session (score, stars, level, duration)
router.post('/session', auth, async (req, res) => {
  try {
    const { childId, childName, gameId, gameName, assignmentId,
            score, maxScore, stars, level, gameType, duration, mode } = req.body;
    if (!childId) return res.status(400).json({ message: 'childId required' });

    const session = new GameSession({
      childId, childName: childName || '',
      gameId, gameName: gameName || '',
      assignmentId,
      score: score || 0,
      maxScore: maxScore || 100,
      stars: stars || (score >= 80 ? 3 : score >= 50 ? 2 : score > 0 ? 1 : 0),
      level: level || 1,
      gameType: gameType || '',
      duration: duration || 0,
      mode: mode || 'practice'
    });
    await session.save();

    // Also update the assignment if provided
    if (assignmentId) {
      const s = session.stars;
      const update = { $inc: { playCount: 1, totalScore: score || 0 }, lastPlayedAt: new Date() };
      const existing = await GameAssignment.findById(assignmentId);
      if (existing) {
        if ((score || 0) > (existing.bestScore || 0)) update.bestScore = score || 0;
        if (s > (existing.stars || 0)) update.stars = s;
      }
      await GameAssignment.findByIdAndUpdate(assignmentId, update);
    }

    res.status(201).json({ success: true, session });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save session', error: err.message });
  }
});

// ── GET /api/games/scores/:childId ──────────────────────────────────────────
// Get child's score summary per game (for parent dashboard progress)
router.get('/scores/:childId', auth, async (req, res) => {
  try {
    const sessions = await GameSession.find({ childId: req.params.childId })
      .sort({ completedAt: -1 })
      .limit(100);

    // Aggregate per gameName
    const totals = {};
    for (const s of sessions) {
      const key = s.gameName || s.gameId?.toString() || 'Unknown';
      if (!totals[key]) {
        totals[key] = { gameName: key, gameId: s.gameId, totalScore: 0, bestScore: 0, playCount: 0, maxStars: 0, lastPlayed: s.completedAt };
      }
      totals[key].playCount += 1;
      totals[key].totalScore += s.score;
      if (s.score > totals[key].bestScore) totals[key].bestScore = s.score;
      if (s.stars > totals[key].maxStars) totals[key].maxStars = s.stars;
    }

    res.json({ success: true, scores: Object.values(totals), recentSessions: sessions.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch scores', error: err.message });
  }
});

// ── POST /api/games/classroom/start ─────────────────────────────────────────
// Teacher saves a completed classroom session
router.post('/classroom/start', auth, async (req, res) => {
  try {
    const { role } = req.user;
    if (!['admin', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Only teachers/admins can save classroom sessions' });
    }
    const { gameId, gameName, gameEmoji, gameRoute, ageGroup, participants, duration, notes } = req.body;

    const cs = new ClassroomSession({
      gameId,
      gameName: gameName || '',
      gameEmoji: gameEmoji || '🎮',
      gameRoute: gameRoute || '',
      teacherId: req.user._id || req.user.id,
      teacherName: req.user.name || req.user.email || 'Teacher',
      ageGroup: ageGroup || 'All',
      participants: participants || [],
      duration: duration || 0,
      notes: notes || '',
      endTime: new Date()
    });
    await cs.save();
    res.status(201).json({ success: true, session: cs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save classroom session', error: err.message });
  }
});

// ── GET /api/games/classroom/history ─────────────────────────────────────────
// Teacher's past classroom sessions
router.get('/classroom/history', auth, async (req, res) => {
  try {
    const { role } = req.user;
    if (!['admin', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const teacherId = req.user._id || req.user.id;
    const sessions = await ClassroomSession.find({ teacherId })
      .sort({ startTime: -1 })
      .limit(20);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch classroom history', error: err.message });
  }
});

// ── GET /api/games/classroom/child-progress ──────────────────────────────────
// Get child participation + performance across all classroom sessions (teacher view)
router.get('/classroom/child-progress', auth, async (req, res) => {
  try {
    const { role } = req.user;
    if (!['admin', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const teacherId = req.user._id || req.user.id;
    const sessions = await ClassroomSession.find({ teacherId }).sort({ startTime: -1 });

    // Aggregate per child
    const childMap = {};
    for (const s of sessions) {
      for (const p of s.participants || []) {
        const id = p.childId?.toString();
        if (!id) continue;
        if (!childMap[id]) childMap[id] = { childName: p.childName, sessions: 0, excellent: 0, good: 0, needs_practice: 0 };
        childMap[id].sessions += 1;
        if (p.performance) childMap[id][p.performance] = (childMap[id][p.performance] || 0) + 1;
      }
    }
    res.json({ success: true, progress: Object.entries(childMap).map(([id, v]) => ({ childId: id, ...v })) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch progress', error: err.message });
  }
});

module.exports = router;
