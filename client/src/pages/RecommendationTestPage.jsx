import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Paper
} from '@mui/material';
import {
  People as Users,
  Favorite as Heart,
  Star,
  Sports as Activity,
  GpsFixed as Target,
  Error as AlertCircle,
  Science
} from '@mui/icons-material';

// Sample test data - will be replaced with real data from API

const RecommendationTestPage = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);


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

  const fetchRealChildren = useCallback(async () => {
    try {
      const response = await fetch('/api/recommendations/children');

      if (response.ok) {
        const realChildren = await response.json();
        // Add age calculation and format for the recommendation system
        const formattedChildren = realChildren.map(child => ({
          ...child,
          age: calculateAge(child.dateOfBirth),
          interests: child.interests || []
        }));
        setChildren(formattedChildren);
        console.log('Fetched real children from database:', formattedChildren.length);
      } else {
        // Fallback to sample data if API fails
        console.log('API failed, using sample data');
        // Don't override the fallback children that were already set
        console.log('Keeping existing fallback children');
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      // Don't override the fallback children that were already set
      console.log('Keeping existing fallback children due to error');
    }
  }, []);

  useEffect(() => {
    // Always start with fallback data for testing
    const fallbackChildren = [
      {
        _id: '507f1f77bcf86cd799439011', // Valid ObjectId format
        firstName: 'Emma',
        lastName: 'Johnson',
        dateOfBirth: '2020-03-15',
        gender: 'female',
        program: 'preschool',
        interests: ['arts_crafts', 'reading', 'music', 'drawing', 'storytelling'],
        age: 3.2
      },
      {
        _id: '507f1f77bcf86cd799439012',
        firstName: 'Liam',
        lastName: 'Smith',
        dateOfBirth: '2020-05-22',
        gender: 'male',
        program: 'preschool',
        interests: ['building_blocks', 'outdoor_play', 'sports', 'running', 'technology'],
        age: 3.1
      },
      {
        _id: '507f1f77bcf86cd799439013',
        firstName: 'Sophia',
        lastName: 'Brown',
        dateOfBirth: '2020-01-10',
        gender: 'female',
        program: 'preschool',
        interests: ['arts_crafts', 'music', 'dancing', 'singing', 'pretend_play'],
        age: 3.4
      },
      {
        _id: '507f1f77bcf86cd799439014',
        firstName: 'Noah',
        lastName: 'Davis',
        dateOfBirth: '2020-07-08',
        gender: 'male',
        program: 'preschool',
        interests: ['building_blocks', 'puzzles', 'science', 'technology', 'board_games'],
        age: 2.9
      },
      {
        _id: '507f1f77bcf86cd799439015',
        firstName: 'Olivia',
        lastName: 'Wilson',
        dateOfBirth: '2020-04-30',
        gender: 'female',
        program: 'preschool',
        interests: ['reading', 'storytelling', 'pretend_play', 'animals', 'cooking'],
        age: 3.1
      },
      {
        _id: '507f1f77bcf86cd799439016',
        firstName: 'Ethan',
        lastName: 'Miller',
        dateOfBirth: '2020-09-15',
        gender: 'male',
        program: 'preschool',
        interests: ['drawing', 'painting', 'arts_crafts', 'creative_play', 'coloring'],
        age: 2.8
      },
      {
        _id: '507f1f77bcf86cd799439017',
        firstName: 'Ava',
        lastName: 'Garcia',
        dateOfBirth: '2020-02-28',
        gender: 'female',
        program: 'preschool',
        interests: ['music', 'dancing', 'singing', 'rhythm_activities', 'pretend_play'],
        age: 3.3
      },
      {
        _id: '507f1f77bcf86cd799439018',
        firstName: 'Mason',
        lastName: 'Rodriguez',
        dateOfBirth: '2020-11-12',
        gender: 'male',
        program: 'preschool',
        interests: ['building_blocks', 'construction', 'engineering', 'problem_solving', 'technology'],
        age: 2.6
      },
      {
        _id: '507f1f77bcf86cd799439019',
        firstName: 'Isabella',
        lastName: 'Martinez',
        dateOfBirth: '2020-06-03',
        gender: 'female',
        program: 'preschool',
        interests: ['nature', 'outdoor_play', 'animals', 'exploration', 'science'],
        age: 3.0
      },
      {
        _id: '507f1f77bcf86cd799439020',
        firstName: 'Lucas',
        lastName: 'Anderson',
        dateOfBirth: '2020-12-20',
        gender: 'male',
        program: 'preschool',
        interests: ['puzzles', 'board_games', 'problem_solving', 'math', 'logic_games'],
        age: 2.5
      },
      {
        _id: '507f1f77bcf86cd799439021',
        firstName: 'Mia',
        lastName: 'Taylor',
        dateOfBirth: '2020-08-14',
        gender: 'female',
        program: 'preschool',
        interests: ['cooking', 'baking', 'pretend_play', 'storytelling', 'creative_play'],
        age: 2.9
      },
      {
        _id: '507f1f77bcf86cd799439022',
        firstName: 'Jackson',
        lastName: 'Thomas',
        dateOfBirth: '2020-03-07',
        gender: 'male',
        program: 'preschool',
        interests: ['sports', 'running', 'physical_activities', 'outdoor_play', 'team_games'],
        age: 3.2
      }
    ];
    console.log('Setting fallback children:', fallbackChildren);
    setChildren(fallbackChildren);
    
    // Also try to fetch real children from the database
    fetchRealChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRealChildren]);

  const calculateAge = (dateOfBirth) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const fetchRecommendations = async (childId) => {
    setLoading(true);
    setError(null);
    
    try {
      // Always use real API for recommendations
      const response = await fetch(`/api/recommendations/child/${childId}?k=3&minGroupSize=2&maxGroupSize=4`);

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (similarity) => {
    if (!similarity || similarity === null || similarity === undefined) return 'default';
    if (similarity >= 0.8) return 'success';
    if (similarity >= 0.6) return 'warning';
    return 'error';
  };

  const getSimilarityLabel = (similarity) => {
    if (!similarity || similarity === null || similarity === undefined) return 'Unknown';
    if (similarity >= 0.8) return 'High';
    if (similarity >= 0.6) return 'Medium';
    return 'Low';
  };

  if (loading && !recommendations) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <CircularProgress sx={{ mr: 2 }} />
        <Typography>Loading recommendations...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Child Grouping Recommendation System
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Test the K-Nearest Neighbors algorithm for optimal child grouping
        </Typography>
      </Box>

      {/* Child Selection */}
      <Card sx={{ mb: 3 }}>
        <CardHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Target />
            <Typography variant="h6">Select Child for Recommendations</Typography>
          </Box>
        </CardHeader>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Found {children.length} children
          </Typography>
          <Grid container spacing={2}>
            {children.map((child) => (
              <Grid item xs={12} sm={6} md={4} key={child._id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    border: selectedChild?._id === child._id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    backgroundColor: selectedChild?._id === child._id ? '#f3f9ff' : 'white',
                    '&:hover': { boxShadow: 3 }
                  }}
                  onClick={() => setSelectedChild(child)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6">{child.firstName} {child.lastName}</Typography>
                      <Chip label={child.program} size="small" color="primary" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Age: {child.age} years • {child.gender}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {child.interests.slice(0, 3).map((interest) => (
                        <Chip 
                          key={interest} 
                          label={interestLabels[interest] || interest} 
                          size="small" 
                          variant="outlined"
                        />
                      ))}
                      {child.interests.length > 3 && (
                        <Chip 
                          label={`+${child.interests.length - 3} more`} 
                          size="small" 
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {selectedChild && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button 
                  onClick={() => fetchRecommendations(selectedChild._id)}
                  disabled={loading}
                  variant="contained"
                  size="large"
                  startIcon={loading ? <CircularProgress size={20} /> : <Users />}
                >
                  {loading ? 'Getting Recommendations...' : `Get Recommendations for ${selectedChild.firstName}`}
                </Button>
                
                <Button 
                  onClick={() => {
                    // Show detailed analysis of the KNN algorithm
                    const analysisData = {
                      algorithm: 'K-Nearest Neighbors (KNN)',
                      description: 'Finds children with similar age and interests using distance-based similarity',
                      inputs: {
                        age: selectedChild.age,
                        interests: selectedChild.interests,
                        gender: selectedChild.gender,
                        program: selectedChild.program
                      },
                      parameters: {
                        k: 3,
                        minGroupSize: 2,
                        maxGroupSize: 4,
                        similarityThreshold: 0.6
                      },
                      process: [
                        'Calculate age similarity (closer ages = higher similarity)',
                        'Calculate interest overlap (more common interests = higher similarity)',
                        'Apply gender and program preferences',
                        'Find K nearest neighbors based on combined similarity score',
                        'Group children with highest compatibility scores'
                      ],
                      benefits: [
                        'Enhanced social interaction through compatible peer matching',
                        'Improved learning outcomes via shared interests',
                        'Better developmental support through age-appropriate grouping',
                        'Reduced conflicts through personality compatibility'
                      ]
                    };
                    
                    // Create a detailed analysis display
                    const analysisWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
                    analysisWindow.document.write(`
                      <html>
                        <head>
                          <title>KNN Algorithm Analysis</title>
                          <style>
                            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                            .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                            .header { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px; margin-bottom: 20px; }
                            .section { margin: 20px 0; }
                            .section h3 { color: #333; margin-bottom: 10px; }
                            .input-item { background: #e3f2fd; padding: 8px; margin: 5px 0; border-radius: 4px; }
                            .process-step { background: #f3e5f5; padding: 8px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #9c27b0; }
                            .benefit { background: #e8f5e8; padding: 8px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #4caf50; }
                            .parameter { background: #fff3e0; padding: 8px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #ff9800; }
                          </style>
                        </head>
                        <body>
                          <div class="container">
                            <div class="header">
                              <h1>🧠 KNN Algorithm Analysis</h1>
                              <h2>Child: ${selectedChild.firstName} ${selectedChild.lastName}</h2>
                            </div>
                            
                            <div class="section">
                              <h3>📊 Algorithm Description</h3>
                              <p>${analysisData.description}</p>
                            </div>
                            
                            <div class="section">
                              <h3>📥 Input Parameters</h3>
                              <div class="input-item"><strong>Age:</strong> ${analysisData.inputs.age} years</div>
                              <div class="input-item"><strong>Gender:</strong> ${analysisData.inputs.gender}</div>
                              <div class="input-item"><strong>Program:</strong> ${analysisData.inputs.program}</div>
                              <div class="input-item"><strong>Interests:</strong> ${analysisData.inputs.interests.join(', ')}</div>
                            </div>
                            
                            <div class="section">
                              <h3>⚙️ Algorithm Parameters</h3>
                              <div class="parameter"><strong>K (Neighbors):</strong> ${analysisData.parameters.k}</div>
                              <div class="parameter"><strong>Min Group Size:</strong> ${analysisData.parameters.minGroupSize}</div>
                              <div class="parameter"><strong>Max Group Size:</strong> ${analysisData.parameters.maxGroupSize}</div>
                              <div class="parameter"><strong>Similarity Threshold:</strong> ${analysisData.parameters.similarityThreshold}</div>
                            </div>
                            
                            <div class="section">
                              <h3>🔄 Processing Steps</h3>
                              ${analysisData.process.map((step, index) => 
                                `<div class="process-step">${index + 1}. ${step}</div>`
                              ).join('')}
                            </div>
                            
                            <div class="section">
                              <h3>✅ Expected Benefits</h3>
                              ${analysisData.benefits.map(benefit => 
                                `<div class="benefit">• ${benefit}</div>`
                              ).join('')}
                            </div>
                          </div>
                        </body>
                      </html>
                    `);
                    analysisWindow.document.close();
                  }}
                  disabled={loading}
                  variant="outlined"
                  size="large"
                  startIcon={<Activity />}
                >
                  View Analysis
                </Button>
                
                <Button 
                  onClick={() => {
                    // Quick test with sample data
                    const sampleRecommendations = {
                      targetChild: {
                        _id: selectedChild._id,
                        firstName: selectedChild.firstName,
                        lastName: selectedChild.lastName,
                        age: selectedChild.age,
                        gender: selectedChild.gender,
                        interests: selectedChild.interests
                      },
                      recommendedGroups: [
                        {
                          groupId: 'group_1',
                          groupSize: 3,
                          averageSimilarity: 0.85,
                          commonInterests: ['reading', 'storytelling'],
                          members: [
                            { id: 'child_2', name: 'Liam Smith', age: 3.2, gender: 'male', similarity: 0.9, compatibility: 0.88 },
                            { id: 'child_3', name: 'Sophia Brown', age: 3.0, gender: 'female', similarity: 0.82, compatibility: 0.85 }
                          ]
                        }
                      ],
                      individualPartners: [
                        { id: 'child_2', name: 'Liam Smith', age: 3.2, gender: 'male', interests: ['reading', 'storytelling', 'pretend_play'], similarity: 0.9, compatibility: 0.88 },
                        { id: 'child_3', name: 'Sophia Brown', age: 3.0, gender: 'female', interests: ['reading', 'storytelling', 'animals'], similarity: 0.82, compatibility: 0.85 }
                      ]
                    };
                    setRecommendations(sampleRecommendations);
                  }}
                  disabled={loading}
                  variant="outlined"
                  size="large"
                  startIcon={<Science />}
                >
                  Quick Test
                </Button>
                
                {recommendations && (
                  <Button 
                    onClick={() => {
                      // Send recommendations to other children/parents
                      const recommendationText = `
🎯 Child Grouping Recommendations for ${selectedChild.firstName} ${selectedChild.lastName}

📊 Algorithm: K-Nearest Neighbors (KNN)
👤 Child Profile: ${selectedChild.age} years old, ${selectedChild.gender}, ${selectedChild.program}
🎨 Interests: ${selectedChild.interests.join(', ')}

🤝 Recommended Activity Partners:
${recommendations.individualPartners.map((partner, index) => 
  `${index + 1}. ${partner.name} (${partner.age} years, ${partner.gender})
   Similarity: ${partner.similarity ? (partner.similarity * 100).toFixed(1) : '0.0'}%
   Compatibility: ${partner.compatibility ? (partner.compatibility * 100).toFixed(1) : '0.0'}%
   Interests: ${partner.interests.join(', ')}`
).join('\n\n')}

👥 Recommended Groups:
${recommendations.recommendedGroups.map((group, index) => 
  `${index + 1}. ${group.groupId.replace('_', ' ').toUpperCase()} (${group.groupSize} members)
   Average Similarity: ${group.averageSimilarity ? (group.averageSimilarity * 100).toFixed(1) : '0.0'}%
   Common Interests: ${group.commonInterests.join(', ')}
   Members: ${group.members.map(m => m.name).join(', ')}`
).join('\n\n')}

💡 Benefits:
• Enhanced social interaction through compatible peer matching
• Improved learning outcomes via shared interests  
• Better developmental support through age-appropriate grouping
• Reduced conflicts through personality compatibility

Generated by TinyTots AI Recommendation System
                      `.trim();
                      
                      // Copy to clipboard
                      navigator.clipboard.writeText(recommendationText).then(() => {
                        alert('Recommendations copied to clipboard! You can now share them with other parents or staff.');
                      }).catch(() => {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = recommendationText;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        alert('Recommendations copied to clipboard! You can now share them with other parents or staff.');
                      });
                    }}
                    variant="contained"
                    color="secondary"
                    size="large"
                    startIcon={<Users />}
                  >
                    Send Recommendations
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertCircle />
          {error}
        </Alert>
      )}

      {/* Recommendations Display */}
      {recommendations && (
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Recommended Groups" icon={<Users />} />
              <Tab label="Individual Partners" icon={<Heart />} />
              <Tab label="Model Info" icon={<Activity />} />
            </Tabs>
          </Box>

          {/* Recommended Groups Tab */}
          {tabValue === 0 && (
            <Box sx={{ p: 3 }}>
              {recommendations.recommendedGroups.length > 0 ? (
                <Box>
                  {recommendations.recommendedGroups.map((group) => (
                    <Card key={group.groupId} sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6">{group.groupId.replace('_', ' ').toUpperCase()}</Typography>
                          <Chip label={`${group.groupSize} members`} color="primary" />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Star color="warning" />
                            <Typography variant="body2">
                              Average Similarity: {group.averageSimilarity ? (group.averageSimilarity * 100).toFixed(1) : '0.0'}%
                            </Typography>
                          </Box>
                        </Box>

                        {group.commonInterests.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Common Interests:</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {group.commonInterests.map((interest) => (
                                <Chip 
                                  key={interest} 
                                  label={interestLabels[interest] || interest} 
                                  size="small" 
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          </Box>
                        )}

                        <Box>
                          <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Group Members:</Typography>
                          <Grid container spacing={2}>
                            {group.members.map((member) => (
                              <Grid item xs={12} sm={6} key={member.id}>
                                <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                    <Typography variant="body1" fontWeight="medium">{member.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Age: {member.age ? member.age.toFixed(1) : '0.0'} years • {member.program}
                                    </Typography>
                                  </Box>
                                  <Chip 
                                    label={`${getSimilarityLabel(member.similarity)} Match`} 
                                    color={getSimilarityColor(member.similarity)}
                                    size="small"
                                  />
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Users sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>No Groups Available</Typography>
                  <Typography color="text.secondary">
                    Not enough children match the criteria for group recommendations.
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Individual Partners Tab */}
          {tabValue === 1 && (
            <Box sx={{ p: 3 }}>
              {recommendations.individualPartners.length > 0 ? (
                <Box>
                  {recommendations.individualPartners.map((partner) => (
                    <Card key={partner.id} sx={{ mb: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                              <Typography variant="h6">{partner.name}</Typography>
                              <Chip 
                                label={`${getSimilarityLabel(partner.similarity)} Match`} 
                                color={getSimilarityColor(partner.similarity)}
                                size="small"
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Age: {partner.age ? partner.age.toFixed(1) : '0.0'} years • Program: {partner.program} • 
                              Age Difference: {partner.ageDifference ? partner.ageDifference.toFixed(1) : '0.0'} years
                            </Typography>
                            {partner.interests.length > 0 && (
                              <Box>
                                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Interests:</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {partner.interests.map((interest) => (
                                    <Chip 
                                      key={interest} 
                                      label={interestLabels[interest] || interest} 
                                      size="small" 
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h4" color="primary" fontWeight="bold">
                              {partner.similarity ? (partner.similarity * 100).toFixed(1) : '0.0'}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Similarity</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Heart sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>No Partners Found</Typography>
                  <Typography color="text.secondary">
                    No suitable activity partners found for this child.
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Model Info Tab */}
          {tabValue === 2 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Model Information" />
                    <CardContent>
                      <Box sx={{ '& > div': { mb: 1 } }}>
                        <Typography variant="body2">
                          <strong>Algorithm:</strong> {recommendations.modelInfo.algorithm}
                        </Typography>
                        <Typography variant="body2">
                          <strong>K Value:</strong> {recommendations.modelInfo.parameters.k}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Group Size Range:</strong> {recommendations.modelInfo.parameters.minGroupSize} - {recommendations.modelInfo.parameters.maxGroupSize}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Last Updated:</strong> {new Date(recommendations.modelInfo.lastUpdated).toLocaleString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Target Child Information" />
                    <CardContent>
                      <Box sx={{ '& > div': { mb: 1 } }}>
                        <Typography variant="body2">
                          <strong>Name:</strong> {recommendations.targetChild.name}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Age:</strong> {recommendations.targetChild.age} years
                        </Typography>
                        <Typography variant="body2">
                          <strong>Program:</strong> {recommendations.targetChild.program}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Interests:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {recommendations.targetChild.interests.map((interest) => (
                              <Chip 
                                key={interest} 
                                label={interestLabels[interest] || interest} 
                                size="small" 
                                color="primary"
                              />
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </Card>
      )}

    </Box>
  );
};

export default RecommendationTestPage;