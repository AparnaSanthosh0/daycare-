const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const Child = require('../models/Child');
const ChildHealthRecord = require('../models/ChildHealthRecord');

function getAgeMonths(dateOfBirth) {
  const now = new Date();
  const dob = new Date(dateOfBirth);
  const years = now.getFullYear() - dob.getFullYear();
  const months = now.getMonth() - dob.getMonth();
  return Math.max(1, years * 12 + months);
}

async function runChildHealthPrediction(payload) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../ml_models/child_health_api.py');
    const pythonProcess = spawn('python', [pythonScript, 'predict', JSON.stringify(payload)]);

    let output = '';
    let errorOutput = '';
    let finished = false;

    const timeoutId = setTimeout(() => {
      if (finished) return;
      finished = true;
      try {
        pythonProcess.kill('SIGTERM');
      } catch (_) {
        // Process already stopped.
      }
      reject(new Error('Child health analysis timed out'));
    }, 45000);

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      clearTimeout(timeoutId);
      if (finished) return;
      finished = true;

      if (code !== 0) {
        return reject(new Error(errorOutput || 'Child health Python process failed'));
      }

      try {
        resolve(JSON.parse(output));
      } catch (parseError) {
        reject(new Error(`Failed to parse child health output: ${parseError.message}`));
      }
    });
  });
}

function normalizeDashboardPayload(child, body) {
  const ageMonths = body.ageMonths !== undefined ? Number(body.ageMonths) : getAgeMonths(child.dateOfBirth);
  const weightKg = body.weightKg !== undefined ? Number(body.weightKg) : 10;
  const heightCm = body.heightCm !== undefined ? Number(body.heightCm) : 80;

  return {
    ageMonths,
    weightKg,
    heightCm,
    gender: body.gender || child.gender || 'male',
    dietaryPreference: body.dietaryPreference || 'vegetarian',
    hasAllergy: body.hasAllergy !== undefined ? Boolean(body.hasAllergy) : (child.allergies || []).length > 0,
    hemoglobin: body.hemoglobin !== undefined ? Number(body.hemoglobin) : 0,
  };
}

function buildTeacherPlan(result) {
  const foods = result?.nutrient_food_recommendations?.recommended_foods || [];
  return {
    breakfast: foods[0] || 'Milk + Banana',
    lunch: foods[1] || 'Rice + Lentils + Spinach',
    snack: foods[2] || 'Fruit Snack',
    dinner: foods[3] || 'Vegetable Khichdi',
    foodsToAvoid: ['High-sodium packaged snacks', 'Sugary drinks'],
    allergySafe: true,
  };
}

function buildApiResponse(record, child) {
  return {
    recordId: record._id,
    child: {
      id: child._id,
      firstName: child.firstName,
      lastName: child.lastName,
      gender: child.gender,
      dateOfBirth: child.dateOfBirth,
      ageMonths: record.inputs.ageMonths,
    },
    growthAnalysis: record.growthAnalysis,
    malnutritionPrediction: record.malnutritionPrediction,
    mealRecommendation: record.mealRecommendation,
    nutrientFoodRecommendations: record.nutrientFoodRecommendations,
    doctorReview: record.doctorReview,
    teacherDailyPlan: record.teacherDailyPlan,
    mealCompletion: record.mealCompletion,
    measuredAt: record.measuredAt,
  };
}

/**
 * @route   POST /api/child-health/analyze
 * @desc    Combined child growth + malnutrition + meal recommendation analysis
 * @access  Public (for testing)
 */
