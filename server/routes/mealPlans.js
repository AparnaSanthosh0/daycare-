const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const MealPlan = require('../models/MealPlan');
const Child = require('../models/Child');
const ChildHealthRecord = require('../models/ChildHealthRecord');

const DOCTOR_MEAL_SUBSCRIPTION_PRICING = {
  specific_period: 75,
  entire_daycare: 150,
};

function getCurrentWeekRange() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return { startOfWeek, endOfWeek };
}

async function getAccessibleChildForParent(parentId, childId) {
  return Child.findOne({ _id: childId, parents: parentId, isActive: true });
}

async function getPublishedMealPlanForChild(child) {
  const { startOfWeek, endOfWeek } = getCurrentWeekRange();
  return MealPlan.findOne({
    isActive: true,
    status: 'published',
    program: { $in: [child.program, 'all'] },
    $or: [
      { weekOf: { $gte: startOfWeek, $lte: endOfWeek } },
      {
        $expr: {
          $and: [
            { $gte: ['$weekOf', startOfWeek] },
            { $lte: ['$weekEnd', endOfWeek] },
            { $eq: ['$weekOf', '$weekEnd'] }
          ]
        }
      }
    ]
  })
    .populate('createdBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName');
}

function formatPublishedMealPlan(mealPlan) {
  if (!mealPlan) return null;
  return {
    id: mealPlan._id,
    title: mealPlan.title,
    description: mealPlan.description,
    weekOf: mealPlan.weekOf,
    weekEnd: mealPlan.weekEnd,
    status: mealPlan.status,
    approvedAt: mealPlan.approvedAt,
    approvedBy: mealPlan.approvedBy
      ? `${mealPlan.approvedBy.firstName || ''} ${mealPlan.approvedBy.lastName || ''}`.trim()
      : null,
    dailyMeals: (mealPlan.dailyMeals || []).map((day) => ({
      day: day.day,
      breakfast: (day.breakfast || []).map((item) => item?.name || '').filter(Boolean),
      morningSnack: (day.morningSnack || []).map((item) => item?.name || '').filter(Boolean),
      lunch: (day.lunch || []).map((item) => item?.name || '').filter(Boolean),
      afternoonSnack: (day.afternoonSnack || []).map((item) => item?.name || '').filter(Boolean),
      notes: day.notes || ''
    }))
  };
}

function buildDoctorSuggestedPlans(record) {
  const options = record?.nutrientFoodRecommendations?.recommended_meal_options;
  if (Array.isArray(options) && options.length > 0) {
    return options.map((option, index) => ({
      title: option.title || `Plan ${index + 1}`,
      breakfast: option.breakfast || '',
      lunch: option.lunch || '',
      snack: option.snack || '',
      dinner: option.dinner || '',
    }));
  }

  const fallback = record?.teacherDailyPlan;
  if (fallback) {
    return [{
      title: 'Doctor Suggested Plan',
      breakfast: fallback.breakfast || '',
      lunch: fallback.lunch || '',
      snack: fallback.snack || '',
      dinner: fallback.dinner || '',
    }];
  }

  return [];
}

function pickPlanByTitle(options, title) {
  if (!Array.isArray(options) || options.length === 0) return null;
  const normalizedTitle = String(title || '').trim().toLowerCase();
  return options.find((option) => String(option.title || '').trim().toLowerCase() === normalizedTitle) || options[0];
}

function isDoctorMealSubscriptionActive(subscription = {}) {
  if (subscription.preference !== 'doctor_recommended' || subscription.status !== 'active') return false;
  const now = new Date();
  const startDate = subscription.startDate ? new Date(subscription.startDate) : null;
  const endDate = subscription.endDate ? new Date(subscription.endDate) : null;
  if (startDate && startDate > now) return false;
  if (subscription.durationType === 'specific_period' && endDate && endDate < now) return false;
  return true;
}

function getRequestUserId(req) {
  return req?.user?.userId || req?.user?.id || req?.user?._id || null;
}

function parseDateOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Get all meal plans (admin and staff can view)
router.get('/', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { program, weekOf } = req.query;
    const query = { isActive: true };
    
    if (program && program !== 'all') {
      query.program = { $in: [program, 'all'] };
    }
    
    if (weekOf) {
      const startOfWeek = new Date(weekOf);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      query.weekOf = { $gte: startOfWeek, $lte: endOfWeek };
    }
    
    const mealPlans = await MealPlan.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ weekOf: -1, createdAt: -1 });
    
    res.json(mealPlans);
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({ message: 'Server error fetching meal plans' });
  }
});

