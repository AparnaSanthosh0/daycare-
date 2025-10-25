import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Psychology as BrainIcon,
  ThumbUp as PositiveIcon,
  ThumbDown as NegativeIcon,
  Analytics as StatsIcon,
  Refresh as RetrainIcon
} from '@mui/icons-material';
import api from '../config/api';

const FeedbackClassification = () => {
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(5);
  const [serviceCategory, setServiceCategory] = useState('meal');
  const [classification, setClassification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [retraining, setRetraining] = useState(false);

  const serviceCategories = useMemo(() => [
    { value: 'meal', label: 'Meal & Nutrition' },
    { value: 'activity', label: 'Activities & Learning' },
    { value: 'communication', label: 'Communication' },
    { value: 'staff', label: 'Staff & Care' },
    { value: 'facility', label: 'Facility & Environment' },
    { value: 'safety', label: 'Safety & Security' }
  ], []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/api/feedback-classification/categories');
      setCategories(response.data.categories || serviceCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(serviceCategories);
    }
  }, [serviceCategories]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/api/feedback-classification/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, [fetchCategories, fetchStats]);

  const classifyFeedback = async () => {
    if (!feedbackText.trim()) {
      setError('Please enter feedback text');
      return;
    }

    setLoading(true);
    setError('');
    setClassification(null);

    try {
      const response = await api.post('/api/feedback-classification/predict', {
        feedback_text: feedbackText,
        rating: rating,
        service_category: serviceCategory
      });

      setClassification(response.data.classification);
    } catch (error) {
      setError(error.response?.data?.message || 'Classification failed');
    } finally {
      setLoading(false);
    }
  };

  const retrainModel = async () => {
    setRetraining(true);
    try {
      await api.post('/api/feedback-classification/retrain');
      await fetchStats();
      alert('Model retrained successfully!');
    } catch (error) {
      alert('Retraining failed: ' + (error.response?.data?.message || 'Unknown error'));
    } finally {
      setRetraining(false);
    }
  };

  const getClassificationColor = (predictedClass) => {
    return predictedClass === 'positive' ? 'success' : 'error';
  };

  const getClassificationIcon = (predictedClass) => {
    return predictedClass === 'positive' ? <PositiveIcon /> : <NegativeIcon />;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <BrainIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Parent Feedback Classification
        </Typography>
        <Typography variant="h6" color="text.secondary">
          AI-Powered Bayesian Classifier for Feedback Analysis
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Input Form */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Classify Feedback" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Feedback Text"
                  multiline
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Enter parent feedback here..."
                  fullWidth
                />

                <FormControl fullWidth>
                  <InputLabel>Service Category</InputLabel>
                  <Select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    label="Service Category"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Rating (1-5)"
                  type="number"
                  value={rating}
                  onChange={(e) => setRating(parseFloat(e.target.value))}
                  inputProps={{ min: 1, max: 5, step: 0.1 }}
                  fullWidth
                />

                <Button
                  variant="contained"
                  onClick={classifyFeedback}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <BrainIcon />}
                  size="large"
                >
                  {loading ? 'Classifying...' : 'Classify Feedback'}
                </Button>

                {error && (
                  <Alert severity="error">{error}</Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Results */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Classification Results" />
            <CardContent>
              {classification ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      icon={getClassificationIcon(classification.predicted_class)}
                      label={classification.predicted_class.replace('_', ' ').toUpperCase()}
                      color={getClassificationColor(classification.predicted_class)}
                      size="large"
                    />
                    <Typography variant="h6">
                      Confidence: {(classification.confidence * 100).toFixed(1)}%
                    </Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={classification.confidence * 100}
                    color={getConfidenceColor(classification.confidence)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />

                  <Divider />

                  <Typography variant="h6" gutterBottom>
                    Probability Distribution:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Chip
                      label={`Positive: ${(classification.probabilities.positive * 100).toFixed(1)}%`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`Needs Improvement: ${(classification.probabilities.needs_improvement * 100).toFixed(1)}%`}
                      color="error"
                      variant="outlined"
                    />
                  </Box>

                  <Divider />

                  <Typography variant="h6" gutterBottom>
                    Features Analyzed:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip label={`Words: ${classification.features_used.word_count}`} size="small" />
                    <Chip label={`Rating: ${classification.features_used.rating}`} size="small" />
                    <Chip label={`Category: ${classification.features_used.service_category}`} size="small" />
                    {classification.features_used.has_positive_words && (
                      <Chip label="Positive Words" color="success" size="small" />
                    )}
                    {classification.features_used.has_negative_words && (
                      <Chip label="Negative Words" color="error" size="small" />
                    )}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <BrainIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    Enter feedback text and click "Classify Feedback" to see results
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Model Statistics */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Model Statistics"
              action={
                <Button
                  variant="outlined"
                  onClick={retrainModel}
                  disabled={retraining}
                  startIcon={retraining ? <CircularProgress size={20} /> : <RetrainIcon />}
                >
                  {retraining ? 'Retraining...' : 'Retrain Model'}
                </Button>
              }
            />
            <CardContent>
              {stats ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <StatsIcon color="primary" />
                      <Typography variant="h6">{stats.classification_stats?.vocabulary_size || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">Vocabulary Size</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <StatsIcon color="primary" />
                      <Typography variant="h6">{stats.classification_stats?.total_documents || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">Training Documents</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <StatsIcon color="primary" />
                      <Typography variant="h6">{stats.classification_stats?.class_distribution?.positive || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">Positive Samples</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <StatsIcon color="primary" />
                      <Typography variant="h6">{stats.classification_stats?.class_distribution?.needs_improvement || 0}</Typography>
                      <Typography variant="body2" color="text.secondary">Needs Improvement</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <CircularProgress />
                  <Typography sx={{ mt: 1 }}>Loading statistics...</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FeedbackClassification;
