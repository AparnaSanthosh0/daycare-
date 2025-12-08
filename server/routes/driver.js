const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const User = require('../models/User');
const Child = require('../models/Child');
const Transport = require('../models/Transport');
const crypto = require('crypto');

// Middleware to check if user is a driver
const driverOnly = [
  auth,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user || user.role !== 'staff' || user.staff?.staffType !== 'driver') {
        return res.status(403).json({ message: 'Access denied. Driver access required.' });
      }
      req.driver = user;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error verifying driver access' });
    }
  }
];

// Test route to verify driver routes are accessible
router.get('/test', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({ 
      message: 'Driver routes are accessible',
      user: user ? {
        role: user.role,
        staffType: user.staff?.staffType,
        isDriver: user.role === 'staff' && user.staff?.staffType === 'driver'
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get driver's routes and schedules
router.get('/routes', driverOnly, async (req, res) => {
  try {
    const routes = await Transport.find({ driver: req.user.userId, isActive: true })
      .populate('assignedChildren.child', 'firstName lastName dateOfBirth profileImage')
      .populate('assignedChildren.child.parents', 'firstName lastName phone email')
      .sort({ createdAt: -1 });
    
    res.json(routes);
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ message: 'Server error fetching routes' });
  }
});

// Get today's trips
router.get('/trips/today', driverOnly, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const routes = await Transport.find({ driver: req.user.userId, isActive: true });
    const todayTrips = [];

    routes.forEach(route => {
      route.dailyTrips.forEach(trip => {
        const tripDate = new Date(trip.date);
        if (tripDate >= today && tripDate < tomorrow) {
          todayTrips.push({
            ...trip.toObject(),
            routeName: route.routeName,
            routeType: route.routeType,
            vehicle: route.vehicle
          });
        }
      });
    });

    res.json(todayTrips.sort((a, b) => {
      const timeA = a.scheduledTime || '00:00';
      const timeB = b.scheduledTime || '00:00';
      return timeA.localeCompare(timeB);
    }));
  } catch (error) {
    console.error('Get today trips error:', error);
    res.status(500).json({ message: 'Server error fetching today\'s trips' });
  }
});

