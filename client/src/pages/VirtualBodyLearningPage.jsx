import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Snackbar, Alert } from '@mui/material';
import VirtualBodyLearning from '../components/Games/VirtualBodyLearning';

/**
 * Virtual Body Learning Page
 * 
 * Educational VR/3D experience where children learn about body parts
 * - Interactive 3D cartoon character
 * - Click body parts to learn their functions
 * - Voice narration
 * - Quiz mode to test knowledge
 * 
 * Usage:
 * - Accessible at /virtual-body-learning
 * - Standalone educational tool
 * - Can be integrated into curriculum or games section
 */
const VirtualBodyLearningPage = () => {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [completionData, setCompletionData] = useState(null);

  // Demo child data (in production, this would come from auth/props)
  const demoChild = {
    id: 'demo-child',
    name: 'Alex',
    dateOfBirth: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 4).toISOString(), // 4 years old
  };

  const handleComplete = (data) => {
    console.log('Virtual Body Learning completed:', data);
    setCompletionData(data);
    setShowSuccess(true);
    
    // In production, save progress to backend
    // await saveBodyLearningProgress(child.id, data);
    
    // Navigate back to Learning Games tab in parent dashboard
    navigate('/dashboard', { state: { initialTab: 11 } });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <VirtualBodyLearning
        child={demoChild}
        onComplete={handleComplete}
      />
      
      {/* Success Message */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSuccess(false)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {completionData?.mode === 'quiz'
            ? `🎉 Great job! You scored ${completionData.score} points!`
            : `🌟 Awesome! You learned about ${completionData?.learnedParts?.length || 0} body parts!`}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VirtualBodyLearningPage;
