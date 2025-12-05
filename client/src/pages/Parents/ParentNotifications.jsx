import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardHeader, 
  CardContent, 
  Grid, 
  Typography,
  Alert,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton
} from '@mui/material';
import { 
  Notifications as NotificationIcon,
  People as Users,
  Groups,
  Close,
  CheckCircle
} from '@mui/icons-material';
import api from '../../config/api';

const ParentNotifications = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/recommendations/received');
      setRecommendations(response.data || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecommendation = (rec) => {
    setSelectedRecommendation(rec);
    setDialogOpen(true);
    // Mark as read
    if (!rec.read) {
      api.put(`/api/recommendations/received/${rec.id}/read`)
        .then(() => {
          setRecommendations(prev => prev.map(r => 
            r.id === rec.id ? { ...r, read: true } : r
          ));
        })
        .catch(err => console.error('Error marking as read:', err));
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Notifications</Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <Grid container spacing={3}>
          {/* AI Recommendations */}
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotificationIcon color="primary" />
                    <span>AI Grouping Recommendations</span>
                    {recommendations.filter(r => !r.read).length > 0 && (
                      <Chip 
                        label={recommendations.filter(r => !r.read).length}
                        color="error"
                        size="small"
                      />
                    )}
                  </Box>
                }
                subheader="Personalized activity grouping recommendations for your child"
              />
              <CardContent>
                {recommendations.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No recommendations available at this time. Recommendations will appear here when staff generates them for your child.
                  </Typography>
                ) : (
                  <List>
                    {recommendations.map((rec, index) => (
                      <React.Fragment key={rec.id}>
                        <ListItem
                          sx={{
                            bgcolor: rec.read ? 'transparent' : 'action.hover',
                            borderRadius: 1,
                            mb: 1,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.selected' }
                          }}
                          onClick={() => handleViewRecommendation(rec)}
                          secondaryAction={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {!rec.read && <Chip label="New" color="primary" size="small" />}
                              <CheckCircle color={rec.read ? 'disabled' : 'primary'} />
                            </Box>
                          }
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" fontWeight={rec.read ? 'normal' : 'bold'}>
                                  Recommendations for {rec.childName}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                Sent on {new Date(rec.sentAt).toLocaleString()}
                              </Typography>
                            }
                          />
                        </ListItem>
                        {index < recommendations.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Other Notifications */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Visitor & Pickup Notifications" />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Real-time alerts when someone arrives for pickup or visits your child.
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'warning.50', border: '1px dashed', borderColor: 'warning.main', borderRadius: 1 }}>
                  <Typography variant="body2"><strong>Example:</strong> Grandma approved for pickup at 3:10 PM.</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Emergency Alerts" />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Immediate alerts during emergencies will appear here.
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'error.50', border: '1px dashed', borderColor: 'error.main', borderRadius: 1 }}>
                  <Typography variant="body2"><strong>Example:</strong> Shelter-in-place drill completed successfully.</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Recommendation Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Recommendations for {selectedRecommendation?.childName}</span>
            <IconButton onClick={() => setDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRecommendation?.recommendations && (
            <Box sx={{ pt: 2 }}>
              {/* Individual Partners */}
              {selectedRecommendation.recommendations.individualPartners && 
               selectedRecommendation.recommendations.individualPartners.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Users color="primary" />
                    Recommended Activity Partners
                  </Typography>
                  <List>
                    {selectedRecommendation.recommendations.individualPartners.map((partner, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={partner.name}
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                Age: {partner.age} years | Gender: {partner.gender}
                              </Typography>
                              <Typography variant="body2">
                                Similarity: {partner.similarity ? (partner.similarity * 100).toFixed(1) : '0.0'}% | 
                                Compatibility: {partner.compatibility ? (partner.compatibility * 100).toFixed(1) : '0.0'}%
                              </Typography>
                              <Typography variant="body2">
                                Common Interests: {partner.interests?.join(', ') || 'N/A'}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Recommended Groups */}
              {selectedRecommendation.recommendations.recommendedGroups && 
               selectedRecommendation.recommendations.recommendedGroups.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Groups color="primary" />
                    Recommended Activity Groups
                  </Typography>
                  <Grid container spacing={2}>
                    {selectedRecommendation.recommendations.recommendedGroups.map((group, index) => (
                      <Grid item xs={12} md={6} key={index}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                              {group.groupId?.replace('_', ' ').toUpperCase() || `Group ${index + 1}`}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>Group Size:</strong> {group.groupSize} members
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>Average Similarity:</strong> {group.averageSimilarity ? (group.averageSimilarity * 100).toFixed(1) : '0.0'}%
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>Common Interests:</strong> {group.commonInterests?.join(', ') || 'N/A'}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Members:</strong> {group.members?.map(m => m.name).join(', ') || 'N/A'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParentNotifications;




