import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardHeader, 
  CardContent, 
  Grid, 
  TextField, 
  MenuItem, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  Chip,
  Alert
} from '@mui/material';
import api from '../../utils/api';

const ParentFeedback = () => {
  const [feedbackData, setFeedbackData] = useState({
    category: 'feedback',
    subject: '',
    details: ''
  });

  const [aiData, setAiData] = useState({
    feedbackText: '',
    serviceCategory: 'meal',
    rating: 5,
    result: null,
    confidence: null,
    analysis: null
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFeedbackSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        category: feedbackData.category,
        subject: feedbackData.subject,
        details: feedbackData.details
      };

      if (!payload.subject || !payload.details) {
        setMessage('Please fill in all required fields');
        return;
      }

      await api.post('/api/parents/me/feedback', payload);
      setFeedbackData({ category: 'feedback', subject: '', details: '' });
      setMessage('Feedback submitted successfully!');
    } catch (error) {
      console.error('Feedback submit error:', error);
      setMessage('Error submitting feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAiAnalysis = async () => {
    try {
      setLoading(true);
      if (!aiData.feedbackText) {
        setMessage('Please enter feedback text to analyze');
        return;
      }

      const response = await api.post('/api/feedback-classification/predict', {
        text: aiData.feedbackText,
        serviceCategory: aiData.serviceCategory,
        rating: parseInt(aiData.rating)
      });

      setAiData(prev => ({
        ...prev,
        result: response.data.prediction,
        confidence: response.data.confidence,
        analysis: response.data
      }));
      setMessage('Analysis completed successfully!');
    } catch (error) {
      console.error('AI Classification error:', error);
      setMessage('Error analyzing feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>🧠 Feedback & AI Analysis</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Share your feedback and get instant AI-powered sentiment analysis
      </Typography>

      {message && (
        <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Side - Submit Feedback */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Submit Feedback" 
              subheader="Share your thoughts and concerns with us"
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={feedbackData.category}
                      onChange={(e) => setFeedbackData(prev => ({ ...prev, category: e.target.value }))}
                      label="Category"
                    >
                      <MenuItem value="feedback">Feedback</MenuItem>
                      <MenuItem value="complaint">Complaint</MenuItem>
                      <MenuItem value="suggestion">Suggestion</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Subject"
                    value={feedbackData.subject}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="Details"
                    value={feedbackData.details}
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, details: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleFeedbackSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side - AI Sentiment Analysis */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="AI Sentiment Analysis" 
              subheader="Get instant analysis of your feedback"
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Feedback Text"
                    placeholder="Enter feedback text to analyze..."
                    value={aiData.feedbackText}
                    onChange={(e) => setAiData(prev => ({ ...prev, feedbackText: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Service Category</InputLabel>
                    <Select
                      value={aiData.serviceCategory}
                      onChange={(e) => setAiData(prev => ({ ...prev, serviceCategory: e.target.value }))}
                      label="Service Category"
                    >
                      <MenuItem value="meal">Meal</MenuItem>
                      <MenuItem value="activity">Activity</MenuItem>
                      <MenuItem value="communication">Communication</MenuItem>
                      <MenuItem value="safety">Safety</MenuItem>
                      <MenuItem value="general">General</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Rating (1-5)</InputLabel>
                    <Select
                      value={aiData.rating}
                      onChange={(e) => setAiData(prev => ({ ...prev, rating: e.target.value }))}
                      label="Rating (1-5)"
                    >
                      <MenuItem value={1}>1 - Very Poor</MenuItem>
                      <MenuItem value={2}>2 - Poor</MenuItem>
                      <MenuItem value={3}>3 - Average</MenuItem>
                      <MenuItem value={4}>4 - Good</MenuItem>
                      <MenuItem value={5}>5 - Excellent</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={handleAiAnalysis}
                    disabled={loading}
                  >
                    {loading ? 'Analyzing...' : 'Classify Sentiment'}
                  </Button>
                </Grid>

                {/* Results Display */}
                {aiData.result && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="h6" gutterBottom>
                        Analysis Results
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={aiData.result === 'Positive' ? '✅ Positive' : '⚠️ Needs Improvement'}
                          color={aiData.result === 'Positive' ? 'success' : 'warning'}
                          size="large"
                        />
                      </Box>
                      <Typography variant="body2" gutterBottom>
                        <strong>Confidence:</strong> {aiData.confidence ? (aiData.confidence * 100).toFixed(1) : '0.0'}%
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Service Category:</strong> {aiData.serviceCategory}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Rating:</strong> {aiData.rating}/5
                      </Typography>
                      {aiData.analysis?.explanation && (
                        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                          {aiData.analysis.explanation}
                        </Typography>
                      )}
                    </Card>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ParentFeedback;




