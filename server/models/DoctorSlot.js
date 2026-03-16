const mongoose = require('mongoose');

const doctorSlotSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true }, // e.g. "09:00"
  endTime: { type: String, required: true },   // e.g. "09:30"
  consultationFee: { type: Number, default: 500 },
  status: {
    type: String,
    enum: ['available', 'booked', 'blocked'],
    default: 'available'
  },
  appointmentType: {
    type: String,
    enum: ['onsite', 'online', 'both'],
    default: 'both'
  },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null }
}, { timestamps: true });

doctorSlotSchema.index({ doctor: 1, date: 1 });
doctorSlotSchema.index({ status: 1 });

module.exports = mongoose.model('DoctorSlot', doctorSlotSchema);