// Create new meal plan (staff and admin)
router.post('/', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { title, description, weekOf, weekEnd, program, dailyMeals, notes } = req.body;
    
    console.log('Creating meal plan with data:', JSON.stringify({
      title,
      weekOf,
      weekEnd,
      program,
      dailyMealsLength: dailyMeals?.length,
      notes
    }));
    
    if (!title || !weekOf || !dailyMeals || !Array.isArray(dailyMeals)) {
      console.log('Validation failed:', { title, weekOf, dailyMeals });
      return res.status(400).json({ 
        message: 'Title, weekOf, and dailyMeals are required' 
      });
    }
    
    const startOfWeek = new Date(weekOf);
    let endOfWeekDate;
    
    // If weekEnd is provided (for daily plans), use it; otherwise calculate end of week
    if (weekEnd) {
      endOfWeekDate = new Date(weekEnd);
    } else {
      endOfWeekDate = new Date(startOfWeek);
      endOfWeekDate.setDate(startOfWeek.getDate() + 6);
    }
    
    const mealPlan = await MealPlan.create({
      title,
      description,
      weekOf: startOfWeek,
      weekEnd: endOfWeekDate,
      program: program || 'all',
      dailyMeals,
      createdBy: req.user.userId,
      notes
    });
    
    await mealPlan.populate('createdBy', 'firstName lastName');
    
    res.status(201).json({
      message: 'Meal plan created successfully',
      mealPlan
    });
  } catch (error) {
    console.error('Create meal plan error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ 
      message: 'Server error creating meal plan',
      error: error.message 
    });
  }
});

// Update meal plan (staff and admin)
router.put('/:id', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { title, description, program, dailyMeals, notes } = req.body;
    
    const mealPlan = await MealPlan.findById(req.params.id);
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    // Staff can only edit their own meal plans unless they're admin
    if (req.user.role === 'staff' && mealPlan.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only edit your own meal plans' });
    }
    
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (program) updateData.program = program;
    if (dailyMeals) updateData.dailyMeals = dailyMeals;
    if (notes !== undefined) updateData.notes = notes;
    
    const updatedMealPlan = await MealPlan.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('createdBy', 'firstName lastName');
    
    res.json({
      message: 'Meal plan updated successfully',
      mealPlan: updatedMealPlan
    });
  } catch (error) {
    console.error('Update meal plan error:', error);
    res.status(500).json({ message: 'Server error updating meal plan' });
  }
});

// Delete meal plan (admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    await MealPlan.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Delete meal plan error:', error);
    res.status(500).json({ message: 'Server error deleting meal plan' });
  }
});

// Submit meal plan for approval (staff)
router.post('/:id/submit', auth, authorize('staff'), async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    // Staff can only submit their own meal plans
    if (mealPlan.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only submit your own meal plans' });
    }
    
    // Update status to pending approval
    mealPlan.status = 'pending_approval';
    mealPlan.submittedForApproval = true;
    await mealPlan.save();
    
    await mealPlan.populate('createdBy', 'firstName lastName');
    
    res.json({
      message: 'Meal plan submitted for approval',
      mealPlan
    });
  } catch (error) {
    console.error('Submit meal plan error:', error);
    res.status(500).json({ message: 'Server error submitting meal plan' });
  }
});

// Approve meal plan (admin only)
router.post('/:id/approve', auth, authorize('admin'), async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    mealPlan.status = 'approved';
    mealPlan.approvedBy = req.user.userId;
    mealPlan.approvedAt = new Date();
    await mealPlan.save();
    
    await mealPlan.populate('createdBy', 'firstName lastName');
    await mealPlan.populate('approvedBy', 'firstName lastName');
    
    res.json({
      message: 'Meal plan approved successfully',
      mealPlan
    });
  } catch (error) {
    console.error('Approve meal plan error:', error);
    res.status(500).json({ message: 'Server error approving meal plan' });
  }
});

// Publish meal plan (admin only - makes it visible to parents)
router.post('/:id/publish', auth, authorize('admin'), async (req, res) => {
  try {
    const mealPlan = await MealPlan.findById(req.params.id);
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    if (mealPlan.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved meal plans can be published' });
    }
    
    mealPlan.status = 'published';
    mealPlan.publishedAt = new Date();
    mealPlan.isActive = true;
    await mealPlan.save();
    
    await mealPlan.populate('createdBy', 'firstName lastName');
    await mealPlan.populate('approvedBy', 'firstName lastName');
    
    res.json({
      message: 'Meal plan published successfully',
      mealPlan
    });
  } catch (error) {
    console.error('Publish meal plan error:', error);
    res.status(500).json({ message: 'Server error publishing meal plan' });
  }
});

