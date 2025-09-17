const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // Optional: activity can be for a specific child or a program/group
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', default: null },
  program: { type: String, enum: ['infant', 'toddler', 'preschool', 'prekindergarten', 'general'], default: 'general' },

  // What & when
  date: { type: Date, required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, enum: ['education', 'play', 'meal', 'nap', 'outdoor', 'event', 'other'], default: 'other' },
  photos: { type: [String], default: [] },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);