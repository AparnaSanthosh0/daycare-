const mongoose = require('mongoose');

const staffTrainingSchema = new mongoose.Schema({
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  provider: { type: String, default: '' },
  dateCompleted: { type: Date },
  hours: { type: Number, min: 0, default: 0 },
  certificateUrl: { type: String, default: null },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('StaffTraining', staffTrainingSchema);