// Reject meal plan (admin only)
router.post('/:id/reject', auth, authorize('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    
    const mealPlan = await MealPlan.findById(req.params.id);
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    mealPlan.status = 'rejected';
    mealPlan.rejectedBy = req.user.userId;
    mealPlan.rejectedAt = new Date();
    mealPlan.rejectionReason = reason || 'No reason provided';
    await mealPlan.save();
    
    await mealPlan.populate('createdBy', 'firstName lastName');
    await mealPlan.populate('rejectedBy', 'firstName lastName');
    
    res.json({
      message: 'Meal plan rejected',
      mealPlan
    });
  } catch (error) {
    console.error('Reject meal plan error:', error);
    res.status(500).json({ message: 'Server error rejecting meal plan' });
  }
});

// Get pending meal plans for approval (admin only)
router.get('/pending', auth, authorize('admin'), async (req, res) => {
  try {
    const pendingPlans = await MealPlan.find({ status: 'pending_approval' })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json(pendingPlans);
  } catch (error) {
    console.error('Get pending meal plans error:', error);
    res.status(500).json({ message: 'Server error fetching pending meal plans' });
  }
});

// Get meal plans for specific child's program (for parents)
router.get('/child/:childId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can view child meal plans' });
    }
    
    // Check if parent has access to this child
    const child = await Child.findOne({ 
      _id: req.params.childId,
      parents: req.user.userId 
    });
    
    if (!child) {
      return res.status(404).json({ message: 'Child not found or access denied' });
    }
    
    const { weekOf } = req.query;
    const query = { 
      isActive: true,
      status: 'published', // Only show published meal plans to parents
      program: { $in: [child.program, 'all'] }
    };
    
    if (weekOf) {
      const startOfWeek = new Date(weekOf);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      query.weekOf = { $gte: startOfWeek, $lte: endOfWeek };
    } else {
      // Default to current week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      query.weekOf = { $gte: startOfWeek, $lte: endOfWeek };
    }
    
    const mealPlans = await MealPlan.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ weekOf: -1 });
    
    res.json(mealPlans);
  } catch (error) {
    console.error('Get child meal plans error:', error);
    res.status(500).json({ message: 'Server error fetching meal plans' });
  }
});

router.get('/parent/children/:childId/subscription-options', auth, authorize('parent'), async (req, res) => {
  try {
    const parentId = getRequestUserId(req);
    if (!parentId) {
      return res.status(401).json({ message: 'Unauthorized parent session' });
    }

    const child = await getAccessibleChildForParent(parentId, req.params.childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found or access denied' });
    }

    const [publishedMealPlan, latestHealthRecord] = await Promise.all([
      getPublishedMealPlanForChild(child),
      ChildHealthRecord.findOne({ child: child._id }).sort({ measuredAt: -1 }).lean(),
    ]);

    const doctorSuggestedPlans = buildDoctorSuggestedPlans(latestHealthRecord);

    res.json({
      success: true,
      child: {
        id: child._id,
        name: `${child.firstName || ''} ${child.lastName || ''}`.trim(),
        program: child.program,
      },
      approvedDaycarePlan: formatPublishedMealPlan(publishedMealPlan),
      doctorSuggestedPlans,
      doctorSuggestionNotes: latestHealthRecord?.doctorReview?.notes || '',
      pricing: {
        approved_daycare: { label: 'Included in daycare fee', extraFee: 0 },
        doctor_recommended: {
          specific_period: DOCTOR_MEAL_SUBSCRIPTION_PRICING.specific_period,
          entire_daycare: DOCTOR_MEAL_SUBSCRIPTION_PRICING.entire_daycare,
          billedWithFee: true,
        },
        bring_from_home: { label: 'No extra meal charge', extraFee: 0 },
      },
      currentSubscription: child.mealSubscription || {
        preference: 'approved_daycare',
        status: 'inactive',
      },
    });
  } catch (error) {
    console.error('Get parent meal subscription options error:', error);
    res.status(500).json({ message: 'Server error fetching meal subscription options' });
  }
});

