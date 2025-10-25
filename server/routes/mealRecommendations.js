const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

/**
 * @route   POST /api/meal-recommendations/predict
 * @desc    Get meal recommendation using Decision Tree
 * @access  Public (for testing)
 */
router.post('/predict', async (req, res) => {
  try {
    const { age, dietaryPreference, hasAllergy } = req.body;

    // Validate inputs
    if (!age || !dietaryPreference || hasAllergy === undefined) {
      return res.status(400).json({ 
        message: 'Missing required fields: age, dietaryPreference, hasAllergy' 
      });
    }

    // Validate age
    if (age < 1 || age > 6) {
      return res.status(400).json({ 
        message: 'Age must be between 1 and 6 years' 
      });
    }

    // Validate dietary preference
    const validDietaryPrefs = ['vegetarian', 'non-vegetarian', 'veg', 'non-veg'];
    if (!validDietaryPrefs.includes(dietaryPreference.toLowerCase())) {
      return res.status(400).json({ 
        message: 'Dietary preference must be: vegetarian, non-vegetarian, veg, or non-veg' 
      });
    }

    // Validate allergy status
    if (typeof hasAllergy !== 'boolean') {
      return res.status(400).json({ 
        message: 'hasAllergy must be a boolean (true/false)' 
      });
    }

    // Convert dietary preference to numeric
    const dietaryPrefNum = dietaryPreference.toLowerCase().includes('non') ? 1 : 0;
    const allergyNum = hasAllergy ? 1 : 0;

    // Call Python script
    const pythonScript = path.join(__dirname, '../ml_models/meal_decision_tree_api.py');
    const pythonProcess = spawn('python', [pythonScript, age, dietaryPrefNum, allergyNum]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorOutput);
        // Fallback to rule-based system
        const fallbackResult = getFallbackRecommendation(age, dietaryPrefNum, allergyNum);
        return res.json(fallbackResult);
      }

      try {
        const result = JSON.parse(output);
        res.json(result);
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        // Fallback to rule-based system
        const fallbackResult = getFallbackRecommendation(age, dietaryPrefNum, allergyNum);
        res.json(fallbackResult);
      }
    });

  } catch (error) {
    console.error('Meal recommendation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Fallback rule-based recommendation system
 */
function getFallbackRecommendation(age, dietaryPreference, hasAllergy) {
  let mealCategory = '';
  let mealName = '';
  let explanation = '';

  // Decision tree logic
  if (age < 3) {
    // Young children (1-2 years)
    if (hasAllergy) {
      mealCategory = 'allergy_free_soft';
      mealName = 'Allergy-Free Soft Meal';
      explanation = 'Young child with allergies - soft, allergy-free meal recommended';
    } else if (dietaryPreference === 0) {
      mealCategory = 'soft_veg';
      mealName = 'Soft Vegetarian Meal';
      explanation = 'Young vegetarian child - soft vegetarian meal recommended';
    } else {
      mealCategory = 'soft_nonveg';
      mealName = 'Soft Non-Vegetarian Meal';
      explanation = 'Young non-vegetarian child - soft non-vegetarian meal recommended';
    }
  } else {
    // Older children (3-6 years)
    if (hasAllergy) {
      mealCategory = 'allergy_free_standard';
      mealName = 'Allergy-Free Standard Meal';
      explanation = 'Older child with allergies - standard allergy-free meal recommended';
    } else if (dietaryPreference === 0) {
      mealCategory = 'standard_veg';
      mealName = 'Standard Vegetarian Meal';
      explanation = 'Older vegetarian child - standard vegetarian meal recommended';
    } else {
      mealCategory = 'standard_nonveg';
      mealName = 'Standard Non-Vegetarian Meal';
      explanation = 'Older non-vegetarian child - standard non-vegetarian meal recommended';
    }
  }

  return {
    prediction: mealCategory,
    meal_category: mealName,
    confidence: 0.95, // High confidence for rule-based system
    feature_importance: {
      age: 0.4,
      dietary_preference: 0.3,
      has_allergy: 0.3
    },
    explanation: explanation,
    input_features: {
      age: age,
      dietary_preference: dietaryPreference === 0 ? 'Vegetarian' : 'Non-Vegetarian',
      has_allergy: hasAllergy ? 'Yes' : 'No'
    },
    algorithm: 'Rule-based Fallback'
  };
}

/**
 * @route   GET /api/meal-recommendations/meal-options
 * @desc    Get available meal options and categories
 * @access  Public
 */
router.get('/meal-options', (req, res) => {
  const mealOptions = {
    categories: {
      'soft_veg': {
        name: 'Soft Vegetarian Meal',
        description: 'Soft, easy-to-digest vegetarian meals for young children',
        age_range: '1-2 years',
        examples: ['Mashed vegetables', 'Soft rice with dal', 'Pureed fruits']
      },
      'standard_veg': {
        name: 'Standard Vegetarian Meal',
        description: 'Regular vegetarian meals for older children',
        age_range: '3-6 years',
        examples: ['Vegetable curry with rice', 'Chapati with vegetables', 'Fruit salad']
      },
      'soft_nonveg': {
        name: 'Soft Non-Vegetarian Meal',
        description: 'Soft, easy-to-digest non-vegetarian meals for young children',
        age_range: '1-2 years',
        examples: ['Soft chicken puree', 'Fish porridge', 'Egg custard']
      },
      'standard_nonveg': {
        name: 'Standard Non-Vegetarian Meal',
        description: 'Regular non-vegetarian meals for older children',
        age_range: '3-6 years',
        examples: ['Chicken curry with rice', 'Fish with vegetables', 'Egg sandwich']
      },
      'allergy_free_soft': {
        name: 'Allergy-Free Soft Meal',
        description: 'Soft meals free from common allergens for young children',
        age_range: '1-2 years',
        examples: ['Hypoallergenic baby food', 'Rice cereal', 'Pureed vegetables']
      },
      'allergy_free_standard': {
        name: 'Allergy-Free Standard Meal',
        description: 'Standard meals free from common allergens for older children',
        age_range: '3-6 years',
        examples: ['Allergy-free bread with jam', 'Rice with safe vegetables', 'Fruit without allergens']
      }
    },
    dietary_preferences: [
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'non-vegetarian', label: 'Non-Vegetarian' }
    ],
    age_groups: [
      { min: 1, max: 2, label: 'Young Children (1-2 years)' },
      { min: 3, max: 6, label: 'Older Children (3-6 years)' }
    ]
  };

  res.json(mealOptions);
});

module.exports = router;
