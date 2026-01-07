import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Chip,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Rating
} from '@mui/material';
import {
  Person,
  Event,
  Assessment
} from '@mui/icons-material';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const NannyServicesTab = () => {
  const { user } = useAuth();
  const [nannyTab, setNannyTab] = useState(0);
  const [nannies, setNannies] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedNanny, setSelectedNanny] = useState(null);
  const [bookingDialog, setBookingDialog] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    nannyId: '',
    childName: '',
    childAge: '',
    allergies: '',
    medicalInfo: '',
    serviceDate: '',
    startTime: '09:00',
    endTime: '17:00',
    hours: 8,
    parentInstructions: '',
    safetyGuidelines: '',
    emergencyContact: { name: '', phone: '', relationship: '' },
    parentAddress: user?.address || '',
    parentPhone: user?.phone || ''
  });
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: '' });

  useEffect(() => {
    fetchNannies();
    fetchBookings();
  }, []);

  const fetchNannies = async () => {
    try {
      console.log('🔍 Fetching nannies from API...');
      const response = await api.get('/api/nanny/nannies');
      console.log('✅ API Response:', response.data);
      console.log('📊 Number of nannies:', response.data?.length || 0);
      setNannies(response.data || []);
      if (response.data && response.data.length > 0) {
        console.log('👥 Nannies:', response.data.map(n => `${n.firstName} ${n.lastName}`));
      } else {
        console.warn('⚠️ No nannies returned from API');
      }
    } catch (error) {
      console.error('❌ Error fetching nannies:', error);
      console.error('Error details:', error.response?.data || error.message);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await api.get('/api/nanny/bookings/parent');
      setBookings(response.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleBookingSubmit = async () => {
    try {
      await api.post('/api/nanny/bookings', bookingForm);
      setBookingDialog(false);
      fetchBookings();
      setBookingForm({
        nannyId: '',
        childName: '',
        childAge: '',
        allergies: '',
        medicalInfo: '',
        serviceDate: '',
        startTime: '09:00',
        endTime: '17:00',
        hours: 8,
        parentInstructions: '',
        safetyGuidelines: '',
        emergencyContact: { name: '', phone: '', relationship: '' },
        parentAddress: user?.address || '',
        parentPhone: user?.phone || ''
      });
      alert('Booking request submitted successfully!');
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking');
    }
  };

  const handleReviewSubmit = async () => {
    try {
      await api.post(`/api/nanny/bookings/${selectedBooking._id}/review`, reviewForm);
      setReviewDialog(false);
      fetchBookings();
      setReviewForm({ rating: 5, review: '' });
      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review');
    }
  };

  const handleCancelBooking = async (bookingId, reason) => {
    try {
      await api.put(`/api/nanny/bookings/${bookingId}/cancel`, { reason });
      fetchBookings();
      alert('Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking');
    }
  };

  return (
    <Box>
      <Tabs value={nannyTab} onChange={(_, v) => setNannyTab(v)} sx={{ mb: 3 }}>
        <Tab label="Find Nanny" />
        <Tab label="My Bookings" />
        <Tab label="History" />
      </Tabs>

      {/* Tab 0: Find Nanny */}
      {nannyTab === 0 && (
        <Grid container spacing={3}>
          {nannies.map((nanny) => (
            <Grid item xs={12} sm={6} md={4} key={nanny._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ width: 60, height: 60, bgcolor: '#e91e63', mr: 2 }}>
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {nanny.firstName} {nanny.lastName}
                      </Typography>
                      <Chip label="Nanny" size="small" color="primary" />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Experience: {nanny.staff?.yearsOfExperience || 0} years
                  </Typography>
                  {nanny.staff?.qualification && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Qualification: {nanny.staff.qualification}
                    </Typography>
                  )}
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{ mt: 2, bgcolor: '#e91e63', '&:hover': { bgcolor: '#d81b60' } }}
                    onClick={() => {
                      setSelectedNanny(nanny);
                      setBookingForm({ ...bookingForm, nannyId: nanny._id });
                      setBookingDialog(true);
                    }}
                  >
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {nannies.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6">No nannies available</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  There are currently no approved nannies available.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Nannies must be approved by the admin before they can accept bookings.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Tab 1: My Bookings */}
      {nannyTab === 1 && (
        <Grid container spacing={3}>
          {bookings.filter(b => ['pending', 'accepted', 'in-progress'].includes(b.status)).map((booking) => (
            <Grid item xs={12} md={6} key={booking._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6">{booking.nannyName}</Typography>
                    <Chip
                      label={booking.status}
                      color={
                        booking.status === 'accepted' ? 'success' :
                        booking.status === 'pending' ? 'warning' :
                        booking.status === 'in-progress' ? 'info' : 'default'
                      }
                      size="small"
                    />
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" gutterBottom>
                    <strong>Child:</strong> {booking.child.name}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Date:</strong> {new Date(booking.serviceDate).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Time:</strong> {booking.startTime} - {booking.endTime}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Hours:</strong> {booking.hours} hrs
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Amount:</strong> ${booking.totalAmount}
                  </Typography>
                  {booking.status === 'in-progress' && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Service is currently in progress
                    </Alert>
                  )}
                  {booking.serviceNotes && booking.serviceNotes.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Latest Note: {booking.serviceNotes[booking.serviceNotes.length - 1].note}
                      </Typography>
                    </Box>
                  )}
                  {booking.status === 'pending' && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      sx={{ mt: 2 }}
                      onClick={() => handleCancelBooking(booking._id, 'Changed plans')}
                    >
                      Cancel Booking
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
          {bookings.filter(b => ['pending', 'accepted', 'in-progress'].includes(b.status)).length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6">No active bookings</Typography>
                <Typography variant="body2" color="text.secondary">
                  Book a nanny to see your bookings here
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Tab 2: History */}
      {nannyTab === 2 && (
        <Grid container spacing={3}>
          {bookings.filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status)).map((booking) => (
            <Grid item xs={12} md={6} key={booking._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6">{booking.nannyName}</Typography>
                    <Chip
                      label={booking.status}
                      color={
                        booking.status === 'completed' ? 'success' :
                        booking.status === 'cancelled' ? 'error' :
                        booking.status === 'rejected' ? 'error' : 'default'
                      }
                      size="small"
                    />
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" gutterBottom>
                    <strong>Child:</strong> {booking.child.name}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Date:</strong> {new Date(booking.serviceDate).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Amount:</strong> ${booking.totalAmount}
                  </Typography>
                  {booking.rating && (
                    <Box sx={{ mt: 2 }}>
                      <Rating value={booking.rating} readOnly size="small" />
                      {booking.review && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          {booking.review}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {booking.status === 'completed' && !booking.rating && (
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{ mt: 2, bgcolor: '#e91e63', '&:hover': { bgcolor: '#d81b60' } }}
                      onClick={() => {
                        setSelectedBooking(booking);
                        setReviewDialog(true);
                      }}
                    >
                      Write Review
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
          {bookings.filter(b => ['completed', 'cancelled', 'rejected'].includes(b.status)).length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6">No booking history</Typography>
                <Typography variant="body2" color="text.secondary">
                  Your completed bookings will appear here
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Booking Dialog */}
      <Dialog open={bookingDialog} onClose={() => setBookingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Book {selectedNanny?.firstName} {selectedNanny?.lastName}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Child Name"
                value={bookingForm.childName}
                onChange={(e) => setBookingForm({ ...bookingForm, childName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Child Age"
                type="number"
                value={bookingForm.childAge}
                onChange={(e) => setBookingForm({ ...bookingForm, childAge: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Allergies"
                value={bookingForm.allergies}
                onChange={(e) => setBookingForm({ ...bookingForm, allergies: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Medical Info"
                multiline
                rows={2}
                value={bookingForm.medicalInfo}
                onChange={(e) => setBookingForm({ ...bookingForm, medicalInfo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Service Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={bookingForm.serviceDate}
                onChange={(e) => setBookingForm({ ...bookingForm, serviceDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Start Time"
                type="time"
                value={bookingForm.startTime}
                onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="End Time"
                type="time"
                value={bookingForm.endTime}
                onChange={(e) => setBookingForm({ ...bookingForm, endTime: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Hours"
                type="number"
                value={bookingForm.hours}
                onChange={(e) => setBookingForm({ ...bookingForm, hours: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Special Instructions"
                multiline
                rows={3}
                value={bookingForm.parentInstructions}
                onChange={(e) => setBookingForm({ ...bookingForm, parentInstructions: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingDialog(false)}>Cancel</Button>
          <Button onClick={handleBookingSubmit} variant="contained" color="primary">
            Submit Booking
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Write Review</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>Rating</Typography>
            <Rating
              value={reviewForm.rating}
              onChange={(_, value) => setReviewForm({ ...reviewForm, rating: value })}
              size="large"
            />
            <TextField
              fullWidth
              label="Review"
              multiline
              rows={4}
              value={reviewForm.review}
              onChange={(e) => setReviewForm({ ...reviewForm, review: e.target.value })}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)}>Cancel</Button>
          <Button onClick={handleReviewSubmit} variant="contained" color="primary">
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NannyServicesTab;
