import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Check,
  Close,
  Visibility,
  Refresh
} from '@mui/icons-material';
import api from '../config/api';

const MealPlanApprovals = () => {
  const [pendingPlans, setPendingPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewDialog, setViewDialog] = useState({ open: false, plan: null });
  const [rejectDialog, setRejectDialog] = useState({ open: false, plan: null });
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadPendingPlans();
  }, []);

  const loadPendingPlans = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/meal-plans/pending');
      setPendingPlans(data || []);
    } catch (error) {
      console.error('Error loading pending meal plans:', error);
      setMessage({ type: 'error', text: 'Failed to load pending meal plans' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (planId) => {
    try {
      await api.post(`/api/meal-plans/${planId}/approve`);
      setMessage({ type: 'success', text: 'Meal plan approved successfully' });
      loadPendingPlans();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to approve meal plan' });
    }
  };

  const handleReject = async (planId) => {
    try {
      await api.post(`/api/meal-plans/${planId}/reject`, { reason: rejectReason });
      setMessage({ type: 'success', text: 'Meal plan rejected' });
      setRejectDialog({ open: false, plan: null });
      setRejectReason('');
      loadPendingPlans();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reject meal plan' });
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusChip = (status) => {
    const colors = {
      draft: 'default',
      pending_approval: 'warning',
      approved: 'success',
      published: 'success',
      rejected: 'error'
    };
    return <Chip label={status.replace('_', ' ').toUpperCase()} size="small" color={colors[status]} />;
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Meal Plan Approvals
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={loadPendingPlans}
          variant="outlined"
        >
          Refresh
        </Button>
      </Box>

      {message.text && (
        <Alert 
          severity={message.type} 
          onClose={() => setMessage({ type: '', text: '' })}
          sx={{ mb: 2 }}
        >
          {message.text}
        </Alert>
      )}

      {pendingPlans.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No pending meal plans for approval
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Week Of</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Program</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingPlans.map((plan) => (
                <TableRow key={plan._id}>
                  <TableCell>{formatDate(plan.weekOf)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {plan.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={plan.program.toUpperCase()} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    {plan.createdBy?.firstName} {plan.createdBy?.lastName}
                  </TableCell>
                  <TableCell>{getStatusChip(plan.status)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => setViewDialog({ open: true, plan })}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        color="success"
                        startIcon={<Check />}
                        onClick={() => handleApprove(plan._id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<Close />}
                        onClick={() => setRejectDialog({ open: true, plan })}
                      >
                        Reject
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* View Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, plan: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>View Meal Plan</DialogTitle>
        <DialogContent>
          {viewDialog.plan && (
            <Box>
              <Typography variant="h6" gutterBottom>{viewDialog.plan.title}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Week of: {formatDate(viewDialog.plan.weekOf)} - {formatDate(viewDialog.plan.weekEnd)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Program: {viewDialog.plan.program}
              </Typography>
              {viewDialog.plan.description && (
                <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
                  {viewDialog.plan.description}
                </Typography>
              )}

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Weekly Menu</Typography>
              {viewDialog.plan.dailyMeals?.map((day, idx) => (
                <Card key={idx} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      {day.day.charAt(0).toUpperCase() + day.day.slice(1)}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Breakfast:</Typography>
                        <Typography variant="body2">{day.breakfast?.map(f => f.name).join(', ') || 'Not specified'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Morning Snack:</Typography>
                        <Typography variant="body2">{day.morningSnack?.map(f => f.name).join(', ') || 'Not specified'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Lunch:</Typography>
                        <Typography variant="body2">{day.lunch?.map(f => f.name).join(', ') || 'Not specified'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Afternoon Snack:</Typography>
                        <Typography variant="body2">{day.afternoonSnack?.map(f => f.name).join(', ') || 'Not specified'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Dinner:</Typography>
                        <Typography variant="body2">{day.dinner?.map(f => f.name).join(', ') || 'Not specified'}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, plan: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, plan: null })}
      >
        <DialogTitle>Reject Meal Plan</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, plan: null })}>Cancel</Button>
          <Button
            color="error"
            onClick={() => handleReject(rejectDialog.plan._id)}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MealPlanApprovals;
