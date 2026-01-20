const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const NannyBooking = require('../models/NannyBooking');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');

// Helper: determine if current user is a nanny (supports both staff+nanny and dedicated nanny role)
function isNannyUser(user) {
  if (!user) {
    console.log('⚠️ isNannyUser: user is null/undefined');
    return false;
  }
  const isStaffNanny = user.role === 'staff' && user.staff?.staffType === 'nanny';
  const isNannyRole = user.role === 'nanny';
  const result = isStaffNanny || isNannyRole;
  console.log('🔍 isNannyUser check:', {
    role: user.role,
    staff: user.staff,
    staffType: user.staff?.staffType,
    isStaffNanny,
    isNannyRole,
    result
  });
  return result;
}

function isAdmin(user) {
  return !!user && user.role === 'admin';
}

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
      parentPhone,
      serviceType,
      serviceCategory,
      subscriptionPlan
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

    // Calculate total amount with subscription discount if applicable
    let finalHourlyRate = hourlyRate ? parseFloat(hourlyRate) : 15;
    let discountPercentage = 0;
    
    if (serviceType === 'subscription' && subscriptionPlan) {
      discountPercentage = subscriptionPlan.discountPercentage || 0;
      if (discountPercentage > 0) {
        finalHourlyRate = finalHourlyRate * (1 - discountPercentage / 100);
      }
    }
    
    const totalAmount = parseInt(hours) * finalHourlyRate;
    const commissionRate = 10; // Platform commission percentage
    const commissionAmount = Math.round((totalAmount * commissionRate / 100) * 100) / 100;
    const nannyPayoutAmount = Math.round((totalAmount - commissionAmount) * 100) / 100;

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
      hourlyRate: finalHourlyRate,
      totalAmount: totalAmount,
      serviceType: serviceType || 'regular-care',
      serviceCategory: serviceCategory || null,
      subscriptionPlan: subscriptionPlan || null,
      parentInstructions: parentInstructions || '',
      safetyGuidelines: safetyGuidelines || '',
      emergencyContact: emergencyContact || { name: '', phone: '', relationship: '' },
      status: 'pending',
      payment: {
        status: 'pending',
        amount: totalAmount,
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        nannyPayoutAmount: nannyPayoutAmount
      }
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
      .populate('parent', 'firstName lastName email phone address')
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
    if (!isNannyUser(req.user)) {
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

// ===== Admin endpoints =====

// Get all pending nanny bookings for admin review/assignment
router.get('/bookings/admin/pending', auth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Get both pending and admin-approved bookings (those that need nanny assignment)
    const bookings = await NannyBooking.find({ 
      $or: [
        { status: 'pending' },
        { status: 'admin-approved' }
      ]
    })
      .populate('parent', 'firstName lastName phone address')
      .populate('nanny', 'firstName lastName phone')
      .sort({ serviceDate: 1 });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching admin nanny bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin approves a booking (sends email to parent)
router.put('/bookings/:id/approve', auth, async (req, res) => {
  console.log('✅ APPROVE ROUTE HIT - Booking ID:', req.params.id);
  console.log('✅ User:', req.user?.role, req.user?.userId);
  try {
    if (!req.user) {
      console.log('❌ No user in request');
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!isAdmin(req.user)) {
      console.log('❌ Not admin:', req.user.role);
      return res.status(403).json({ message: 'Admin access required' });
    }

    const booking = await NannyBooking.findById(req.params.id).populate('parent', 'firstName lastName email phone address');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Booking is already processed' });
    }

    // Update status to admin-approved
    booking.status = 'admin-approved';
    await booking.save();

    // Send approval email to parent
    try {
      const parentEmail = booking.parent?.email;
      if (parentEmail) {
        const serviceDateStr = booking.serviceDate ? new Date(booking.serviceDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : '';
        const addressStr = booking.parentAddress || 
          (booking.parent?.address ? 
            (typeof booking.parent.address === 'string' ? booking.parent.address :
              `${booking.parent.address.street || ''}, ${booking.parent.address.city || ''}, ${booking.parent.address.state || ''} ${booking.parent.address.zipCode || ''}`.trim())
            : 'On file');

        const subject = 'Your Nanny Service Request Has Been Approved';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1abc9c;">Booking Approved!</h2>
            <p>Hi ${booking.parent.firstName} ${booking.parent.lastName},</p>
            <p>Great news! Your nanny service request has been <b>approved</b> by the admin.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Booking Details:</h3>
              <p><b>Child:</b> ${booking.child?.name || 'N/A'}</p>
              <p><b>Service Date:</b> ${serviceDateStr}</p>
              <p><b>Time:</b> ${booking.startTime} - ${booking.endTime}</p>
              <p><b>Duration:</b> ${booking.hours} hours</p>
              <p><b>Service Address:</b> ${addressStr}</p>
              <p><b>Total Amount:</b> $${booking.totalAmount || (booking.hours * (booking.hourlyRate || 15))}</p>
            </div>

            <p>A nanny will be assigned to your booking shortly. You will receive another email once a nanny has been assigned.</p>
            
            <p>You can view your booking status in your parent dashboard.</p>
            
            <p>Regards,<br/>TinyTots Team</p>
          </div>
        `;
        const text = `Hi ${booking.parent.firstName} ${booking.parent.lastName},\n\nYour nanny service request has been approved!\n\nBooking Details:\nChild: ${booking.child?.name || 'N/A'}\nService Date: ${serviceDateStr}\nTime: ${booking.startTime} - ${booking.endTime}\nDuration: ${booking.hours} hours\nService Address: ${addressStr}\nTotal Amount: $${booking.totalAmount || (booking.hours * (booking.hourlyRate || 15))}\n\nA nanny will be assigned shortly. You will receive another email once assigned.\n\nRegards,\nTinyTots Team`;
        
        await sendMail({ to: parentEmail, subject, html, text });
        console.log(`✅ Approval email sent to ${parentEmail}`);
      }
    } catch (mailErr) {
      console.warn('⚠️ Failed to send approval email:', mailErr?.message || mailErr);
    }

    res.json({ message: 'Booking approved successfully. Email sent to parent.', booking });
  } catch (error) {
    console.error('Error approving booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin assigns/changes nanny for a booking
router.put('/bookings/:id/assign', auth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { nannyId } = req.body;
    if (!nannyId) {
      return res.status(400).json({ message: 'nannyId is required' });
    }

    const nanny = await User.findById(nannyId);
    if (!nanny || !isNannyUser(nanny)) {
      return res.status(404).json({ message: 'Nanny not found or not a nanny user' });
    }

    const booking = await NannyBooking.findById(req.params.id).populate('parent', 'firstName lastName email phone address');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only allow assignment if booking is approved
    if (booking.status !== 'admin-approved' && booking.status !== 'pending') {
      return res.status(400).json({ message: 'Can only assign nanny to approved or pending bookings' });
    }

    booking.nanny = nanny._id;
    booking.nannyName = `${nanny.firstName} ${nanny.lastName}`;
    // Keep status as 'admin-approved' so nanny can see and accept it
    if (booking.status === 'pending') {
      booking.status = 'admin-approved';
    }
    await booking.save();

    // Notify parent by email that nanny has been assigned
    try {
      const parentEmail = booking.parent?.email;
      if (parentEmail) {
        const serviceDateStr = booking.serviceDate ? new Date(booking.serviceDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : '';
        const addressStr = booking.parentAddress || 
          (booking.parent?.address ? 
            (typeof booking.parent.address === 'string' ? booking.parent.address :
              `${booking.parent.address.street || ''}, ${booking.parent.address.city || ''}, ${booking.parent.address.state || ''} ${booking.parent.address.zipCode || ''}`.trim())
            : 'On file');

        const subject = 'Nanny Assigned to Your Booking';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1abc9c;">Nanny Assigned!</h2>
            <p>Hi ${booking.parent.firstName} ${booking.parent.lastName},</p>
            <p>A nanny has been assigned to your booking request.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Booking Details:</h3>
              <p><b>Child:</b> ${booking.child?.name || 'N/A'}</p>
              <p><b>Service Date:</b> ${serviceDateStr}</p>
              <p><b>Time:</b> ${booking.startTime} - ${booking.endTime}</p>
              <p><b>Duration:</b> ${booking.hours} hours</p>
              <p><b>Service Address:</b> ${addressStr}</p>
              <p><b>Assigned Nanny:</b> ${booking.nannyName}</p>
              <p><b>Total Amount:</b> $${booking.totalAmount || (booking.hours * (booking.hourlyRate || 15))}</p>
            </div>

            <p>The nanny will review and accept the booking from their dashboard. Once accepted, your booking will be confirmed.</p>
            
            <p>You can track your booking status in your parent dashboard.</p>
            
            <p>Regards,<br/>TinyTots Team</p>
          </div>
        `;
        const text = `Hi ${booking.parent.firstName} ${booking.parent.lastName},\n\nA nanny has been assigned to your booking!\n\nBooking Details:\nChild: ${booking.child?.name || 'N/A'}\nService Date: ${serviceDateStr}\nTime: ${booking.startTime} - ${booking.endTime}\nAssigned Nanny: ${booking.nannyName}\n\nThe nanny will review and accept the booking. Once accepted, your booking will be confirmed.\n\nRegards,\nTinyTots Team`;
        await sendMail({ to: parentEmail, subject, html, text });
        console.log(`✅ Assignment email sent to ${parentEmail}`);
      }
    } catch (mailErr) {
      console.warn('⚠️ Failed to send nanny assignment email:', mailErr?.message || mailErr);
    }

    res.json({ message: 'Nanny assigned successfully. Email sent to parent.', booking });
  } catch (error) {
    console.error('Error assigning nanny:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending requests for nanny
router.get('/bookings/nanny/pending', auth, async (req, res) => {
  try {
    console.log('🔍 Nanny pending requests check:', {
      userId: req.user.userId,
      role: req.user.role,
      staff: req.user.staff,
      isNanny: isNannyUser(req.user)
    });
    
    if (!isNannyUser(req.user)) {
      console.log('❌ Not a nanny user:', req.user);
      return res.status(403).json({ message: 'Access denied. Only nannies can access this endpoint.' });
    }

    // Get bookings assigned to this nanny that are admin-approved (ready for nanny to accept)
    const bookings = await NannyBooking.find({
      nanny: req.user.userId,
      status: 'admin-approved'
    })
      .populate('parent', 'firstName lastName phone address')
      .sort({ serviceDate: 1 });
    
    console.log(`✅ Found ${bookings.length} pending bookings for nanny ${req.user.userId}`);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept booking (Nanny)
router.put('/bookings/:id/accept', auth, async (req, res) => {
  try {
    if (!isNannyUser(req.user)) {
      return res.status(403).json({ message: 'Only nannies can accept bookings' });
    }

    const booking = await NannyBooking.findById(req.params.id).populate('parent', 'firstName lastName email phone address');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.nanny.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.status !== 'admin-approved') {
      return res.status(400).json({ message: 'Booking must be approved by admin before nanny can accept' });
    }

    booking.status = 'accepted';
    await booking.save();

    // Notify parent that nanny has accepted
    try {
      const parentEmail = booking.parent?.email;
      if (parentEmail) {
        const serviceDateStr = booking.serviceDate ? new Date(booking.serviceDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : '';
        const addressStr = booking.parentAddress || 
          (booking.parent?.address ? 
            (typeof booking.parent.address === 'string' ? booking.parent.address :
              `${booking.parent.address.street || ''}, ${booking.parent.address.city || ''}, ${booking.parent.address.state || ''} ${booking.parent.address.zipCode || ''}`.trim())
            : 'On file');

        const subject = 'Your Nanny Booking Has Been Confirmed!';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1abc9c;">Booking Confirmed!</h2>
            <p>Hi ${booking.parent.firstName} ${booking.parent.lastName},</p>
            <p>Great news! Your nanny booking has been <b>confirmed</b> by ${booking.nannyName}.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Booking Details:</h3>
              <p><b>Child:</b> ${booking.child?.name || 'N/A'}</p>
              <p><b>Service Date:</b> ${serviceDateStr}</p>
              <p><b>Time:</b> ${booking.startTime} - ${booking.endTime}</p>
              <p><b>Duration:</b> ${booking.hours} hours</p>
              <p><b>Service Address:</b> ${addressStr}</p>
              <p><b>Nanny:</b> ${booking.nannyName}</p>
              <p><b>Total Amount:</b> $${booking.totalAmount || (booking.hours * (booking.hourlyRate || 15))}</p>
            </div>

            <p>The nanny will arrive at the scheduled time. Please ensure someone is available to receive them.</p>
            
            <p>You can track your booking status in your parent dashboard.</p>
            
            <p>Regards,<br/>TinyTots Team</p>
          </div>
        `;
        const text = `Hi ${booking.parent.firstName} ${booking.parent.lastName},\n\nYour nanny booking has been confirmed by ${booking.nannyName}!\n\nBooking Details:\nChild: ${booking.child?.name || 'N/A'}\nService Date: ${serviceDateStr}\nTime: ${booking.startTime} - ${booking.endTime}\nNanny: ${booking.nannyName}\n\nThe nanny will arrive at the scheduled time.\n\nRegards,\nTinyTots Team`;
        await sendMail({ to: parentEmail, subject, html, text });
        console.log(`✅ Confirmation email sent to ${parentEmail}`);
      }
    } catch (mailErr) {
      console.warn('⚠️ Failed to send confirmation email:', mailErr?.message || mailErr);
    }

    res.json({ message: 'Booking accepted. Email sent to parent.', booking });
  } catch (error) {
    console.error('Error accepting booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject booking (Nanny)
router.put('/bookings/:id/reject', auth, async (req, res) => {
  try {
    if (!isNannyUser(req.user)) {
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
    if (!isNannyUser(req.user)) {
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
    if (!isNannyUser(req.user)) {
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
    
    // Calculate actual hours and update payment amount if different
    if (booking.actualStartTime && booking.actualEndTime) {
      const diffMs = booking.actualEndTime - booking.actualStartTime;
      booking.actualHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      if (booking.hourlyRate) {
        const actualTotal = booking.actualHours * booking.hourlyRate;
        booking.totalAmount = actualTotal;
        const commissionAmount = Math.round((actualTotal * booking.payment.commissionRate / 100) * 100) / 100;
        booking.payment.amount = actualTotal;
        booking.payment.commissionAmount = commissionAmount;
        booking.payment.nannyPayoutAmount = Math.round((actualTotal - commissionAmount) * 100) / 100;
      }
    }
    
    // Change payment status to payment_held (waiting for parent confirmation)
    booking.payment.status = 'payment_held';
    booking.payment.heldAt = new Date();
    
    await booking.save();

    res.json({ message: 'Service completed. Waiting for parent confirmation.', booking });
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

// ===== Payment Routes =====

const NannyPayment = require('../models/NannyPayment');

// Parent confirms service completion and payment
router.post('/bookings/:id/confirm-payment', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can confirm payment' });
    }

    const { rating, feedback, issues } = req.body;
    const booking = await NannyBooking.findById(req.params.id).populate('nanny', 'firstName lastName email');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.parent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Service must be completed before confirming payment' });
    }

    if (booking.payment.status !== 'payment_held') {
      return res.status(400).json({ message: 'Payment is not in the correct state for confirmation' });
    }

    // Update payment confirmation
    booking.payment.status = 'parent_confirmed';
    booking.payment.parentConfirmation = {
      confirmed: true,
      confirmedAt: new Date(),
      rating: rating || null,
      feedback: feedback || '',
      issues: issues || ''
    };
    booking.payment.parentConfirmedAt = new Date();
    
    // Update rating if provided
    if (rating) {
      booking.rating = rating;
      booking.review = feedback || '';
      booking.reviewDate = new Date();
    }

    await booking.save();

    // Create or update payment record
    let payment = await NannyPayment.findOne({ booking: booking._id });
    if (!payment) {
      payment = new NannyPayment({
        booking: booking._id,
        nanny: booking.nanny,
        parent: booking.parent,
        totalAmount: booking.totalAmount,
        commissionRate: booking.payment.commissionRate,
        commissionAmount: booking.payment.commissionAmount,
        payoutAmount: booking.payment.nannyPayoutAmount,
        status: 'parent_confirmed',
        paymentReceivedAt: booking.payment.paidAt,
        paymentHeldAt: booking.payment.heldAt,
        parentConfirmedAt: new Date(),
        parentConfirmation: booking.payment.parentConfirmation
      });
    } else {
      payment.status = 'parent_confirmed';
      payment.parentConfirmedAt = new Date();
      payment.parentConfirmation = booking.payment.parentConfirmation;
    }
    await payment.save();

    res.json({ message: 'Payment confirmed. Admin will review and approve payout.', booking, payment });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin approves payment and initiates payout to nanny
router.put('/payments/:paymentId/approve', auth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { payoutMethod, payoutDetails, payoutNotes } = req.body;
    const payment = await NannyPayment.findById(req.params.paymentId)
      .populate('booking')
      .populate('nanny', 'firstName lastName email')
      .populate('parent', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'parent_confirmed') {
      return res.status(400).json({ message: 'Payment must be confirmed by parent before admin approval' });
    }

    // Update payment status
    payment.status = 'admin_approved';
    payment.adminApprovedAt = new Date();
    payment.approvedBy = req.user.userId;
    payment.payoutMethod = payoutMethod || 'bank_transfer';
    payment.payoutDetails = payoutDetails || {};

    // Update booking payment status
    const booking = await NannyBooking.findById(payment.booking._id);
    if (booking) {
      booking.payment.status = 'admin_approved';
      booking.payment.adminApprovedAt = new Date();
      booking.payment.payoutMethod = payoutMethod;
      booking.payment.payoutDetails = payoutDetails;
      await booking.save();
    }

    await payment.save();

    res.json({ 
      message: 'Payment approved. Ready for payout to nanny.', 
      payment,
      note: 'Admin should mark payment as paid after actual transfer.'
    });
  } catch (error) {
    console.error('Error approving payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin marks payment as paid (after actual transfer)
router.put('/payments/:paymentId/mark-paid', auth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { payoutTransactionId } = req.body;
    const payment = await NannyPayment.findById(req.params.paymentId)
      .populate('booking')
      .populate('nanny', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'admin_approved') {
      return res.status(400).json({ message: 'Payment must be approved before marking as paid' });
    }

    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.payoutTransactionId = payoutTransactionId || '';

    // Update booking payment status
    const booking = await NannyBooking.findById(payment.booking._id);
    if (booking) {
      booking.payment.status = 'paid_to_nanny';
      booking.payment.paidToNannyAt = new Date();
      await booking.save();
    }

    await payment.save();

    // Send email notification to nanny
    try {
      if (payment.nanny?.email) {
        const subject = 'Payment Received - Nanny Service';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1abc9c;">Payment Received!</h2>
            <p>Hi ${payment.nanny.firstName} ${payment.nanny.lastName},</p>
            <p>Your payment for the completed service has been processed.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Payment Details:</h3>
              <p><b>Total Amount:</b> $${payment.totalAmount}</p>
              <p><b>Platform Commission:</b> $${payment.commissionAmount} (${payment.commissionRate}%)</p>
              <p><b>Your Payout:</b> $${payment.payoutAmount}</p>
              <p><b>Payment Method:</b> ${payment.payoutMethod}</p>
              ${payment.payoutTransactionId ? `<p><b>Transaction ID:</b> ${payment.payoutTransactionId}</p>` : ''}
            </div>

            <p>Thank you for your excellent service!</p>
            
            <p>Regards,<br/>TinyTots Team</p>
          </div>
        `;
        const text = `Hi ${payment.nanny.firstName},\n\nYour payment of $${payment.payoutAmount} has been processed.\n\nTotal: $${payment.totalAmount}\nCommission: $${payment.commissionAmount}\nYour Payout: $${payment.payoutAmount}\n\nThank you!\nTinyTots Team`;
        await sendMail({ to: payment.nanny.email, subject, html, text });
      }
    } catch (mailErr) {
      console.warn('⚠️ Failed to send payment email:', mailErr?.message || mailErr);
    }

    res.json({ message: 'Payment marked as paid. Nanny notified.', payment });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment history for nanny
router.get('/payments/nanny/history', auth, async (req, res) => {
  try {
    if (!isNannyUser(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payments = await NannyPayment.find({ nanny: req.user.userId })
      .populate('booking', 'child serviceDate startTime endTime hours')
      .populate('parent', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending payments for admin review
router.get('/payments/admin/pending', auth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const payments = await NannyPayment.find({
      status: { $in: ['parent_confirmed', 'admin_approved'] }
    })
      .populate('booking', 'child serviceDate startTime endTime hours serviceType serviceCategory')
      .populate('nanny', 'firstName lastName email phone')
      .populate('parent', 'firstName lastName email')
      .sort({ parentConfirmedAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
