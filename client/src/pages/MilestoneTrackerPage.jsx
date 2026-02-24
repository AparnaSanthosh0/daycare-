import React from 'react';
import { Box, Container } from '@mui/material';
import MilestoneTracker from '../components/Milestones/MilestoneTracker';

/**
 * Milestone Tracker Page
 * Parent-facing page to track child's development milestones
 */
const MilestoneTrackerPage = () => {
  // In real app, get child data from context or props
  // For demo, using sample data
  const demoChild = {
    id: 'demo-child-1',
    name: 'Emma',
    dateOfBirth: '2023-02-15', // About 12 months old
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <MilestoneTracker child={demoChild} />
      </Container>
    </Box>
  );
};

export default MilestoneTrackerPage;
