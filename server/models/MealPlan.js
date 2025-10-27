const mongoose = require('mongoose');

const mealItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  allergens: [String],
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  }
}, { _id: false });

const dailyMealSchema = new mongoose.Schema({
  day: { 
    type: String, 
    required: true,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  breakfast: [mealItemSchema],
  morningSnack: [mealItemSchema],
  lunch: [mealItemSchema],
  afternoonSnack: [mealItemSchema],
  notes: String
}, { _id: false });

const mealPlanSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  weekOf: { type: Date, required: true }, // Start of the week
  weekEnd: { type: Date, required: true }, // End of the week
  program: { 
    type: String, 
    enum: ['infant', 'toddler', 'preschool', 'prekindergarten', 'all'],
    default: 'all'
  },
  dailyMeals: [dailyMealSchema],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // Approval workflow fields
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'published', 'rejected'],
    default: 'draft'
  },
  submittedForApproval: { type: Boolean, default: false },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  approvedAt: { type: Date },
  rejectedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  publishedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  notes: String
}, { timestamps: true });

// Index for efficient queries
mealPlanSchema.index({ weekOf: 1, program: 1 });
mealPlanSchema.index({ createdBy: 1 });

module.exports = mongoose.model('MealPlan', mealPlanSchema);
