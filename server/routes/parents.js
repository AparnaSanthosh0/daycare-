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
router.get('/me/children', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can access their children' });
    }

    const children = await Child.find({ parents: req.user.userId })
      .select('-__v')
      .sort({ createdAt: -1 });

    // Handle case where parent has no children
    if (children.length === 0) {
      return res.status(403).json({ 
        message: 'No child profiles found. Please contact administration to create your child profile before accessing the dashboard.',
        code: 'NO_CHILD_PROFILE'
      });
    }

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
  body('program').optional().isIn(['toddler', 'preschool', 'prekindergarten']).withMessage('Invalid program'),
  body('medicalInfo').optional().isString(),
  body('emergencyContactName').optional().isString(),
  body('emergencyContactPhone').optional().custom((value) => {
    if (!value || value === '') return true; // Allow empty
    if (!/^\d{10}$/.test(value)) {
      throw new Error('Emergency contact phone must be exactly 10 digits');
    }
    return true;
  })
], async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can submit admissions' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array(),
        details: errors.array().map(e => `${e.path}: ${e.msg}`).join(', ')
      });
    }

    const { childName, childDob, childGender, program, medicalInfo, emergencyContactName, emergencyContactPhone } = req.body || {};
    
    console.log('Admission request data:', { childName, childDob, childGender, program, medicalInfo, emergencyContactName, emergencyContactPhone });

    const dob = new Date(childDob);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({ message: 'Invalid date of birth format' });
    }
    
    // More flexible age validation - allow children from 0.5 to 8 years old
    const today = new Date();
    const minDob = new Date(today.getFullYear() - 8, today.getMonth(), today.getDate());
    const maxDob = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()); // 6 months old minimum
    if (!(dob >= minDob && dob <= maxDob)) {
      return res.status(400).json({ 
        message: 'Child age must be between 6 months and 8 years old',
        receivedDob: childDob,
        calculatedAge: Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000))
      });
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

// Get driver and transport details for parent's child
router.get('/me/children/:childId/driver', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can access this resource' });
    }

    const { childId } = req.params;
    
    // Verify child belongs to parent
    const child = await Child.findOne({ _id: childId, parents: req.user.userId });
    if (!child) {
      return res.status(404).json({ message: 'Child not found or access denied' });
    }

    const Transport = require('../models/Transport');
    
    // Find transport routes assigned to this child
    const transportRoutes = await Transport.find({
      'assignedChildren.child': childId,
      'assignedChildren.isActive': true,
      isActive: true
    })
    .populate('driver', 'firstName lastName phone staff.licenseNumber staff.vehicleType profileImage')
    .select('routeName routeType vehicle schedule assignedChildren dailyTrips');

    if (!transportRoutes || transportRoutes.length === 0) {
      return res.json({ 
        hasTransport: false,
        message: 'No transport assigned to this child'
      });
    }

    // Format response with driver details and today's trips
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const transportInfo = transportRoutes.map(route => {
      const childInfo = route.assignedChildren.find(ac => ac.child.toString() === childId);
      
      // Get today's trips for this child
      const todayTrips = route.dailyTrips.filter(trip => {
        const tripDate = new Date(trip.date);
        return tripDate >= today && tripDate < tomorrow;
      }).map(trip => {
        const childTrip = trip.children.find(c => c.child.toString() === childId);
        return {
          tripType: trip.tripType,
          scheduledTime: trip.scheduledTime,
          actualTime: trip.actualTime,
          status: trip.status,
          boardingStatus: childTrip?.boardingStatus || 'pending',
          boardingTime: childTrip?.boardingTime,
          deboardingStatus: childTrip?.deboardingStatus || 'pending',
          deboardingTime: childTrip?.deboardingTime,
          handoverTo: childTrip?.handoverTo
        };
      });

      return {
        routeId: route._id,
        routeName: route.routeName,
        routeType: route.routeType,
        driver: route.driver ? {
          id: route.driver._id,
          name: `${route.driver.firstName} ${route.driver.lastName}`,
          phone: route.driver.phone,
          licenseNumber: route.driver.staff?.licenseNumber,
          vehicleType: route.driver.staff?.vehicleType,
          profileImage: route.driver.profileImage
        } : null,
        vehicle: route.vehicle,
        schedule: route.schedule,
        pickupAddress: childInfo?.pickupAddress,
        dropoffAddress: childInfo?.dropoffAddress,
        todayTrips
      };
    });

    res.json({
      hasTransport: true,
      child: {
        id: child._id,
        name: `${child.firstName} ${child.lastName}`
      },
      transportInfo
    });

  } catch (error) {
    console.error('Get child driver info error:', error);
    res.status(500).json({ message: 'Server error fetching driver information' });
  }
});

// Get all transport info for parent (all their children)
router.get('/me/transport', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can access this resource' });
    }

    // Get all parent's children
    const children = await Child.find({ parents: req.user.userId }).select('firstName lastName profileImage');
    
    if (children.length === 0) {
      return res.json({ children: [], message: 'No children found' });
    }

    const Transport = require('../models/Transport');
    const childIds = children.map(c => c._id);

    // Find all transport routes for parent's children
    const transportRoutes = await Transport.find({
      'assignedChildren.child': { $in: childIds },
      isActive: true
    })
    .populate('driver', 'firstName lastName phone staff.licenseNumber staff.vehicleType profileImage')
    .populate('assignedChildren.child', 'firstName lastName profileImage')
    .select('routeName routeType vehicle schedule assignedChildren dailyTrips');

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format response grouped by child
    const childrenTransport = children.map(child => {
      const childRoutes = transportRoutes.filter(route => 
        route.assignedChildren.some(ac => ac.child._id.toString() === child._id.toString() && ac.isActive)
      );

      const routes = childRoutes.map(route => {
        const childInfo = route.assignedChildren.find(ac => ac.child._id.toString() === child._id.toString());
        
        // Get today's trips
        const todayTrips = route.dailyTrips.filter(trip => {
          const tripDate = new Date(trip.date);
          return tripDate >= today && tripDate < tomorrow;
        }).map(trip => {
          const childTrip = trip.children.find(c => c.child.toString() === child._id.toString());
          return {
            tripType: trip.tripType,
            scheduledTime: trip.scheduledTime,
            actualTime: trip.actualTime,
            status: trip.status,
            boardingStatus: childTrip?.boardingStatus || 'pending',
            boardingTime: childTrip?.boardingTime,
            deboardingStatus: childTrip?.deboardingStatus || 'pending',
            deboardingTime: childTrip?.deboardingTime
          };
        });

        return {
          routeId: route._id,
          routeName: route.routeName,
          routeType: route.routeType,
          driver: route.driver ? {
            id: route.driver._id,
            name: `${route.driver.firstName} ${route.driver.lastName}`,
            phone: route.driver.phone,
            licenseNumber: route.driver.staff?.licenseNumber,
            vehicleType: route.driver.staff?.vehicleType,
            profileImage: route.driver.profileImage
          } : null,
          vehicle: route.vehicle,
          pickupAddress: childInfo?.pickupAddress,
          dropoffAddress: childInfo?.dropoffAddress,
          todayTrips
        };
      });

      return {
        childId: child._id,
        childName: `${child.firstName} ${child.lastName}`,
        childImage: child.profileImage,
        hasTransport: routes.length > 0,
        routes
      };
    });

    res.json({ childrenTransport });

  } catch (error) {
    console.error('Get parent transport info error:', error);
    res.status(500).json({ message: 'Server error fetching transport information' });
  }
});

module.exports = router;
