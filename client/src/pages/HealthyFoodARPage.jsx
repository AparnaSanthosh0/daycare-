import React from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HealthyFoodARScanner from '../components/AR/HealthyFoodARScanner';

const HealthyFoodARPage = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      <HealthyFoodARScanner onBack={() => navigate(-1)} />
    </Box>
  );
};

export default HealthyFoodARPage;
