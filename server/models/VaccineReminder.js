const mongoose = require('mongoose');

const vaccineReminderSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true
  },
  vaccinationRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BlockchainRecord',
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vaccine: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  reminderType: {
    type: String,
    enum: ['30-day', '7-day', '1-day', 'overdue'],
    required: true
  },
  notificationMethod: {
    type: String,
    enum: ['email', 'sms', 'both'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    default: 'sent'
  }
}, {
  timestamps: true
});

// Index for faster queries
vaccineReminderSchema.index({ childId: 1, sentAt: -1 });
vaccineReminderSchema.index({ parentId: 1, sentAt: -1 });

module.exports = mongoose.model('VaccineReminder', vaccineReminderSchema);
