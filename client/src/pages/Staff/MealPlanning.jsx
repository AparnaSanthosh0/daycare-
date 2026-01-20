import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { Send, Save, Refresh } from '@mui/icons-material';
import api from '../../config/api';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TYPES = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack'];

export default function MealPlanning() {
  const [mealPlans, setMealPlans] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [planType, setPlanType] = useState('weekly'); // 'weekly' or 'daily'
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    weekOf: '',
    date: '', // For daily plan
    program: 'all',
    dailyMeals: DAYS.map(day => ({
      day,
      breakfast: [],
      morningSnack: [],
      lunch: [],
      afternoonSnack: [],
      notes: ''
    })),
    // For daily plan
    dayMeals: {
      breakfast: [],
      morningSnack: [],
      lunch: [],
      afternoonSnack: [],
      notes: ''
    },
    notes: ''
  });

  useEffect(() => {
    loadMealPlans();
  }, []);

  const loadMealPlans = async () => {
    try {
      const { data } = await api.get('/meal-plans');
      setMealPlans(data || []);
    } catch (error) {
      console.error('Error loading meal plans:', error);
    }
  };

  const handleAddMealItem = (dayIndex, mealType) => {
    const itemName = prompt('Enter meal item name:');
    if (!itemName) return;
    
    if (planType === 'daily') {
      const newDayMeals = { ...formData.dayMeals };
      newDayMeals[mealType].push({ name: itemName });
      setFormData({ ...formData, dayMeals: newDayMeals });
    } else {
      const newDailyMeals = [...formData.dailyMeals];
      newDailyMeals[dayIndex][mealType].push({ name: itemName });
      setFormData({ ...formData, dailyMeals: newDailyMeals });
    }
  };

  const handleRemoveMealItem = (dayIndex, mealType, itemIndex) => {
    if (planType === 'daily') {
      const newDayMeals = { ...formData.dayMeals };
      newDayMeals[mealType].splice(itemIndex, 1);
      setFormData({ ...formData, dayMeals: newDayMeals });
    } else {
      const newDailyMeals = [...formData.dailyMeals];
      newDailyMeals[dayIndex][mealType].splice(itemIndex, 1);
      setFormData({ ...formData, dailyMeals: newDailyMeals });
    }
  };

  const handleSaveDraft = async () => {
    try {
      setError('');
      setMessage('');
      
      if (planType === 'daily') {
        if (!formData.title || !formData.date) {
          setError('Title and date are required');
          return;
        }
        // Convert daily plan to weekly format for API
        const dailyPlanData = {
          title: formData.title,
          description: formData.description,
          weekOf: formData.date,
          weekEnd: formData.date,
          program: formData.program,
          dailyMeals: [{
            day: new Date(formData.date).toLocaleDateString('en-US', { weekday: 'lowercase' }),
            breakfast: formData.dayMeals.breakfast,
            morningSnack: formData.dayMeals.morningSnack,
            lunch: formData.dayMeals.lunch,
            afternoonSnack: formData.dayMeals.afternoonSnack,
            notes: formData.dayMeals.notes
          }],
          notes: formData.notes,
          status: 'draft'
        };
        await api.post('/meal-plans', dailyPlanData);
      } else {
        if (!formData.title || !formData.weekOf) {
          setError('Title and week of are required');
          return;
        }
        await api.post('/meal-plans', {
          ...formData,
          status: 'draft'
        });
      }
      
      setMessage('Meal plan saved as draft');
      loadMealPlans();
      resetForm();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save meal plan');
    }
  };

  const handleSubmitForApproval = async (planId) => {
    if (!planId) {
      // Create new and submit
      try {
        setError('');
        
        if (planType === 'daily') {
          if (!formData.title || !formData.date) {
            setError('Title and date are required');
            return;
          }
          // Get the day name in lowercase
          const date = new Date(formData.date);
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = days[date.getDay()];
          
          const dailyPlanData = {
            title: formData.title,
            description: formData.description,
            weekOf: formData.date,
            weekEnd: formData.date,
            program: formData.program,
            dailyMeals: [{
              day: dayName,
              breakfast: formData.dayMeals.breakfast,
              morningSnack: formData.dayMeals.morningSnack,
              lunch: formData.dayMeals.lunch,
              afternoonSnack: formData.dayMeals.afternoonSnack,
              notes: formData.dayMeals.notes
            }],
            notes: formData.notes
          };
          console.log('Submitting daily meal plan:', JSON.stringify(dailyPlanData, null, 2));
          const response = await api.post('/meal-plans', dailyPlanData);
          const newPlanId = response.data.mealPlan._id;
          await api.post(`/api/meal-plans/${newPlanId}/submit`);
        } else {
          if (!formData.title || !formData.weekOf) {
            setError('Title and week of are required');
            return;
          }
          const response = await api.post('/meal-plans', formData);
          const newPlanId = response.data.mealPlan._id;
          await api.post(`/api/meal-plans/${newPlanId}/submit`);
        }
        
        setMessage('Meal plan submitted for approval');
        loadMealPlans();
        resetForm();
      } catch (e) {
        console.error('Error submitting meal plan:', e);
        console.error('Response data:', e?.response?.data);
        setError(e?.response?.data?.message || e?.response?.data?.error || 'Failed to submit meal plan');
      }
    } else {
      // Submit existing plan
      try {
        await api.post(`/api/meal-plans/${planId}/submit`);
        setMessage('Meal plan submitted for approval');
        loadMealPlans();
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to submit meal plan');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      weekOf: '',
      date: '',
      program: 'all',
      dailyMeals: DAYS.map(day => ({
        day,
        breakfast: [],
        morningSnack: [],
        lunch: [],
        afternoonSnack: [],
        notes: ''
      })),
      dayMeals: {
        breakfast: [],
        morningSnack: [],
        lunch: [],
        afternoonSnack: [],
        notes: ''
      },
      notes: ''
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusChip = (status) => {
    const colors = {
      draft: 'default',
      pending_approval: 'warning',
      approved: 'success',
      published: 'success',
      rejected: 'error'
    };
    return <Chip label={status.replace('_', ' ').toUpperCase()} size="small" color={colors[status]} />;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Meal Planning</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>}

      {/* Create New Meal Plan Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Create New Meal Plan</Typography>
          <ToggleButtonGroup
            value={planType}
            exclusive
            onChange={(e, newValue) => newValue && setPlanType(newValue)}
            size="small"
          >
            <ToggleButton value="weekly">Weekly Plan</ToggleButton>
            <ToggleButton value="daily">Daily Plan</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={planType === 'daily' ? "Lunch Menu - Monday" : "Week of January 1, 2024"}
            />
          </Grid>
          {planType === 'weekly' ? (
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Week Starting"
                value={formData.weekOf}
                onChange={(e) => setFormData({ ...formData, weekOf: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          ) : (
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Program</InputLabel>
              <Select
                value={formData.program}
                label="Program"
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
              >
                <MenuItem value="all">All Programs</MenuItem>
                <MenuItem value="toddler">Toddler (1-2 years)</MenuItem>
                <MenuItem value="preschool">Preschool (3-4 years)</MenuItem>
                <MenuItem value="prekindergarten">Pre-Kindergarten (5-7 years)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Meal plan description (optional)"
            />
          </Grid>
        </Grid>

        {/* Menu Section */}
        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
          {planType === 'daily' ? 'Daily Menu' : 'Weekly Menu'}
        </Typography>
        
        {planType === 'daily' ? (
          <Card variant="outlined">
            <CardContent>
              <Grid container spacing={2}>
                {MEAL_TYPES.map((mealType) => (
                  <Grid item xs={12} sm={6} md={4} key={mealType}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {mealType === 'morningSnack' ? 'Morning Snack' : 
                         mealType === 'afternoonSnack' ? 'Afternoon Snack' :
                         mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {formData.dayMeals[mealType].map((item, itemIndex) => (
                          <Chip
                            key={itemIndex}
                            label={item.name}
                            size="small"
                            onDelete={() => handleRemoveMealItem(0, mealType, itemIndex)}
                          />
                        ))}
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleAddMealItem(0, mealType)}
                      >
                        + Add Item
                      </Button>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {formData.dailyMeals.map((day, dayIndex) => (
              <Grid item xs={12} key={day.day}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {day.day.charAt(0).toUpperCase() + day.day.slice(1)}
                    </Typography>
                    <Grid container spacing={2}>
                      {MEAL_TYPES.map((mealType) => (
                        <Grid item xs={12} sm={6} md={4} key={mealType}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {mealType === 'morningSnack' ? 'Morning Snack' : 
                               mealType === 'afternoonSnack' ? 'Afternoon Snack' :
                               mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                              {day[mealType].map((item, itemIndex) => (
                                <Chip
                                  key={itemIndex}
                                  label={item.name}
                                  size="small"
                                  onDelete={() => handleRemoveMealItem(dayIndex, mealType, itemIndex)}
                                />
                              ))}
                            </Box>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleAddMealItem(dayIndex, mealType)}
                            >
                              + Add Item
                            </Button>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="outlined"
            startIcon={<Save />}
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={() => handleSubmitForApproval(null)}
          >
            Submit for Approval
          </Button>
        </Box>
      </Paper>

      {/* My Meal Plans */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">My Meal Plans</Typography>
          <Button startIcon={<Refresh />} onClick={loadMealPlans}>Refresh</Button>
        </Box>

        {mealPlans.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No meal plans created yet
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Week Of</TableCell>
                  <TableCell>Program</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mealPlans.map((plan) => (
                  <TableRow key={plan._id}>
                    <TableCell>{plan.title}</TableCell>
                    <TableCell>{formatDate(plan.weekOf)}</TableCell>
                    <TableCell>
                      <Chip label={plan.program.toUpperCase()} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{getStatusChip(plan.status)}</TableCell>
                    <TableCell>{formatDate(plan.createdAt)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setViewDialog(true);
                          }}
                        >
                          View
                        </Button>
                        {plan.status === 'draft' && (
                          <Button
                            size="small"
                            color="success"
                            onClick={() => handleSubmitForApproval(plan._id)}
                          >
                            Submit
                          </Button>
                        )}
                        {plan.status === 'rejected' && (
                          <Button
                            size="small"
                            color="warning"
                            onClick={() => handleSubmitForApproval(plan._id)}
                          >
                            Resubmit
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* View Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Meal Plan Details</DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <Box>
              <Typography variant="h6" gutterBottom>{selectedPlan.title}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Week of: {formatDate(selectedPlan.weekOf)} - {formatDate(selectedPlan.weekEnd)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Program: {selectedPlan.program}
              </Typography>
              {selectedPlan.description && (
                <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
                  {selectedPlan.description}
                </Typography>
              )}

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Weekly Menu</Typography>
              {selectedPlan.dailyMeals?.map((day, idx) => (
                <Card key={idx} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {day.day.charAt(0).toUpperCase() + day.day.slice(1)}
                    </Typography>
                    <Grid container spacing={2}>
                      {MEAL_TYPES.map((mealType) => (
                        <Grid item xs={12} sm={6} key={mealType}>
                          <Typography variant="body2" color="text.secondary">
                            {mealType === 'morningSnack' ? 'Morning Snack' : 
                             mealType === 'afternoonSnack' ? 'Afternoon Snack' :
                             mealType.charAt(0).toUpperCase() + mealType.slice(1)}:
                          </Typography>
                          <Typography variant="body2">
                            {day[mealType]?.map(f => f.name).join(', ') || 'Not specified'}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


