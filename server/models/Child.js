const mongoose = require('mongoose');

const childSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  parents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  assignedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  program: {
    type: String,
    enum: ['infant', 'toddler', 'preschool', 'prekindergarten'],
    required: true
  },
  allergies: [{
    type: String,
    trim: true
  }],
  medicalConditions: [{
    condition: String,
    medication: String,
    instructions: String
  }],
  emergencyContacts: [{
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      required: true
    },
    canPickup: {
      type: Boolean,
      default: false
    }
  }],
  authorizedPickup: [{
    name: String,
    phone: String,
    relationship: String,
    photoId: String
  }],
  schedule: {
    monday: { start: String, end: String, enrolled: Boolean },
    tuesday: { start: String, end: String, enrolled: Boolean },
    wednesday: { start: String, end: String, enrolled: Boolean },
    thursday: { start: String, end: String, enrolled: Boolean },
    friday: { start: String, end: String, enrolled: Boolean }
  },
  tuitionRate: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    trim: true
  },
  gallery: [{
    url: { type: String, required: true },
    caption: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Calculate age
childSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Ensure virtual fields are serialized
childSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Child', childSchema);