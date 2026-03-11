const mongoose = require('mongoose');

const childHealthRecordSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    measuredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    measuredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    inputs: {
      ageMonths: { type: Number, required: true },
      weightKg: { type: Number, required: true },
      heightCm: { type: Number, required: true },
      gender: { type: String, enum: ['male', 'female'], default: 'male' },
      muacCm: { type: Number, default: null },
      hemoglobin: { type: Number, default: null },
      dietaryPreference: {
        type: String,
        enum: ['vegetarian', 'non-vegetarian', 'veg', 'non-veg'],
        default: 'vegetarian',
      },
      hasAllergy: { type: Boolean, default: false },
    },
    growthAnalysis: { type: mongoose.Schema.Types.Mixed, default: {} },
    malnutritionPrediction: { type: mongoose.Schema.Types.Mixed, default: {} },
    mealRecommendation: { type: mongoose.Schema.Types.Mixed, default: {} },
    nutrientFoodRecommendations: { type: mongoose.Schema.Types.Mixed, default: {} },
    doctorReview: {
      notes: { type: String, trim: true, default: '' },
      followUpDays: { type: Number, default: 14 },
      approvedByDoctor: { type: Boolean, default: false },
    },
    teacherDailyPlan: {
      breakfast: { type: String, default: '' },
      lunch: { type: String, default: '' },
      snack: { type: String, default: '' },
      dinner: { type: String, default: '' },
      foodsToAvoid: [{ type: String }],
      allergySafe: { type: Boolean, default: true },
    },
    mealCompletion: {
      breakfastDone: { type: Boolean, default: false },
      lunchDone: { type: Boolean, default: false },
      snackDone: { type: Boolean, default: false },
      dinnerDone: { type: Boolean, default: false },
      completionNotes: { type: String, trim: true, default: '' },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      updatedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ChildHealthRecord', childHealthRecordSchema);