router.put('/parent/children/:childId/subscription', auth, authorize('parent'), async (req, res) => {
  try {
    const parentId = getRequestUserId(req);
    if (!parentId) {
      return res.status(401).json({ message: 'Unauthorized parent session' });
    }

    const child = await getAccessibleChildForParent(parentId, req.params.childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found or access denied' });
    }

    const {
      preference = 'approved_daycare',
      selectedPlanTitle = '',
      durationType = 'specific_period',
      startDate,
      endDate,
    } = req.body || {};

    const supportedPreferences = ['approved_daycare', 'doctor_recommended', 'bring_from_home'];
    if (!supportedPreferences.includes(preference)) {
      return res.status(400).json({ message: 'Invalid meal preference selected' });
    }

    const latestHealthRecord = await ChildHealthRecord.findOne({ child: child._id }).sort({ measuredAt: -1 }).lean();
    const doctorSuggestedPlans = buildDoctorSuggestedPlans(latestHealthRecord);

    if (preference === 'doctor_recommended' && doctorSuggestedPlans.length === 0) {
      return res.status(400).json({ message: 'Doctor-recommended meal plans are not available yet for this child' });
    }

    const chosenPlan = preference === 'doctor_recommended'
      ? pickPlanByTitle(doctorSuggestedPlans, selectedPlanTitle)
      : null;

    const normalizedDurationType = durationType === 'entire_daycare' ? 'entire_daycare' : 'specific_period';
    const normalizedStartDate = parseDateOrNull(startDate) || new Date();
    const normalizedEndDate = normalizedDurationType === 'specific_period' ? parseDateOrNull(endDate) : null;

    if (!normalizedStartDate || Number.isNaN(normalizedStartDate.getTime())) {
      return res.status(400).json({ message: 'Invalid start date provided' });
    }
    if (normalizedDurationType === 'specific_period' && endDate && !normalizedEndDate) {
      return res.status(400).json({ message: 'Invalid end date provided' });
    }

    if (normalizedDurationType === 'specific_period' && normalizedEndDate && normalizedEndDate < normalizedStartDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const extraFee = preference === 'doctor_recommended'
      ? DOCTOR_MEAL_SUBSCRIPTION_PRICING[normalizedDurationType]
      : 0;

    child.mealSubscription = {
      preference,
      status: preference === 'doctor_recommended' ? 'active' : 'inactive',
      selectedPlanTitle: chosenPlan?.title || (preference === 'approved_daycare' ? 'Admin Approved Daycare Meal Plan' : 'Bring From Home'),
      selectedPlanMeals: {
        breakfast: chosenPlan?.breakfast || '',
        lunch: chosenPlan?.lunch || '',
        snack: chosenPlan?.snack || '',
        dinner: chosenPlan?.dinner || '',
      },
      doctorSuggestionNotes: latestHealthRecord?.doctorReview?.notes || '',
      durationType: normalizedDurationType,
      startDate: normalizedStartDate,
      endDate: normalizedDurationType === 'specific_period' ? normalizedEndDate : null,
      extraFee,
      includedInFee: true,
      subscribedAt: new Date(),
      cancelledAt: null,
    };

    await child.save();

    res.json({
      success: true,
      message: preference === 'doctor_recommended'
        ? 'Doctor-recommended meal subscription saved. Extra charge will be included in billing.'
        : preference === 'bring_from_home'
          ? 'Meal preference updated to bring food from home.'
          : 'Meal preference updated to the admin-approved daycare plan.',
      subscription: child.mealSubscription,
      doctorSuggestedPlans,
    });
  } catch (error) {
    console.error('Update parent meal subscription error:', error);
    res.status(500).json({
      message: 'Server error updating meal subscription',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
    });
  }
});

router.delete('/parent/children/:childId/subscription', auth, authorize('parent'), async (req, res) => {
  try {
    const parentId = getRequestUserId(req);
    if (!parentId) {
      return res.status(401).json({ message: 'Unauthorized parent session' });
    }

    const child = await getAccessibleChildForParent(parentId, req.params.childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found or access denied' });
    }

    child.mealSubscription = {
      preference: 'approved_daycare',
      status: 'cancelled',
      selectedPlanTitle: 'Admin Approved Daycare Meal Plan',
      selectedPlanMeals: {
        breakfast: '',
        lunch: '',
        snack: '',
        dinner: '',
      },
      doctorSuggestionNotes: '',
      durationType: 'specific_period',
      startDate: null,
      endDate: null,
      extraFee: 0,
      includedInFee: true,
      subscribedAt: null,
      cancelledAt: new Date(),
    };

    await child.save();

    res.json({
      success: true,
      message: 'Custom meal subscription removed. Child will follow the standard daycare arrangement.',
      subscription: child.mealSubscription,
    });
  } catch (error) {
    console.error('Delete parent meal subscription error:', error);
    res.status(500).json({ message: 'Server error removing meal subscription' });
  }
});

module.exports = router;
