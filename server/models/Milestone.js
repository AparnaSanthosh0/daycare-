const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true, index: true },
  date: { type: Date, required: true, index: true },
  category: { type: String, enum: ['motor', 'language', 'social', 'cognitive', 'emotional', 'other'], default: 'other' },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  photos: { type: [String], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Milestone', milestoneSchema);