router.post('/analyze', async (req, res) => {
  try {
    const {
      ageMonths,
      weightKg,
      heightCm,
      gender,
      dietaryPreference,
      hasAllergy,
      hemoglobin
    } = req.body;

    if (ageMonths === undefined || weightKg === undefined || heightCm === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: ageMonths, weightKg, heightCm'
      });
    }

    const payload = {
      ageMonths: Number(ageMonths),
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      gender: gender !== undefined ? gender : 0,
      dietaryPreference: dietaryPreference !== undefined ? dietaryPreference : 'vegetarian',
      hasAllergy: hasAllergy !== undefined ? hasAllergy : false,
      hemoglobin: hemoglobin !== undefined ? Number(hemoglobin) : 0
    };

    const result = await runChildHealthPrediction(payload);
    res.json(result);
  } catch (error) {
    console.error('Child health route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in child health route',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/child-health/doctor/children
 * @desc    Doctor dashboard - children list with latest nutrition status
 * @access  Doctor/Admin
 */
router.get('/doctor/children', auth, authorize('doctor', 'admin'), async (req, res) => {
  try {
    const children = await Child.find({ isActive: true })
      .select('firstName lastName dateOfBirth gender program allergies assignedStaff')
      .sort({ firstName: 1 })
      .lean();

    const childIds = children.map((c) => c._id);
    const latestRecords = await ChildHealthRecord.aggregate([
      { $match: { child: { $in: childIds } } },
      { $sort: { measuredAt: -1 } },
      { $group: { _id: '$child', latest: { $first: '$$ROOT' } } },
    ]);

    const latestMap = new Map(latestRecords.map((item) => [String(item._id), item.latest]));
    const result = children.map((child) => {
      const latest = latestMap.get(String(child._id));
      return {
        id: child._id,
        name: `${child.firstName} ${child.lastName || ''}`.trim(),
        gender: child.gender,
        ageMonths: getAgeMonths(child.dateOfBirth),
        program: child.program,
        hasAllergy: (child.allergies || []).length > 0,
        latestStatus: latest?.malnutritionPrediction?.prediction || null,
        latestConfidence: latest?.malnutritionPrediction?.confidence || null,
        measuredAt: latest?.measuredAt || null,
      };
    });

    res.json({ success: true, children: result });
  } catch (error) {
    console.error('Doctor children list error:', error);
    res.status(500).json({ success: false, message: 'Failed to load doctor children list' });
  }
});

/**
 * @route   POST /api/child-health/doctor/children/:childId/analyze
 * @desc    Doctor dashboard workflow: select child -> growth monitoring -> AI prediction -> meal recommendation -> report
 * @access  Doctor/Admin
 */
router.post('/doctor/children/:childId/analyze', auth, authorize('doctor', 'admin'), async (req, res) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child || !child.isActive) {
      return res.status(404).json({ success: false, message: 'Child not found' });
    }

    if (req.body.weightKg === undefined || req.body.heightCm === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: weightKg, heightCm',
      });
    }

    const payload = normalizeDashboardPayload(child, req.body);
    const result = await runChildHealthPrediction(payload);

    const record = await ChildHealthRecord.create({
      child: child._id,
      measuredBy: req.user.userId,
      inputs: {
        ageMonths: payload.ageMonths,
        weightKg: payload.weightKg,
        heightCm: payload.heightCm,
        gender: String(payload.gender).toLowerCase().includes('f') ? 'female' : 'male',
        muacCm: req.body.muacCm !== undefined ? Number(req.body.muacCm) : null,
        hemoglobin: payload.hemoglobin || null,
        dietaryPreference: payload.dietaryPreference,
        hasAllergy: Boolean(payload.hasAllergy),
      },
      growthAnalysis: result.growth_analysis || {},
      malnutritionPrediction: result.malnutrition_prediction || {},
      mealRecommendation: result.meal_recommendation || {},
      nutrientFoodRecommendations: result.nutrient_food_recommendations || {},
      doctorReview: {
        notes: req.body.doctorNotes || '',
        followUpDays: req.body.followUpDays !== undefined ? Number(req.body.followUpDays) : 14,
        approvedByDoctor: true,
      },
      teacherDailyPlan: buildTeacherPlan(result),
    });

    res.json({
      success: true,
      message: 'Child health analysis completed and saved',
      data: buildApiResponse(record, child),
    });
  } catch (error) {
    console.error('Doctor analyze child error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze child health' });
  }
});

