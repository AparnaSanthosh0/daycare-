/**
 * AI-Powered Milestone Analysis Service
 * Analyzes child development progress and provides insights
 */

import { milestoneCategories, developmentActivities } from '../data/milestones';

/**
 * Analyze milestone completion status
 */
export const analyzeMilestones = (childAge, completedMilestones, totalMilestones) => {
  const completionRate = (completedMilestones.length / totalMilestones.length) * 100;
  
  // Count by category
  const categoryProgress = {};
  milestoneCategories.forEach(cat => {
    const catTotal = totalMilestones.filter(m => m.category === cat.id).length;
    const catCompleted = completedMilestones.filter(m => m.category === cat.id).length;
    categoryProgress[cat.id] = {
      completed: catCompleted,
      total: catTotal,
      percentage: catTotal > 0 ? (catCompleted / catTotal) * 100 : 0,
    };
  });

  // Check critical milestones
  const criticalMilestones = totalMilestones.filter(m => m.critical);
  const criticalMissing = criticalMilestones.filter(m => 
    !completedMilestones.some(cm => cm.milestone === m.milestone)
  );

  // Determine status
  let status = 'excellent';
  let statusColor = '#4CAF50';
  let statusIcon = '🌟';
  
  if (criticalMissing.length > 0) {
    status = 'needs-attention';
    statusColor = '#FF5722';
    statusIcon = '⚠️';
  } else if (completionRate < 60) {
    status = 'below-average';
    statusColor = '#FF9800';
    statusIcon = '📊';
  } else if (completionRate < 80) {
    status = 'on-track';
    statusColor = '#2196F3';
    statusIcon = '✅';
  }

  return {
    completionRate: Math.round(completionRate),
    categoryProgress,
    criticalMissing,
    status,
    statusColor,
    statusIcon,
  };
};

/**
 * Generate AI insights and recommendations
 */
export const generateInsights = (analysis, childAge, childName = 'Your child') => {
  const insights = [];
  const recommendations = [];

  // Overall progress insight
  if (analysis.status === 'excellent') {
    insights.push({
      type: 'success',
      icon: analysis.statusIcon,
      title: 'Excellent Progress!',
      message: `${childName} is meeting all developmental milestones for their age. Keep up the great work!`,
    });
  } else if (analysis.status === 'on-track') {
    insights.push({
      type: 'info',
      icon: analysis.statusIcon,
      title: 'On Track',
      message: `${childName} is progressing well with ${analysis.completionRate}% of milestones achieved.`,
    });
  } else if (analysis.status === 'below-average') {
    insights.push({
      type: 'warning',
      icon: analysis.statusIcon,
      title: 'Below Expected Progress',
      message: `${childName} has achieved ${analysis.completionRate}% of expected milestones. Consider additional activities to support development.`,
    });
  } else if (analysis.status === 'needs-attention') {
    insights.push({
      type: 'error',
      icon: analysis.statusIcon,
      title: 'Attention Needed',
      message: `Some critical milestones are not yet achieved. We recommend consulting with a pediatrician for evaluation.`,
    });
  }

  // Category-specific insights
  Object.entries(analysis.categoryProgress).forEach(([categoryId, progress]) => {
    const category = milestoneCategories.find(c => c.id === categoryId);
    
    if (progress.percentage < 50 && progress.total > 0) {
      insights.push({
        type: 'warning',
        icon: category.icon,
        title: `${category.name} Needs Focus`,
        message: `Only ${Math.round(progress.percentage)}% completed in this area.`,
      });
      
      // Add activity recommendations
      const activities = developmentActivities[categoryId];
      if (activities && activities.length > 0) {
        recommendations.push({
          category: category.name,
          icon: category.icon,
          color: category.color,
          activities: activities.slice(0, 3), // Top 3 activities
        });
      }
    } else if (progress.percentage === 100 && progress.total > 0) {
      insights.push({
        type: 'success',
        icon: category.icon,
        title: `${category.name} - Complete!`,
        message: `All milestones achieved in this category. Excellent!`,
      });
    }
  });

  // Critical milestone alerts
  if (analysis.criticalMissing.length > 0) {
    analysis.criticalMissing.forEach(milestone => {
      const category = milestoneCategories.find(c => c.id === milestone.category);
      insights.push({
        type: 'error',
        icon: '🚨',
        title: 'Critical Milestone Missing',
        message: `${category.icon} ${milestone.milestone}`,
        priority: 'high',
      });
    });
    
    recommendations.push({
      category: 'Immediate Action',
      icon: '🩺',
      color: '#F44336',
      activities: [
        'Schedule pediatrician appointment',
        'Discuss concerns with healthcare provider',
        'Early intervention evaluation if recommended',
      ],
    });
  }

  return {
    insights,
    recommendations,
    nextCheckDate: getNextCheckDate(childAge),
  };
};

/**
 * Get next milestone check date (every 3 months)
 */
const getNextCheckDate = (ageInMonths) => {
  const nextCheck = new Date();
  nextCheck.setMonth(nextCheck.getMonth() + 3);
  return nextCheck.toLocaleDateString();
};

/**
 * Simple AI-like tip generator based on patterns
 */
export const generateDailyTip = (categoryProgress) => {
  const tips = {
    physical: [
      '💪 Try 15 minutes of active play today - dancing, jumping, or climbing!',
      '🏃 Take a walk and let your child explore different surfaces and textures.',
      '⚽ Play catch with a soft ball to develop hand-eye coordination.',
    ],
    cognitive: [
      '🧩 Spend 10 minutes on puzzles or building blocks today.',
      '📚 Read a new book together and ask questions about the story.',
      '🎨 Try a simple art project - it boosts creativity and problem-solving!',
    ],
    social: [
      '💕 Practice sharing and taking turns during playtime today.',
      '🤝 Arrange a playdate to develop social skills.',
      '😊 Talk about emotions - "How are you feeling today?"',
    ],
    language: [
      '📖 Read aloud for at least 20 minutes today.',
      '🎵 Sing songs and nursery rhymes together.',
      '💬 Ask open-ended questions during daily activities.',
    ],
  };

  // Find category with lowest progress
  let lowestCategory = 'physical';
  let lowestPercentage = 100;
  
  Object.entries(categoryProgress).forEach(([categoryId, progress]) => {
    if (progress.percentage < lowestPercentage && progress.total > 0) {
      lowestPercentage = progress.percentage;
      lowestCategory = categoryId;
    }
  });

  const categoryTips = tips[lowestCategory] || tips.physical;
  return categoryTips[Math.floor(Math.random() * categoryTips.length)];
};

/**
 * Predict areas that may need attention based on current progress
 */
export const predictConcerns = (categoryProgress, childAge) => {
  const concerns = [];

  Object.entries(categoryProgress).forEach(([categoryId, progress]) => {
    const category = milestoneCategories.find(c => c.id === categoryId);
    
    // If category is significantly behind
    if (progress.percentage < 40 && progress.total > 0) {
      concerns.push({
        category: category.name,
        icon: category.icon,
        severity: 'high',
        message: `${category.name} is significantly delayed. Early intervention may be beneficial.`,
        action: 'Consult with pediatrician',
      });
    } else if (progress.percentage < 60 && progress.total > 0) {
      concerns.push({
        category: category.name,
        icon: category.icon,
        severity: 'medium',
        message: `${category.name} could use more focus and practice.`,
        action: 'Increase targeted activities',
      });
    }
  });

  return concerns;
};
