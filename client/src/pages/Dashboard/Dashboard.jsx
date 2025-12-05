import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Typography,
  Box
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import RecommendationQuickAccess from '../../components/RecommendationQuickAccess';
import FeedbackClassification from '../../components/FeedbackClassification';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect admin users to admin dashboard
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
    // Redirect parents to dedicated parent dashboard
    if (user?.role === 'parent') {
      navigate('/parents/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Recommendation System */}
        <Grid item xs={12}>
          <RecommendationQuickAccess />
        </Grid>

        {/* Feedback Classification */}
        <Grid item xs={12}>
          <FeedbackClassification />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;