/**
 * @route   GET /api/child-health/doctor/children/:childId/report
 * @desc    Doctor dashboard detailed health report with history
 * @access  Doctor/Admin
 */
router.get('/doctor/children/:childId/report', auth, authorize('doctor', 'admin'), async (req, res) => {
  try {
    const child = await Child.findById(req.params.childId).select('firstName lastName dateOfBirth gender');
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found' });
    }

    const records = await ChildHealthRecord.find({ child: child._id })
      .sort({ measuredAt: -1 })
      .limit(10)
      .lean();

    const latest = records[0] || null;
    res.json({
      success: true,
      child,
      latest,
      history: records,
    });
  } catch (error) {
    console.error('Doctor report error:', error);
    res.status(500).json({ success: false, message: 'Failed to load doctor report' });
  }
});

/**
 * @route   GET /api/child-health/parent/children
 * @desc    Parent dashboard - list parent children with latest status badge
 * @access  Parent
 */
router.get('/parent/children', auth, authorize('parent'), async (req, res) => {
  try {
    const children = await Child.find({ parents: req.user.userId, isActive: true })
      .select('firstName lastName dateOfBirth gender allergies')
      .sort({ firstName: 1 })
      .lean();

    const childIds = children.map((c) => c._id);
    const latestRecords = await ChildHealthRecord.aggregate([
      { $match: { child: { $in: childIds } } },
      { $sort: { measuredAt: -1 } },
      { $group: { _id: '$child', latest: { $first: '$$ROOT' } } },
    ]);

    const latestMap = new Map(latestRecords.map((item) => [String(item._id), item.latest]));
    const result = children.map((child) => {
      const latest = latestMap.get(String(child._id));
      return {
        id: child._id,
        name: `${child.firstName} ${child.lastName || ''}`.trim(),
        ageMonths: getAgeMonths(child.dateOfBirth),
        statusBadge: latest?.malnutritionPrediction?.prediction || 'No Analysis Yet',
        topFoods: latest?.nutrientFoodRecommendations?.recommended_foods?.slice(0, 3) || [],
        nextCheckupInDays: latest?.doctorReview?.followUpDays || 14,
      };
    });

    res.json({ success: true, children: result });
  } catch (error) {
    console.error('Parent children summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to load parent summary' });
  }
});

/**
 * @route   GET /api/child-health/parent/children/:childId/summary
 * @desc    Parent dashboard simplified child health view
 * @access  Parent
 */
router.get('/parent/children/:childId/summary', auth, authorize('parent'), async (req, res) => {
  try {
    const child = await Child.findOne({ _id: req.params.childId, parents: req.user.userId, isActive: true })
      .select('firstName lastName dateOfBirth gender')
      .lean();

    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found or access denied' });
    }

    const latest = await ChildHealthRecord.findOne({ child: child._id }).sort({ measuredAt: -1 }).lean();
    if (!latest) {
      return res.json({
        success: true,
        child,
        message: 'No health analysis available yet for this child',
      });
    }

    res.json({
      success: true,
      child,
      growthProgress: latest.growthAnalysis,
      nutritionStatus: latest.malnutritionPrediction,
      recommendedFoods: latest.nutrientFoodRecommendations?.recommended_foods || [],
      dailyDietPlan: latest.teacherDailyPlan,
      healthAlerts: latest.growthAnalysis?.alerts || [],
      doctorSuggestion: {
        notes: latest.doctorReview?.notes || 'Follow prescribed meal plan and monitor growth weekly',
        nextCheckupInDays: latest.doctorReview?.followUpDays || 14,
      },
      measuredAt: latest.measuredAt,
    });
  } catch (error) {
    console.error('Parent summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to load parent dashboard summary' });
  }
});

/**
 * @route   GET /api/child-health/teacher/daily-plan
 * @desc    Teacher dashboard daily meal operations
 * @access  Staff/Admin
 */
