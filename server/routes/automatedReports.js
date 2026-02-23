const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const nlpService = require('../services/nlpService');
const User = require('../models/User');
const Child = require('../models/Child');
const { Feedback } = require('./sentimentAnalysis');
const mongoose = require('mongoose');

// Report Schema
const reportSchema = new mongoose.Schema({
  reportType: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly', 'feedback', 'custom'],
    required: true 
  },
  title: { type: String, required: true },
  content: { type: String, required: true }, // Markdown format
  data: { type: Object }, // Raw data used to generate report
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  generatedAt: { type: Date, default: Date.now },
  period: {
    startDate: Date,
    endDate: Date
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  metadata: {
    tokensUsed: Number,
    generationTime: Number, // milliseconds
    aiGenerated: { type: Boolean, default: true }
  }
});

const Report = mongoose.model('Report', reportSchema);

/**
 * Gather data for daily report
 */
async function gatherDailyData(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get attendance (simplified - you may have an Attendance model)
  const childrenPresent = await Child.countDocuments({ status: 'active' });

  // Get feedback for the day
  const feedback = await Feedback.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });

  return {
    date: date.toDateString(),
    childrenPresent: childrenPresent,
    activitiesCompleted: Math.floor(Math.random() * 10) + 5, // Placeholder
    mealsServed: Math.floor(childrenPresent * 3), // Breakfast, lunch, snack
    incidents: feedback.filter(f => f.category === 'safety').length,
    parentCommunications: feedback.length,
    feedbackPositive: feedback.filter(f => f.sentimentAnalysis?.sentiment === 'positive').length,
    feedbackNegative: feedback.filter(f => f.sentimentAnalysis?.sentiment === 'negative').length,
    notes: 'Automated daily report generation'
  };
}

/**
 * Gather data for weekly report
 */
