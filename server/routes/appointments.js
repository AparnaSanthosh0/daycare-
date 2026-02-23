const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Child = require('../models/Child');
const User = require('../models/User');
const DoctorEarning = require('../models/DoctorEarning');
const auth = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');

// Create appointment (Parent)
router.post('/', auth, async (req, res) => {
  try {
    const { childId, appointmentDate, appointmentTime, reason, appointmentType, isEmergency } = req.body;

    // Validate appointment date
    const appointmentDateObj = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if appointment is in the past
    if (appointmentDateObj < today) {
      return res.status(400).json({ message: 'Cannot book appointments in the past' });
    }
    
    // Check if appointment is more than 3 months in future
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    if (appointmentDateObj > maxDate) {
      return res.status(400).json({ message: 'Appointments can only be booked up to 3 months in advance' });
    }

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
      
      // Handle payment release to doctor when appointment is completed
      if (appointment.payment && appointment.payment.status === 'payment_held') {
        try {
          const DoctorPayment = require('../models/DoctorPayment');
          const DoctorEarning = require('../models/DoctorEarning');
          const { sendMail } = require('../utils/mailer');
          
          // Find the payment record
          const paymentRecord = await DoctorPayment.findOne({ 
            appointment: appointment._id,
            status: 'payment_held'
          });
          
          if (paymentRecord) {
            // Update payment status to released
            paymentRecord.status = 'released';
            paymentRecord.releasedAt = new Date();
            await paymentRecord.save();
            
            // Update appointment payment status
            appointment.payment.status = 'released';
            appointment.payment.releasedAt = new Date();
            
            // Create earning record for doctor
            const earning = new DoctorEarning({
              doctor: appointment.doctor,
              appointment: appointment._id,
              child: appointment.child,
              parent: appointment.parent,
              consultationFee: paymentRecord.totalAmount,
              commissionRate: paymentRecord.commissionRate,
              commissionAmount: paymentRecord.commissionAmount,
              netEarning: paymentRecord.payoutAmount,
              status: 'credited',
              consultationDate: appointment.appointmentDate,
              creditedAt: new Date(),
              notes: `Consultation fee for appointment on ${new Date(appointment.appointmentDate).toLocaleDateString()}`
            });
            await earning.save();
            
            // Send email notification to doctor
            await appointment.populate('doctor parent');
            const doctorEmail = appointment.doctor?.email;
            if (doctorEmail) {
              await sendMail({
                to: doctorEmail,
                subject: 'Payment Released - TinyTots',
                html: `
                  <h2>Payment Released</h2>
                  <p>Dear Dr. ${appointment.doctor?.firstName} ${appointment.doctor?.lastName},</p>
                  <p>Your consultation fee has been released to your account.</p>
                  <h3>Payment Details:</h3>
                  <ul>
                    <li><strong>Total Amount:</strong> ₹${paymentRecord.totalAmount}</li>
                    <li><strong>Platform Commission:</strong> ₹${paymentRecord.commissionAmount}</li>
                    <li><strong>Your Payout:</strong> ₹${paymentRecord.payoutAmount}</li>
                    <li><strong>Appointment Date:</strong> ${new Date(appointment.appointmentDate).toLocaleDateString()}</li>
                  </ul>
                  <p>The amount has been credited to your earnings and will be paid out according to the payout schedule.</p>
                  <p>Thank you for using TinyTots!</p>
                `
              });
              console.log('Payment release email sent to doctor:', doctorEmail);
            }
            
            console.log('Payment released to doctor:', appointment.doctor, 'Amount:', paymentRecord.payoutAmount);
          }
        } catch (paymentError) {
          console.error('Error releasing payment to doctor:', paymentError);
          // Don't fail the entire request if payment release fails
        }
      }
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

    // Credit payment to doctor's account
    const consultationFee = appointment.payment?.consultationFee || 500;
    const commissionRate = appointment.payment?.commissionRate || 10;
    const commissionAmount = (consultationFee * commissionRate) / 100;
    const netEarning = consultationFee - commissionAmount;

    // Update doctor's wallet
    const doctor = await User.findById(appointment.doctor._id);
    if (doctor && doctor.role === 'doctor') {
      if (!doctor.doctor) {
        doctor.doctor = {};
      }
      doctor.doctor.walletBalance = (doctor.doctor.walletBalance || 0) + netEarning;
      doctor.doctor.totalEarnings = (doctor.doctor.totalEarnings || 0) + netEarning;
      doctor.doctor.totalConsultations = (doctor.doctor.totalConsultations || 0) + 1;
      await doctor.save();

      // Create earning record
      const earning = new DoctorEarning({
        doctor: doctor._id,
        appointment: appointment._id,
        child: appointment.child._id,
        parent: appointment.parent._id,
        consultationFee,
        commissionRate,
        commissionAmount,
        netEarning,
        consultationDate: appointment.completedAt,
        status: 'credited'
      });
      await earning.save();

      // Update appointment payment status
      if (!appointment.payment) {
        appointment.payment = {};
      }
      appointment.payment.status = 'paid_to_doctor';
      appointment.payment.paidToDoctorAt = new Date();
      appointment.payment.commissionAmount = commissionAmount;
      appointment.payment.doctorPayoutAmount = netEarning;
      await appointment.save();

      // Send email notification to doctor
      try {
        const childName = appointment.child ? `${appointment.child.firstName} ${appointment.child.lastName}` : 'Patient';
        const emailSubject = '💰 Consultation Payment Credited - TinyTots';
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">Payment Credited Successfully!</h2>
            <p>Dear Dr. ${doctor.firstName} ${doctor.lastName},</p>
            <p>Your consultation fee has been credited to your account.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Consultation Details:</h3>
              <p><strong>Patient:</strong> ${childName}</p>
              <p><strong>Date:</strong> ${new Date(appointment.completedAt).toLocaleDateString()}</p>
              <p><strong>Consultation Fee:</strong> ₹${consultationFee}</p>
              <p><strong>Platform Commission (${commissionRate}%):</strong> -₹${commissionAmount.toFixed(2)}</p>
              <p><strong>Net Earning:</strong> <span style="color: #4CAF50; font-size: 18px; font-weight: bold;">₹${netEarning.toFixed(2)}</span></p>
            </div>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Wallet Summary:</h3>
              <p><strong>Current Balance:</strong> ₹${doctor.doctor.walletBalance.toFixed(2)}</p>
              <p><strong>Total Earnings:</strong> ₹${doctor.doctor.totalEarnings.toFixed(2)}</p>
              <p><strong>Total Consultations:</strong> ${doctor.doctor.totalConsultations}</p>
            </div>
            
            <p>You can view your complete earnings history in your dashboard.</p>
            
            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/doctor/dashboard" 
                 style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                View Dashboard
              </a>
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Thank you for your service!<br/>
              TinyTots Team
            </p>
          </div>
        `;
        const emailText = `
Payment Credited Successfully!

Dear Dr. ${doctor.firstName} ${doctor.lastName},

Your consultation fee has been credited to your account.

Consultation Details:
- Patient: ${childName}
- Date: ${new Date(appointment.completedAt).toLocaleDateString()}
- Consultation Fee: ₹${consultationFee}
- Platform Commission (${commissionRate}%): -₹${commissionAmount.toFixed(2)}
- Net Earning: ₹${netEarning.toFixed(2)}

Wallet Summary:
- Current Balance: ₹${doctor.doctor.walletBalance.toFixed(2)}
- Total Earnings: ₹${doctor.doctor.totalEarnings.toFixed(2)}
- Total Consultations: ${doctor.doctor.totalConsultations}

You can view your complete earnings history in your dashboard.

Thank you for your service!
TinyTots Team
        `;

        await sendMail({
          to: doctor.email,
          subject: emailSubject,
          html: emailHtml,
          text: emailText
        });
        console.log(`✅ Payment notification email sent to ${doctor.email}`);
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({ 
      message: 'Consultation details saved successfully', 
      appointment,
      paymentCredited: true,
      netEarning: netEarning.toFixed(2)
    });
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
