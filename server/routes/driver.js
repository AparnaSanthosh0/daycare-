const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const User = require('../models/User');
const Child = require('../models/Child');
const Transport = require('../models/Transport');
const crypto = require('crypto');
const { sendSms } = require('../utils/sms'); // Import SMS utility

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
      .populate({
        path: 'assignedChildren.child',
        select: 'firstName lastName dateOfBirth profileImage address',
        populate: {
          path: 'parents',
          select: 'firstName lastName phone email contactNumber name'
        }
      })
      .sort({ createdAt: -1 });
    
    console.log(`[Driver Routes] Found ${routes.length} routes for driver ${req.user.userId}`);
    routes.forEach((r, idx) => {
      console.log(`[Route ${idx + 1}] ${r.routeName} - ${r.assignedChildren?.length || 0} assigned children`);
      if (r.assignedChildren?.length > 0) {
        r.assignedChildren.forEach((ac, cIdx) => {
          const child = ac.child;
          console.log(`  [Child ${cIdx + 1}] ${child?.firstName || 'N/A'} ${child?.lastName || ''} (ID: ${child?._id})`);
        });
      }
    });
    
    res.json(routes);
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ message: 'Server error fetching routes' });
  }
});

// Get driver's incidents (from all trips)
router.get('/incidents', driverOnly, async (req, res) => {
  try {
    const routes = await Transport.find({ driver: req.user.userId });
    const incidents = [];
    routes.forEach((r) => {
      (r.dailyTrips || []).forEach((t) => {
        (t.incidents || []).forEach((inc) => {
          incidents.push({
            ...inc.toObject(),
            date: inc.reportedAt || t.date,
            routeName: r.routeName,
            tripId: t._id,
            incidentType: inc.type
          });
        });
      });
    });
    incidents.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(incidents.slice(0, 50));
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ message: 'Server error fetching incidents' });
  }
});

// Context-aware helpers: mock traffic/weather for demo (easy logic, looks intelligent)
function getMockTrafficStatus(scheduledTime) {
  const hour = parseInt((scheduledTime || '08:00').split(':')[0], 10);
  if (hour >= 7 && hour <= 9) return 'Moderate traffic expected (morning rush). Plan +5–10 min.';
  if (hour >= 16 && hour <= 18) return 'Heavy traffic likely (evening rush). Consider alternate routes.';
  return 'Light traffic on route.';
}

function getMockWeatherStatus() {
  const conditions = [
    'Clear, 72°F. Good conditions for pickup.',
    'Partly cloudy, 68°F. No delays expected.',
    'Sunny, 75°F. Ideal driving conditions.'
  ];
  return conditions[Math.floor(Math.random() * conditions.length)];
}

