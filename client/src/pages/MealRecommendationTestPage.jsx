import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import MealRecommendation from '../components/MealRecommendation';

const MealRecommendationTestPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom align="center" color="primary">
          🍽️ Meal Recommendation System
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 4 }}>
          Decision Tree Algorithm for Personalized Meal Recommendations
        </Typography>
        
        <Box sx={{ mb: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom color="primary">
            📋 How It Works:
          </Typography>
          <Typography variant="body1" paragraph>
            The Decision Tree algorithm analyzes three key factors to recommend the best meal option:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li><strong>Age:</strong> Children under 3 get soft meals, older children get standard meals</li>
            <li><strong>Dietary Preference:</strong> Vegetarian or Non-Vegetarian options</li>
            <li><strong>Allergy Status:</strong> Special allergy-free meals for children with allergies</li>
          </Box>
          
          <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 3 }}>
            🎯 Example Decision Logic:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>If age &lt; 3 and allergy = Yes → <strong>Allergy-Free Soft Meal</strong></li>
            <li>If age &lt; 3 and allergy = No → <strong>Soft Meal</strong> (Veg/Non-Veg)</li>
            <li>If age ≥ 3 and allergy = Yes → <strong>Allergy-Free Standard Meal</strong></li>
            <li>If age ≥ 3 and allergy = No → <strong>Standard Meal</strong> (Veg/Non-Veg)</li>
          </Box>
        </Box>
      </Box>
      
      <MealRecommendation />
    </Container>
  );
};

export default MealRecommendationTestPage;
