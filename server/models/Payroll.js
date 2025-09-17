const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema({
  type: { type: String, required: true }, // base, overtime, bonus
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const deductionSchema = new mongoose.Schema({
  type: { type: String, required: true }, // tax, insurance, other
  amount: { type: Number, required: true, min: 0 }
}, { _id: false });

const payrollSchema = new mongoose.Schema({
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  baseRate: { type: Number, required: true, min: 0 }, // per hour or period
  hoursWorked: { type: Number, required: true, min: 0 },
  earnings: { type: [earningSchema], default: [] },
  deductions: { type: [deductionSchema], default: [] },
  netPay: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);