const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, min: 0, max: 5, required: true },
  comment: { type: String, default: '' }
}, { _id: false });

const staffPerformanceSchema = new mongoose.Schema({
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  overallRating: { type: Number, min: 0, max: 5, default: 0 },
  kpis: { type: [kpiSchema], default: [] },
  notes: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('StaffPerformance', staffPerformanceSchema);