const mongoose = require('mongoose');

const admissionRequestSchema = new mongoose.Schema({
  parentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parent: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
    },
  },
  child: {
    name: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    program: { type: String, enum: ['toddler', 'preschool', 'prekindergarten'], default: null },
    medicalInfo: { type: String, default: '' },
    emergencyContactName: { type: String, default: '' },
    emergencyContactPhone: { type: String, default: '' },
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
  handledAt: { type: Date },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdmissionRequest', admissionRequestSchema);