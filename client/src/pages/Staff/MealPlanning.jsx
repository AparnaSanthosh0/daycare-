import React, { useState } from 'react';
import { Box, Grid, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import api from '../../config/api';

export default function MealPlanning() {
  const [meal, setMeal] = useState({ day: '', type: '', menu: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function saveMealPlan() {
    try {
      setError('');
      setMessage('');
      await api.post('/api/staff-ops/meals/plan', meal);
      setMessage('Meal plan saved');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save meal plan');
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Meal Planning</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Meal Planning & Dietary Management</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Day" placeholder="Monday" value={meal.day} onChange={(e)=>setMeal(p=>({...p, day:e.target.value}))} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Meal Type" placeholder="Lunch" value={meal.type} onChange={(e)=>setMeal(p=>({...p, type:e.target.value}))} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Menu" placeholder="Rice, Dal, Veggies" value={meal.menu} onChange={(e)=>setMeal(p=>({...p, menu:e.target.value}))} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={saveMealPlan}>Save Meal Plan</Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}


