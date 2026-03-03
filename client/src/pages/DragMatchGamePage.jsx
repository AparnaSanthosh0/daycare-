import React from 'react';
import { Box } from '@mui/material';
import DragMatchGame from '../components/Games/DragMatchGame';

/**
 * Drag & Match Game Page
 * 
 * Educational drag-and-drop matching game for children
 * - Multiple game types: Shapes, Animals, Numbers, Colors, Letters
 * - Touch and mouse support
 * - Progressive difficulty levels
 */
const DragMatchGamePage = () => {
  // Demo child data (in production, this would come from auth/props)
  const demoChild = {
    id: 'demo-child',
    name: 'Alex',
    dateOfBirth: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 4).toISOString(), // 4 years old
  };

  const handleComplete = (data) => {
    console.log('Drag & Match Game completed:', data);
    // In production, save progress to backend
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <DragMatchGame
        child={demoChild}
        onComplete={handleComplete}
      />
    </Box>
  );
};

export default DragMatchGamePage;
