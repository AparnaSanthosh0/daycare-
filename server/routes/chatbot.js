const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const nlpService = require('../services/nlpService');
const User = require('../models/User');
const Child = require('../models/Child');

// Model to store chat history (in-memory for now, can be moved to MongoDB)
let chatSessions = new Map();

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * Clean up expired sessions
 */
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of chatSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      chatSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Get or create chat session
 */
const getOrCreateSession = (userId) => {
  const sessionId = `session_${userId}`;
  
  if (!chatSessions.has(sessionId)) {
    chatSessions.set(sessionId, {
      sessionId,
      userId,
      conversationHistory: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    });
  } else {
    const session = chatSessions.get(sessionId);
    session.lastActivity = Date.now();
  }
  
  return chatSessions.get(sessionId);
};

// @route   POST /api/chatbot/query
// @desc    Process parent query using GPT
// @access  Private (Parent/Staff)
router.post('/query', [
  auth,
  body('query').notEmpty().withMessage('Query is required'),
  body('query').isLength({ max: 1000 }).withMessage('Query too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { query } = req.body;
    const userId = req.user.userId;

    // Get user info for context
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get session and conversation history
    const session = getOrCreateSession(userId);
    
    // Build context
    const context = {
      conversationHistory: session.conversationHistory.slice(-10), // Last 10 messages
      userName: user.name,
      userRole: user.role
    };

    // If parent, get child info
    if (user.role === 'parent' && user.childId) {
      const child = await Child.findById(user.childId);
      if (child) {
        context.childName = child.name;
        context.childAge = child.age;
      }
    }

    // Process query using NLP service
    const response = await nlpService.processParentQuery(query, context);

    if (!response.success) {
      return res.status(500).json({ 
        message: 'Failed to process query',
        error: response.error,
        fallbackAnswer: response.fallbackAnswer
      });
    }

    // Update conversation history
    session.conversationHistory.push(
      { role: 'user', content: query },
      { role: 'assistant', content: response.answer }
    );

    // Keep only last 20 messages
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }

    res.json({
      success: true,
      answer: response.answer,
      sessionId: session.sessionId,
      timestamp: response.timestamp,
      usage: response.usage
    });

  } catch (error) {
    console.error('Chatbot query error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/chatbot/session
// @desc    Get current chat session history
// @access  Private
router.get('/session', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const session = getOrCreateSession(userId);

    res.json({
      success: true,
      sessionId: session.sessionId,
      conversationHistory: session.conversationHistory,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    });

  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   DELETE /api/chatbot/session
// @desc    Clear chat session
// @access  Private
router.delete('/session', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = `session_${userId}`;
    
    chatSessions.delete(sessionId);

    res.json({
      success: true,
      message: 'Chat session cleared'
    });

  } catch (error) {
    console.error('Session clear error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   POST /api/chatbot/quick-ask
// @desc    Quick query without session (stateless)
// @access  Private
router.post('/quick-ask', [
  auth,
  body('query').notEmpty().withMessage('Query is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { query } = req.body;

    // Process query without context
    const response = await nlpService.processParentQuery(query, {});

    if (!response.success) {
      return res.status(500).json({ 
        message: 'Failed to process query',
        error: response.error,
        fallbackAnswer: response.fallbackAnswer
      });
    }

    res.json({
      success: true,
      answer: response.answer,
      timestamp: response.timestamp
    });

  } catch (error) {
    console.error('Quick ask error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/chatbot/suggestions
// @desc    Get suggested queries for parents
// @access  Private (Parent)
router.get('/suggestions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can access suggestions' });
    }

    const suggestions = [
      {
        category: 'General',
        questions: [
          'What are your operating hours?',
          'What is your child-to-staff ratio?',
          'Do you provide meals and snacks?',
          'What is your illness policy?'
        ]
      },
      {
        category: 'Activities',
        questions: [
          'What activities do you offer for toddlers?',
          'Do you have outdoor play time?',
          'What learning programs are available?',
          'Can I see today\'s activity schedule?'
        ]
      },
      {
        category: 'Health & Safety',
        questions: [
          'What are your safety protocols?',
          'How do you handle emergencies?',
          'What vaccinations are required?',
          'Do you have a nurse on staff?'
        ]
      },
      {
        category: 'Billing',
        questions: [
          'What are your payment options?',
          'When are fees due?',
          'Do you offer sibling discounts?',
          'What is your late pickup policy?'
        ]
      },
      {
        category: 'Communication',
        questions: [
          'How do you communicate daily updates?',
          'How can I contact my child\'s teacher?',
          'Do you send progress reports?',
          'How do I schedule a parent-teacher meeting?'
        ]
      }
    ];

    res.json({
      success: true,
      suggestions: suggestions
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/chatbot/stats
// @desc    Get chatbot usage statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const stats = {
      activeSessions: chatSessions.size,
      totalSessions: chatSessions.size,
      sessions: []
    };

    for (const [sessionId, session] of chatSessions.entries()) {
      stats.sessions.push({
        sessionId,
        userId: session.userId,
        messageCount: session.conversationHistory.length,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        isActive: (Date.now() - session.lastActivity) < SESSION_TIMEOUT
      });
    }

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;
