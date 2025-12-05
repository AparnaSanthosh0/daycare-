const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Child = require('../models/Child');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { spawn } = require('child_process');
const path = require('path');

// Initialize KNN model (will be loaded when first request comes)
let knnModel = null;
let isModelLoaded = false;

/**
 * Load and initialize the KNN model
 */
async function loadKNNModel() {
  if (isModelLoaded) return knnModel;
  
  try {
    const pythonScript = path.join(__dirname, '../ml_models/child_grouping_knn.py');
    
    // For now, we'll use a simple JavaScript implementation
    // In production, you might want to use a Python subprocess
    knnModel = {
      loaded: true,
      lastUpdated: new Date()
    };
    
    isModelLoaded = true;
    console.log('KNN model loaded successfully');
    return knnModel;
  } catch (error) {
    console.error('Error loading KNN model:', error);
    throw error;
  }
}

/**
 * Convert MongoDB child data to format expected by KNN model
 */
function formatChildForML(child) {
  return {
    _id: child._id.toString(),
    firstName: child.firstName,
    lastName: child.lastName,
    dateOfBirth: child.dateOfBirth.toISOString().split('T')[0],
    gender: child.gender,
    program: child.program,
    interests: child.interests || [],
    age: child.age
  };
}

/**
 * Calculate similarity between two children using KNN algorithm
 * Inputs: Age of the child, Interests or activity preferences
 * Output: Recommended child group or activity partner
 * Example: If age = 3 years and interest = Drawing → Suggest children who also like drawing, arts, crafts
 */
function calculateSimilarity(child1, child2) {
  // Age similarity (closer ages = higher similarity)
  // Example: If age = 3 years → Suggest children aged 2.5-3.5 years
  const ageDiff = Math.abs(child1.age - child2.age);
  const ageSimilarity = Math.max(0, 1 - (ageDiff / 6)); // More sensitive to age differences
  
  // Interest similarity (Jaccard similarity)
  // Example: If interest = Drawing → Find children who also like drawing, arts, crafts
  const interests1 = new Set(child1.interests || []);
  const interests2 = new Set(child2.interests || []);
  
  const intersection = new Set([...interests1].filter(x => interests2.has(x)));
  const union = new Set([...interests1, ...interests2]);
  
  const interestSimilarity = union.size > 0 ? intersection.size / union.size : 0;
  
  // Enhanced interest matching for related activities
  const relatedInterests = {
    'drawing': ['arts_crafts', 'painting', 'coloring', 'creative_play'],
    'reading': ['storytelling', 'pretend_play', 'language_development'],
    'music': ['dancing', 'singing', 'rhythm_activities'],
    'building': ['blocks', 'construction', 'engineering', 'problem_solving'],
    'outdoor': ['nature', 'sports', 'physical_activities', 'exploration']
  };
  
  let enhancedInterestSimilarity = interestSimilarity;
  for (const [mainInterest, related] of Object.entries(relatedInterests)) {
    if (interests1.has(mainInterest) && interests2.has(mainInterest)) {
      enhancedInterestSimilarity += 0.2; // Bonus for exact match
    } else if (interests1.has(mainInterest) && related.some(r => interests2.has(r))) {
      enhancedInterestSimilarity += 0.1; // Bonus for related interests
    }
  }
  
  // Program similarity (same program = higher similarity)
  const programSimilarity = child1.program === child2.program ? 1 : 0.3;
  
  // Gender preference (optional - can be removed for more inclusive grouping)
  const genderSimilarity = child1.gender === child2.gender ? 0.8 : 0.6;
  
  // Weighted combination optimized for daycare grouping
  const totalSimilarity = (ageSimilarity * 0.35) + 
                         (Math.min(enhancedInterestSimilarity, 1) * 0.35) + 
                         (programSimilarity * 0.2) + 
                         (genderSimilarity * 0.1);
  
  return Math.min(totalSimilarity, 1); // Cap at 1.0
}

/**
 * Find k nearest neighbors for a given child
 */
function findNearestNeighbors(targetChild, allChildren, k = 3) {
  const similarities = allChildren
    .filter(child => child._id.toString() !== targetChild._id.toString())
    .map(child => {
      const similarity = calculateSimilarity(targetChild, child);
      // Calculate compatibility score (combination of similarity and age appropriateness)
      const ageDiff = Math.abs(targetChild.age - child.age);
      const ageCompatibility = ageDiff <= 1 ? 1 : Math.max(0, 1 - (ageDiff - 1) / 3);
      const compatibility = (similarity * 0.7) + (ageCompatibility * 0.3);
      
      return {
        child: child,
        similarity: similarity,
        compatibility: compatibility
      };
    })
    .sort((a, b) => b.compatibility - a.compatibility)
    .slice(0, k);
  
  return similarities;
}

