import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MilestoneCelebrationAR from '../components/AR/MilestoneCelebrationAR';

/**
 * Milestone Celebration AR Page
 * Standalone page for celebrating milestone achievements with AR
 * Can be accessed via routing with milestone and child data
 */
const MilestoneCelebrationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get milestone and child data from route state or localStorage
  const { milestone, child } = location.state || {};
  
  // Fallback demo data if accessed directly
  const demoMilestone = {
    milestone: 'Takes first steps',
    title: 'Takes first steps',
    category: 'physical',
    critical: true,
    completedDate: new Date().toISOString(),
  };

  const demoChild = {
    id: 'demo-child-1',
    name: 'Emma',
    dateOfBirth: '2023-02-15',
  };

  const activeMilestone = milestone || demoMilestone;
  const activeChild = child || demoChild;

  const handleClose = () => {
    // Navigate back or to milestones page
    navigate('/milestones');
  };

  const handleSavePhoto = (imageData, milestoneData, childData) => {
    console.log('Saving celebration photo...', { milestone: milestoneData, child: childData });
    // In production, save to backend
    // await api.post('/api/milestones/celebration-photos', {
    //   imageData,
    //   milestoneId: milestoneData.id,
    //   childId: childData.id
    // });
    
    // Save to localStorage as demo
    const photos = JSON.parse(localStorage.getItem('celebration_photos') || '[]');
    photos.push({
      imageData,
      milestone: milestoneData,
      child: childData,
      date: new Date().toISOString(),
    });
    localStorage.setItem('celebration_photos', JSON.stringify(photos));
  };

  return (
    <MilestoneCelebrationAR
      milestone={activeMilestone}
      child={activeChild}
      onClose={handleClose}
      onSavePhoto={handleSavePhoto}
    />
  );
};

export default MilestoneCelebrationPage;