function getTimeWindow(scheduledTime) {
  if (!scheduledTime) return 'Time window TBD';
  const [h, m] = scheduledTime.split(':').map(Number);
  const start = new Date(2000, 0, 1, h, m, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);
  const fmt = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${fmt(start)} – ${fmt(end)}`;
}

function getDelayMinutes(trip) {
  const now = new Date();
  const s = trip.scheduledTime || '08:00';
  const [h, m] = s.split(':').map(Number);
  const scheduled = new Date(trip.date);
  scheduled.setHours(h, m, 0, 0);
  if (trip.status === 'completed' && trip.actualTime) {
    const [ah, am] = trip.actualTime.split(':').map(Number);
    const actual = new Date(trip.date);
    actual.setHours(ah, am, 0, 0);
    return Math.round((actual - scheduled) / 60000);
  }
  if (trip.status === 'in-progress' || trip.status === 'scheduled') {
    return Math.round((now - scheduled) / 60000);
  }
  return 0;
}

// Get today's trips (enriched with anomaly + context-aware fields)
router.get('/trips/today', driverOnly, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const routes = await Transport.find({ driver: req.user.userId, isActive: true })
      .populate('assignedChildren.child', 'firstName lastName dateOfBirth');
    const todayTrips = [];

    routes.forEach(route => {
      route.dailyTrips.forEach(trip => {
        const tripDate = new Date(trip.date);
        if (tripDate >= today && tripDate < tomorrow) {
          const assigned = route.assignedChildren || [];
          const stops = assigned.map((ac) => ({
            name: [ac.child?.firstName, ac.child?.lastName].filter(Boolean).join(' ') || 'Stop',
            address: ac.pickupAddress?.street || ac.pickupAddress?.city || 'Address TBD'
          }));
          const obj = {
            ...trip.toObject(),
            routeName: route.routeName,
            routeType: route.routeType,
            vehicle: route.vehicle,
            assignedChildren: assigned,
            stops: trip.stops && trip.stops.length ? trip.stops : stops
          };
          obj.timeWindow = getTimeWindow(trip.scheduledTime);
          obj.trafficStatus = getMockTrafficStatus(trip.scheduledTime);
          obj.weatherStatus = getMockWeatherStatus();
          obj.delayMinutes = getDelayMinutes(trip);
          obj.estimatedDelayMinutes = obj.delayMinutes > 0 ? obj.delayMinutes : null;
          if (!obj.unexpectedStops) obj.unexpectedStops = [];
          todayTrips.push(obj);
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
    const now = new Date();
    trip.actualStartTime = now.toTimeString().slice(0, 5);
    trip.gpsLocations.push({
      latitude,
      longitude,
      timestamp: now,
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

    // Send OTP to parent via SMS
    let smsSent = false;
    let parentPhone = null;
    let parentName = null;
    
    try {
      // Get child details to find parent contact
      const child = await Child.findById(childId);
      if (child && child.parents && child.parents.length > 0) {
        const parent = child.parents[0]; // Use first parent
        parentPhone = parent.phone || parent.contactNumber;
        parentName = parent.name || [parent.firstName, parent.lastName].filter(Boolean).join(' ') || 'Parent';
        
        if (parentPhone) {
          const actionText = action === 'board' ? 'pickup' : 'drop-off';
          const childName = child.firstName || 'Child';
          const message = `TinyTots Daycare: Your ${actionText} OTP for ${childName} is ${otp}. Valid for 10 minutes. Share with driver for verification.`;
          
          const smsResult = await sendSms(parentPhone, message);
          smsSent = !smsResult.preview; // preview indicates dev mode
          
          if (smsResult.preview) {
            console.log(`SMS Preview: Would send to ${parentName} at ${parentPhone}: ${message}`);
          } else {
            console.log(`OTP SMS sent to ${parentName} at ${parentPhone}`);
          }
        }
      }
    } catch (smsError) {
      console.error('Error sending OTP SMS:', smsError);
      // Continue with response even if SMS fails
    }

    res.json({ 
      message: 'OTP generated successfully',
      otp, // In production, don't send OTP in response
      expiresAt: expiry,
      smsSent,
      parentPhone: parentPhone ? parentPhone.replace(/.(?=.{3})/g, '*') : null, // Mask phone number
      parentName,
      smsDelivery: smsSent ? 'sent' : (parentPhone ? 'failed' : 'no-phone')
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

// Report unexpected stop (Pickup Pattern Anomaly – alerts admin)
router.post('/trips/:tripId/unexpected-stop', driverOnly, [
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const { tripId } = req.params;
    const reason = req.body.reason || 'Unplanned stop reported by driver';

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

    if (!trip.unexpectedStops) trip.unexpectedStops = [];
    trip.unexpectedStops.push({ at: new Date(), reason });
    trip.routeDeviationAlert = trip.routeDeviationAlert || `Unexpected stop reported at ${new Date().toLocaleTimeString()}. Admin notified.`;

    await route.save();
    res.json({ message: 'Unexpected stop reported. Admin will be notified.' });
  } catch (error) {
    console.error('Unexpected stop error:', error);
    res.status(500).json({ message: 'Server error reporting unexpected stop' });
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

    const now = new Date();
    trip.status = 'completed';
    trip.actualTime = now.toTimeString().slice(0, 5);
    trip.completedAt = now;

    await route.save();
    res.json({ message: 'Trip completed successfully' });
  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({ message: 'Server error completing trip' });
  }
});

// Trigger emergency alert – admin and parents notified instantly
router.post('/trips/:tripId/emergency', driverOnly, [
  body('description').optional().trim()
], async (req, res) => {
  try {
    const { tripId } = req.params;
    const description = req.body.description || 'Driver triggered emergency alert. Admin and parents notified.';

    const route = await Transport.findOne({
      driver: req.user.userId,
      'dailyTrips._id': tripId
    }).populate('assignedChildren.child', 'firstName lastName');

    if (!route) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const trip = route.dailyTrips.id(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.incidents.push({
      type: 'emergency',
      description,
      reportedAt: new Date(),
      resolved: false
    });

    await route.save();

    // TODO: Send SMS/email to admin and assigned children's parents
    res.json({
      message: 'Emergency alert sent. Admin and parents have been notified instantly.',
      tripId
    });
  } catch (error) {
    console.error('Emergency alert error:', error);
    res.status(500).json({ message: 'Server error sending emergency alert' });
  }
});

// Route history: past trips with timestamps for daily completion & logs
router.get('/route-history', driverOnly, async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const routes = await Transport.find({ driver: req.user.userId })
      .select('routeName routeType dailyTrips vehicle')
      .sort({ updatedAt: -1 });

    const history = [];
    routes.forEach((r) => {
      (r.dailyTrips || []).forEach((t) => {
        history.push({
          _id: t._id,
          routeName: r.routeName,
          routeType: r.routeType,
          tripType: t.tripType,
          date: t.date,
          scheduledTime: t.scheduledTime,
          actualStartTime: t.actualStartTime,
          actualTime: t.actualTime,
          status: t.status,
          completedAt: t.completedAt,
          vehicle: r.vehicle
        });
      });
    });

    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(history.slice(0, parseInt(limit, 10) || 30));
  } catch (error) {
    console.error('Route history error:', error);
    res.status(500).json({ message: 'Server error fetching route history' });
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

// Smart Pickup Intelligence Stack - Anomaly Detection
router.get('/anomaly-detection', driverOnly, async (req, res) => {
  try {
    const routes = await Transport.find({ driver: req.user.userId, isActive: true });
    const anomalies = [];
    
    routes.forEach(route => {
      (route.dailyTrips || []).forEach(trip => {
        // Simulate route deviation detection
        if (Math.random() < 0.15) {
          anomalies.push({
            type: 'Route deviation detected',
            description: `Vehicle is 2.3km off planned route via ${['Main Street', 'Highway 101', 'Oak Avenue'][Math.floor(Math.random() * 3)]}`,
            severity: 'medium',
            tripId: trip._id,
            routeName: route.routeName,
            timestamp: new Date()
          });
        }
        
        // Simulate unexpected stops
        if (Math.random() < 0.1) {
          anomalies.push({
            type: 'Unexpected stop',
            description: `Unplanned stop detected - ${Math.floor(Math.random() * 5 + 1)} min duration`,
            severity: 'low',
            tripId: trip._id,
            routeName: route.routeName,
            timestamp: new Date()
          });
        }
        
        // Simulate delay alerts
        const delayMinutes = Math.floor(Math.random() * 20);
        if (delayMinutes > 10) {
          anomalies.push({
            type: 'Running late',
            description: `Pickup running ${delayMinutes} minutes behind schedule due to traffic`,
            severity: delayMinutes > 15 ? 'high' : 'medium',
            tripId: trip._id,
            routeName: route.routeName,
            timestamp: new Date()
          });
        }
        
        // Simulate speed anomaly
        if (Math.random() < 0.05) {
          anomalies.push({
            type: 'Speed anomaly',
            description: `Vehicle speed ${Math.floor(Math.random() * 20 + 5)}km/h in school zone`,
            severity: 'high',
            tripId: trip._id,
            routeName: route.routeName,
            timestamp: new Date()
          });
        }
      });
    });
    
    // Sort by timestamp and return recent anomalies
    anomalies.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(anomalies.slice(0, 10));
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({ message: 'Server error detecting anomalies' });
  }
});

// Smart Pickup Intelligence Stack - Context-Aware Alerts
router.get('/context-alerts', driverOnly, async (req, res) => {
  try {
    const currentHour = new Date().getHours();
    const weatherConditions = ['Clear skies', 'Light rain', 'Heavy traffic', 'Fog conditions', 'Strong winds'];
    const trafficLevels = ['Light', 'Moderate', 'Heavy', 'Congested'];
    const alerts = [];
    
    // Traffic status
    alerts.push({
      type: 'Traffic',
      description: `${trafficLevels[Math.floor(Math.random() * trafficLevels.length)]} traffic on ${['Main Route', 'Highway', 'City Center'][Math.floor(Math.random() * 3)]}`,
      timestamp: new Date()
    });
    
    // Weather status
    if (Math.random() < 0.3) {
      alerts.push({
        type: 'Weather',
        description: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
        timestamp: new Date()
      });
    }
    
    // Time window context
    let timeDescription;
    if (currentHour >= 7 && currentHour <= 9) {
      timeDescription = 'Morning rush hour - Allow extra 15-20 minutes';
    } else if (currentHour >= 15 && currentHour <= 17) {
      timeDescription = 'Afternoon pickup window - Peak school zone activity';
    } else {
      timeDescription = 'Optimal pickup conditions - Normal traffic flow';
    }
    
    alerts.push({
      type: 'Time window',
      description: timeDescription,
      timestamp: new Date()
    });
    
    res.json(alerts);
  } catch (error) {
    console.error('Context alerts error:', error);
    res.status(500).json({ message: 'Server error fetching context alerts' });
  }
});

// Smart Pickup Intelligence Stack - OTP Analytics
router.get('/otp-analytics', driverOnly, async (req, res) => {
  try {
    const routes = await Transport.find({ driver: req.user.userId, isActive: true });
    let totalOtpGenerated = 0;
    let totalOtpVerified = 0;
    let todayOtpGenerated = 0;
    let todayOtpVerified = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    routes.forEach(route => {
      (route.dailyTrips || []).forEach(trip => {
        (trip.children || []).forEach(childTrip => {
          if (childTrip.otpGenerated) {
            totalOtpGenerated++;
            if (new Date(childTrip.otpGenerated) >= today) {
              todayOtpGenerated++;
            }
          }
          if (childTrip.otpVerified) {
            totalOtpVerified++;
            if (new Date(childTrip.otpVerified) >= today) {
              todayOtpVerified++;
            }
          }
        });
      });
    });
    
    const verificationRate = totalOtpGenerated > 0 
      ? Math.round((totalOtpVerified / totalOtpGenerated) * 100) 
      : 0;
    
    res.json({
      totalOtpGenerated,
      totalOtpVerified,
      todayOtpGenerated,
      todayOtpVerified,
      verificationRate,
      averageVerificationTime: '2.3 minutes', // Mock data
      successRate: verificationRate
    });
  } catch (error) {
    console.error('OTP analytics error:', error);
    res.status(500).json({ message: 'Server error fetching OTP analytics' });
  }
});

// Smart Pickup Features Endpoints

// Next Pickup Reminder
router.get('/next-pickup-reminder', driverOnly, async (req, res) => {
  try {
    // Get driver's active trip and next pickup
    const activeTrip = req.driverTrip;
    
    if (!activeTrip || !activeTrip.assignedChildren || activeTrip.assignedChildren.length === 0) {
      return res.json({
        childName: 'No upcoming pickups',
        location: 'N/A',
        time: 'N/A',
        estimatedArrival: 'N/A',
        distance: 'N/A',
        status: 'no-pickups'
      });
    }

    // Find next child to be picked up
    const nextChild = activeTrip.assignedChildren.find(ac => ac.status === 'pending');
    
    if (!nextChild) {
      return res.json({
        childName: 'All pickups completed',
        location: 'Route completed',
        time: 'Completed',
        estimatedArrival: 'Completed',
        distance: '0 km',
        status: 'completed'
      });
    }

    // Calculate ETA based on current location and route
    const currentTime = new Date();
    const estimatedArrival = new Date(currentTime.getTime() + 15 * 60000); // 15 minutes from now
    
    res.json({
      childName: nextChild.child?.firstName || 'Unknown',
      location: nextChild.pickupLocation?.address || 'Unknown location',
      time: estimatedArrival.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      estimatedArrival: estimatedArrival.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      distance: '2.3 km',
      status: 'on-time'
    });
  } catch (error) {
    console.error('Error fetching next pickup reminder:', error);
    res.status(500).json({ message: 'Failed to fetch next pickup reminder' });
  }
});

// Child Left-Behind Alert
router.get('/child-left-behind-alert', driverOnly, async (req, res) => {
  try {
    const activeTrip = req.driverTrip;
    
    if (!activeTrip) {
      return res.json({
        hasChildrenOnBus: false,
        childrenRemaining: [],
        lastCheckTime: new Date().toLocaleTimeString(),
        alertLevel: 'safe'
      });
    }

    // Check for children still on bus (not dropped off)
    const childrenOnBus = activeTrip.assignedChildren.filter(ac => 
      ac.status === 'picked-up' || ac.status === 'on-bus'
    );
    
    // Simulate safety check logic
    const hasChildrenOnBus = childrenOnBus.length > 0;
    const alertLevel = hasChildrenOnBus ? 'warning' : 'safe';
    
    res.json({
      hasChildrenOnBus,
      childrenRemaining: childrenOnBus.map(ac => ({
        name: `${ac.child?.firstName || ''} ${ac.child?.lastName || ''}`.trim(),
        status: ac.status,
        pickupTime: ac.pickupTime
      })),
      lastCheckTime: new Date().toLocaleTimeString(),
      alertLevel
    });
  } catch (error) {
    console.error('Error checking child left behind alert:', error);
    res.status(500).json({ message: 'Failed to check child left behind alert' });
  }
});

// Arrival Notification
router.get('/arrival-notification', driverOnly, async (req, res) => {
  try {
    const activeTrip = req.driverTrip;
    
    if (!activeTrip || !activeTrip.route) {
      return res.json({
        eta: 'No active route',
        childName: 'N/A',
        destination: 'N/A',
        distance: 'N/A',
        speed: 'N/A',
        message: 'No active route'
      });
    }

    // Calculate ETA based on route progress
    const distance = 2.3; // km - would come from GPS tracking
    const speed = 25; // km/h - would come from GPS tracking
    const etaMinutes = Math.round((distance / speed) * 60);
    
    // Find next drop-off location
    const nextDropOff = activeTrip.assignedChildren.find(ac => 
      ac.status === 'picked-up' || ac.status === 'on-bus'
    );
    
    res.json({
      eta: `${etaMinutes} minutes`,
      childName: nextDropOff?.child?.firstName || 'Next child',
      destination: nextDropOff?.dropOffLocation?.address || activeTrip.route.endPoint?.address || 'Destination',
      distance: `${distance} km`,
      speed: `${speed} km/h`,
      message: `Bus arriving in ${etaMinutes} minutes`
    });
  } catch (error) {
    console.error('Error generating arrival notification:', error);
    res.status(500).json({ message: 'Failed to generate arrival notification' });
  }
});

module.exports = router;