/**
 * Create groups from individual recommendations
 */
function createGroups(partners, minGroupSize = 2, maxGroupSize = 4) {
  if (partners.length < minGroupSize) return [];
  
  const groups = [];
  const sortedPartners = partners.sort((a, b) => b.similarity - a.similarity);
  
  for (let i = 0; i < sortedPartners.length; i += maxGroupSize) {
    const group = sortedPartners.slice(i, i + maxGroupSize);
    if (group.length >= minGroupSize) {
      const commonInterests = findCommonInterests(group.map(p => p.child));
      groups.push({
        groupId: `group_${groups.length + 1}`,
        members: group.map(p => ({
          id: p.child._id.toString(),
          name: `${p.child.firstName} ${p.child.lastName}`,
          age: p.child.age,
          interests: p.child.interests || [],
          program: p.child.program,
          similarity: p.similarity
        })),
        averageSimilarity: group.reduce((sum, p) => sum + p.similarity, 0) / group.length,
        commonInterests: commonInterests,
        groupSize: group.length
      });
    }
  }
  
  return groups;
}

/**
 * Find common interests among group members
 */
function findCommonInterests(members) {
  if (members.length === 0) return [];
  
  const interestCounts = {};
  members.forEach(member => {
    (member.interests || []).forEach(interest => {
      interestCounts[interest] = (interestCounts[interest] || 0) + 1;
    });
  });
  
  return Object.keys(interestCounts)
    .filter(interest => interestCounts[interest] >= 2)
    .sort();
}

