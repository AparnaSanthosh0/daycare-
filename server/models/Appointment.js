const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  appointmentType: {
    type: String,
    enum: ['online', 'onsite'],
    default: 'onsite'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
    default: 'pending'
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  diagnosis: {
    type: String,
    default: ''
  },
  prescription: {
    type: String,
    default: ''
  },
  healthAdvice: {
    type: String,
    default: ''
  },
  reports: [{
    filename: String,
    url: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  notes: {
    type: String,
    default: ''
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['parent', 'doctor'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  }],
  requestedBy: {
    type: String,
    enum: ['parent', 'staff', 'admin'],
    default: 'parent'
  },
  rescheduledDate: Date,
  rescheduledTime: String,
  rescheduledReason: String,
  completedAt: Date,
  cancelledAt: Date,
  cancelReason: String
}, {
  timestamps: true
});

// Index for efficient queries
appointmentSchema.index({ child: 1, appointmentDate: -1 });
appointmentSchema.index({ doctor: 1, status: 1 });
appointmentSchema.index({ parent: 1, appointmentDate: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