router.get('/teacher/daily-plan', auth, authorize('staff', 'admin'), async (req, res) => {
  try {
    const match = { isActive: true };
    if (req.user.role === 'staff') {
      match.assignedStaff = req.user.userId;
    }

    const children = await Child.find(match)
      .select('firstName lastName dateOfBirth gender allergies assignedStaff')
      .lean();

    const childIds = children.map((c) => c._id);
    const latestRecords = await ChildHealthRecord.aggregate([
      { $match: { child: { $in: childIds } } },
      { $sort: { measuredAt: -1 } },
      { $group: { _id: '$child', latest: { $first: '$$ROOT' } } },
    ]);
    const latestMap = new Map(latestRecords.map((item) => [String(item._id), item.latest]));

    const rows = children.map((child) => {
      const latest = latestMap.get(String(child._id));
      return {
        childId: child._id,
        name: `${child.firstName} ${child.lastName || ''}`.trim(),
        allergies: child.allergies || [],
        status: latest?.malnutritionPrediction?.prediction || 'No Analysis Yet',
        breakfast: latest?.teacherDailyPlan?.breakfast || 'Milk + Banana',
        lunch: latest?.teacherDailyPlan?.lunch || 'Rice + Lentils + Spinach',
        snack: latest?.teacherDailyPlan?.snack || 'Fruit',
        dinner: latest?.teacherDailyPlan?.dinner || 'Vegetable Meal',
        foodsToAvoid: latest?.teacherDailyPlan?.foodsToAvoid || [],
        completion: latest?.mealCompletion || {},
      };
    });

    res.json({ success: true, dailyPlan: rows });
  } catch (error) {
    console.error('Teacher daily plan error:', error);
    res.status(500).json({ success: false, message: 'Failed to load teacher daily plan' });
  }
});

/**
 * @route   PATCH /api/child-health/teacher/children/:childId/meal-completion
 * @desc    Teacher updates meal completion for operational tracking
 * @access  Staff/Admin
 */
router.patch('/teacher/children/:childId/meal-completion', auth, authorize('staff', 'admin'), async (req, res) => {
  try {
    const latest = await ChildHealthRecord.findOne({ child: req.params.childId }).sort({ measuredAt: -1 });
    if (!latest) {
      return res.status(404).json({ success: false, message: 'No health plan found for this child' });
    }

    latest.mealCompletion = {
      breakfastDone: req.body.breakfastDone !== undefined ? Boolean(req.body.breakfastDone) : latest.mealCompletion.breakfastDone,
      lunchDone: req.body.lunchDone !== undefined ? Boolean(req.body.lunchDone) : latest.mealCompletion.lunchDone,
      snackDone: req.body.snackDone !== undefined ? Boolean(req.body.snackDone) : latest.mealCompletion.snackDone,
      dinnerDone: req.body.dinnerDone !== undefined ? Boolean(req.body.dinnerDone) : latest.mealCompletion.dinnerDone,
      completionNotes: req.body.completionNotes || latest.mealCompletion.completionNotes,
      updatedBy: req.user.userId,
      updatedAt: new Date(),
    };

    await latest.save();
    res.json({ success: true, message: 'Meal completion updated', mealCompletion: latest.mealCompletion });
  } catch (error) {
    console.error('Teacher meal completion update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update meal completion' });
  }
});

router.get('/status', (req, res) => {
  res.json({
    success: true,
    module: 'Child Health System',
    endpoints: [
      'POST /api/child-health/analyze',
      'GET /api/child-health/status',
      'GET /api/child-health/doctor/children',
      'POST /api/child-health/doctor/children/:childId/analyze',
      'GET /api/child-health/doctor/children/:childId/report',
      'GET /api/child-health/parent/children',
      'GET /api/child-health/parent/children/:childId/summary',
      'GET /api/child-health/teacher/daily-plan',
      'PATCH /api/child-health/teacher/children/:childId/meal-completion'
    ],
    requiredFields: ['ageMonths', 'weightKg', 'heightCm'],
    optionalFields: ['gender', 'dietaryPreference', 'hasAllergy', 'hemoglobin', 'muacCm']
  });
});

module.exports = router;