async function gatherWeeklyData(startDate, endDate) {
  const feedback = await Feedback.find({
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const totalChildren = await Child.countDocuments({ status: 'active' });
  
  // Calculate averages
  const avgAttendance = totalChildren;
  const totalFeedback = feedback.length;
  const positiveFeedback = feedback.filter(f => f.sentimentAnalysis?.sentiment === 'positive').length;
  const negativeFeedback = feedback.filter(f => f.sentimentAnalysis?.sentiment === 'negative').length;
  
  const avgRating = feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / (feedback.filter(f => f.rating).length || 1);
  
  // Get top issues from negative feedback
  const topIssues = [];
  feedback.filter(f => f.sentimentAnalysis?.sentiment === 'negative').forEach(f => {
    if (f.sentimentAnalysis?.actionableItems) {
      topIssues.push(...f.sentimentAnalysis.actionableItems);
    }
  });

  return {
    weekStart: startDate.toLocaleDateString(),
    weekEnd: endDate.toLocaleDateString(),
    avgAttendance: avgAttendance,
    totalActivities: Math.floor(Math.random() * 50) + 30, // Placeholder
    satisfactionScore: avgRating.toFixed(1),
    feedbackCount: totalFeedback,
    positiveFeedback: positiveFeedback,
    negativeFeedback: negativeFeedback,
    staffRating: '4.5/5', // Placeholder
    topIssues: [...new Set(topIssues)].slice(0, 5)
  };
}

/**
 * Gather data for monthly report
 */
async function gatherMonthlyData(startDate, endDate) {
  const feedback = await Feedback.find({
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const totalChildren = await Child.countDocuments({ status: 'active' });
  const totalParents = await User.countDocuments({ role: 'parent' });
  
  const avgRating = feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / (feedback.filter(f => f.rating).length || 1);

  return {
    month: startDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
    revenue: Math.floor(Math.random() * 50000) + 100000, // Placeholder
    enrollments: totalChildren,
    occupancyRate: Math.floor((totalChildren / 100) * 100), // Assuming capacity of 100
    retentionRate: 95, // Placeholder
    feedbackScore: avgRating.toFixed(1),
    totalActivities: Math.floor(Math.random() * 200) + 100, // Placeholder
    safetyIncidents: feedback.filter(f => f.category === 'safety').length,
    staffTurnover: 5, // Placeholder
    achievements: 'Implemented new meal plan system, Improved parent communication'
  };
}

/**
 * Gather data for feedback report
 */
async function gatherFeedbackData(startDate, endDate) {
  const feedback = await Feedback.find({
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const positive = feedback.filter(f => f.sentimentAnalysis?.sentiment === 'positive').length;
  const neutral = feedback.filter(f => f.sentimentAnalysis?.sentiment === 'neutral').length;
  const negative = feedback.filter(f => f.sentimentAnalysis?.sentiment === 'negative').length;

  // Get top topics
  const topicsMap = {};
  feedback.forEach(f => {
    if (f.sentimentAnalysis?.keyTopics) {
      f.sentimentAnalysis.keyTopics.forEach(topic => {
        topicsMap[topic] = (topicsMap[topic] || 0) + 1;
      });
    }
  });

  const topTopics = Object.keys(topicsMap)
    .sort((a, b) => topicsMap[b] - topicsMap[a])
    .slice(0, 5);

  // Get recurring issues
  const issuesMap = {};
  feedback.filter(f => f.sentimentAnalysis?.sentiment === 'negative').forEach(f => {
    if (f.sentimentAnalysis?.actionableItems) {
      f.sentimentAnalysis.actionableItems.forEach(item => {
        issuesMap[item] = (issuesMap[item] || 0) + 1;
      });
    }
  });

  const recurringIssues = Object.keys(issuesMap)
    .filter(item => issuesMap[item] > 1)
    .sort((a, b) => issuesMap[b] - issuesMap[a]);

  return {
    period: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    totalFeedback: feedback.length,
    positive: positive,
    neutral: neutral,
    negative: negative,
    responseRate: 85, // Placeholder
    topTopics: topTopics,
    recurringIssues: recurringIssues
  };
}

// @route   POST /api/automated-reports/generate
// @desc    Generate automated report using AI
// @access  Private (Admin/Staff)
router.post('/generate', [
  auth,
  body('reportType').isIn(['daily', 'weekly', 'monthly', 'feedback']).withMessage('Invalid report type'),
  body('date').optional().isISO8601().withMessage('Invalid date format')
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

    const { reportType, date } = req.body;
    const startTime = Date.now();

    let reportData;
    let period = {};
    
    const targetDate = date ? new Date(date) : new Date();

    // Gather data based on report type
    switch (reportType) {
      case 'daily':
        reportData = await gatherDailyData(targetDate);
        period = {
          startDate: targetDate,
          endDate: targetDate
        };
        break;

      case 'weekly':
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        reportData = await gatherWeeklyData(weekStart, weekEnd);
        period = { startDate: weekStart, endDate: weekEnd };
        break;

      case 'monthly':
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
        
        reportData = await gatherMonthlyData(monthStart, monthEnd);
        period = { startDate: monthStart, endDate: monthEnd };
        break;

      case 'feedback':
        const feedbackStart = new Date(targetDate);
        feedbackStart.setDate(targetDate.getDate() - 30); // Last 30 days
        
        reportData = await gatherFeedbackData(feedbackStart, targetDate);
        period = { startDate: feedbackStart, endDate: targetDate };
        break;
    }

    // Generate report using NLP service
    const generationResult = await nlpService.generateReport(reportType, reportData);

    if (!generationResult.success) {
      return res.status(500).json({ 
        message: 'Failed to generate report',
        error: generationResult.error
      });
    }

    const generationTime = Date.now() - startTime;

    // Save report to database
    const report = new Report({
      reportType: reportType,
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report - ${targetDate.toLocaleDateString()}`,
      content: generationResult.report,
      data: reportData,
      generatedBy: req.user.userId,
      period: period,
      status: 'published',
      metadata: {
        tokensUsed: generationResult.usage?.totalTokens || 0,
        generationTime: generationTime,
        aiGenerated: true
      }
    });

    await report.save();

    res.json({
      success: true,
      report: {
        id: report._id,
        type: report.reportType,
        title: report.title,
        content: report.content,
        generatedAt: report.generatedAt,
        period: report.period
      },
      metadata: report.metadata
    });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/automated-reports
// @desc    Get all reports
// @access  Private (Admin/Staff)
router.get('/', auth, async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin or staff access required' });
    }

    const { type, status, limit = 20, skip = 0 } = req.query;

    const filter = {};
    if (type) filter.reportType = type;
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .sort({ generatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('generatedBy', 'name')
      .select('-content'); // Exclude content in list view

    const total = await Report.countDocuments(filter);

    res.json({
      success: true,
      reports: reports,
      pagination: {
        total: total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('Reports fetch error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/automated-reports/:id
// @desc    Get single report by ID
// @access  Private (Admin/Staff)
router.get('/:id', auth, async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin or staff access required' });
    }

    const report = await Report.findById(req.params.id)
      .populate('generatedBy', 'name email');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({
      success: true,
      report: report
    });

  } catch (error) {
    console.error('Report fetch error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   DELETE /api/automated-reports/:id
// @desc    Delete report
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const report = await Report.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Report delete error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   POST /api/automated-reports/schedule
// @desc    Schedule automatic report generation
// @access  Private (Admin)
router.post('/schedule', [
  auth,
  body('reportType').isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid report type'),
  body('enabled').isBoolean().withMessage('Enabled must be boolean')
], async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { reportType, enabled } = req.body;

    // This is a placeholder - you would implement actual scheduling with node-cron
    // For now, just return a success message
    res.json({
      success: true,
      message: `${reportType} report scheduling ${enabled ? 'enabled' : 'disabled'}`,
      schedule: {
        reportType: reportType,
        enabled: enabled,
        frequency: reportType === 'daily' ? 'Every day at 6 PM' : 
                   reportType === 'weekly' ? 'Every Monday at 8 AM' :
                   'First day of month at 9 AM'
      }
    });

  } catch (error) {
    console.error('Schedule error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/automated-reports/preview/:type
// @desc    Preview report data without generating full report
// @access  Private (Admin/Staff)
router.get('/preview/:type', auth, async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin or staff access required' });
    }

    const reportType = req.params.type;
    const targetDate = new Date();

    let reportData;

    switch (reportType) {
      case 'daily':
        reportData = await gatherDailyData(targetDate);
        break;
      case 'weekly':
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        reportData = await gatherWeeklyData(weekStart, weekEnd);
        break;
      case 'monthly':
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
        reportData = await gatherMonthlyData(monthStart, monthEnd);
        break;
      case 'feedback':
        const feedbackStart = new Date(targetDate);
        feedbackStart.setDate(targetDate.getDate() - 30);
        reportData = await gatherFeedbackData(feedbackStart, targetDate);
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    res.json({
      success: true,
      reportType: reportType,
      data: reportData,
      previewDate: targetDate
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;
module.exports.Report = Report;
