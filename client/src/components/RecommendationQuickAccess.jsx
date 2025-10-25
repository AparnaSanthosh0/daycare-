import React from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  Typography, 
  Box
} from '@mui/material';
import { 
  People as Users, 
  Psychology as Brain
} from '@mui/icons-material';

const RecommendationQuickAccess = () => {

  const openReactTestPage = () => {
    // Navigate to the React test page
    window.location.href = '/recommendations-test';
  };

  return (
    <Box sx={{ mt: 3 }}>
      {/* Quick Access Card */}
      <Card sx={{ border: '1px solid #e3f2fd', backgroundColor: '#f3f9ff', mb: 2 }}>
        <CardHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Brain color="primary" />
            <Typography variant="h6" color="primary">
              Child Grouping Recommendations
            </Typography>
          </Box>
        </CardHeader>
        <CardContent>
          <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
            The KNN algorithm identifies children with similar age and interests to suggest optimal activity partners or groups within the daycare. This ensures children engage with peers who share comparable developmental stages and preferences, enhancing social interaction and learning outcomes.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Button 
              onClick={openReactTestPage}
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Users />}
            >
              View Recommendations
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RecommendationQuickAccess;