// Start a trip
router.post('/trips/:tripId/start', driverOnly, [
  body('latitude').isFloat().withMessage('Valid latitude required'),
  body('longitude').isFloat().withMessage('Valid longitude required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tripId } = req.params;
    const { latitude, longitude } = req.body;

    const route = await Transport.findOne({ 
      driver: req.user.userId,
      'dailyTrips._id': tripId 
    });

    if (!route) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const trip = route.dailyTrips.id(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'in-progress';
    trip.gpsLocations.push({
      latitude,
      longitude,
      timestamp: new Date(),
      speed: req.body.speed || 0,
      heading: req.body.heading || 0
    });

    await route.save();
    res.json({ message: 'Trip started', trip });
  } catch (error) {
    console.error('Start trip error:', error);
    res.status(500).json({ message: 'Server error starting trip' });
  }
});

// Update GPS location
router.post('/trips/:tripId/location', driverOnly, [
  body('latitude').isFloat().withMessage('Valid latitude required'),
  body('longitude').isFloat().withMessage('Valid longitude required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tripId } = req.params;
    const { latitude, longitude, speed, heading } = req.body;

    const route = await Transport.findOne({ 
      driver: req.user.userId,
      'dailyTrips._id': tripId 
    });

    if (!route) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const trip = route.dailyTrips.id(tripId);
    if (!trip || trip.status !== 'in-progress') {
      return res.status(400).json({ message: 'Trip is not in progress' });
    }

    trip.gpsLocations.push({
      latitude,
      longitude,
      timestamp: new Date(),
      speed: speed || 0,
      heading: heading || 0
    });

    await route.save();
    res.json({ message: 'Location updated', location: trip.gpsLocations[trip.gpsLocations.length - 1] });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error updating location' });
  }
});

// Generate OTP for child boarding
router.post('/trips/:tripId/children/:childId/generate-otp', driverOnly, async (req, res) => {
  try {
    const { tripId, childId } = req.params;

    const route = await Transport.findOne({ 
      driver: req.user.userId,
      'dailyTrips._id': tripId 
    });

    if (!route) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const trip = route.dailyTrips.id(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const childTrip = trip.children.id(childId);
    if (!childTrip) {
      return res.status(404).json({ message: 'Child not found in this trip' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10); // OTP valid for 10 minutes

    if (trip.tripType === 'pickup') {
      childTrip.boardingOTP = otp;
      childTrip.boardingOTPExpiry = expiry;
    } else {
      childTrip.deboardingOTP = otp;
      childTrip.deboardingOTPExpiry = expiry;
    }

    await route.save();

    // In production, send OTP via SMS/Email to parent
    res.json({ 
      message: 'OTP generated successfully',
      otp, // In production, don't send OTP in response
      expiresAt: expiry
    });
  } catch (error) {
    console.error('Generate OTP error:', error);
    res.status(500).json({ message: 'Server error generating OTP' });
  }
});

// Verify OTP and confirm boarding/deboarding
router.post('/trips/:tripId/children/:childId/verify-otp', driverOnly, [
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('action').isIn(['board', 'deboard']).withMessage('Action must be board or deboard')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tripId, childId } = req.params;
    const { otp, action } = req.body;

    const route = await Transport.findOne({ 
      driver: req.user.userId,
      'dailyTrips._id': tripId 
    });

    if (!route) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const trip = route.dailyTrips.id(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const childTrip = trip.children.id(childId);
    if (!childTrip) {
      return res.status(404).json({ message: 'Child not found in this trip' });
    }

    let isValid = false;
    if (action === 'board') {
      if (childTrip.boardingOTP === otp && new Date() < childTrip.boardingOTPExpiry) {
        childTrip.boardingStatus = 'otp-verified';
        childTrip.boardingTime = new Date();
        childTrip.boardingVerifiedBy = req.user.userId;
        isValid = true;
      }
    } else {
      if (childTrip.deboardingOTP === otp && new Date() < childTrip.deboardingOTPExpiry) {
        childTrip.deboardingStatus = 'otp-verified';
        childTrip.deboardingTime = new Date();
        childTrip.deboardingVerifiedBy = req.user.userId;
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await route.save();
    res.json({ message: `${action === 'board' ? 'Boarding' : 'Deboarding'} confirmed successfully` });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error verifying OTP' });
  }
});

// Verify guardian for pickup/dropoff
router.post('/trips/:tripId/children/:childId/verify-guardian', driverOnly, [
  body('guardianName').trim().notEmpty().withMessage('Guardian name required'),
  body('guardianPhone').trim().notEmpty().withMessage('Guardian phone required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tripId, childId } = req.params;
    const { guardianName, guardianPhone } = req.body;

    const route = await Transport.findOne({ 
      driver: req.user.userId,
      'dailyTrips._id': tripId 
    }).populate('assignedChildren.child');

    if (!route) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const trip = route.dailyTrips.id(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const childAssignment = route.assignedChildren.find(
      ac => ac.child._id.toString() === childId
    );

    if (!childAssignment) {
      return res.status(404).json({ message: 'Child not assigned to this route' });
    }

    // Check if guardian is authorized
    const isAuthorized = childAssignment.authorizedGuardians.some(
      guardian => guardian.name.toLowerCase() === guardianName.toLowerCase() &&
                  guardian.phone === guardianPhone
    );

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Guardian not authorized for this child' });
    }

    const childTrip = trip.children.id(childId);
    if (!childTrip) {
      return res.status(404).json({ message: 'Child not found in this trip' });
    }

    childTrip.guardianVerified = {
      name: guardianName,
      phone: guardianPhone,
      verifiedAt: new Date()
    };

    await route.save();
    res.json({ message: 'Guardian verified successfully' });
  } catch (error) {
    console.error('Verify guardian error:', error);
    res.status(500).json({ message: 'Server error verifying guardian' });
  }
});

// Report incident
router.post('/trips/:tripId/incidents', driverOnly, [
  body('type').isIn(['delay', 'accident', 'breakdown', 'traffic', 'weather', 'other']).withMessage('Valid incident type required'),
  body('description').trim().notEmpty().withMessage('Description required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tripId } = req.params;
    const { type, description } = req.body;

    const route = await Transport.findOne({ 
      driver: req.user.userId,
      'dailyTrips._id': tripId 
    });

    if (!route) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const trip = route.dailyTrips.id(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.incidents.push({
      type,
      description,
      reportedAt: new Date()
    });

    await route.save();
    res.json({ message: 'Incident reported successfully' });
  } catch (error) {
    console.error('Report incident error:', error);
    res.status(500).json({ message: 'Server error reporting incident' });
  }
});

// Report vehicle issue
router.post('/trips/:tripId/vehicle-issues', driverOnly, [
  body('issueType').trim().notEmpty().withMessage('Issue type required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Valid severity required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tripId } = req.params;
    const { issueType, description, severity } = req.body;

    const route = await Transport.findOne({ 
      driver: req.user.userId,
      'dailyTrips._id': tripId 
    });

    if (!route) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const trip = route.dailyTrips.id(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.vehicleIssues.push({
      issueType,
      description,
      severity,
      reportedAt: new Date()
    });

    await route.save();
    res.json({ message: 'Vehicle issue reported successfully' });
  } catch (error) {
    console.error('Report vehicle issue error:', error);
    res.status(500).json({ message: 'Server error reporting vehicle issue' });
  }
});

// Complete trip
router.post('/trips/:tripId/complete', driverOnly, async (req, res) => {
  try {
    const { tripId } = req.params;

    const route = await Transport.findOne({ 
      driver: req.user.userId,
      'dailyTrips._id': tripId 
    });

    if (!route) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const trip = route.dailyTrips.id(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'completed';
    trip.completedAt = new Date();

    await route.save();
    res.json({ message: 'Trip completed successfully' });
  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({ message: 'Server error completing trip' });
  }
});

// Add vehicle log entry
router.post('/vehicle-log', driverOnly, [
  body('date').isISO8601().withMessage('Valid date required'),
  body('startMileage').isInt({ min: 0 }).withMessage('Valid start mileage required'),
  body('endMileage').isInt({ min: 0 }).withMessage('Valid end mileage required'),
  body('fuelLevel').isIn(['full', 'three-quarter', 'half', 'quarter', 'low', 'empty']).withMessage('Valid fuel level required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date, startMileage, endMileage, fuelLevel, maintenanceIssues, driverNotes } = req.body;

    const route = await Transport.findOne({ driver: req.user.userId, isActive: true });
    if (!route) {
      return res.status(404).json({ message: 'No active route found for driver' });
    }

    route.vehicleLogs.push({
      date: new Date(date),
      startMileage,
      endMileage,
      fuelLevel,
      maintenanceIssues: Array.isArray(maintenanceIssues) ? maintenanceIssues : [],
      driverNotes: driverNotes || '',
      checkedBy: req.user.userId
    });

    await route.save();
    res.json({ message: 'Vehicle log entry added successfully' });
  } catch (error) {
    console.error('Add vehicle log error:', error);
    res.status(500).json({ message: 'Server error adding vehicle log' });
  }
});

// Get vehicle logs
router.get('/vehicle-logs', driverOnly, async (req, res) => {
  try {
    const route = await Transport.findOne({ driver: req.user.userId, isActive: true });
    if (!route) {
      return res.json([]);
    }

    const logs = route.vehicleLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(logs);
  } catch (error) {
    console.error('Get vehicle logs error:', error);
    res.status(500).json({ message: 'Server error fetching vehicle logs' });
  }
});

// Get compliance report
router.get('/compliance-report', driverOnly, async (req, res) => {
  try {
    const { month, year } = req.query;
    const reportMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const reportYear = year ? parseInt(year) : new Date().getFullYear();

    const route = await Transport.findOne({ driver: req.user.userId, isActive: true });
    if (!route) {
      return res.json({
        month: reportMonth,
        year: reportYear,
        totalTrips: 0,
        onTimeTrips: 0,
        delayedTrips: 0,
        cancelledTrips: 0,
        incidents: 0,
        vehicleIssues: 0,
        averageDelay: 0,
        complianceScore: 100
      });
    }

    // Check if report already exists
    let report = route.complianceReports.find(
      r => r.month === reportMonth && r.year === reportYear
    );

    if (!report) {
      // Generate report
      const startDate = new Date(reportYear, reportMonth - 1, 1);
      const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59);

      const monthTrips = route.dailyTrips.filter(trip => {
        const tripDate = new Date(trip.date);
        return tripDate >= startDate && tripDate <= endDate;
      });

      const totalTrips = monthTrips.length;
      const onTimeTrips = monthTrips.filter(trip => {
        if (!trip.actualTime || !trip.scheduledTime) return false;
        const scheduled = new Date(`2000-01-01T${trip.scheduledTime}`);
        const actual = new Date(`2000-01-01T${trip.actualTime}`);
        const diffMinutes = (actual - scheduled) / 60000;
        return diffMinutes <= 5; // On time if within 5 minutes
      }).length;

      const delayedTrips = monthTrips.filter(trip => trip.status === 'delayed').length;
      const cancelledTrips = monthTrips.filter(trip => trip.status === 'cancelled').length;
      const incidents = monthTrips.reduce((sum, trip) => sum + trip.incidents.length, 0);
      const vehicleIssues = monthTrips.reduce((sum, trip) => sum + trip.vehicleIssues.length, 0);

      let totalDelay = 0;
      let delayCount = 0;
      monthTrips.forEach(trip => {
        if (trip.actualTime && trip.scheduledTime && trip.status === 'delayed') {
          const scheduled = new Date(`2000-01-01T${trip.scheduledTime}`);
          const actual = new Date(`2000-01-01T${trip.actualTime}`);
          const diffMinutes = (actual - scheduled) / 60000;
          totalDelay += diffMinutes;
          delayCount++;
        }
      });
      const averageDelay = delayCount > 0 ? totalDelay / delayCount : 0;

      const complianceScore = totalTrips > 0
        ? Math.round(((onTimeTrips / totalTrips) * 100) - (delayedTrips * 5) - (incidents * 10) - (vehicleIssues * 5))
        : 100;
      const finalScore = Math.max(0, Math.min(100, complianceScore));

      report = {
        month: reportMonth,
        year: reportYear,
        totalTrips,
        onTimeTrips,
        delayedTrips,
        cancelledTrips,
        incidents,
        vehicleIssues,
        averageDelay: Math.round(averageDelay),
        complianceScore: finalScore,
        generatedAt: new Date()
      };

      route.complianceReports.push(report);
      await route.save();
    }

    res.json(report);
  } catch (error) {
    console.error('Get compliance report error:', error);
    res.status(500).json({ message: 'Server error fetching compliance report' });
  }
});

module.exports = router;

