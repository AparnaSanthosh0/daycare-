import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  Typography, 
  Box, 
  Chip,
  Grid,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  People as Users, 
  Psychology as Brain, 
  Science as TestTube,
  Favorite as Heart,
  Star
} from '@mui/icons-material';

const ParentRecommendationCard = ({ child }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // const [showFullView, setShowFullView] = useState(false); // Removed unused state

  const interestLabels = {
    'arts_crafts': 'Arts & Crafts',
    'music': 'Music',
    'dancing': 'Dancing',
    'reading': 'Reading',
    'outdoor_play': 'Outdoor Play',
    'building_blocks': 'Building Blocks',
    'puzzles': 'Puzzles',
    'sports': 'Sports',
    'cooking': 'Cooking',
    'science': 'Science',
    'storytelling': 'Storytelling',
    'drawing': 'Drawing',
    'singing': 'Singing',
    'running': 'Running',
    'swimming': 'Swimming',
    'board_games': 'Board Games',
    'pretend_play': 'Pretend Play',
    'gardening': 'Gardening',
    'animals': 'Animals',
    'technology': 'Technology'
  };

  const fetchRecommendations = useCallback(async () => {
    if (!child?._id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // For now, use sample data. In production, this would call the real API
      const mockRecommendations = {
        individualPartners: [
          {
            id: 'child_2',
            name: 'Sophia Brown',
            age: 3.4,
            interests: ['arts_crafts', 'music', 'dancing'],
            similarity: 0.75
          },
          {
            id: 'child_3',
            name: 'Liam Smith',
            age: 3.1,
            interests: ['building_blocks', 'outdoor_play'],
            similarity: 0.65
          }
        ],
        recommendedGroups: [
          {
            groupId: 'group_1',
            members: [
              { name: 'Sophia Brown', similarity: 0.75 },
              { name: 'Liam Smith', similarity: 0.65 },
              { name: 'Olivia Wilson', similarity: 0.60 }
            ],
            averageSimilarity: 0.67,
            commonInterests: ['arts_crafts', 'music'],
            groupSize: 3
          }
        ]
      };
      
      setRecommendations(mockRecommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [child?._id]);

  const getSimilarityColor = (similarity) => {
    if (similarity >= 0.8) return 'success';
    if (similarity >= 0.6) return 'warning';
    return 'error';
  };

  const getSimilarityLabel = (similarity) => {
    if (similarity >= 0.8) return 'High';
    if (similarity >= 0.6) return 'Medium';
    return 'Low';
  };

  useEffect(() => {
    if (child?._id) {
      fetchRecommendations();
    }
  }, [child?._id, fetchRecommendations]);

  if (!child) {
    return null;
  }

  return (
    <Card sx={{ border: '1px solid #e3f2fd', backgroundColor: '#f8f9ff' }}>
      <CardHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Brain color="primary" />
          <Typography variant="h6" color="primary">
            AI-Powered Grouping Recommendations for {child.firstName}
          </Typography>
        </Box>
      </CardHeader>
      <CardContent>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography>Finding optimal play partners...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {recommendations && !loading && (
          <Box>
            {/* Quick Summary */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Our AI algorithm has analyzed {child.firstName}'s interests and age to find the best play partners and group activities.
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Users color="primary" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h6">{recommendations.individualPartners.length}</Typography>
                    <Typography variant="body2" color="text.secondary">Recommended Partners</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Heart color="primary" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h6">{recommendations.recommendedGroups.length}</Typography>
                    <Typography variant="body2" color="text.secondary">Optimal Groups</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Top Recommendations */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
                Best Play Partners
              </Typography>
              <Grid container spacing={2}>
                {recommendations.individualPartners.slice(0, 2).map((partner) => (
                  <Grid item xs={12} sm={6} key={partner.id}>
                    <Paper sx={{ p: 2, border: '1px solid #e0e0e0' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body1" fontWeight="medium">{partner.name}</Typography>
                        <Chip 
                          label={`${getSimilarityLabel(partner.similarity)} Match`} 
                          color={getSimilarityColor(partner.similarity)}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Age: {partner.age} years
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {partner.interests.slice(0, 3).map((interest) => (
                          <Chip 
                            key={interest} 
                            label={interestLabels[interest] || interest} 
                            size="small" 
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Group Recommendations */}
            {recommendations.recommendedGroups.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
                  Recommended Group Activities
                </Typography>
                {recommendations.recommendedGroups.map((group) => (
                  <Paper key={group.groupId} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body1" fontWeight="medium">
                        {group.groupId.replace('_', ' ').toUpperCase()} Group
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Star color="warning" />
                        <Typography variant="body2">
                          {(group.averageSimilarity * 100).toFixed(0)}% Match
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {group.groupSize} children • Common interests: {group.commonInterests.join(', ')}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {group.members.map((member, index) => (
                        <Chip 
                          key={index}
                          label={member.name} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                startIcon={<TestTube />}
                onClick={() => window.open('/recommendation-test.html', '_blank')}
              >
                View Full Analysis
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<Users />}
                onClick={() => window.location.href = '/recommendations-test'}
              >
                Test with Other Children
              </Button>
            </Box>
          </Box>
        )}

        {!recommendations && !loading && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click the button below to get AI-powered grouping recommendations for {child.firstName}.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<Brain />}
              onClick={fetchRecommendations}
            >
              Get Recommendations
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ParentRecommendationCard;
