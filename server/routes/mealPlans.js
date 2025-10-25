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
    const { title, description, weekOf, program, dailyMeals, notes } = req.body;
    
    if (!title || !weekOf || !dailyMeals || !Array.isArray(dailyMeals)) {
      return res.status(400).json({ 
        message: 'Title, weekOf, and dailyMeals are required' 
      });
    }
    
    const startOfWeek = new Date(weekOf);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const mealPlan = await MealPlan.create({
      title,
      description,
      weekOf: startOfWeek,
      weekEnd: endOfWeek,
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
    res.status(500).json({ message: 'Server error creating meal plan' });
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
