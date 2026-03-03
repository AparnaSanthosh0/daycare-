import React, { useState } from 'react';
import {
  TextField,
  Button,
  MenuItem,
  Rating,
  Typography,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import api from '../config/api';

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    category: 'general',
    subject: '',
    text: '',
    rating: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const categories = [
    { value: 'general', label: 'General Feedback' },
    { value: 'meal', label: 'Meals & Nutrition' },
    { value: 'activity', label: 'Activities & Learning' },
    { value: 'communication', label: 'Communication' },
    { value: 'staff', label: 'Staff & Care' },
    { value: 'facility', label: 'Facility & Environment' },
    { value: 'safety', label: 'Safety & Security' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.text.trim()) {
      setResult({
        success: false,
        message: 'Please enter your feedback message'
      });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      // Send feedback to sentiment analysis endpoint
      const payload = {
        category: formData.category,
        subject: formData.subject,
        text: formData.text
      };
      
      // Only include rating if it's been set (greater than 0)
      if (formData.rating > 0) {
        payload.rating = formData.rating;
      }

      await api.post('/sentiment/feedback', payload);

      setResult({
        success: true,
        message: 'Thank you! Your feedback has been sent to the administration.'
      });

      // Reset form
      setFormData({
        category: 'general',
        subject: '',
        text: '',
        rating: 0
      });

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setResult({
        success: false,
        message: error.response?.data?.message || 'Failed to submit feedback. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Stack spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Share Your Feedback
        </Typography>
        <Typography variant="body2" color="text.secondary">
          We value your opinion and use it to improve our services
        </Typography>
      </Stack>

      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Category */}
          <TextField
            select
            name="category"
            label="Category"
            value={formData.category}
            onChange={handleChange}
            fullWidth
            required
          >
            {categories.map((cat) => (
              <MenuItem key={cat.value} value={cat.value}>
                {cat.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Subject */}
          <TextField
            name="subject"
            label="Subject (Optional)"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Brief subject..."
            fullWidth
          />

          {/* Message */}
          <TextField
            name="text"
            label="Your Feedback"
            value={formData.text}
            onChange={handleChange}
            multiline
            rows={4}
            placeholder="Tell us what you think..."
            fullWidth
            required
          />

          {/* Rating */}
          <Stack spacing={1}>
            <Typography variant="body2" gutterBottom>
              Rate Your Experience
            </Typography>
            <Rating
              name="rating"
              value={formData.rating}
              onChange={(event, newValue) => {
                setFormData({ ...formData, rating: newValue || 0 });
              }}
              size="large"
            />
          </Stack>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            fullWidth
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>

          {/* Result */}
          {result && (
            <Alert severity={result.success ? 'success' : 'error'}>
              {result.message}
            </Alert>
          )}
        </Stack>
      </form>
    </Paper>
  );
};

export default FeedbackForm;

