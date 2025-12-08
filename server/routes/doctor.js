const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const User = require('../models/User');
const Child = require('../models/Child');

// Middleware to check if user is a doctor
const doctorOnly = [
  auth,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user || user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied. Doctor access required.' });
      }
      req.doctor = user;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error verifying doctor access' });
    }
  }
];

// Get doctor's assigned children
router.get('/children', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId)
      .populate('doctor.assignedChildren', 'firstName lastName dateOfBirth gender program profileImage');
    
    if (!doctor || !doctor.doctor) {
      return res.json([]);
    }

    const children = await Child.find({
      _id: { $in: doctor.doctor.assignedChildren || [] },
      isActive: true
    })
      .populate('parents', 'firstName lastName email phone')
      .select('firstName lastName dateOfBirth gender program allergies medicalConditions emergencyContacts authorizedPickup notes profileImage enrollmentDate')
      .sort({ firstName: 1 });

    res.json(children);
  } catch (error) {
    console.error('Get assigned children error:', error);
    res.status(500).json({ message: 'Server error fetching assigned children' });
  }
});

// Get child medical details
router.get('/children/:childId', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId);
    if (!doctor || !doctor.doctor) {
      return res.status(403).json({ message: 'Doctor not found' });
    }

    // Check if child is assigned to this doctor
    const isAssigned = doctor.doctor.assignedChildren.some(
      childId => childId.toString() === req.params.childId
    );

    if (!isAssigned) {
      return res.status(403).json({ message: 'Child not assigned to this doctor' });
    }

    const child = await Child.findById(req.params.childId)
      .populate('parents', 'firstName lastName email phone address emergencyContact')
      .populate('assignedStaff', 'firstName lastName email phone')
      .select('-__v');

    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    res.json(child);
  } catch (error) {
    console.error('Get child details error:', error);
    res.status(500).json({ message: 'Server error fetching child details' });
  }
});

// Update child medical information
router.put('/children/:childId/medical', doctorOnly, [
  body('allergies').optional().isArray(),
  body('medicalConditions').optional().isArray(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await User.findById(req.user.userId);
    if (!doctor || !doctor.doctor) {
      return res.status(403).json({ message: 'Doctor not found' });
    }

    // Check if child is assigned to this doctor
    const isAssigned = doctor.doctor.assignedChildren.some(
      childId => childId.toString() === req.params.childId
    );

    if (!isAssigned) {
      return res.status(403).json({ message: 'Child not assigned to this doctor' });
    }

    const { allergies, medicalConditions, notes } = req.body;

    const child = await Child.findById(req.params.childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    if (allergies !== undefined) {
      child.allergies = Array.isArray(allergies) ? allergies : [];
    }
    if (medicalConditions !== undefined) {
      child.medicalConditions = Array.isArray(medicalConditions) 
        ? medicalConditions.map(mc => typeof mc === 'string' 
          ? { condition: mc, medication: '', instructions: '' }
          : mc)
        : [];
    }
    if (notes !== undefined) {
      child.notes = notes || '';
    }

    await child.save();

    res.json({
      message: 'Medical information updated successfully',
      child: child.toJSON()
    });
  } catch (error) {
    console.error('Update medical information error:', error);
    res.status(500).json({ message: 'Server error updating medical information' });
  }
});

// Add medical record/note
router.post('/children/:childId/medical-records', doctorOnly, [
  body('date').isISO8601().withMessage('Valid date required'),
  body('type').isIn(['checkup', 'vaccination', 'illness', 'injury', 'medication', 'other']).withMessage('Valid record type required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('prescription').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await User.findById(req.user.userId);
    if (!doctor || !doctor.doctor) {
      return res.status(403).json({ message: 'Doctor not found' });
    }

    // Check if child is assigned to this doctor
    const isAssigned = doctor.doctor.assignedChildren.some(
      childId => childId.toString() === req.params.childId
    );

    if (!isAssigned) {
      return res.status(403).json({ message: 'Child not assigned to this doctor' });
    }

    const { date, type, description, prescription, followUpDate } = req.body;

    const child = await Child.findById(req.params.childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Add medical record to child's notes or create a medicalRecords field
    // For now, we'll append to notes with structured format
    const recordText = `\n\n[Medical Record - ${new Date(date).toLocaleDateString()}]\nType: ${type}\nDescription: ${description}${prescription ? `\nPrescription: ${prescription}` : ''}${followUpDate ? `\nFollow-up: ${new Date(followUpDate).toLocaleDateString()}` : ''}\nRecorded by: Dr. ${doctor.firstName} ${doctor.lastName}`;
    
    child.notes = (child.notes || '') + recordText;
    await child.save();

    res.json({
      message: 'Medical record added successfully',
      record: {
        date,
        type,
        description,
        prescription,
        followUpDate,
        recordedBy: {
          id: doctor._id,
          name: `Dr. ${doctor.firstName} ${doctor.lastName}`
        }
      }
    });
  } catch (error) {
    console.error('Add medical record error:', error);
    res.status(500).json({ message: 'Server error adding medical record' });
  }
});

// Get doctor's profile
router.get('/profile', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId)
      .select('-password')
      .populate('doctor.assignedChildren', 'firstName lastName dateOfBirth');
    
    res.json(doctor);
  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Get statistics for doctor dashboard
router.get('/statistics', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId);
    if (!doctor || !doctor.doctor) {
      return res.json({
        totalChildren: 0,
        childrenWithAllergies: 0,
        childrenWithMedicalConditions: 0,
        recentCheckups: 0
      });
    }

    const children = await Child.find({
      _id: { $in: doctor.doctor.assignedChildren || [] },
      isActive: true
    });

    const statistics = {
      totalChildren: children.length,
      childrenWithAllergies: children.filter(c => c.allergies && c.allergies.length > 0).length,
      childrenWithMedicalConditions: children.filter(c => c.medicalConditions && c.medicalConditions.length > 0).length,
      recentCheckups: 0 // Can be enhanced with actual checkup tracking
    };

    res.json(statistics);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

module.exports = router;

