const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Child = require('../models/Child');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create appointment (Parent)
router.post('/', auth, async (req, res) => {
  try {
    const { childId, appointmentDate, appointmentTime, reason, appointmentType, isEmergency } = req.body;

    // Verify child belongs to parent
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Check if parent has access to this child
    const isParent = child.parents.some(p => p.toString() === req.user.userId);
    if (!isParent && req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Not authorized to book appointment for this child' });
    }

    // Find the doctor (assuming single doctor in system)
    const doctor = await User.findOne({ role: 'doctor', isActive: true });
    if (!doctor) {
      return res.status(404).json({ message: 'No doctor available' });
    }

    const appointment = new Appointment({
      child: childId,
      parent: req.user.userId,
      doctor: doctor._id,
      appointmentDate,
      appointmentTime,
      reason,
      appointmentType: appointmentType || 'onsite',
      isEmergency: isEmergency || false,
      requestedBy: req.user.role === 'parent' ? 'parent' : req.user.role
    });

    await appointment.save();

    // Populate appointment details
    await appointment.populate('child parent doctor');

    res.status(201).json({
      message: 'Appointment request submitted successfully',
      appointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get appointments for parent
router.get('/parent', auth, async (req, res) => {
  try {
    const appointments = await Appointment.find({ parent: req.user.userId })
      .populate('child doctor')
      .sort({ appointmentDate: -1 });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching parent appointments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get appointments for doctor
router.get('/doctor', auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status } = req.query;
    const filter = { doctor: req.user.userId };
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate('child parent')
      .sort({ 
        isEmergency: -1,  // Emergency first
        appointmentDate: 1, 
        appointmentTime: 1 
      });

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get pending doctor payments
router.get('/payments/admin/pending', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const DoctorPayment = require('../models/DoctorPayment');
    const payments = await DoctorPayment.find({ status: { $in: ['parent_confirmed', 'admin_approved'] } })
      .populate('appointment')
      .populate('doctor', 'firstName lastName email phone')
      .populate('parent', 'firstName lastName email')
      .sort({ parentConfirmedAt: -1 });
    res.json(payments);
  } catch (error) {
    console.error('Get doctor payments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Approve doctor payout (after parent confirmed)
router.put('/payments/:paymentId/approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const DoctorPayment = require('../models/DoctorPayment');
    const payment = await DoctorPayment.findById(req.params.paymentId).populate('appointment doctor');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status !== 'parent_confirmed') {
      return res.status(400).json({ message: 'Payment must be confirmed by parent first' });
    }
    payment.status = 'admin_approved';
    payment.adminApprovedAt = new Date();
    payment.approvedBy = req.user.userId;
    payment.payoutMethod = req.body.payoutMethod || 'bank_transfer';
    payment.payoutDetails = req.body.payoutDetails || {};
    await payment.save();
    if (payment.appointment) {
      payment.appointment.payment = payment.appointment.payment || {};
      payment.appointment.payment.status = 'admin_approved';
      await payment.appointment.save();
    }
    res.json({ message: 'Payment approved. Ready for payout to doctor.', payment });
  } catch (error) {
    console.error('Approve doctor payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Mark doctor payment as paid (after actual transfer)
router.put('/payments/:paymentId/mark-paid', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const DoctorPayment = require('../models/DoctorPayment');
    const payment = await DoctorPayment.findById(req.params.paymentId).populate('appointment');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status !== 'admin_approved') {
      return res.status(400).json({ message: 'Payment must be approved first' });
    }
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.payoutTransactionId = req.body.payoutTransactionId || '';
    await payment.save();
    if (payment.appointment) {
      payment.appointment.payment = payment.appointment.payment || {};
      payment.appointment.payment.status = 'paid_to_doctor';
      payment.appointment.payment.paidToDoctorAt = new Date();
      await payment.appointment.save();
    }
    res.json({ message: 'Payment marked as paid.', payment });
  } catch (error) {
    console.error('Mark doctor paid error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get appointment by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('child parent doctor');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check authorization
    const isAuthorized = 
      appointment.parent.toString() === req.user.userId ||
      appointment.doctor.toString() === req.user.userId ||
      req.user.role === 'admin' ||
      req.user.role === 'staff';

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment status (Doctor/Admin)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, rescheduledDate, rescheduledTime, rescheduledReason, cancelReason } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Only doctor and admin can update status
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if appointment date has passed and trying to confirm
    if (status === 'confirmed') {
      const appointmentDate = new Date(appointment.appointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        return res.status(400).json({ 
          message: 'Cannot confirm past appointment. Please reschedule instead.' 
        });
      }
    }

    appointment.status = status;

    if (status === 'rescheduled') {
      appointment.rescheduledDate = rescheduledDate;
      appointment.rescheduledTime = rescheduledTime;
      appointment.rescheduledReason = rescheduledReason;
    }

    if (status === 'cancelled') {
      appointment.cancelledAt = new Date();
      appointment.cancelReason = cancelReason;
    }

    if (status === 'completed') {
      appointment.completedAt = new Date();
    }

    await appointment.save();
    await appointment.populate('child parent doctor');

    res.json({ message: 'Appointment updated successfully', appointment });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add consultation details (Doctor only)
router.patch('/:id/consultation', auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { diagnosis, prescription, healthAdvice, notes } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.diagnosis = diagnosis || appointment.diagnosis;
    appointment.prescription = prescription || appointment.prescription;
    appointment.healthAdvice = healthAdvice || appointment.healthAdvice;
    appointment.notes = notes || appointment.notes;
    appointment.status = 'completed';
    appointment.completedAt = new Date();

    await appointment.save();
    await appointment.populate('child parent doctor');

    res.json({ message: 'Consultation details saved successfully', appointment });
  } catch (error) {
    console.error('Error saving consultation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get appointment statistics (Doctor)
router.get('/stats/doctor', auth, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCount, thisWeekCount, pendingCount, completedCount] = await Promise.all([
      Appointment.countDocuments({
        doctor: req.user.userId,
        appointmentDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      }),
      Appointment.countDocuments({
        doctor: req.user.userId,
        appointmentDate: { $gte: today, $lt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) }
      }),
      Appointment.countDocuments({
        doctor: req.user.userId,
        status: 'pending'
      }),
      Appointment.countDocuments({
        doctor: req.user.userId,
        status: 'completed'
      })
    ]);

    res.json({
      today: todayCount,
      thisWeek: thisWeekCount,
      pending: pendingCount,
      completed: completedCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message between parent and doctor
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is either the parent or doctor of this appointment
    const isParent = appointment.parent.toString() === req.user.userId;
    const isDoctor = appointment.doctor && appointment.doctor.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isParent && !isDoctor && !isAdmin) {
      return res.status(403).json({ message: 'Access denied. You are not part of this appointment.' });
    }

    // Determine sender role
    let senderRole = 'parent';
    if (req.user.role === 'doctor') {
      senderRole = 'doctor';
    }

    // Add message to appointment
    appointment.messages.push({
      sender: req.user.userId,
      senderRole: senderRole,
      message: message.trim()
    });

    await appointment.save();
    await appointment.populate('messages.sender', 'name email');

    res.json({ 
      message: 'Message sent successfully', 
      messages: appointment.messages 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Parent confirms service completion (escrow - releases for admin payout)
router.post('/:id/confirm-payment', auth, async (req, res) => {
  try {
    const { rating, feedback, issues } = req.body;
    const appointment = await Appointment.findById(req.params.id).populate('doctor', 'firstName lastName');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (appointment.parent.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (appointment.payment?.status !== 'payment_held') {
      return res.status(400).json({ message: 'Payment must be held before confirmation' });
    }
    const DoctorPayment = require('../models/DoctorPayment');
    let payment = await DoctorPayment.findOne({ appointment: appointment._id });
    if (!payment) {
      payment = new DoctorPayment({
        appointment: appointment._id,
        doctor: appointment.doctor._id,
        parent: appointment.parent,
        totalAmount: appointment.payment?.consultationFee || 500,
        commissionRate: 10,
        commissionAmount: 0,
        payoutAmount: 0,
        status: 'parent_confirmed',
        paymentReceivedAt: appointment.payment?.paidAt,
        paymentHeldAt: appointment.payment?.heldAt,
        parentConfirmedAt: new Date(),
        parentConfirmation: { confirmed: true, confirmedAt: new Date(), rating: rating || 5, feedback: feedback || '', issues: issues || '' }
      });
      payment.commissionAmount = Math.round((payment.totalAmount * 10 / 100) * 100) / 100;
      payment.payoutAmount = Math.round((payment.totalAmount - payment.commissionAmount) * 100) / 100;
    } else {
      payment.status = 'parent_confirmed';
      payment.parentConfirmedAt = new Date();
      payment.parentConfirmation = { confirmed: true, confirmedAt: new Date(), rating: rating || 5, feedback: feedback || '', issues: issues || '' };
    }
    await payment.save();
    appointment.payment = appointment.payment || {};
    appointment.payment.status = 'parent_confirmed';
    appointment.payment.parentConfirmedAt = new Date();
    appointment.payment.parentConfirmation = payment.parentConfirmation;
    await appointment.save();
    res.json({ message: 'Payment confirmed. Admin will review and approve payout.', appointment, payment });
  } catch (error) {
    console.error('Confirm doctor payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get messages for an appointment
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('messages.sender', 'name email');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is either the parent or doctor of this appointment
    const isParent = appointment.parent.toString() === req.user.userId;
    const isDoctor = appointment.doctor && appointment.doctor.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isParent && !isDoctor && !isAdmin) {
      return res.status(403).json({ message: 'Access denied. You are not part of this appointment.' });
    }

    res.json({ messages: appointment.messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
