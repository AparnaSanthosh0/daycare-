import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Alert,
  IconButton
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  Visibility,
  AccessTime,
  Group
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const MealPlanApproval = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Meal plan states
  const [mealPlans, setMealPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [submitDialog, setSubmitDialog] = useState(false);
  
  // Form states for staff submission
  const [mealPlanForm, setMealPlanForm] = useState({
    title: '',
    description: '',
    ageGroup: '',
    meals: [],
    notes: '',
    nutritionNotes: ''
  });

  useEffect(() => {
    fetchMealPlans();
  }, []);

  const fetchMealPlans = async () => {
    try {
      setLoading(true);
      // Generate sample meal plans
      const samplePlans = [
        {
          _id: 'mp1',
          planId: 'MP001',
          title: 'Healthy Breakfast Week',
          description: 'A comprehensive breakfast plan focusing on nutrition and variety',
          staffMember: {
            name: 'Sarah Johnson',
            email: 'sarah.johnson@tinytots.com',
            id: 'staff1'
          },
          ageGroup: '3-4 years',
          submittedDate: '2024-10-25T09:00:00Z',
          status: 'pending',
          meals: [
            { day: 'Monday', breakfast: 'Oatmeal with berries', snack: 'Apple slices', lunch: 'Grilled chicken sandwich' },
            { day: 'Tuesday', breakfast: 'Yogurt parfait', snack: 'Crackers', lunch: 'Vegetable soup' }
          ],
          nutritionNotes: 'High in fiber and protein, balanced vitamins',
          notes: 'Consider allergies for nuts and dairy'
        },
        {
          _id: 'mp2',
          planId: 'MP002',
          title: 'Nutrition Education Program',
          description: 'Interactive meal plan with educational components',
          staffMember: {
            name: 'Mike Wilson',
            email: 'mike.wilson@tinytots.com',
            id: 'staff2'
          },
          ageGroup: '4-5 years',
          submittedDate: '2024-10-24T14:30:00Z',
          status: 'pending',
          meals: [
            { day: 'Monday', breakfast: 'Whole grain toast', snack: 'Carrot sticks', lunch: 'Fish tacos' },
            { day: 'Tuesday', breakfast: 'Smoothie bowl', snack: 'Cheese cubes', lunch: 'Pasta salad' }
          ],
          nutritionNotes: 'Focus on introducing new vegetables and flavors',
          notes: 'Include fun facts about each food item'
        },
        {
          _id: 'mp3',
          planId: 'MP003',
          title: 'Seasonal Fruit Introduction',
          description: 'Introducing children to seasonal fruits and their benefits',
          staffMember: {
            name: 'Emma Davis',
            email: 'emma.davis@tinytots.com',
            id: 'staff3'
          },
          ageGroup: '2-3 years',
          submittedDate: '2024-10-23T11:15:00Z',
          status: 'approved',
          approvedDate: '2024-10-24T10:00:00Z',
          approvedBy: 'Admin User',
          meals: [
            { day: 'Monday', breakfast: 'Banana pancakes', snack: 'Orange slices', lunch: 'Chicken strips' },
            { day: 'Tuesday', breakfast: 'Apple cinnamon oats', snack: 'Grapes', lunch: 'Turkey sandwich' }
          ],
          nutritionNotes: 'Rich in vitamins C and potassium',
          notes: 'Great for developing taste preferences'
        },
        {
          _id: 'mp4',
          planId: 'MP004',
          title: 'Vegetable Garden to Table',
          description: 'Farm-fresh vegetables incorporated into daily meals',
          staffMember: {
            name: 'James Brown',
            email: 'james.brown@tinytots.com',
            id: 'staff4'
          },
          ageGroup: '4-5 years',
          submittedDate: '2024-10-22T16:45:00Z',
          status: 'rejected',
          rejectedDate: '2024-10-23T09:30:00Z',
          rejectedBy: 'Admin User',
          rejectionReason: 'Need more detailed preparation instructions and allergen information',
          meals: [
            { day: 'Monday', breakfast: 'Veggie omelet', snack: 'Bell pepper strips', lunch: 'Garden salad' }
          ],
          nutritionNotes: 'High in vitamins A, C, and K',
          notes: 'Encourage children to try new vegetables'
        }
      ];
      
      setMealPlans(samplePlans);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
      setError('Failed to load meal plans');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (planId) => {
    try {
      setSuccess(`Meal plan ${planId} approved successfully!`);
      // Update the plan status locally
      setMealPlans(prev => prev.map(plan => 
        plan.planId === planId 
          ? { ...plan, status: 'approved', approvedDate: new Date().toISOString(), approvedBy: user?.name || 'Admin' }
          : plan
      ));
    } catch (error) {
      console.error('Error approving meal plan:', error);
      setError('Failed to approve meal plan');
    }
  };

  const handleReject = async (planId) => {
    try {
      const reason = prompt('Please provide a reason for rejection:');
      if (reason) {
        setSuccess(`Meal plan ${planId} rejected.`);
        // Update the plan status locally
        setMealPlans(prev => prev.map(plan => 
          plan.planId === planId 
            ? { 
                ...plan, 
                status: 'rejected', 
                rejectedDate: new Date().toISOString(), 
                rejectedBy: user?.name || 'Admin',
                rejectionReason: reason
              }
            : plan
        ));
      }
    } catch (error) {
      console.error('Error rejecting meal plan:', error);
      setError('Failed to reject meal plan');
    }
  };

  const handleSubmitPlan = async () => {
    try {
      if (!mealPlanForm.title || !mealPlanForm.ageGroup) {
        setError('Title and age group are required');
        return;
      }

      const newPlan = {
        _id: `mp_${Date.now()}`,
        planId: `MP${String(mealPlans.length + 1).padStart(3, '0')}`,
        title: mealPlanForm.title,
        description: mealPlanForm.description,
        staffMember: {
          name: user?.name || 'Current Staff',
          email: user?.email || 'staff@tinytots.com',
          id: user?.userId || 'current_staff'
        },
        ageGroup: mealPlanForm.ageGroup,
        submittedDate: new Date().toISOString(),
        status: 'pending',
        meals: mealPlanForm.meals,
        nutritionNotes: mealPlanForm.nutritionNotes,
        notes: mealPlanForm.notes
      };

      setMealPlans(prev => [newPlan, ...prev]);
      setSuccess('Meal plan submitted successfully!');
      setSubmitDialog(false);
      setMealPlanForm({
        title: '',
        description: '',
        ageGroup: '',
        meals: [],
        notes: '',
        nutritionNotes: ''
      });
    } catch (error) {
      console.error('Error submitting meal plan:', error);
      setError('Failed to submit meal plan');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const pendingPlans = mealPlans.filter(plan => plan.status === 'pending');
  const approvedPlans = mealPlans.filter(plan => plan.status === 'approved');
  const rejectedPlans = mealPlans.filter(plan => plan.status === 'rejected');

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading meal plans...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Meal Plan Management
        </Typography>
        {user?.role === 'staff' && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setSubmitDialog(true)}
            sx={{ bgcolor: 'primary.main' }}
          >
            Submit New Plan
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTime />
                <Box>
                  <Typography variant="h4">{pendingPlans.length}</Typography>
                  <Typography variant="body2">Pending Reviews</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle />
                <Box>
                  <Typography variant="h4">{approvedPlans.length}</Typography>
                  <Typography variant="body2">Approved Plans</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Cancel />
                <Box>
                  <Typography variant="h4">{rejectedPlans.length}</Typography>
                  <Typography variant="body2">Rejected Plans</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Group />
                <Box>
                  <Typography variant="h4">{mealPlans.length}</Typography>
                  <Typography variant="body2">Total Plans</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Meal Plans Table */}
      <Card>
        <CardHeader 
          title="Meal Plan Submissions" 
          subheader="Review and manage staff meal plan submissions"
        />
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plan ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Age Group</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mealPlans.map((plan) => (
                  <TableRow key={plan._id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight="bold">
                        {plan.planId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="bold">
                        {plan.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {plan.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">
                        {plan.staffMember.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {plan.staffMember.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={plan.ageGroup} size="small" color="info" />
                    </TableCell>
                    <TableCell>
                      {new Date(plan.submittedDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={plan.status.toUpperCase()}
                        color={getStatusColor(plan.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setViewDialog(true);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                        {plan.status === 'pending' && user?.role === 'admin' && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleApprove(plan.planId)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => handleReject(plan.planId)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {mealPlans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">No meal plans found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* View Plan Details Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Meal Plan Details - {selectedPlan?.title}
        </DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Basic Information</Typography>
                  <Typography><strong>Plan ID:</strong> {selectedPlan.planId}</Typography>
                  <Typography><strong>Title:</strong> {selectedPlan.title}</Typography>
                  <Typography><strong>Description:</strong> {selectedPlan.description}</Typography>
                  <Typography><strong>Age Group:</strong> {selectedPlan.ageGroup}</Typography>
                  <Typography><strong>Status:</strong> 
                    <Chip 
                      label={selectedPlan.status.toUpperCase()} 
                      color={getStatusColor(selectedPlan.status)} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Submission Details</Typography>
                  <Typography><strong>Staff Member:</strong> {selectedPlan.staffMember.name}</Typography>
                  <Typography><strong>Email:</strong> {selectedPlan.staffMember.email}</Typography>
                  <Typography><strong>Submitted:</strong> {new Date(selectedPlan.submittedDate).toLocaleString()}</Typography>
                  {selectedPlan.approvedDate && (
                    <Typography><strong>Approved:</strong> {new Date(selectedPlan.approvedDate).toLocaleString()}</Typography>
                  )}
                  {selectedPlan.rejectedDate && (
                    <Typography><strong>Rejected:</strong> {new Date(selectedPlan.rejectedDate).toLocaleString()}</Typography>
                  )}
                </Grid>
                {selectedPlan.meals && selectedPlan.meals.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Meal Schedule</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Day</TableCell>
                            <TableCell>Breakfast</TableCell>
                            <TableCell>Snack</TableCell>
                            <TableCell>Lunch</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedPlan.meals.map((meal, index) => (
                            <TableRow key={index}>
                              <TableCell>{meal.day}</TableCell>
                              <TableCell>{meal.breakfast}</TableCell>
                              <TableCell>{meal.snack}</TableCell>
                              <TableCell>{meal.lunch}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Additional Notes</Typography>
                  {selectedPlan.nutritionNotes && (
                    <Typography><strong>Nutrition Notes:</strong> {selectedPlan.nutritionNotes}</Typography>
                  )}
                  {selectedPlan.notes && (
                    <Typography><strong>General Notes:</strong> {selectedPlan.notes}</Typography>
                  )}
                  {selectedPlan.rejectionReason && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      <strong>Rejection Reason:</strong> {selectedPlan.rejectionReason}
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
          {selectedPlan?.status === 'pending' && user?.role === 'admin' && (
            <>
              <Button 
                variant="contained" 
                color="success"
                onClick={() => {
                  handleApprove(selectedPlan.planId);
                  setViewDialog(false);
                }}
              >
                Approve
              </Button>
              <Button 
                variant="contained" 
                color="error"
                onClick={() => {
                  handleReject(selectedPlan.planId);
                  setViewDialog(false);
                }}
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Submit New Plan Dialog (Staff Only) */}
      <Dialog open={submitDialog} onClose={() => setSubmitDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Submit New Meal Plan</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Plan Title *"
                value={mealPlanForm.title}
                onChange={(e) => setMealPlanForm({ ...mealPlanForm, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Age Group *"
                value={mealPlanForm.ageGroup}
                onChange={(e) => setMealPlanForm({ ...mealPlanForm, ageGroup: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="">Select Age Group</option>
                <option value="1-2 years">1-2 years</option>
                <option value="2-3 years">2-3 years</option>
                <option value="3-4 years">3-4 years</option>
                <option value="4-5 years">4-5 years</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Plan Description"
                value={mealPlanForm.description}
                onChange={(e) => setMealPlanForm({ ...mealPlanForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Nutrition Notes"
                value={mealPlanForm.nutritionNotes}
                onChange={(e) => setMealPlanForm({ ...mealPlanForm, nutritionNotes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Additional Notes"
                value={mealPlanForm.notes}
                onChange={(e) => setMealPlanForm({ ...mealPlanForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitPlan}>
            Submit Plan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MealPlanApproval;
