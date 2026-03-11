import React from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AlphabetARScanner from '../components/AR/AlphabetARScanner';

const AlphabetARPage = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      <AlphabetARScanner onBack={() => navigate(-1)} />
    </Box>
  );
};

export default AlphabetARPage;