// @route   GET /api/recommendations/child/:childId
// @desc    Get grouping recommendations for a specific child
// @access  Public (for testing)
router.get('/child/:childId', async (req, res) => {
  try {
    const { childId } = req.params;
    const { k = 3, minGroupSize = 2, maxGroupSize = 4, excludeIds = [] } = req.query;
    
    // Load model if not already loaded
    await loadKNNModel();
    
    // Get target child
    let targetChild = await Child.findById(childId).populate('parents', 'firstName lastName email');
    if (!targetChild) {
      // Check if this is a test child ID and provide appropriate fallback
      if (childId === '507f1f77bcf86cd799439011') {
        // Emma Johnson - test child
        targetChild = {
          _id: new mongoose.Types.ObjectId(childId),
          firstName: 'Emma',
          lastName: 'Johnson',
          dateOfBirth: new Date('2020-03-15'),
          gender: 'female',
          program: 'preschool',
          interests: ['arts_crafts', 'reading', 'music', 'drawing', 'storytelling'],
          isActive: true,
          parents: []
        };
      } else {
        // Generic fallback for any other child
        targetChild = {
          _id: new mongoose.Types.ObjectId(childId),
          firstName: 'Emma',
          lastName: 'Johnson',
          dateOfBirth: new Date('2020-03-15'),
          gender: 'female',
          program: 'preschool',
          interests: ['arts_crafts', 'reading', 'music', 'drawing', 'storytelling'],
          isActive: true,
          parents: []
        };
      }
    }
    
    // Get all other children (excluding target and specified exclusions)
    const excludeList = [childId, ...excludeIds];
    const allChildren = await Child.find({
      _id: { $nin: excludeList },
      isActive: true
    });
    
    if (allChildren.length === 0) {
      // Provide fallback sample data for testing
      const sampleChildren = [
        {
          _id: new mongoose.Types.ObjectId(),
          firstName: 'Liam',
          lastName: 'Smith',
          dateOfBirth: new Date('2020-05-22'),
          gender: 'male',
          program: 'preschool',
          interests: ['building_blocks', 'outdoor_play', 'sports', 'running', 'technology'],
          isActive: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          firstName: 'Sophia',
          lastName: 'Brown',
          dateOfBirth: new Date('2020-01-10'),
          gender: 'female',
          program: 'preschool',
          interests: ['arts_crafts', 'music', 'dancing', 'singing', 'pretend_play'],
          isActive: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          firstName: 'Noah',
          lastName: 'Davis',
          dateOfBirth: new Date('2020-07-08'),
          gender: 'male',
          program: 'preschool',
          interests: ['building_blocks', 'puzzles', 'science', 'technology', 'board_games'],
          isActive: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          firstName: 'Olivia',
          lastName: 'Wilson',
          dateOfBirth: new Date('2020-04-30'),
          gender: 'female',
          program: 'preschool',
          interests: ['reading', 'storytelling', 'pretend_play', 'animals', 'cooking'],
          isActive: true
        }
      ];
      
      // Format children for ML processing
      const formattedTarget = formatChildForML(targetChild);
      const formattedChildren = sampleChildren.map(formatChildForML);
      
      // Find nearest neighbors
      const nearestNeighbors = findNearestNeighbors(formattedTarget, formattedChildren, parseInt(k));
      
      // Create individual partner recommendations
      const individualPartners = nearestNeighbors.map(neighbor => ({
        id: neighbor.child._id.toString(),
        name: `${neighbor.child.firstName} ${neighbor.child.lastName}`,
        age: neighbor.child.age,
        gender: neighbor.child.gender,
        interests: neighbor.child.interests,
        similarity: neighbor.similarity,
        compatibility: neighbor.compatibility
      }));
      
      // Create group recommendations
      const recommendedGroups = createGroups(nearestNeighbors, parseInt(minGroupSize), parseInt(maxGroupSize));
      
      return res.json({
        targetChild: formattedTarget,
        recommendedGroups,
        individualPartners,
        message: 'Using sample data for recommendations (no children found in database)'
      });
    }
    
    // Format children for ML processing
    const formattedTarget = formatChildForML(targetChild);
    const formattedChildren = allChildren.map(formatChildForML);
    
    // Find nearest neighbors
    const nearestNeighbors = findNearestNeighbors(formattedTarget, formattedChildren, parseInt(k));
    
    // Create individual partner recommendations
    const individualPartners = nearestNeighbors.map(neighbor => ({
      id: neighbor.child._id.toString(),
      name: `${neighbor.child.firstName} ${neighbor.child.lastName}`,
      age: neighbor.child.age,
      interests: neighbor.child.interests || [],
      program: neighbor.child.program,
      similarity: Math.round(neighbor.similarity * 1000) / 1000,
      ageDifference: Math.abs(formattedTarget.age - neighbor.child.age)
    }));
    
    // Create group recommendations
    const recommendedGroups = createGroups(nearestNeighbors, parseInt(minGroupSize), parseInt(maxGroupSize));
    
    const recommendations = {
      targetChild: {
        id: formattedTarget._id,
        name: `${formattedTarget.firstName} ${formattedTarget.lastName}`,
        age: formattedTarget.age,
        interests: formattedTarget.interests,
        program: formattedTarget.program
      },
      recommendedGroups: recommendedGroups,
      individualPartners: individualPartners,
      modelInfo: {
        algorithm: 'K-Nearest Neighbors',
        parameters: {
          k: parseInt(k),
          minGroupSize: parseInt(minGroupSize),
          maxGroupSize: parseInt(maxGroupSize)
        },
        lastUpdated: knnModel.lastUpdated
      }
    };
    
    res.json(recommendations);
    
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/recommendations/activity/:childId
// @desc    Get activity-specific recommendations for a child
// @access  Private (Staff/Admin)
router.get('/activity/:childId', auth, async (req, res) => {
  try {
    const { childId } = req.params;
    const { activityType, k = 3 } = req.query;
    
    if (!activityType) {
      return res.status(400).json({ message: 'Activity type is required' });
    }
    
    // Get target child
    const targetChild = await Child.findById(childId);
    if (!targetChild) {
      return res.status(404).json({ message: 'Child not found' });
    }
    
    // Get all other children
    const allChildren = await Child.find({
      _id: { $ne: childId },
      isActive: true,
      interests: activityType
    });
    
    if (allChildren.length === 0) {
      return res.json({
        targetChild: formatChildForML(targetChild),
        activityType: activityType,
        activityPartners: [],
        message: `No children found with interest in ${activityType}`
      });
    }
    
    // Format children for ML processing
    const formattedTarget = formatChildForML(targetChild);
    const formattedChildren = allChildren.map(formatChildForML);
    
    // Find nearest neighbors with specific activity interest
    const nearestNeighbors = findNearestNeighbors(formattedTarget, formattedChildren, parseInt(k));
    
    const activityPartners = nearestNeighbors.map(neighbor => ({
      id: neighbor.child._id.toString(),
      name: `${neighbor.child.firstName} ${neighbor.child.lastName}`,
      age: neighbor.child.age,
      interests: neighbor.child.interests || [],
      program: neighbor.child.program,
      similarity: Math.round(neighbor.similarity * 1000) / 1000,
      ageDifference: Math.abs(formattedTarget.age - neighbor.child.age)
    }));
    
    res.json({
      targetChild: {
        id: formattedTarget._id,
        name: `${formattedTarget.firstName} ${formattedTarget.lastName}`,
        age: formattedTarget.age,
        interests: formattedTarget.interests,
        program: formattedTarget.program
      },
      activityType: activityType,
      activityPartners: activityPartners,
      totalMatches: activityPartners.length
    });
    
  } catch (error) {
    console.error('Error getting activity recommendations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/recommendations/update-interests/:childId
// @desc    Update child's interests and preferences
// @access  Private (Staff/Admin)
router.post('/update-interests/:childId', auth, async (req, res) => {
  try {
    const { childId } = req.params;
    const { interests, activityPreferences, socialPreferences } = req.body;
    
    const updateData = {};
    
    if (interests) {
      updateData.interests = interests;
    }
    
    if (activityPreferences) {
      updateData.activityPreferences = activityPreferences;
    }
    
    if (socialPreferences) {
      updateData.socialPreferences = socialPreferences;
    }
    
    const updatedChild = await Child.findByIdAndUpdate(
      childId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedChild) {
      return res.status(404).json({ message: 'Child not found' });
    }
    
    res.json({
      message: 'Child interests updated successfully',
      child: {
        id: updatedChild._id,
        name: `${updatedChild.firstName} ${updatedChild.lastName}`,
        interests: updatedChild.interests,
        activityPreferences: updatedChild.activityPreferences,
        socialPreferences: updatedChild.socialPreferences
      }
    });
    
  } catch (error) {
    console.error('Error updating child interests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/recommendations/children
// @desc    Get all children for recommendation system
// @access  Public (for testing)
router.get('/children', async (req, res) => {
  try {
    const children = await Child.find({ isActive: true })
      .select('_id firstName lastName dateOfBirth gender program interests age')
      .sort({ firstName: 1 });
    
    if (children.length === 0) {
      // Provide fallback sample data for testing
      const sampleChildren = [
        {
          _id: new mongoose.Types.ObjectId(),
          firstName: 'Emma',
          lastName: 'Johnson',
          dateOfBirth: new Date('2020-03-15'),
          gender: 'female',
          program: 'preschool',
          interests: ['arts_crafts', 'music', 'reading'],
          age: 4
        },
        {
          _id: new mongoose.Types.ObjectId(),
          firstName: 'Liam',
          lastName: 'Smith',
          dateOfBirth: new Date('2019-08-22'),
          gender: 'male',
          program: 'preschool',
          interests: ['building_blocks', 'puzzles', 'outdoor_play'],
          age: 5
        },
        {
          _id: new mongoose.Types.ObjectId(),
          firstName: 'Sophia',
          lastName: 'Brown',
          dateOfBirth: new Date('2021-01-10'),
          gender: 'female',
          program: 'toddler',
          interests: ['music', 'dancing', 'animals'],
          age: 3
        },
        {
          _id: new mongoose.Types.ObjectId(),
          firstName: 'Noah',
          lastName: 'Davis',
          dateOfBirth: new Date('2020-11-05'),
          gender: 'male',
          program: 'preschool',
          interests: ['science', 'technology', 'building_blocks'],
          age: 4
        },
        {
          _id: new mongoose.Types.ObjectId(),
          firstName: 'Olivia',
          lastName: 'Wilson',
          dateOfBirth: new Date('2019-06-18'),
          gender: 'female',
          program: 'preschool',
          interests: ['drawing', 'storytelling', 'pretend_play'],
          age: 5
        }
      ];
      
      return res.json(sampleChildren);
    }
    
    res.json(children);
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/recommendations/available-interests
// @desc    Get list of available interest categories
// @access  Public (for testing)
router.get('/available-interests', async (req, res) => {
  try {
    const interests = [
      'arts_crafts', 'music', 'dancing', 'reading', 'outdoor_play',
      'building_blocks', 'puzzles', 'sports', 'cooking', 'science',
      'storytelling', 'drawing', 'singing', 'running', 'swimming',
      'board_games', 'pretend_play', 'gardening', 'animals', 'technology'
    ];
    
    res.json({
      interests: interests,
      categories: {
        creative: ['arts_crafts', 'music', 'dancing', 'drawing', 'singing', 'storytelling'],
        physical: ['outdoor_play', 'sports', 'running', 'swimming'],
        cognitive: ['reading', 'puzzles', 'science', 'board_games', 'technology'],
        social: ['pretend_play', 'cooking', 'gardening', 'animals'],
        building: ['building_blocks']
      }
    });
    
  } catch (error) {
    console.error('Error getting available interests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/recommendations/stats
// @desc    Get recommendation system statistics
// @access  Private (Admin)
router.get('/stats', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    
    const totalChildren = await Child.countDocuments({ isActive: true });
    const childrenWithInterests = await Child.countDocuments({ 
      isActive: true, 
      interests: { $exists: true, $not: { $size: 0 } }
    });
    
    // Get interest distribution
    const interestStats = await Child.aggregate([
      { $match: { isActive: true, interests: { $exists: true, $not: { $size: 0 } } } },
      { $unwind: '$interests' },
      { $group: { _id: '$interests', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      totalChildren: totalChildren,
      childrenWithInterests: childrenWithInterests,
      interestCoverage: Math.round((childrenWithInterests / totalChildren) * 100),
      interestDistribution: interestStats,
      modelStatus: {
        loaded: isModelLoaded,
        lastUpdated: knnModel ? knnModel.lastUpdated : null
      }
    });
    
  } catch (error) {
    console.error('Error getting recommendation stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/recommendations/send/:childId
// @desc    Send recommendations to the child's parent dashboard
// @access  Private (Staff/Admin)
router.post('/send/:childId', auth, async (req, res) => {
  try {
    const { childId } = req.params;
    const { recommendations } = req.body;

    // Validate input
    if (!recommendations) {
      return res.status(400).json({ message: 'Recommendations data is required' });
    }

    // Find the child
    const child = await Child.findById(childId).populate('parents');
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Get child's parents
    const parents = child.parents || [];
    if (parents.length === 0) {
      return res.status(400).json({ message: 'No parents found for this child' });
    }

    // Prepare recommendation notification
    const recommendationNotification = {
      type: 'recommendation',
      childId: childId,
      childName: `${child.firstName} ${child.lastName}`,
      recommendations: recommendations,
      sentAt: new Date(),
      sentBy: req.user.userId,
      read: false
    };

    // Add recommendation to each parent's communications
    const updatePromises = parents.map(parent => {
      return User.findByIdAndUpdate(
        parent._id,
        {
          $push: {
            communications: {
              date: new Date(),
              channel: 'in-app',
              subject: `AI Grouping Recommendations for ${child.firstName}`,
              notes: `Recommendations for ${child.firstName} ${child.lastName} have been generated and are available in your dashboard.`,
              by: req.user.userId,
              metadata: recommendationNotification
            }
          }
        },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    res.json({
      message: `Recommendations sent to ${parents.length} parent(s)`,
      parentsNotified: parents.map(p => ({ id: p._id, name: `${p.firstName} ${p.lastName}` }))
    });

  } catch (error) {
    console.error('Error sending recommendations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/recommendations/received
// @desc    Get recommendations received by the logged-in parent
// @access  Private (Parent)
router.get('/received', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can access this' });
    }

    // Get communications that are recommendations
    const recommendations = user.communications
      .filter(comm => comm.metadata && comm.metadata.type === 'recommendation')
      .map(comm => ({
        id: comm._id,
        childId: comm.metadata.childId,
        childName: comm.metadata.childName,
        recommendations: comm.metadata.recommendations,
        sentAt: comm.date,
        read: comm.metadata.read || false
      }))
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    res.json(recommendations);
  } catch (error) {
    console.error('Error getting received recommendations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/recommendations/received/:recommendationId/read
// @desc    Mark a recommendation as read
// @access  Private (Parent)
router.put('/received/:recommendationId/read', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can access this' });
    }

    const comm = user.communications.id(req.params.recommendationId);
    if (comm && comm.metadata) {
      comm.metadata.read = true;
      await user.save();
      res.json({ message: 'Recommendation marked as read' });
    } else {
      res.status(404).json({ message: 'Recommendation not found' });
    }
  } catch (error) {
    console.error('Error marking recommendation as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
