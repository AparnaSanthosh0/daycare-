const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const MealPlan = require('../models/MealPlan');
const Child = require('../models/Child');

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

module.exports = router;
