const cron = require('node-cron');
const BlockchainRecord = require('../models/BlockchainRecord');
const User = require('../models/User');
const Child = require('../models/Child');
const VaccineReminder = require('../models/VaccineReminder');

/**
 * Automated Vaccine Reminder System
 * Runs daily at 9:00 AM to check for upcoming and overdue vaccinations
 */

// Email/SMS notification helper and logger
const sendNotification = async (parentId, childId, vaccinationRecordId, vaccine, dueDate, message, type, reminderType) => {
  try {
    const parent = await User.findById(parentId);
    if (!parent) return;

    console.log(`[Vaccine Reminder] Sending ${type} to ${parent.name}: ${message}`);
    
    // Log the reminder to database
    const reminder = new VaccineReminder({
      childId,
      vaccinationRecordId,
      parentId,
      vaccine,
      dueDate,
      reminderType,
      notificationMethod: type,
      message,
      status: 'sent'
    });
    
    await reminder.save();
    
    // TODO: Integrate with your existing email/SMS system
    // For now, just logging. You can add:
    // - Email: await sendEmail(parent.email, subject, message);
    // - SMS: await sendSMS(parent.phone, message);
    
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Main reminder function
const checkVaccineReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    console.log('=== Vaccine Reminder System Running ===');
    console.log('Checking for upcoming and overdue vaccinations...');
    
    // Find all vaccination records with nextDoseDate
    const upcomingVaccines = await BlockchainRecord.find({
      dataType: 'vaccination',
      'data.nextDoseDate': { $exists: true, $ne: null },
      verified: true
    }).populate('data.childId');
    
    let reminders30Day = 0;
    let reminders7Day = 0;
    let reminders1Day = 0;
    let overdueCount = 0;
    
    for (const record of upcomingVaccines) {
      const nextDose = new Date(record.data.nextDoseDate);
      nextDose.setHours(0, 0, 0, 0);
      
      const daysUntil = Math.ceil((nextDose - today) / (1000 * 60 * 60 * 24));
      
      // Skip if child not found
      if (!record.data.childId) continue;
      
      const child = await Child.findById(record.data.childId).populate('parents');
      if (!child || !child.parents || child.parents.length === 0) continue;
      
      // Check if overdue
      if (daysUntil < 0) {
        overdueCount++;
        const daysOverdue = Math.abs(daysUntil);
        
        // Send overdue alert every 7 days
        if (daysOverdue % 7 === 0) {
          const message = `⚠️ OVERDUE: ${child.firstName} ${child.lastName}'s ${record.data.vaccine} vaccine was due ${daysOverdue} days ago. Please schedule appointment.`;
          await sendNotification(child.parents[0]._id, child._id, record._id, record.data.vaccine, nextDose, message, 'sms', 'overdue');
          console.log(`  - OVERDUE (${daysOverdue}d): ${child.firstName} ${child.lastName} - ${record.data.vaccine}`);
        }
        continue;
      }
      
      // 30-day reminder (email)
      if (daysUntil === 30) {
        reminders30Day++;
        const message = `Reminder: ${child.firstName} ${child.lastName}'s ${record.data.vaccine} vaccine is due in 30 days (${nextDose.toLocaleDateString()})`;
        await sendNotification(child.parents[0]._id, child._id, record._id, record.data.vaccine, nextDose, message, 'email', '30-day');
        console.log(`  - 30 days: ${child.firstName} ${child.lastName} - ${record.data.vaccine}`);
      }
      
      // 7-day reminder (SMS)
      if (daysUntil === 7) {
        reminders7Day++;
        const message = `⚠️ Reminder: ${child.firstName} ${child.lastName}'s ${record.data.vaccine} vaccine is due in 7 days!`;
        await sendNotification(child.parents[0]._id, child._id, record._id, record.data.vaccine, nextDose, message, 'sms', '7-day');
        console.log(`  - 7 days: ${child.firstName} ${child.lastName} - ${record.data.vaccine}`);
      }
      
      // 1-day reminder (SMS + Email)
      if (daysUntil === 1) {
        reminders1Day++;
        const message = `🏥 TOMORROW: ${child.firstName} ${child.lastName}'s ${record.data.vaccine} vaccine appointment. Location: ${record.data.location || 'Not specified'}`;
        await sendNotification(child.parents[0]._id, child._id, record._id, record.data.vaccine, nextDose, message, 'both', '1-day');
        console.log(`  - Tomorrow: ${child.firstName} ${child.lastName} - ${record.data.vaccine}`);
      }
    }
    
    console.log('=== Summary ===');
    console.log(`30-day reminders sent: ${reminders30Day}`);
    console.log(`7-day reminders sent: ${reminders7Day}`);
    console.log(`1-day reminders sent: ${reminders1Day}`);
    console.log(`Overdue vaccinations: ${overdueCount}`);
    console.log('===================\n');
    
  } catch (error) {
    console.error('Error in vaccine reminder system:', error);
  }
};

// Initialize cron job
const initializeVaccineReminders = () => {
  try {
    // Run every day at 9:00 AM
    // Cron format: second minute hour day month weekday
    // '0 9 * * *' = At 9:00 AM every day
    
    const cronSchedule = process.env.VACCINE_REMINDER_CRON || '0 9 * * *';
    
    cron.schedule(cronSchedule, () => {
      console.log(`\n[${new Date().toLocaleString()}] Running vaccine reminder check...`);
      checkVaccineReminders().catch(err => {
        console.error('Cron job error (non-fatal):', err);
      });
    });
    
    console.log('✅ Vaccine Reminder System initialized');
    console.log(`   Schedule: ${cronSchedule} (9:00 AM daily)`);
    console.log('   Reminders: 30 days, 7 days, 1 day before due date');
    console.log('   Overdue alerts: Every 7 days\n');
    
    // Run once on startup for testing (optional - comment out in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Running initial check...');
      setTimeout(() => {
        checkVaccineReminders().catch(err => {
          console.error('Initial check error (non-fatal):', err);
        });
      }, 5000); // Run after 5 seconds
    }
  } catch (error) {
    console.error('Failed to initialize vaccine reminders (non-fatal):', error);
  }
};

// Manual trigger function (for testing or admin use)
const triggerManualCheck = async () => {
  console.log('Manual vaccine reminder check triggered');
  await checkVaccineReminders();
};

module.exports = {
  initializeVaccineReminders,
  checkVaccineReminders,
  triggerManualCheck
};
