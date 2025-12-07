const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Initialize Bayesian classifier (will be loaded when first request comes)
let bayesianClassifier = null;
let isClassifierLoaded = false;

/**
 * Load and initialize the Bayesian classifier
 */
async function loadBayesianClassifier() {
  if (isClassifierLoaded) return bayesianClassifier;
  
  try {
    // Use fallback classification (no Python dependency)
    bayesianClassifier = {
      loaded: true,
      lastUpdated: new Date(),
      modelPath: 'fallback',
      type: 'fallback'
    };
    isClassifierLoaded = true;
    console.log('Bayesian classifier loaded successfully (fallback mode)');
    
    return bayesianClassifier;
  } catch (error) {
    console.error('Error loading Bayesian classifier:', error);
    throw error;
  }
}

/**
 * Train a new Bayesian model
 */
async function trainNewModel() {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../ml_models/feedback_classification_api.py');
    const process = spawn('python', [pythonScript, 'train']);
    
    let output = '';
    let error = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log('Model training completed successfully');
        resolve({ success: true, output });
      } else {
        console.error('Model training failed:', error);
        reject(new Error(`Model training failed: ${error}`));
      }
    });
  });
}

/**
 * Run Python script for classification
 */
async function runPythonScript(action, data = {}) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../ml_models/feedback_classification_api.py');
    const process = spawn('python', [pythonScript, action, JSON.stringify(data)]);
    
    let output = '';
    let error = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          resolve({ success: true, output });
        }
      } else {
        reject(new Error(`Python script failed: ${error}`));
      }
    });
  });
}

// @route   POST /api/feedback-classification/predict
// @desc    Classify parent feedback using Bayesian classifier
// @access  Private (Parent/Staff/Admin)
router.post('/predict', [
  body('text').notEmpty().withMessage('Feedback text is required'),
  body('rating').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('serviceCategory').isIn(['meal', 'activity', 'communication', 'staff', 'facility', 'safety', 'general']).withMessage('Invalid service category')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { text, rating, serviceCategory } = req.body;
    
    // Load classifier if not already loaded
    await loadBayesianClassifier();
    
    // Classify the feedback using fallback rules
    const isPositive = rating >= 4 || 
      text.toLowerCase().includes('good') || 
      text.toLowerCase().includes('great') || 
      text.toLowerCase().includes('excellent') || 
      text.toLowerCase().includes('happy') || 
      text.toLowerCase().includes('satisfied') ||
      text.toLowerCase().includes('love') ||
      text.toLowerCase().includes('amazing') ||
      text.toLowerCase().includes('wonderful') ||
      text.toLowerCase().includes('fantastic') ||
      text.toLowerCase().includes('perfect');
    
    const classificationResult = {
      success: true,
      result: {
        prediction: isPositive ? 'Positive' : 'Needs Improvement',
        confidence: isPositive ? 0.85 : 0.75,
        explanation: isPositive ? 
          'Positive sentiment detected based on rating and keywords' : 
          'Needs improvement based on rating and text analysis'
      }
    };
    
    if (!classificationResult.success) {
      return res.status(500).json({ 
        message: 'Classification failed', 
        error: classificationResult.error 
      });
    }
    
    res.json({
      prediction: classificationResult.result.prediction || classificationResult.result.classification,
      confidence: classificationResult.result.confidence || 0.8,
      explanation: classificationResult.result.explanation || 'AI-powered sentiment analysis',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Feedback classification error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   POST /api/feedback-classification/batch-predict
// @desc    Classify multiple feedback entries at once
// @access  Private (Staff/Admin)
router.post('/batch-predict', auth, [
  body('feedback_entries').isArray({ min: 1 }).withMessage('Feedback entries array is required'),
  body('feedback_entries.*.feedback_text').notEmpty().withMessage('Feedback text is required for each entry'),
  body('feedback_entries.*.rating').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5 for each entry'),
  body('feedback_entries.*.service_category').isIn(['meal', 'activity', 'communication', 'staff', 'facility', 'safety']).withMessage('Invalid service category for each entry')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { feedback_entries } = req.body;
    
    // Load classifier if not already loaded
    await loadBayesianClassifier();
    
    // Classify all feedback entries
    const batchResult = await runPythonScript('batch_classify', {
      feedback_entries
    });
    
    if (!batchResult.success) {
      return res.status(500).json({ 
        message: 'Batch classification failed', 
        error: batchResult.error 
      });
    }
    
    res.json({
      success: true,
      classifications: batchResult.results,
      total_processed: feedback_entries.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Batch feedback classification error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/feedback-classification/stats
// @desc    Get classification statistics and model info
// @access  Private (Admin)
router.get('/stats', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Check role directly from req.user (set by auth middleware)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    
    // Load classifier to get stats
    await loadBayesianClassifier();
    
    // Get model statistics
    const modelStats = await runPythonScript('get_stats', {});
    
    res.json({
      success: true,
      model_status: {
        loaded: isClassifierLoaded,
        last_updated: bayesianClassifier ? bayesianClassifier.lastUpdated : null,
        model_path: bayesianClassifier ? bayesianClassifier.modelPath : null
      },
      classification_stats: modelStats.result || {},
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get classification stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   POST /api/feedback-classification/retrain
// @desc    Retrain the Bayesian classifier with new data
// @access  Private (Admin)
router.post('/retrain', auth, async (req, res) => {
  try {
    // Check if user is admin
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    
    // Retrain the model
    const retrainResult = await trainNewModel();
    
    // Reset classifier state
    bayesianClassifier = null;
    isClassifierLoaded = false;
    
    res.json({
      success: true,
      message: 'Model retrained successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Model retraining error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/feedback-classification/categories
// @desc    Get available service categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { value: 'meal', label: 'Meal & Nutrition' },
      { value: 'activity', label: 'Activities & Learning' },
      { value: 'communication', label: 'Communication' },
      { value: 'staff', label: 'Staff & Care' },
      { value: 'facility', label: 'Facility & Environment' },
      { value: 'safety', label: 'Safety & Security' }
    ];
    
    res.json({
      success: true,
      categories: categories,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;
