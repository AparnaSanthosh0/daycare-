const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Child = require('../models/Child');
const AdmissionRequest = require('../models/AdmissionRequest');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const User = require('../models/User');

// Get children for logged-in parent
router.get('/me/children', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can access their children' });
    }

    const children = await Child.find({ parents: req.user.userId })
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json(children);
  } catch (error) {
    console.error('Get my children error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit admission for additional child (parent can add multiple)
router.post('/me/admissions', auth, [
  body('childName').trim().notEmpty().withMessage("Child name is required"),
  body('childDob').notEmpty().withMessage('Date of birth is required'),
  body('childGender').isIn(['male', 'female']).withMessage('Gender must be male or female'),
  body('program').optional().isIn(['infant', 'toddler', 'preschool', 'prekindergarten']).withMessage('Invalid program'),
  body('medicalInfo').optional().isString(),
  body('emergencyContactName').optional().isString(),
  body('emergencyContactPhone').optional().matches(/^\d{10}$/).withMessage('Emergency contact phone must be 10 digits')
], async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can submit admissions' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { childName, childDob, childGender, program, medicalInfo, emergencyContactName, emergencyContactPhone } = req.body || {};

    const dob = new Date(childDob);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({ message: 'Invalid date of birth' });
    }
    const today = new Date();
    const minDob = new Date(today.getFullYear() - 7, today.getMonth(), today.getDate());
    const maxDob = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    if (!(dob >= minDob && dob <= maxDob)) {
      return res.status(400).json({ message: 'Child age must be between 1 and 7 years' });
    }

    const admission = await AdmissionRequest.create({
      parentUser: req.user.userId,
      child: {
        name: childName,
        dateOfBirth: dob,
        gender: childGender,
        program: program || null,
        medicalInfo: medicalInfo || '',
        emergencyContactName: emergencyContactName || '',
        emergencyContactPhone: emergencyContactPhone || ''
      },
      status: 'pending'
    });

    res.status(201).json({ message: 'Admission submitted', admission });
  } catch (error) {
    console.error('Submit admission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// List my admissions
router.get('/me/admissions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can view admissions' });
    }

    const admissions = await AdmissionRequest.find({ parentUser: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(admissions);
  } catch (error) {
    console.error('List admissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my communications history (feedback/notes stored on user)
router.get('/me/communications', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ message: 'Only parents can view this' });
    const parent = await User.findById(req.user.userId).select('communications');
    res.json(parent?.communications || []);
  } catch (error) {
    console.error('List communications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Parent messaging: list my messages
router.get('/me/messages', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ message: 'Only parents can view messages' });
    const items = await Message.find({ from: req.user.userId }).sort({ createdAt: -1 }).limit(100);
    res.json(items);
  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Parent messaging: send message
router.post('/me/messages', auth, [
  body('to').isIn(['staff', 'admin']).withMessage('Invalid recipient'),
  body('subject').notEmpty().withMessage('Subject required'),
  body('body').notEmpty().withMessage('Message body required')
], async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ message: 'Only parents can send messages' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const item = await Message.create({ from: req.user.userId, to: req.body.to, subject: req.body.subject, body: req.body.body });
    res.status(201).json({ message: 'Sent', item });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Parent feedback submission (store under communications for now)
router.post('/me/feedback', auth, [
  body('category').isIn(['feedback','complaint','suggestion']).withMessage('Invalid category'),
  body('subject').notEmpty().withMessage('Subject required'),
  body('details').notEmpty().withMessage('Details required')
], async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ message: 'Only parents can submit feedback' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const parent = await User.findById(req.user.userId);
    parent.communications = Array.isArray(parent.communications) ? parent.communications : [];
    parent.communications.push({ channel: req.body.category, subject: req.body.subject, notes: req.body.details, by: req.user.userId, date: new Date() });
    await parent.save();
    res.status(201).json({ message: 'Feedback submitted' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;