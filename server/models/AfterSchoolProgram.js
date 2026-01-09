const mongoose = require('mongoose');

const afterSchoolProgramSchema = new mongoose.Schema({
  programName: {
    type: String,
    required: true,
    trim: true
  },
  programType: {
    type: String,
    required: true,
    enum: [
      'Homework Help',
      'Dance',
      'Sports',
      'Music',
      'Art & Craft',
      'Coding',
      'Language Learning',
      'Chess',
      'Drama',
      'Yoga',
      'Swimming',
      'Other'
    ]
  },
  description: {
    type: String,
    required: true
  },
  ageGroup: {
    min: { type: Number, required: true, min: 2 },
    max: { type: Number, required: true, max: 12 }
  },
  schedule: {
    days: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    startTime: { type: String, required: true }, // HH:MM format
    endTime: { type: String, required: true },
    duration: { type: Number } // in minutes, calculated
  },
  fees: {
    amount: { type: Number, required: true, min: 0 },
    frequency: {
      type: String,
      enum: ['per session', 'weekly', 'monthly', 'free'],
      default: 'monthly'
    }
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    max: 30
  },
  enrolledChildren: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child'
  }],
  assignedStaff: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'cancelled'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  location: {
    type: String,
    required: true
  },
  requirements: {
    type: String // Special equipment, dress code, etc.
  },
  maxAbsences: {
    type: Number,
    default: 3
  },
  // Performance tracking
  sessions: [{
    date: Date,
    attendees: [{
      child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child' },
      status: { type: String, enum: ['present', 'absent', 'excused'] },
      notes: String
    }],
    activities: String,
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    feedback: String
  }],
  // Communication
  announcements: [{
    title: String,
    message: String,
    date: { type: Date, default: Date.now },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
afterSchoolProgramSchema.index({ status: 1, programType: 1 });
afterSchoolProgramSchema.index({ enrolledChildren: 1 });
afterSchoolProgramSchema.index({ assignedStaff: 1 });

// Virtual for current enrollment count
afterSchoolProgramSchema.virtual('currentEnrollment').get(function() {
  return this.enrolledChildren.length;
});

// Virtual for available slots
afterSchoolProgramSchema.virtual('availableSlots').get(function() {
  return this.capacity - this.enrolledChildren.length;
});

// Method to check if program is full
afterSchoolProgramSchema.methods.isFull = function() {
  return this.enrolledChildren.length >= this.capacity;
};

// Method to enroll a child
afterSchoolProgramSchema.methods.enrollChild = function(childId) {
  if (this.isFull()) {
    throw new Error('Program is full');
  }
  if (!this.enrolledChildren.includes(childId)) {
    this.enrolledChildren.push(childId);
  }
  return this.save();
};

// Method to unenroll a child
afterSchoolProgramSchema.methods.unenrollChild = function(childId) {
  this.enrolledChildren = this.enrolledChildren.filter(
    id => id.toString() !== childId.toString()
  );
  return this.save();
};

afterSchoolProgramSchema.set('toJSON', { virtuals: true });
afterSchoolProgramSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AfterSchoolProgram', afterSchoolProgramSchema);
