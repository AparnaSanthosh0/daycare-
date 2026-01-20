const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Store for active tracking sessions (in production, use Redis)
const activeTracking = new Map();

/**
 * @route   POST /api/location/start-tracking
 * @desc    Start tracking parent's location for pickup
 * @access  Private (Parent)
 */
router.post('/start-tracking', auth, async (req, res) => {
  try {
    const { childId, parentLocation } = req.body;

    if (!childId || !parentLocation) {
      return res.status(400).json({ message: 'Child ID and location are required' });
    }

    // Create tracking session
    const trackingId = `${req.user.userId}_${childId}_${Date.now()}`;
    activeTracking.set(trackingId, {
      userId: req.user.userId,
      childId,
      startTime: new Date(),
      lastLocation: parentLocation,
      isActive: true
    });

    res.json({
      message: 'Tracking started',
      trackingId,
      success: true
    });
  } catch (error) {
    console.error('Start tracking error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/location/update-location
 * @desc    Update parent's location during tracking
 * @access  Private (Parent)
 */
router.put('/update-location', auth, async (req, res) => {
  try {
    const { trackingId, location } = req.body;

    if (!trackingId || !location) {
      return res.status(400).json({ message: 'Tracking ID and location are required' });
    }

    const tracking = activeTracking.get(trackingId);

    if (!tracking) {
      return res.status(404).json({ message: 'Tracking session not found' });
    }

    // Update location
    tracking.lastLocation = location;
    tracking.lastUpdate = new Date();
    activeTracking.set(trackingId, tracking);

    // Calculate distance to daycare (example coordinates)
    const daycareLocation = {
      lat: 9.9679032,
      lng: 76.2444378
    };

    const distance = calculateDistance(
      location.lat,
      location.lng,
      daycareLocation.lat,
      daycareLocation.lng
    );

    // Check if within geofence (500m)
    const isNearby = distance < 0.5;

    // If nearby, notify staff (implement WebSocket/notification here)
    if (isNearby && !tracking.notified) {
      tracking.notified = true;
      activeTracking.set(trackingId, tracking);
      // TODO: Send notification to staff
      console.log(`Parent approaching for child ${tracking.childId}`);
    }

    res.json({
      success: true,
      distance: distance.toFixed(2),
      isNearby,
      eta: Math.round((distance / 40) * 60) // Estimate in minutes
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/location/stop-tracking
 * @desc    Stop tracking session
 * @access  Private (Parent)
 */
router.post('/stop-tracking', auth, async (req, res) => {
  try {
    const { trackingId } = req.body;

    if (!trackingId) {
      return res.status(400).json({ message: 'Tracking ID is required' });
    }

    const tracking = activeTracking.get(trackingId);

    if (tracking) {
      tracking.isActive = false;
      tracking.endTime = new Date();
      activeTracking.set(trackingId, tracking);
      
      // Clean up after 1 hour
      setTimeout(() => {
        activeTracking.delete(trackingId);
      }, 3600000);
    }

    res.json({ message: 'Tracking stopped', success: true });
  } catch (error) {
    console.error('Stop tracking error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/location/active-pickups
 * @desc    Get all active pickup tracking (for staff)
 * @access  Private (Staff/Admin)
 */
router.get('/active-pickups', auth, async (req, res) => {
  try {
    // Check if user is staff/admin
    if (!['admin', 'teacher', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const activePickups = Array.from(activeTracking.values())
      .filter(tracking => tracking.isActive)
      .map(tracking => ({
        childId: tracking.childId,
        location: tracking.lastLocation,
        startTime: tracking.startTime,
        lastUpdate: tracking.lastUpdate
      }));

    res.json({ activePickups, count: activePickups.length });
  } catch (error) {
    console.error('Get active pickups error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/location/daycare-info
 * @desc    Get daycare location and contact info
 * @access  Public
 */
router.get('/daycare-info', async (req, res) => {
  try {
    // In production, fetch from database
    const daycareInfo = {
      name: 'TinyTots Daycare',
      address: 'Kerala, India',
      location: {
        lat: 9.9679032,
        lng: 76.2444378
      },
      phone: '+91 (555) 123-4567',
      email: 'contact@tinytots.com',
      hours: {
        weekdays: '7:00 AM - 6:00 PM',
        saturday: '8:00 AM - 4:00 PM',
        sunday: 'Closed'
      }
    };

    res.json(daycareInfo);
  } catch (error) {
    console.error('Get daycare info error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function: Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

module.exports = router;
