const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  date: { type: Date, required: true }, // specific date
  start: { type: String, required: true }, // HH:mm
  end: { type: String, required: true },   // HH:mm
  room: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { _id: false });

const staffScheduleSchema = new mongoose.Schema({
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shifts: { type: [shiftSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('StaffSchedule', staffScheduleSchema);