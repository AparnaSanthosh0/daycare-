import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ExpandMore,
  CheckCircle,
  RadioButtonUnchecked,
  TrendingUp,
  Warning,
  Lightbulb,
  CalendarToday,
  Share,
  Print,
  Info,
  Celebration,
} from '@mui/icons-material';
import {
  milestoneCategories,
  getMilestonesForAge,
  calculateAgeInMonths,
} from '../../data/milestones';
import {
  analyzeMilestones,
  generateInsights,
  generateDailyTip,
  predictConcerns,
} from '../../services/milestoneAI';
import ConfettiCelebration from './ConfettiCelebration';

const MilestoneTracker = ({ child }) => {
  const navigate = useNavigate();
  const [completedMilestones, setCompletedMilestones] = useState([]);
  const [currentMilestones, setCurrentMilestones] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [insights, setInsights] = useState(null);
  const [dailyTip, setDailyTip] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratingMilestone, setCelebratingMilestone] = useState(null);

  const childAge = child?.dateOfBirth ? calculateAgeInMonths(child.dateOfBirth) : 12;
  const childName = child?.name || 'Your child';

  useEffect(() => {
    // Load milestones for child's age
    const milestones = getMilestonesForAge(childAge);
    setCurrentMilestones(milestones);

    // Load saved progress from localStorage (in real app, use backend)
    const saved = localStorage.getItem(`milestones_${child?.id || 'demo'}`);
    if (saved) {
      setCompletedMilestones(JSON.parse(saved));
    }
  }, [childAge, child?.id]);

  useEffect(() => {
    // Run AI analysis when milestones change
    if (currentMilestones.length > 0) {
      const analysisResult = analyzeMilestones(childAge, completedMilestones, currentMilestones);
      setAnalysis(analysisResult);

      const insightsResult = generateInsights(analysisResult, childAge, childName);
      setInsights(insightsResult);

      const tip = generateDailyTip(analysisResult.categoryProgress);
      setDailyTip(tip);
    }
  }, [completedMilestones, currentMilestones, childAge, childName]);

  const handleToggleMilestone = (milestone) => {
    const isCompleted = completedMilestones.some(m => m.milestone === milestone.milestone);
    
    let updated;
    if (isCompleted) {
      updated = completedMilestones.filter(m => m.milestone !== milestone.milestone);
    } else {
      updated = [...completedMilestones, { ...milestone, completedDate: new Date().toISOString() }];
      // Show celebration for newly completed milestone
      setCelebratingMilestone(milestone);
      setShowCelebration(true);
    }
    
    setCompletedMilestones(updated);
    
    // Save to localStorage (in real app, save to backend)
    localStorage.setItem(`milestones_${child?.id || 'demo'}`, JSON.stringify(updated));
  };

  const handleCelebrate = (milestone) => {
    setCelebratingMilestone(milestone);
    setShowCelebration(true);
  };

  const handleSavePhoto = (imageData, milestone, childData) => {
    console.log('Saving celebration photo...', { milestone, child: childData });
    // In real app, save to backend
    // await api.post('/api/milestones/celebration-photos', { imageData, milestoneId, childId });
  };

  const getMilestonesByCategory = () => {
    const grouped = {};
    milestoneCategories.forEach(cat => {
      grouped[cat.id] = currentMilestones.filter(m => m.category === cat.id);
    });
    return grouped;
  };

  if (!analysis || !insights) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading milestone tracker...</Typography>
      </Box>
    );
  }

  const milestonesByCategory = getMilestonesByCategory();
  const concerns = predictConcerns(analysis.categoryProgress, childAge);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              📊 Development Milestone Tracker
            </Typography>
            <Typography variant="h6">
              {childName} • {childAge} months old
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Share Report">
              <IconButton sx={{ color: 'white' }}>
                <Share />
              </IconButton>
            </Tooltip>
            <Tooltip title="Print Report">
              <IconButton sx={{ color: 'white' }}>
                <Print />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
        
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Overall Progress</Typography>
            <Typography variant="body2" fontWeight="bold">{analysis.completionRate}%</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={analysis.completionRate} 
            sx={{ 
              height: 10, 
              borderRadius: 5,
              backgroundColor: 'rgba(255,255,255,0.3)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: analysis.statusColor,
              }
            }} 
          />
        </Box>
      </Paper>

      {/* Daily Tip */}
      <Alert icon={<Lightbulb />} severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold">Today's Development Tip</Typography>
        <Typography variant="body2">{dailyTip}</Typography>
      </Alert>

      {/* AI Insights */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp color="primary" />
          AI-Powered Insights
        </Typography>
        <Grid container spacing={2}>
          {insights.insights.map((insight, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Alert 
                severity={insight.type} 
                icon={<span style={{ fontSize: '1.5rem' }}>{insight.icon}</span>}
                sx={{ height: '100%' }}
              >
                <Typography variant="subtitle2" fontWeight="bold">{insight.title}</Typography>
                <Typography variant="body2">{insight.message}</Typography>
              </Alert>
            </Grid>
          ))}
        </Grid>

        {concerns.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" fontWeight="bold" color="error" gutterBottom>
              <Warning /> Areas Needing Attention
            </Typography>
            {concerns.map((concern, index) => (
              <Alert severity={concern.severity === 'high' ? 'error' : 'warning'} sx={{ mb: 1 }} key={index}>
                <Typography variant="body2">
                  {concern.icon} <strong>{concern.category}:</strong> {concern.message}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Recommended: {concern.action}
                </Typography>
              </Alert>
            ))}
          </Box>
        )}
      </Paper>

      {/* Category Progress */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {milestoneCategories.map((category) => {
          const progress = analysis.categoryProgress[category.id];
          const percentage = progress?.percentage || 0;
          
          return (
            <Grid item xs={12} sm={6} md={3} key={category.id}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h3" sx={{ mb: 1 }}>{category.icon}</Typography>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    {category.name}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color={category.color}>
                    {Math.round(percentage)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {progress?.completed || 0}/{progress?.total || 0} completed
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={percentage} 
                    sx={{ 
                      mt: 1,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: category.color,
                      }
                    }} 
                  />
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Milestones by Category */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Milestones Checklist
        </Typography>
        {milestoneCategories.map((category) => {
          const categoryMilestones = milestonesByCategory[category.id] || [];
          if (categoryMilestones.length === 0) return null;

          return (
            <Accordion key={category.id} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography variant="h5">{category.icon}</Typography>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                    {category.name}
                  </Typography>
                  <Chip 
                    label={`${analysis.categoryProgress[category.id]?.completed || 0}/${categoryMilestones.length}`}
                    size="small"
                    sx={{ backgroundColor: category.color, color: 'white' }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {categoryMilestones.map((milestone, index) => {
                    const isCompleted = completedMilestones.some(m => m.milestone === milestone.milestone);
                    
                    return (
                      <ListItem 
                        key={index} 
                        sx={{ py: 1 }}
                        secondaryAction={
                          isCompleted && (
                            <Tooltip title="Celebrate this achievement!">
                              <IconButton 
                                edge="end" 
                                color="primary"
                                onClick={() => handleCelebrate(milestone)}
                              >
                                <Celebration />
                              </IconButton>
                            </Tooltip>
                          )
                        }
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isCompleted}
                              onChange={() => handleToggleMilestone(milestone)}
                              icon={<RadioButtonUnchecked />}
                              checkedIcon={<CheckCircle />}
                              sx={{ 
                                color: category.color,
                                '&.Mui-checked': { color: category.color }
                              }}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>
                                {milestone.milestone}
                              </Typography>
                              {milestone.critical && (
                                <Chip label="Critical" size="small" color="error" />
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Paper>

      {/* Activity Recommendations */}
      {insights.recommendations.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lightbulb color="warning" />
            Recommended Activities
          </Typography>
          <Grid container spacing={2}>
            {insights.recommendations.map((rec, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card sx={{ borderLeft: 4, borderColor: rec.color }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      {rec.icon} {rec.category}
                    </Typography>
                    <List dense>
                      {rec.activities.map((activity, i) => (
                        <ListItem key={i}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <CheckCircle fontSize="small" sx={{ color: rec.color }} />
                          </ListItemIcon>
                          <ListItemText primary={activity} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Next Check */}
      <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CalendarToday color="primary" />
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">Next Milestone Check</Typography>
            <Typography variant="body2" color="text.secondary">
              {insights.nextCheckDate}
            </Typography>
          </Box>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Info />}
          onClick={() => navigate('/milestone-celebration', { state: { child } })}
        >
          Learn More
        </Button>
      </Paper>

      {/* Milestone Celebration */}
      {showCelebration && celebratingMilestone && (
        <ConfettiCelebration
          milestone={celebratingMilestone}
          child={child}
          onClose={() => setShowCelebration(false)}
          onSavePhoto={handleSavePhoto}
        />
      )}
    </Box>
  );
};

export default MilestoneTracker;
