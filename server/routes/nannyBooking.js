const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const NannyBooking = require('../models/NannyBooking');
const User = require('../models/User');

// Get all nannies (for parents to view)
router.get('/nannies', auth, async (req, res) => {
  try {
    // Find active nannies
    const nannies = await User.find({
      role: 'staff',
      'staff.staffType': 'nanny',
      isActive: true
    }).select('firstName lastName phone staff.yearsOfExperience staff.qualification');
    
    console.log('Active nannies found:', nannies.length);
    
    // Also check for pending nannies (for debugging)
    const pendingNannies = await User.find({
      role: 'staff',
      'staff.staffType': 'nanny',
      isActive: false
    }).select('firstName lastName isActive');
    
    if (pendingNannies.length > 0) {
      console.log('Pending nannies (need admin approval):', pendingNannies.length);
    }
    
    res.json(nannies);
  } catch (error) {
    console.error('Error fetching nannies:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create booking request (Parent)
router.post('/bookings', auth, async (req, res) => {
  try {
    console.log('📥 Booking request received:', req.body);
    console.log('👤 User:', { userId: req.user.userId, role: req.user.role, name: `${req.user.firstName} ${req.user.lastName}` });

    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can create bookings' });
    }

    const {
      nannyId,
      childName,
      childAge,
      specialNeeds,
      allergies,
      medicalInfo,
      serviceDate,
      startTime,
      endTime,
      hours,
      hourlyRate,
      parentInstructions,
      safetyGuidelines,
      emergencyContact,
      parentAddress,
      parentPhone
    } = req.body;

    // Validation
    if (!nannyId) {
      console.error('❌ Missing nannyId');
      return res.status(400).json({ message: 'Nanny ID is required' });
    }
    if (!childName) {
      console.error('❌ Missing childName');
      return res.status(400).json({ message: 'Child name is required' });
    }
    if (!serviceDate) {
      console.error('❌ Missing serviceDate');
      return res.status(400).json({ message: 'Service date is required' });
    }
    if (!startTime || !endTime) {
      console.error('❌ Missing time fields');
      return res.status(400).json({ message: 'Start time and end time are required' });
    }
    if (!hours || hours <= 0) {
      console.error('❌ Invalid hours');
      return res.status(400).json({ message: 'Hours must be greater than 0' });
    }

    console.log('🔍 Looking for nanny:', nannyId);
    const nanny = await User.findById(nannyId);
    if (!nanny || nanny.staff?.staffType !== 'nanny') {
      console.error('❌ Nanny not found or invalid type:', nanny);
      return res.status(404).json({ message: 'Nanny not found' });
    }
    console.log('✅ Nanny found:', `${nanny.firstName} ${nanny.lastName}`);

    const bookingData = {
      parent: req.user.userId,
      parentName: `${req.user.firstName} ${req.user.lastName}`,
      parentPhone: parentPhone || req.user.phone,
      parentAddress: parentAddress || req.user.address,
      nanny: nannyId,
      nannyName: `${nanny.firstName} ${nanny.lastName}`,
      child: {
        name: childName,
        age: childAge ? parseInt(childAge) : undefined,
        specialNeeds: specialNeeds || '',
        allergies: allergies || '',
        medicalInfo: medicalInfo || ''
      },
      serviceDate: new Date(serviceDate),
      startTime,
      endTime,
      hours: parseInt(hours),
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 15,
      parentInstructions: parentInstructions || '',
      safetyGuidelines: safetyGuidelines || '',
      emergencyContact: emergencyContact || { name: '', phone: '', relationship: '' },
      status: 'pending'
    };

    console.log('📝 Creating booking with data:', bookingData);
    const booking = new NannyBooking(bookingData);
    await booking.save();
    console.log('✅ Booking saved successfully:', booking._id);
    
    res.status(201).json({ message: 'Booking request created successfully', booking });
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
  }
});

// Get parent's bookings
router.get('/bookings/parent', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bookings = await NannyBooking.find({ parent: req.user.userId })
      .populate('nanny', 'firstName lastName phone')
      .sort({ serviceDate: -1 });
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching parent bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get nanny's booking requests
router.get('/bookings/nanny', auth, async (req, res) => {
  try {
    if (req.user.role !== 'staff' || req.user.staff?.staffType !== 'nanny') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const status = req.query.status;
    const query = { nanny: req.user.userId };
    
    if (status) {
      query.status = status;
    }

    const bookings = await NannyBooking.find(query)
      .populate('parent', 'firstName lastName phone')
      .sort({ serviceDate: -1 });
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching nanny bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending requests for nanny
router.get('/bookings/nanny/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'staff' || req.user.staff?.staffType !== 'nanny') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bookings = await NannyBooking.find({
      nanny: req.user.userId,
      status: 'pending'
    })
      .populate('parent', 'firstName lastName phone')
      .sort({ serviceDate: 1 });
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept booking (Nanny)
router.put('/bookings/:id/accept', auth, async (req, res) => {
  try {
    if (req.user.role !== 'staff' || req.user.staff?.staffType !== 'nanny') {
      return res.status(403).json({ message: 'Only nannies can accept bookings' });
    }

    const booking = await NannyBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.nanny.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    booking.status = 'accepted';
    await booking.save();

    res.json({ message: 'Booking accepted', booking });
  } catch (error) {
    console.error('Error accepting booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject booking (Nanny)
router.put('/bookings/:id/reject', auth, async (req, res) => {
  try {
    if (req.user.role !== 'staff' || req.user.staff?.staffType !== 'nanny') {
      return res.status(403).json({ message: 'Only nannies can reject bookings' });
    }

    const booking = await NannyBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.nanny.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    booking.status = 'rejected';
    await booking.save();

    res.json({ message: 'Booking rejected', booking });
  } catch (error) {
    console.error('Error rejecting booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start service (Nanny)
router.put('/bookings/:id/start', auth, async (req, res) => {
  try {
    if (req.user.role !== 'staff' || req.user.staff?.staffType !== 'nanny') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const booking = await NannyBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.nanny.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    booking.status = 'in-progress';
    booking.actualStartTime = new Date();
    await booking.save();

    res.json({ message: 'Service started', booking });
  } catch (error) {
    console.error('Error starting service:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// End service (Nanny)
router.put('/bookings/:id/end', auth, async (req, res) => {
  try {
    if (req.user.role !== 'staff' || req.user.staff?.staffType !== 'nanny') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const booking = await NannyBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.nanny.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    booking.status = 'completed';
    booking.actualEndTime = new Date();
    await booking.save();

    res.json({ message: 'Service completed', booking });
  } catch (error) {
    console.error('Error ending service:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add service note (Nanny)
router.post('/bookings/:id/notes', auth, async (req, res) => {
  try {
    if (req.user.role !== 'staff' || req.user.staff?.staffType !== 'nanny') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { note } = req.body;
    const booking = await NannyBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.nanny.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    booking.serviceNotes.push({
      note,
      addedBy: `${req.user.firstName} ${req.user.lastName}`,
      timestamp: new Date()
    });

    await booking.save();
    res.json({ message: 'Note added', booking });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add activity update (Nanny)
router.post('/bookings/:id/activity', auth, async (req, res) => {
  try {
    if (req.user.role !== 'staff' || req.user.staff?.staffType !== 'nanny') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { activity, photos } = req.body;
    const booking = await NannyBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.nanny.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    booking.activityUpdates.push({
      activity,
      photos: photos || [],
      timestamp: new Date()
    });

    await booking.save();
    res.json({ message: 'Activity update added', booking });
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add rating and review (Parent)
router.post('/bookings/:id/review', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can add reviews' });
    }

    const { rating, review } = req.body;
    const booking = await NannyBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.parent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed bookings' });
    }

    booking.rating = rating;
    booking.review = review;
    booking.reviewDate = new Date();

    await booking.save();
    res.json({ message: 'Review added', booking });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel booking
router.put('/bookings/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await NannyBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isParent = req.user.role === 'parent' && booking.parent.toString() === req.user.userId;
    const isNanny = req.user.role === 'staff' && 
                     req.user.staff?.staffType === 'nanny' && 
                     booking.nanny.toString() === req.user.userId;

    if (!isParent && !isNanny) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledBy = req.user.role === 'parent' ? 'parent' : 'nanny';
    booking.cancelledAt = new Date();

    await booking.save();
    res.json({ message: 'Booking cancelled', booking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send message
router.post('/bookings/:id/message', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const booking = await NannyBooking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isParent = req.user.role === 'parent' && booking.parent.toString() === req.user.userId;
    const isNanny = req.user.role === 'staff' && 
                     req.user.staff?.staffType === 'nanny' && 
                     booking.nanny.toString() === req.user.userId;

    if (!isParent && !isNanny) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    booking.messages.push({
      sender: req.user.userId,
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      message,
      timestamp: new Date()
    });

    await booking.save();
    res.json({ message: 'Message sent', booking });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get nanny reviews
router.get('/nannies/:nannyId/reviews', auth, async (req, res) => {
  try {
    const reviews = await NannyBooking.find({
      nanny: req.params.nannyId,
      status: 'completed',
      rating: { $exists: true, $ne: null }
    })
      .select('rating review reviewDate parentName')
      .sort({ reviewDate: -1 });
    
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
