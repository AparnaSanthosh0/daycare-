const Appointment = require('../models/Appointment');
const DoctorPayment = require('../models/DoctorPayment');
const DoctorEarning = require('../models/DoctorEarning');

/**
 * Split payment between doctor and admin when appointment is completed
 * @param {string} appointmentId - The appointment ID
 * @returns {Promise<Object>} - Payment split result
 */
const splitPayment = async (appointmentId) => {
  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor parent child');

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status !== 'completed') {
      throw new Error('Only completed appointments can have payments split');
    }

    const consultationFee = appointment.payment?.consultationFee || 500;
    const commissionRate = 30; // 30% admin commission
    const commissionAmount = Math.round((consultationFee * commissionRate / 100) * 100) / 100;
    const doctorEarning = Math.round((consultationFee - commissionAmount) * 100) / 100;

    // Create or update DoctorPayment record
    let doctorPayment = await DoctorPayment.findOne({ appointment: appointmentId });
    
    if (!doctorPayment) {
      doctorPayment = new DoctorPayment({
        appointment: appointmentId,
        doctor: appointment.doctor,
        parent: appointment.parent,
        totalAmount: consultationFee,
        commissionRate,
        commissionAmount,
        payoutAmount: doctorEarning,
        status: 'parent_confirmed', // Assume parent confirmed since appointment is completed
        paymentReceivedAt: new Date(),
        paymentHeldAt: new Date(),
        parentConfirmedAt: new Date()
      });
    } else {
      doctorPayment.status = 'parent_confirmed';
      doctorPayment.parentConfirmedAt = new Date();
    }

    await doctorPayment.save();

    // Create or update DoctorEarning record
    let doctorEarningRecord = await DoctorEarning.findOne({ appointment: appointmentId });
    
    if (!doctorEarningRecord) {
      doctorEarningRecord = new DoctorEarning({
        doctor: appointment.doctor,
        appointment: appointmentId,
        child: appointment.child,
        parent: appointment.parent,
        consultationFee,
        commissionRate,
        commissionAmount,
        netEarning: doctorEarning,
        status: 'credited',
        consultationDate: appointment.appointmentDate,
        creditedAt: new Date()
      });
    } else {
      doctorEarningRecord.status = 'credited';
      doctorEarningRecord.creditedAt = new Date();
    }

    await doctorEarningRecord.save();

    return {
      success: true,
      consultationFee,
      commissionAmount,
      doctorEarning,
      doctorPayment: doctorPayment._id,
      doctorEarningRecord: doctorEarningRecord._id
    };

  } catch (error) {
    console.error('Payment split error:', error);
    throw error;
  }
};

/**
 * Process payment withdrawal for doctor
 * @param {string} doctorId - The doctor ID
 * @returns {Promise<Object>} - Withdrawal result
 */
const processWithdrawal = async (doctorId) => {
  try {
    const creditedEarnings = await DoctorEarning.find({ 
      doctor: doctorId, 
      status: 'credited' 
    });

    if (creditedEarnings.length === 0) {
      throw new Error('No earnings available for withdrawal');
    }

    const totalAmount = creditedEarnings.reduce((sum, earning) => sum + earning.netEarning, 0);
    
    // Update all credited earnings to paid_out
    await DoctorEarning.updateMany(
      { doctor: doctorId, status: 'credited' },
      { 
        status: 'paid_out', 
        paidOutAt: new Date(),
        payoutTransactionId: `WD_${Date.now()}_${doctorId.toString().slice(-6)}`
      }
    );

    // Update corresponding DoctorPayment records
    const appointmentIds = creditedEarnings.map(e => e.appointment);
    await DoctorPayment.updateMany(
      { appointment: { $in: appointmentIds } },
      { 
        status: 'paid',
        paidAt: new Date(),
        adminApprovedAt: new Date()
      }
    );

    return {
      success: true,
      totalAmount,
      earningsCount: creditedEarnings.length,
      processedAt: new Date()
    };

  } catch (error) {
    console.error('Withdrawal processing error:', error);
    throw error;
  }
};

/**
 * Get admin revenue statistics
 * @param {Date} startDate - Start date for revenue calculation
 * @param {Date} endDate - End date for revenue calculation
 * @returns {Promise<Object>} - Revenue statistics
 */
const getAdminRevenue = async (startDate = null, endDate = null) => {
  try {
    const matchStage = {};
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    const revenueStats = await DoctorPayment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$commissionAmount' },
          totalConsultations: { $sum: 1 },
          averageCommissionPerConsultation: { $avg: '$commissionAmount' },
          pendingRevenue: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'payment_held', 'parent_confirmed']] }, '$commissionAmount', 0]
            }
          },
          realizedRevenue: {
            $sum: {
              $cond: [{ $in: ['$status', ['admin_approved', 'paid']] }, '$commissionAmount', 0]
            }
          }
        }
      }
    ]);

    const result = revenueStats[0] || {
      totalRevenue: 0,
      totalConsultations: 0,
      averageCommissionPerConsultation: 0,
      pendingRevenue: 0,
      realizedRevenue: 0
    };

    return {
      success: true,
      ...result,
      startDate,
      endDate
    };

  } catch (error) {
    console.error('Admin revenue calculation error:', error);
    throw error;
  }
};

module.exports = {
  splitPayment,
  processWithdrawal,
  getAdminRevenue
};
