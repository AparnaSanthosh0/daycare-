const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const nlpService = require('../services/nlpService');
const User = require('../models/User');

// Feedback storage in MongoDB
const mongoose = require('mongoose');

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['meal', 'activity', 'communication', 'staff', 'facility', 'safety', 'general', 'feedback', 'complaint', 'suggestion'],
    required: true 
  },
  subject: { type: String },
  text: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 },
  sentimentAnalysis: {
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
    confidence: { type: Number },
    keyTopics: [String],
    actionableItems: [String],
    summary: String,
    analyzedAt: Date,
    fallback: { type: Boolean, default: false }
  },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'in-progress', 'resolved'],
    default: 'pending'
  },
  adminNotes: String,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

if (mongoose.models.Feedback) {
  delete mongoose.models['Feedback'];
}
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Admin Notification Schema for feedback
const adminNotificationSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['meal', 'activity', 'communication', 'staff', 'facility', 'safety', 'general', 'feedback', 'complaint', 'suggestion'], 
    default: 'feedback'
  },
  feedbackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feedback', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  category: String,
  subject: String,
  message: String,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  read: { type: Boolean, default: false },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  response: String,
  respondedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// Force redefine to avoid stale cached schema
if (mongoose.models.AdminNotification) {
  delete mongoose.models['AdminNotification'];
}
const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

