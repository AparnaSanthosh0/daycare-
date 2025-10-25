const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireChildProfile } = require('../middleware/auth');
const Child = require('../models/Child');
const User = require('../models/User');
const AdmissionRequest = require('../models/AdmissionRequest');
const { body, validationResult } = require('express-validator');
const Attendance = require('../models/Attendance');

// Get children for logged-in parent
router.get('/me/children', auth, requireChildProfile, async (req, res) => {
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
    if (!parent) {
      return res.status(404).json({ message: 'Parent user not found' });
    }
    
    parent.communications = Array.isArray(parent.communications) ? parent.communications : [];
    parent.communications.push({ 
      channel: 'feedback', 
      subject: req.body.subject, 
      notes: req.body.details, 
      by: req.user.userId, 
      date: new Date() 
    });
    
    await parent.save();
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
router.get('/me/attendance', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can view attendance' });
    }

    // Check if parent has active children
    const children = await Child.find({ 
      parents: req.user.userId,
      isActive: true 
    }).select('_id firstName lastName');

    if (children.length === 0) {
      return res.status(404).json({ 
        message: 'No active children found. Please ensure your child profile is created and approved.' 
      });
    }

    const childIds = children.map(child => child._id);
    
    // Get attendance records for parent's children
    const { from, to, childId } = req.query || {};
    
    const query = {
      entityType: 'child',
      entityId: childId ? 
        (childIds.includes(childId) ? childId : null) : 
        { $in: childIds }
    };

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    // Only show attendance records marked by staff members
    const staffUsers = await User.find({ role: 'staff' }).select('_id');
    const staffIds = staffUsers.map(u => u._id);
    
    query.createdBy = { $in: staffIds }; // Only records created by staff

    const attendance = await Attendance.find(query)
      .populate('entityId', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ date: -1 })
      .limit(100); // Limit for performance

    // Format response to include child names
    const formattedAttendance = attendance.map(record => ({
      ...record.toObject(),
      childName: record.entityId ? `${record.entityId.firstName} ${record.entityId.lastName}` : 'Unknown'
    }));

    res.json({
      children,
      attendance: formattedAttendance,
      total: formattedAttendance.length
    });
  } catch (error) {
    console.error('Get parent attendance error:', error);
    res.status(500).json({ message: 'Server error fetching attendance' });
  }
});

// Get attendance for a specific child
router.get('/me/attendance/:childId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can view attendance' });
    }

    const { childId } = req.params;
    const { from, to } = req.query || {};

    // Verify the child belongs to this parent and is active
    const child = await Child.findOne({
      _id: childId,
      parents: req.user.userId,
      isActive: true
    }).select('_id firstName lastName');

    if (!child) {
      return res.status(404).json({ 
        message: 'Child not found or not associated with your account' 
      });
    }

    const query = {
      entityType: 'child',
      entityId: childId
    };

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(50);

    res.json({
      child,
      attendance,
      total: attendance.length
    });
  } catch (error) {
    console.error('Get child attendance error:', error);
    res.status(500).json({ message: 'Server error fetching child attendance' });
  }
});

module.exports = router;
