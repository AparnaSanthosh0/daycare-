const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  // Who is being tracked
  entityType: { type: String, enum: ['child', 'staff'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

  // When
  date: { type: Date, required: true, index: true }, // normalized to start of day (00:00)

  // Times
  checkInAt: { type: Date, default: null },
  checkOutAt: { type: Date, default: null },

  // Status
  status: { type: String, enum: ['present', 'absent', 'late', 'left-early'], default: 'absent' },
  notes: { type: String, default: '' },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

AttendanceSchema.index({ entityType: 1, entityId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);