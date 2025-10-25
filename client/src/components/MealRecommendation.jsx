import React, { useState, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  Restaurant as MealIcon,
  ChildCare as ChildIcon,
  Warning as AllergyIcon
} from '@mui/icons-material';
import api from '../config/api';

const MealRecommendation = () => {
  const [formData, setFormData] = useState({
    age: '',
    dietaryPreference: 'vegetarian',
    hasAllergy: false
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear previous results when inputs change
    if (result) {
      setResult(null);
    }
  };

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setResult(null);

      // Validate inputs
      if (!formData.age || formData.age < 1 || formData.age > 6) {
        setError('Age must be between 1 and 6 years');
        return;
      }

      if (!formData.dietaryPreference) {
        setError('Please select a dietary preference');
        return;
      }

      const response = await api.post('/api/meal-recommendations/predict', {
        age: parseInt(formData.age),
        dietaryPreference: formData.dietaryPreference,
        hasAllergy: formData.hasAllergy
      });

      setResult(response.data);
    } catch (err) {
      console.error('Meal recommendation error:', err);
      setError('Error getting meal recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formData]);

  const getMealIcon = (category) => {
    if (category?.includes('allergy')) return <AllergyIcon color="warning" />;
    if (category?.includes('soft')) return <ChildIcon color="primary" />;
    return <MealIcon color="success" />;
  };

  const getMealColor = (category) => {
    if (category?.includes('allergy')) return 'warning';
    if (category?.includes('soft')) return 'primary';
    return 'success';
  };

  return (
    <Box>
      <Card>
        <CardHeader
          title="🍽️ Meal Recommendation System"
          subheader="Get personalized meal recommendations based on age, dietary preferences, and allergies"
          avatar={<MealIcon color="primary" />}
        />
        <CardContent>
          <Grid container spacing={3}>
            {/* Input Form */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom color="primary">
                Child Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Age (1-6 years)"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    inputProps={{ min: 1, max: 6 }}
                    helperText="Enter child's age in years"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Dietary Preference</InputLabel>
                    <Select
                      value={formData.dietaryPreference}
                      onChange={(e) => handleInputChange('dietaryPreference', e.target.value)}
                      label="Dietary Preference"
                    >
                      <MenuItem value="vegetarian">Vegetarian</MenuItem>
                      <MenuItem value="non-vegetarian">Non-Vegetarian</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Allergy Status</InputLabel>
                    <Select
                      value={formData.hasAllergy}
                      onChange={(e) => handleInputChange('hasAllergy', e.target.value === 'true')}
                      label="Allergy Status"
                    >
                      <MenuItem value={false}>No Allergies</MenuItem>
                      <MenuItem value={true}>Has Allergies</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <MealIcon />}
                  >
                    {loading ? 'Analyzing...' : 'Get Meal Recommendation'}
                  </Button>
                </Grid>
              </Grid>
            </Grid>

            {/* Results Display */}
            <Grid item xs={12} md={6}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {result && (
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    🍽️ Recommended Meal
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      icon={getMealIcon(result.prediction)}
                      label={result.meal_category}
                      color={getMealColor(result.prediction)}
                      size="large"
                      sx={{ mb: 1 }}
                    />
                  </Box>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Algorithm:</strong> {result.algorithm || 'Decision Tree'}
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Explanation:</strong> {result.explanation}
                  </Typography>
                  
                  {result.input_features && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Input Summary:
                      </Typography>
                      <Typography variant="body2">
                        • Age: {result.input_features.age} years
                      </Typography>
                      <Typography variant="body2">
                        • Dietary Preference: {result.input_features.dietary_preference}
                      </Typography>
                      <Typography variant="body2">
                        • Allergies: {result.input_features.has_allergy}
                      </Typography>
                    </Box>
                  )}
                  
                  {result.feature_importance && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Feature Importance:
                      </Typography>
                      {Object.entries(result.feature_importance).map(([feature, importance]) => (
                        <Typography key={feature} variant="body2">
                          • {feature.replace('_', ' ')}: {(importance * 100).toFixed(1)}%
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Paper>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MealRecommendation;
