const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const Child = require('../models/Child');
const ChildHealthRecord = require('../models/ChildHealthRecord');

const MEAL_DATASET_PATHS = [
  path.join(__dirname, '../ml_models/clean_food_dataset.csv'),
  path.join(__dirname, '../ml_models/clean_food_dataset (1).csv'),
];

let cachedMealDataset = null;

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
      resolve(buildNodeFallbackPrediction(payload, 'Python analysis timed out'));
    }, 45000);

    pythonProcess.on('error', (error) => {
      clearTimeout(timeoutId);
      if (finished) return;
      finished = true;
      resolve(buildNodeFallbackPrediction(payload, error.message || 'Python process failed to start'));
    });

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
        return resolve(buildNodeFallbackPrediction(payload, errorOutput || 'Child health Python process failed'));
      }

      try {
        resolve(JSON.parse(output));
      } catch (parseError) {
        resolve(buildNodeFallbackPrediction(payload, `Failed to parse child health output: ${parseError.message}`));
      }
    });
  });
}

function toInt(value, defaultValue = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function toFloat(value, defaultValue = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseDietaryPreference(value) {
  const text = String(value || '').trim().toLowerCase();
  return text.includes('non') ? 1 : 0;
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function loadMealDataset() {
  if (cachedMealDataset) {
    return cachedMealDataset;
  }

  const datasetPath = MEAL_DATASET_PATHS.find((candidatePath) => fs.existsSync(candidatePath));
  if (!datasetPath) {
    cachedMealDataset = [];
    return cachedMealDataset;
  }

  const raw = fs.readFileSync(datasetPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);

  cachedMealDataset = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return {
      Category: row.Category,
      Food: row.Food,
      Carbohydrates: toFloat(row.Carbohydrates, 0),
      Potassium: toFloat(row.Potassium, 0),
      Sodium: toFloat(row.Sodium, 0),
      Zinc: toFloat(row.Zinc, 0),
      VitaminC: toFloat(row.VitaminC, 0),
      VitaminA: toFloat(row.VitaminA, 0),
    };
  });

  return cachedMealDataset;
}

function classifyGrowthStatus(weightDev, heightDev) {
  if (weightDev < -20 || heightDev < -20) {
    return 'Growth Delay';
  }
  if (weightDev > 20 || heightDev > 20) {
    return 'Above Expected Growth';
  }
  return 'Normal Growth';
}

function analyzeGrowthFallback(ageMonths, weightKg, heightCm) {
  const ageYears = Math.max(1, Math.min(6, ageMonths / 12));
  const expectedWeight = (2 * ageYears) + 8;
  const expectedHeight = (6 * ageYears) + 77;
  const weightDeviationPercent = expectedWeight ? ((weightKg - expectedWeight) / expectedWeight) * 100 : 0;
  const heightDeviationPercent = expectedHeight ? ((heightCm - expectedHeight) / expectedHeight) * 100 : 0;
  const bmi = heightCm > 0 ? weightKg / ((heightCm / 100) ** 2) : 0;
  const alerts = [];

  if (weightDeviationPercent < -20) alerts.push('Weight is significantly below expected range for age');
  if (heightDeviationPercent < -20) alerts.push('Height is significantly below expected range for age');
  if (bmi < 14) alerts.push('Low BMI signal detected');
  if (bmi > 18) alerts.push('High BMI signal detected');

  return {
    age_years: Number(ageYears.toFixed(2)),
    expected_weight_kg: Number(expectedWeight.toFixed(2)),
    expected_height_cm: Number(expectedHeight.toFixed(2)),
    actual_weight_kg: Number(weightKg.toFixed(2)),
    actual_height_cm: Number(heightCm.toFixed(2)),
    weight_deviation_percent: Number(weightDeviationPercent.toFixed(2)),
    height_deviation_percent: Number(heightDeviationPercent.toFixed(2)),
    bmi: Number(bmi.toFixed(2)),
    growth_status: classifyGrowthStatus(weightDeviationPercent, heightDeviationPercent),
    alerts,
  };
}

function predictMalnutritionFallback(payload, growthInfo) {
  const muacCm = toFloat(payload.muacCm, 0);
  const hemoglobin = toFloat(payload.hemoglobin, 0);
  const bmi = toFloat(growthInfo?.bmi, 0);
  const weightDeviation = toFloat(growthInfo?.weight_deviation_percent, 0);
  const lowHeight = toFloat(growthInfo?.height_deviation_percent, 0);

  let prediction = 'Normal';
  let confidence = 0.78;

  if (bmi < 13 || (muacCm > 0 && muacCm < 11.5) || (hemoglobin > 0 && hemoglobin < 9) || weightDeviation < -30 || lowHeight < -25) {
    prediction = 'Severely Malnourished';
    confidence = 0.89;
  } else if (bmi < 14.5 || (muacCm > 0 && muacCm < 12.5) || (hemoglobin > 0 && hemoglobin < 11) || weightDeviation < -20 || lowHeight < -18) {
    prediction = 'Moderately Malnourished';
    confidence = 0.86;
  }

  return {
    available: false,
    prediction,
    raw_prediction: prediction,
    confidence,
  };
}

function recommendMealFallback(payload) {
  const ageMonths = toInt(payload.ageMonths, 24);
  const ageYears = Math.max(1, Math.min(6, Math.round(ageMonths / 12)));
  const dietaryPreference = parseDietaryPreference(payload.dietaryPreference);
  const hasAllergy = Boolean(payload.hasAllergy);

  let prediction = 'standard_veg';
  let mealCategory = 'Standard Vegetarian Meal';

  if (ageYears < 3) {
    if (hasAllergy) {
      prediction = 'allergy_free_soft';
      mealCategory = 'Allergy-Free Soft Meal';
    } else if (dietaryPreference === 1) {
      prediction = 'soft_nonveg';
      mealCategory = 'Soft Non-Vegetarian Meal';
    } else {
      prediction = 'soft_veg';
      mealCategory = 'Soft Vegetarian Meal';
    }
  } else if (hasAllergy) {
    prediction = 'allergy_free_standard';
    mealCategory = 'Allergy-Free Standard Meal';
  } else if (dietaryPreference === 1) {
    prediction = 'standard_nonveg';
    mealCategory = 'Standard Non-Vegetarian Meal';
  }

  return {
    prediction,
    meal_category: mealCategory,
    confidence: 0.82,
    input_features: {
      age: ageYears,
      dietary_preference: dietaryPreference === 1 ? 'Non-Vegetarian' : 'Vegetarian',
      has_allergy: hasAllergy ? 'Yes' : 'No',
    },
  };
}

function recommendFoodsFallback(status, ageYears) {
  const dataset = loadMealDataset();
  let foods = [...dataset];

  if (ageYears <= 2) {
    foods = foods.filter((food) => food.Sodium < 200);
  } else if (ageYears <= 5) {
    foods = foods.filter((food) => food.Potassium > 200);
  } else {
    foods = foods.filter((food) => food.Carbohydrates > 5);
  }

  if (status === 'Moderately Malnourished') {
    foods = foods.filter((food) => food.Zinc > 1);
  } else if (status === 'Severely Malnourished') {
    foods = foods.filter((food) => food.Zinc > 2 && food.Potassium > 300);
  }

  const uniqueFoods = [];
  const seen = new Set();
  for (const food of foods) {
    const foodName = String(food.Food || '').trim();
    if (!foodName || seen.has(foodName)) continue;
    seen.add(foodName);
    uniqueFoods.push(foodName);
    if (uniqueFoods.length >= 10) break;
  }

  return sanitizeRecommendedFoods(uniqueFoods);
}

const INGREDIENT_ONLY_KEYWORDS = [
  'bay leaf', 'bay leaves', 'leaf', 'leaves', 'spice', 'masala', 'pepper', 'salt', 'turmeric',
  'cumin', 'mustard seed', 'cardamom', 'clove', 'cinnamon', 'asafoetida', 'hing', 'fenugreek',
  'ajwain', 'oregano', 'thyme', 'rosemary', 'vanilla', 'saffron', 'chilli powder', 'chili powder',
  'coriander powder', 'garam masala', 'seasoning', 'anise', 'anise seed', 'basil', 'caraway',
  'caraway seed', 'celery seed', 'coriander seed', 'chervil', 'chervil dried', 'dill', 'parsley'
];

const INGREDIENT_ONLY_PATTERNS = ['seed', 'dried', 'powder', 'spices,', 'spice,', 'leaf', 'leaves', 'herb'];

function prettifyMealText(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isIngredientOnlyFood(foodName) {
  const normalized = String(foodName || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
  if (!normalized) return true;
  return INGREDIENT_ONLY_KEYWORDS.some((keyword) => normalized === keyword || normalized.includes(keyword))
    || INGREDIENT_ONLY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function sanitizeRecommendedFoods(rawFoods) {
  const seen = new Set();
  const filtered = [];
  for (const item of rawFoods || []) {
    const name = String(item || '').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    if (isIngredientOnlyFood(name)) continue;
    filtered.push(name);
    if (filtered.length >= 10) break;
  }
  return filtered;
}

function buildMealFromFood(foodName, slot) {
  const ingredient = prettifyMealText(foodName);
  if (!ingredient) return '';
  if (slot === 'breakfast') return `${ingredient} porridge with milk`;
  if (slot === 'lunch') return `Rice and lentil bowl with ${ingredient}`;
  if (slot === 'snack') return `${ingredient} yogurt snack`;
  return `Soft khichdi with ${ingredient}`;
}

function normalizeMealEntry(value, slot, fallbackIngredient) {
  const text = prettifyMealText(value);
  if (!text) {
    return buildMealFromFood(fallbackIngredient, slot);
  }
  if (isIngredientOnlyFood(text)) {
    return buildMealFromFood(text, slot);
  }
  return text;
}

function normalizeTeacherPlan(plan = {}, recommendedFoods = []) {
  const foods = sanitizeRecommendedFoods(recommendedFoods);
  return {
    breakfast: normalizeMealEntry(plan.breakfast, 'breakfast', foods[0] || 'Banana'),
    lunch: normalizeMealEntry(plan.lunch, 'lunch', foods[1] || foods[0] || 'Lentils'),
    snack: normalizeMealEntry(plan.snack, 'snack', foods[2] || foods[0] || 'Apple'),
    dinner: normalizeMealEntry(plan.dinner, 'dinner', foods[3] || foods[1] || 'Spinach'),
    foodsToAvoid: Array.isArray(plan.foodsToAvoid) ? plan.foodsToAvoid : ['High-sodium packaged snacks', 'Sugary drinks'],
    allergySafe: plan.allergySafe !== undefined ? Boolean(plan.allergySafe) : true,
  };
}

function buildMealPlanOptionsFromFoods(recommendedFoods = [], basePlan = {}) {
  const cleanFoods = sanitizeRecommendedFoods(recommendedFoods);
  const normalizedBasePlan = normalizeTeacherPlan(basePlan, cleanFoods);
  const f0 = cleanFoods[0] || 'Banana';
  const f1 = cleanFoods[1] || f0;
  const f2 = cleanFoods[2] || f1;
  const f3 = cleanFoods[3] || f2;

  return [
    {
      title: 'Plan A',
      breakfast: normalizedBasePlan.breakfast || buildMealFromFood(f0, 'breakfast'),
      lunch: normalizedBasePlan.lunch || buildMealFromFood(f1, 'lunch'),
      snack: normalizedBasePlan.snack || buildMealFromFood(f2, 'snack'),
      dinner: normalizedBasePlan.dinner || buildMealFromFood(f3, 'dinner'),
    },
    {
      title: 'Plan B',
      breakfast: buildMealFromFood(f1, 'breakfast'),
      lunch: buildMealFromFood(f2, 'lunch'),
      snack: buildMealFromFood(f3, 'snack'),
      dinner: buildMealFromFood(f0, 'dinner'),
    },
    {
      title: 'Plan C',
      breakfast: buildMealFromFood(f2, 'breakfast'),
      lunch: buildMealFromFood(f3, 'lunch'),
      snack: buildMealFromFood(f0, 'snack'),
      dinner: buildMealFromFood(f1, 'dinner'),
    },
  ];
}

function buildNodeFallbackPrediction(payload, reason) {
  const ageMonths = toInt(payload.ageMonths, 24);
  const weightKg = toFloat(payload.weightKg, 10);
  const heightCm = toFloat(payload.heightCm, 80);
  const growthAnalysis = analyzeGrowthFallback(ageMonths, weightKg, heightCm);
  const malnutritionPrediction = predictMalnutritionFallback(payload, growthAnalysis);
  const normalizedStatus = normalizeNutritionStatus(malnutritionPrediction.prediction);
  const mealRecommendation = recommendMealFallback(payload);
  const recommendedFoods = recommendFoodsFallback(normalizedStatus, Math.max(1, Math.round(ageMonths / 12)));
  const recommendedMeals = buildMealPlanOptionsFromFoods(recommendedFoods);

  return {
    success: true,
    system: 'Smart Child Growth Monitoring and Malnutrition Prediction',
    backend: 'node-fallback',
    growth_analysis: growthAnalysis,
    malnutrition_prediction: {
      ...malnutritionPrediction,
      prediction: normalizedStatus,
    },
    meal_recommendation: mealRecommendation,
    nutrient_food_recommendations: {
      nutrition_status_for_filter: normalizedStatus,
      recommended_foods: recommendedFoods,
      recommended_meal_options: recommendedMeals,
    },
    note: `Fallback analysis used because Python analysis was unavailable: ${reason}`,
  };
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
  const foods = sanitizeRecommendedFoods(result?.nutrient_food_recommendations?.recommended_foods || []);
  const mealOptions = buildMealPlanOptionsFromFoods(foods);
  const primary = mealOptions[0] || {};
  return normalizeTeacherPlan({
    breakfast: primary.breakfast || buildMealFromFood(foods[0] || 'Banana', 'breakfast'),
    lunch: primary.lunch || buildMealFromFood(foods[1] || 'Lentils', 'lunch'),
    snack: primary.snack || buildMealFromFood(foods[2] || 'Apple', 'snack'),
    dinner: primary.dinner || buildMealFromFood(foods[3] || 'Spinach', 'dinner'),
    foodsToAvoid: ['High-sodium packaged snacks', 'Sugary drinks'],
    allergySafe: true,
  }, foods);
}

function normalizeNutritionStatus(value) {
  const text = String(value || '').trim().toLowerCase();
  const mapping = {
    '0': 'Normal',
    '1': 'Moderately Malnourished',
    '2': 'Severely Malnourished',
    normal: 'Normal',
    moderate: 'Moderately Malnourished',
    'moderately malnourished': 'Moderately Malnourished',
    severe: 'Severely Malnourished',
    'severely malnourished': 'Severely Malnourished',
    underweight: 'Moderately Malnourished',
    wasted: 'Severely Malnourished',
    stunted: 'Moderately Malnourished',
  };
  return mapping[text] || value || 'No Analysis Yet';
}

function buildApiResponse(record, child) {
  const normalizedPrediction = normalizeNutritionStatus(record?.malnutritionPrediction?.prediction);
  const recommendedFoods = sanitizeRecommendedFoods(record?.nutrientFoodRecommendations?.recommended_foods || []);
  const teacherDailyPlan = normalizeTeacherPlan(record?.teacherDailyPlan || {}, recommendedFoods);
  const mealPlanOptions = record?.nutrientFoodRecommendations?.recommended_meal_options || buildMealPlanOptionsFromFoods(recommendedFoods, teacherDailyPlan);

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
    malnutritionPrediction: {
      ...(record.malnutritionPrediction || {}),
      prediction: normalizedPrediction,
    },
    mealRecommendation: record.mealRecommendation,
    nutrientFoodRecommendations: {
      ...(record.nutrientFoodRecommendations || {}),
      recommended_foods: recommendedFoods,
      recommended_meal_options: mealPlanOptions,
    },
    doctorReview: record.doctorReview,
    teacherDailyPlan,
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
    const sanitizedFoods = sanitizeRecommendedFoods(result?.nutrient_food_recommendations?.recommended_foods || []);
    result.nutrient_food_recommendations = {
      ...(result.nutrient_food_recommendations || {}),
      recommended_foods: sanitizedFoods,
      recommended_meal_options: result?.nutrient_food_recommendations?.recommended_meal_options || buildMealPlanOptionsFromFoods(sanitizedFoods),
    };
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
        allergies: child.allergies || [],
        hasAllergy: (child.allergies || []).length > 0,
          latestStatus: normalizeNutritionStatus(latest?.malnutritionPrediction?.prediction) || null,
        latestConfidence: latest?.malnutritionPrediction?.confidence || null,
        measuredAt: latest?.measuredAt || null,
        latestInputs: {
          weightKg: latest?.inputs?.weightKg ?? null,
          heightCm: latest?.inputs?.heightCm ?? null,
          muacCm: latest?.inputs?.muacCm ?? null,
          hemoglobin: latest?.inputs?.hemoglobin ?? null,
        },
        latestBmi: latest?.growthAnalysis?.bmi ?? null,
        latestDoctorReview: {
          notes: latest?.doctorReview?.notes || '',
          followUpDays: latest?.doctorReview?.followUpDays ?? null,
        },
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
    const normalizedPrediction = normalizeNutritionStatus(result?.malnutrition_prediction?.prediction);
    const sanitizedFoods = sanitizeRecommendedFoods(result?.nutrient_food_recommendations?.recommended_foods || []);
    const mealPlanOptions = buildMealPlanOptionsFromFoods(sanitizedFoods);
    result.nutrient_food_recommendations = {
      ...(result.nutrient_food_recommendations || {}),
      recommended_foods: sanitizedFoods,
      recommended_meal_options: mealPlanOptions,
    };

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
      malnutritionPrediction: {
        ...(result.malnutrition_prediction || {}),
        prediction: normalizedPrediction,
      },
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

    const normalizedHistory = records.map((record) => ({
      ...record,
      nutrientFoodRecommendations: {
        ...(record.nutrientFoodRecommendations || {}),
        recommended_foods: sanitizeRecommendedFoods(record?.nutrientFoodRecommendations?.recommended_foods || []),
        recommended_meal_options: record?.nutrientFoodRecommendations?.recommended_meal_options || buildMealPlanOptionsFromFoods(record?.nutrientFoodRecommendations?.recommended_foods || [], record?.teacherDailyPlan || {}),
      },
      teacherDailyPlan: normalizeTeacherPlan(record?.teacherDailyPlan || {}, record?.nutrientFoodRecommendations?.recommended_foods || []),
      malnutritionPrediction: {
        ...(record.malnutritionPrediction || {}),
        prediction: normalizeNutritionStatus(record?.malnutritionPrediction?.prediction),
      },
    }));

    res.json({
      success: true,
      child,
      latest: normalizedHistory[0] || null,
      history: normalizedHistory,
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
          statusBadge: normalizeNutritionStatus(latest?.malnutritionPrediction?.prediction),
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
        nutritionStatus: {
          ...(latest.malnutritionPrediction || {}),
          prediction: normalizeNutritionStatus(latest?.malnutritionPrediction?.prediction),
        },
      recommendedFoods: sanitizeRecommendedFoods(latest.nutrientFoodRecommendations?.recommended_foods || []),
      dailyDietPlan: normalizeTeacherPlan(latest.teacherDailyPlan || {}, latest.nutrientFoodRecommendations?.recommended_foods || []),
      mealPlanOptions: latest.nutrientFoodRecommendations?.recommended_meal_options || buildMealPlanOptionsFromFoods(latest.nutrientFoodRecommendations?.recommended_foods || [], normalizeTeacherPlan(latest.teacherDailyPlan || {}, latest.nutrientFoodRecommendations?.recommended_foods || [])),
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
      const recommendedFoods = sanitizeRecommendedFoods(latest?.nutrientFoodRecommendations?.recommended_foods || []);
      const normalizedPlan = normalizeTeacherPlan(latest?.teacherDailyPlan || {}, recommendedFoods);
      return {
        childId: child._id,
        name: `${child.firstName} ${child.lastName || ''}`.trim(),
        allergies: child.allergies || [],
        status: normalizeNutritionStatus(latest?.malnutritionPrediction?.prediction),
        growth: {
          weightKg: latest?.growthAnalysis?.actual_weight_kg ?? null,
          expectedWeightKg: latest?.growthAnalysis?.expected_weight_kg ?? null,
          heightCm: latest?.growthAnalysis?.actual_height_cm ?? null,
          expectedHeightCm: latest?.growthAnalysis?.expected_height_cm ?? null,
          bmi: latest?.growthAnalysis?.bmi ?? null,
          growthStatus: latest?.growthAnalysis?.growth_status || 'N/A',
          alerts: Array.isArray(latest?.growthAnalysis?.alerts) ? latest.growthAnalysis.alerts : [],
        },
        measuredAt: latest?.measuredAt || null,
        breakfast: normalizedPlan.breakfast || 'Milk + Banana',
        lunch: normalizedPlan.lunch || 'Rice + Lentils + Spinach',
        snack: normalizedPlan.snack || 'Fruit',
        dinner: normalizedPlan.dinner || 'Vegetable Meal',
        foodsToAvoid: normalizedPlan.foodsToAvoid || [],
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
 * @route   POST /api/child-health/teacher/children/:childId/growth-record
 * @desc    Teacher records fresh child growth data that feeds the daily plan workflow
 * @access  Staff/Admin
 */
router.post('/teacher/children/:childId/growth-record', auth, authorize('staff', 'admin'), async (req, res) => {
  try {
    const childQuery = {
      _id: req.params.childId,
      isActive: true,
    };

    if (req.user.role === 'staff') {
      childQuery.assignedStaff = req.user.userId;
    }

    const child = await Child.findOne(childQuery);
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found or access denied' });
    }

    if (req.body.weightKg === undefined || req.body.heightCm === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: weightKg, heightCm',
      });
    }

    const payload = normalizeDashboardPayload(child, req.body);
    const result = await runChildHealthPrediction(payload);
    const normalizedPrediction = normalizeNutritionStatus(result?.malnutrition_prediction?.prediction);
    const sanitizedFoods = sanitizeRecommendedFoods(result?.nutrient_food_recommendations?.recommended_foods || []);
    const mealPlanOptions = buildMealPlanOptionsFromFoods(sanitizedFoods);

    result.nutrient_food_recommendations = {
      ...(result.nutrient_food_recommendations || {}),
      recommended_foods: sanitizedFoods,
      recommended_meal_options: result?.nutrient_food_recommendations?.recommended_meal_options || mealPlanOptions,
    };

    const record = await ChildHealthRecord.create({
      child: child._id,
      measuredBy: req.user.userId,
      inputs: {
        ageMonths: payload.ageMonths,
        weightKg: payload.weightKg,
        heightCm: payload.heightCm,
        gender: String(payload.gender).toLowerCase().includes('f') ? 'female' : 'male',
        muacCm: req.body.muacCm !== undefined && req.body.muacCm !== '' ? Number(req.body.muacCm) : null,
        hemoglobin: req.body.hemoglobin !== undefined && req.body.hemoglobin !== '' ? Number(req.body.hemoglobin) : null,
        dietaryPreference: payload.dietaryPreference,
        hasAllergy: Boolean(payload.hasAllergy),
      },
      growthAnalysis: result.growth_analysis || {},
      malnutritionPrediction: {
        ...(result.malnutrition_prediction || {}),
        prediction: normalizedPrediction,
      },
      mealRecommendation: result.meal_recommendation || {},
      nutrientFoodRecommendations: result.nutrient_food_recommendations || {},
      doctorReview: {
        notes: req.body.teacherNotes || 'Recorded by teacher for daily growth monitoring',
        followUpDays: req.body.followUpDays !== undefined ? Number(req.body.followUpDays) : 14,
        approvedByDoctor: false,
      },
      teacherDailyPlan: buildTeacherPlan(result),
    });

    res.status(201).json({
      success: true,
      message: 'Growth record saved successfully',
      data: buildApiResponse(record, child),
    });
  } catch (error) {
    console.error('Teacher growth record error:', error);
    res.status(500).json({ success: false, message: 'Failed to save child growth record' });
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
      'POST /api/child-health/teacher/children/:childId/growth-record',
      'PATCH /api/child-health/teacher/children/:childId/meal-completion'
    ],
    requiredFields: ['ageMonths', 'weightKg', 'heightCm'],
    optionalFields: ['gender', 'dietaryPreference', 'hasAllergy', 'hemoglobin', 'muacCm']
  });
});

module.exports = router;