// @route   POST /api/sentiment/analyze
// @desc    Analyze sentiment of feedback using OpenAI
// @access  Private
router.post('/analyze', [
  auth,
  body('text').notEmpty().withMessage('Feedback text is required'),
  body('rating').optional().isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { text, rating } = req.body;

    // Analyze sentiment using NLP service
    const analysis = await nlpService.analyzeSentiment(text, rating);

    res.json({
      success: true,
      analysis: {
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        keyTopics: analysis.keyTopics,
        actionableItems: analysis.actionableItems,
        summary: analysis.summary,
        fallback: analysis.fallback || false
      },
      timestamp: analysis.timestamp
    });

  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   POST /api/sentiment/feedback
// @desc    Submit feedback with automatic sentiment analysis
// @access  Private (Parent)
router.post('/feedback', [
  auth,
  body('category').isIn(['meal', 'activity', 'communication', 'staff', 'facility', 'safety', 'general', 'feedback', 'complaint', 'suggestion']).withMessage('Invalid category'),
  body('subject').optional(),
  body('text').notEmpty().withMessage('Feedback text is required'),
  body('rating').optional().isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can submit feedback' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { category, subject, text, rating } = req.body;
    const userId = req.user.userId;

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build full name safely from firstName/lastName or fallback to email
    const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 
                     user.name || 
                     user.email || 
                     'Anonymous';

    // Analyze sentiment using fallback (rule-based, no OpenAI needed)
    let analysis;
    try {
      analysis = await nlpService.analyzeSentiment(text, rating);
    } catch (sentimentErr) {
      console.error('Sentiment analysis failed, using fallback:', sentimentErr.message);
    }
    
    // If sentiment analysis failed or returned nothing, use a simple rule-based fallback
    if (!analysis || !analysis.sentiment) {
      const lowerText = (text || '').toLowerCase();
      const negativeWords = ['bad', 'poor', 'terrible', 'unhappy', 'disappointed', 'complaint', 'issue', 'problem', 'wrong', 'worse'];
      const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'wonderful', 'amazing', 'perfect', 'best', 'thank'];
      const negCount = negativeWords.filter(w => lowerText.includes(w)).length;
      const posCount = positiveWords.filter(w => lowerText.includes(w)).length;
      analysis = {
        sentiment: negCount > posCount ? 'negative' : posCount > negCount ? 'positive' : 'neutral',
        confidence: 0.6,
        keyTopics: [],
        actionableItems: [],
        summary: 'Feedback received.',
        fallback: true
      };
    }

    // Create feedback entry
    const feedback = new Feedback({
      userId: userId,
      userName: userName,
      userRole: user.role,
      category: category,
      subject: subject || 'General Feedback',
      text: text,
      rating: rating || undefined,
      sentimentAnalysis: {
        sentiment: analysis.sentiment,
        confidence: analysis.confidence || 0.5,
        keyTopics: analysis.keyTopics || [],
        actionableItems: analysis.actionableItems || [],
        summary: analysis.summary || 'Feedback received',
        analyzedAt: new Date(),
        fallback: analysis.fallback || false
      },
      status: 'pending'
    });

    await feedback.save();

    // Create admin notification
    const priority = category === 'complaint' ? 'high' : 
                    analysis.sentiment === 'negative' ? 'medium' : 'low';

    const notification = new AdminNotification({
      type: category || 'feedback',
      feedbackId: feedback._id,
      userId: userId,
      userName: userName,
      category: category,
      subject: subject || 'General Feedback',
      message: text,
      priority: priority,
      read: false
    });

    await notification.save();

    // Also store in user communications for backward compatibility
    try {
      user.communications = Array.isArray(user.communications) ? user.communications : [];
      user.communications.push({ 
        channel: 'feedback', 
        subject: subject || 'General Feedback',
        notes: text, 
        by: userId, 
        date: new Date(),
        sentiment: analysis.sentiment
      });
      await user.save();
    } catch (commErr) {
      console.error('Failed to store communication, but feedback was saved:', commErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback._id,
        category: feedback.category,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        actionableItems: analysis.actionableItems
      }
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/sentiment/feedback
// @desc    Get all feedback (Admin/Staff)
// @access  Private (Admin/Staff)
router.get('/feedback', auth, async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin or staff access required' });
    }

    const { status, sentiment, category, limit = 50, skip = 0 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (sentiment) filter['sentimentAnalysis.sentiment'] = sentiment;
    if (category) filter.category = category;

    const feedback = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'name email')
      .populate('resolvedBy', 'name');

    const total = await Feedback.countDocuments(filter);

    res.json({
      success: true,
      feedback: feedback,
      pagination: {
        total: total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('Feedback fetch error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/sentiment/feedback/my
// @desc    Get my feedback (Parent)
// @access  Private (Parent)
router.get('/feedback/my', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Parent access required' });
    }

    const feedback = await Feedback.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      feedback: feedback
    });

  } catch (error) {
    console.error('My feedback fetch error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   PUT /api/sentiment/feedback/:id
// @desc    Update feedback status (Admin/Staff)
// @access  Private (Admin/Staff)
router.put('/feedback/:id', [
  auth,
  body('status').isIn(['pending', 'reviewed', 'in-progress', 'resolved']).withMessage('Invalid status'),
  body('adminNotes').optional()
], async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin or staff access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { status, adminNotes } = req.body;
    const feedbackId = req.params.id;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    feedback.status = status;
    if (adminNotes) feedback.adminNotes = adminNotes;
    feedback.updatedAt = new Date();

    if (status === 'resolved') {
      feedback.resolvedBy = req.user.userId;
      feedback.resolvedAt = new Date();
    }

    await feedback.save();

    res.json({
      success: true,
      message: 'Feedback updated successfully',
      feedback: feedback
    });

  } catch (error) {
    console.error('Feedback update error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/sentiment/summary
// @desc    Get sentiment summary and statistics
// @access  Private (Admin/Staff)
router.get('/summary', auth, async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin or staff access required' });
    }

    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get feedback in period
    const feedbackInPeriod = await Feedback.find({
      createdAt: { $gte: startDate }
    });

    // Calculate statistics
    const total = feedbackInPeriod.length;
    const positive = feedbackInPeriod.filter(f => f.sentimentAnalysis.sentiment === 'positive').length;
    const neutral = feedbackInPeriod.filter(f => f.sentimentAnalysis.sentiment === 'neutral').length;
    const negative = feedbackInPeriod.filter(f => f.sentimentAnalysis.sentiment === 'negative').length;

    const avgRating = feedbackInPeriod.reduce((sum, f) => sum + (f.rating || 0), 0) / (feedbackInPeriod.filter(f => f.rating).length || 1);

    // Get top topics
    const topicsMap = {};
    feedbackInPeriod.forEach(f => {
      if (f.sentimentAnalysis.keyTopics) {
        f.sentimentAnalysis.keyTopics.forEach(topic => {
          topicsMap[topic] = (topicsMap[topic] || 0) + 1;
        });
      }
    });

    const topTopics = Object.entries(topicsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    // Get actionable items
    const actionableMap = {};
    feedbackInPeriod.forEach(f => {
      if (f.sentimentAnalysis.actionableItems) {
        f.sentimentAnalysis.actionableItems.forEach(item => {
          actionableMap[item] = (actionableMap[item] || 0) + 1;
        });
      }
    });

    const topActionableItems = Object.entries(actionableMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([item, count]) => ({ item, count }));

    // Category breakdown
    const categoryBreakdown = {};
    feedbackInPeriod.forEach(f => {
      if (!categoryBreakdown[f.category]) {
        categoryBreakdown[f.category] = { positive: 0, neutral: 0, negative: 0, total: 0 };
      }
      categoryBreakdown[f.category][f.sentimentAnalysis.sentiment]++;
      categoryBreakdown[f.category].total++;
    });

    // Status breakdown
    const statusBreakdown = {};
    feedbackInPeriod.forEach(f => {
      statusBreakdown[f.status] = (statusBreakdown[f.status] || 0) + 1;
    });

    res.json({
      success: true,
      period: `Last ${period} days`,
      summary: {
        total: total,
        positive: positive,
        neutral: neutral,
        negative: negative,
        positivePercentage: total > 0 ? ((positive / total) * 100).toFixed(1) : 0,
        negativePercentage: total > 0 ? ((negative / total) * 100).toFixed(1) : 0,
        averageRating: avgRating.toFixed(2)
      },
      topTopics: topTopics,
      topActionableItems: topActionableItems,
      categoryBreakdown: categoryBreakdown,
      statusBreakdown: statusBreakdown
    });

  } catch (error) {
    console.error('Summary fetch error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   POST /api/sentiment/summarize
// @desc    Summarize multiple feedback items using AI
// @access  Private (Admin/Staff)
router.post('/summarize', [
  auth,
  body('feedbackIds').isArray().withMessage('feedbackIds must be an array')
], async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin or staff access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { feedbackIds } = req.body;

    // Get feedback items
    const feedbackItems = await Feedback.find({
      _id: { $in: feedbackIds }
    });

    if (feedbackItems.length === 0) {
      return res.status(404).json({ message: 'No feedback found' });
    }

    // Prepare feedback list for summarization
    const feedbackList = feedbackItems.map(f => ({
      text: f.text,
      rating: f.rating,
      category: f.category,
      sentiment: f.sentimentAnalysis.sentiment
    }));

    // Summarize using NLP service
    const summary = await nlpService.summarizeFeedback(feedbackList);

    res.json({
      success: true,
      summary: summary.summary,
      totalCount: summary.totalCount,
      timestamp: summary.timestamp
    });

  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/sentiment/notifications
// @desc    Get admin notifications for feedback
// @access  Private (Admin/Staff)
router.get('/notifications', auth, async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin or staff access required' });
    }

    const { read, priority } = req.query;
    const filter = {};
    
    if (read !== undefined) {
      filter.read = read === 'true';
    }
    if (priority) {
      filter.priority = priority;
    }

    const notifications = await AdminNotification.find(filter)
      .populate('userId', 'name email')
      .populate('feedbackId')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      notifications: notifications,
      count: notifications.length
    });

  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   POST /api/sentiment/notifications/:id/respond
// @desc    Admin respond to feedback
// @access  Private (Admin/Staff)
router.post('/notifications/:id/respond', [
  auth,
  body('response').notEmpty().withMessage('Response is required')
], async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin or staff access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { response } = req.body;
    const notificationId = req.params.id;

    const notification = await AdminNotification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Update notification with response
    notification.response = response;
    notification.respondedBy = req.user.userId;
    notification.respondedAt = new Date();
    notification.read = true;
    await notification.save();

    // Update feedback status
    const feedback = await Feedback.findById(notification.feedbackId);
    if (feedback) {
      feedback.status = 'resolved';
      feedback.adminNotes = response;
      feedback.resolvedBy = req.user.userId;
      feedback.resolvedAt = new Date();
      await feedback.save();
    }

    // Add response to user's communications
    const user = await User.findById(notification.userId);
    if (user) {
      user.communications = Array.isArray(user.communications) ? user.communications : [];
      user.communications.push({
        channel: 'admin_response',
        subject: `Re: ${notification.subject}`,
        notes: response,
        by: req.user.userId,
        date: new Date()
      });
      await user.save();
    }

    res.json({
      success: true,
      message: 'Response sent successfully',
      notification: notification
    });

  } catch (error) {
    console.error('Response send error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/sentiment/feedback/responses
// @desc    Get feedback responses for parent
// @access  Private (Parent)
router.get('/feedback/responses', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Parent access required' });
    }

    const responses = await AdminNotification.find({
      userId: req.user.userId,
      response: { $exists: true, $ne: null }
    })
      .populate('respondedBy', 'name role')
      .sort({ respondedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      responses: responses,
      count: responses.length
    });

  } catch (error) {
    console.error('Responses fetch error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;
module.exports.Feedback = Feedback;
module.exports.AdminNotification = AdminNotification;
