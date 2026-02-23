// React component example for Feedback Submission with Sentiment Analysis
import React, { useState } from 'react';
import api from '../config/api';
import './Chatbot.css';

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    category: 'general',
    subject: '',
    text: '',
    rating: 0
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'meal', label: 'Meals' },
    { value: 'activity', label: 'Activities' },
    { value: 'communication', label: 'Communication' },
    { value: 'staff', label: 'Staff' },
    { value: 'facility', label: 'Facility' },
    { value: 'safety', label: 'Safety' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRating = (rating) => {
    setFormData({ ...formData, rating });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const response = await api.post(
        '/sentiment/feedback',
        formData
      );

      if (response.data.success) {
        setResult({
          success: true,
          message: response.data.message,
          sentiment: response.data.feedback.sentiment,
          confidence: response.data.feedback.confidence
        });

        // Reset form
        setFormData({
          category: 'general',
          subject: '',
          text: '',
          rating: 0
        });
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setResult({
        success: false,
        message: error.response?.data?.message || 'Failed to submit feedback'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-form">
      <h2>Share Your Feedback</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Subject (Optional)</label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Brief subject..."
          />
        </div>

        <div className="form-group">
          <label>Your Feedback</label>
          <textarea
            name="text"
            value={formData.text}
            onChange={handleChange}
            placeholder="Tell us what you think..."
            required
          />
        </div>

        <div className="form-group">
          <label>Rating</label>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                className={`star ${star <= (hoverRating || formData.rating) ? 'filled' : 'empty'}`}
                onClick={() => handleRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <button type="submit" disabled={submitting} className="submit-btn">
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>

      {result && (
        <div className={`sentiment-result ${result.sentiment || ''}`}>
          {result.success ? (
            <>
              <h4>✓ {result.message}</h4>
              <p>
                <strong>Sentiment:</strong> {result.sentiment} 
                ({(result.confidence * 100).toFixed(0)}% confidence)
              </p>
            </>
          ) : (
            <h4>✗ {result.message}</h4>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackForm;
