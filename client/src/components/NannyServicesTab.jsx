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
  Rating,
  FormControl,
  InputLabel,
  Select,
  MenuItem
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
  const [paymentConfirmDialog, setPaymentConfirmDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentConfirmForm, setPaymentConfirmForm] = useState({ rating: 5, feedback: '', issues: '' });
  const [bookingForm, setBookingForm] = useState({
    nannyId: '',
    childName: '',
    childAge: '',
    specialNeeds: '',
    allergies: '',
    medicalInfo: '',
    serviceDate: '',
    startTime: '09:00',
    endTime: '17:00',
    hours: 8,
    parentInstructions: '',
    safetyGuidelines: '',
    emergencyContact: { name: '', phone: '', relationship: '' },
    parentAddress: user?.address ? `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.zipCode || ''}`.trim() : '',
    parentPhone: user?.phone || '',
    serviceType: 'regular-care',
    serviceCategory: '',
    subscriptionPlan: null
  });
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: '' });

  useEffect(() => {
    fetchNannies();
    fetchBookings();
  }, []);

  const fetchNannies = async () => {
    try {
      console.log('🔍 Fetching nannies from API...');
      const response = await api.get('/nanny/nannies');
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
      const response = await api.get('/nanny/bookings/parent');
      setBookings(response.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleBookingSubmit = async () => {
    try {
      // Validation
      if (!bookingForm.childName || !bookingForm.serviceDate || !bookingForm.startTime || !bookingForm.endTime) {
        alert('Please fill in all required fields: Child Name, Service Date, Start Time, and End Time');
        return;
      }
      
      if (!bookingForm.parentAddress) {
        alert('Please enter the service address where the nanny will come');
        return;
      }
      
      if (!bookingForm.parentPhone) {
        alert('Please enter your contact phone number');
        return;
      }
      
      if (!bookingForm.hours || bookingForm.hours <= 0) {
        alert('Please enter valid hours');
        return;
      }

      console.log('📤 Submitting booking:', bookingForm);
      const response = await api.post('/nanny/bookings', bookingForm);
      console.log('✅ Booking created:', response.data);
      
      setBookingDialog(false);
      fetchBookings();
      setBookingForm({
        nannyId: '',
        childName: '',
        childAge: '',
        specialNeeds: '',
        allergies: '',
        medicalInfo: '',
        serviceDate: '',
        startTime: '09:00',
        endTime: '17:00',
        hours: 8,
        parentInstructions: '',
        safetyGuidelines: '',
        emergencyContact: { name: '', phone: '', relationship: '' },
        parentAddress: user?.address ? `${user.address.street || ''}, ${user.address.city || ''}, ${user.address.state || ''} ${user.address.zipCode || ''}`.trim() : '',
        parentPhone: user?.phone || '',
        serviceType: 'regular-care',
        serviceCategory: '',
        subscriptionPlan: null
      });
      alert('Booking request submitted successfully!');
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.message || 'Failed to create booking. Please try again.');
    }
  };

  const handleReviewSubmit = async () => {
    try {
      await api.post(`/nanny/bookings/${selectedBooking._id}/review`, reviewForm);
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
      await api.put(`/nanny/bookings/${bookingId}/cancel`, { reason: reason || 'Cancelled by parent' });
      fetchBookings();
      alert('Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(error.response?.data?.message || 'Failed to cancel booking');
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
        <Box>
          {/* In Progress Bookings */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#1abc9c' }}>
            In Progress Services
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {bookings.filter(b => b.status === 'in-progress').map((booking) => (
              <Grid item xs={12} md={6} key={booking._id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography variant="h6">{booking.nannyName}</Typography>
                      <Chip
                        label="In Progress"
                        color="info"
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
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Service is currently in progress
                    </Alert>
                    {booking.serviceNotes && booking.serviceNotes.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Latest Note: {booking.serviceNotes[booking.serviceNotes.length - 1].note}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {bookings.filter(b => b.status === 'in-progress').length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                  <Typography variant="body2" color="text.secondary">
                    No services in progress
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* Active Bookings (Pending, Approved, Accepted) */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#1abc9c' }}>
            Active Bookings
          </Typography>
          <Grid container spacing={3}>
            {bookings.filter(b => ['pending', 'admin-approved', 'accepted'].includes(b.status)).map((booking) => (
            <Grid item xs={12} md={6} key={booking._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6">{booking.nannyName}</Typography>
                    <Chip
                      label={booking.status === 'admin-approved' ? 'Approved' : booking.status === 'pending' ? 'Pending' : booking.status}
                      color={
                        booking.status === 'accepted' ? 'success' :
                        booking.status === 'admin-approved' ? 'info' :
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
                  {booking.serviceNotes && booking.serviceNotes.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Latest Note: {booking.serviceNotes[booking.serviceNotes.length - 1].note}
                      </Typography>
                    </Box>
                  )}
                  {(booking.status === 'pending' || booking.status === 'admin-approved' || booking.status === 'accepted') && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      sx={{ mt: 2 }}
                      onClick={() => {
                        const reason =
                          prompt('Please provide a reason for cancellation (optional):') || 'Cancelled by parent';
                        if (reason !== null) {
                          handleCancelBooking(booking._id, reason);
                        }
                      }}
                    >
                      Cancel Booking
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
            {bookings.filter(b => ['pending', 'admin-approved', 'accepted'].includes(b.status)).length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                  <Typography variant="body2" color="text.secondary">
                    No active bookings
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Tab 2: History */}
      {nannyTab === 2 && (
        <Box>
          {/* Completed Services */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#1abc9c' }}>
            Completed Services
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {bookings.filter(b => b.status === 'completed').map((booking) => (
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
                  {booking.status === 'completed' && booking.payment?.status === 'payment_held' && (
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{ mt: 2, bgcolor: '#1abc9c', '&:hover': { bgcolor: '#169b83' } }}
                      onClick={() => {
                        setSelectedBooking(booking);
                        setPaymentConfirmForm({ rating: booking.rating || 5, feedback: booking.review || '', issues: '' });
                        setPaymentConfirmDialog(true);
                      }}
                    >
                      Confirm Payment & Rate Service
                    </Button>
                  )}
                  {booking.status === 'completed' && booking.payment?.status !== 'payment_held' && !booking.rating && booking.payment?.status === 'parent_confirmed' && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Payment confirmed. Waiting for admin approval.
                    </Alert>
                  )}
                  {booking.status === 'completed' && booking.payment?.status === 'paid_to_nanny' && !booking.rating && (
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
          {bookings.filter(b => b.status === 'completed').length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                <Typography variant="body2" color="text.secondary">
                  No completed services yet
                </Typography>
              </Paper>
            </Grid>
          )}
          </Grid>

          {/* Cancelled/Rejected Services */}
          <Typography variant="h6" sx={{ mb: 2, mt: 4, fontWeight: 'bold', color: '#e91e63' }}>
            Cancelled & Rejected Services
          </Typography>
          <Grid container spacing={3}>
            {bookings.filter(b => ['cancelled', 'rejected'].includes(b.status)).map((booking) => (
              <Grid item xs={12} md={6} key={booking._id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography variant="h6">{booking.nannyName}</Typography>
                      <Chip
                        label={booking.status === 'cancelled' ? 'Cancelled' : 'Rejected'}
                        color="error"
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
                    {booking.cancellationReason && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        <strong>Reason:</strong> {booking.cancellationReason}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {bookings.filter(b => ['cancelled', 'rejected'].includes(b.status)).length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                  <Typography variant="body2" color="text.secondary">
                    No cancelled or rejected bookings
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Booking Dialog */}
      <Dialog 
        open={bookingDialog} 
        onClose={() => setBookingDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
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
                label="Special Needs"
                value={bookingForm.specialNeeds}
                onChange={(e) => setBookingForm({ ...bookingForm, specialNeeds: e.target.value })}
                placeholder="Any special care requirements"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Allergies"
                value={bookingForm.allergies}
                onChange={(e) => setBookingForm({ ...bookingForm, allergies: e.target.value })}
                placeholder="Food allergies, medication allergies, etc."
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
              <FormControl fullWidth>
                <InputLabel>Service Type</InputLabel>
                <Select
                  value={bookingForm.serviceType}
                  label="Service Type"
                  onChange={(e) => {
                    console.log('Service type selected:', e.target.value);
                    setBookingForm({ ...bookingForm, serviceType: e.target.value, serviceCategory: '' });
                  }}
                >
                  <MenuItem value="regular-care">Regular Care Services (Daily/Weekly/Monthly)</MenuItem>
                  <MenuItem value="educational">Educational & Development Support</MenuItem>
                  <MenuItem value="health-safety">Health & Safety Support</MenuItem>
                  <MenuItem value="short-term">Short-Term / On-Demand Services</MenuItem>
                  <MenuItem value="after-school">After-School Services</MenuItem>
                  <MenuItem value="subscription">Subscription-Based Plans</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {bookingForm.serviceType && (
              <Grid item xs={12}>
                {/* Use native select to avoid any MUI portal/z-index issues */}
                <FormControl fullWidth>
                  <InputLabel shrink>Service Category</InputLabel>
                  <Select
                    native
                    value={bookingForm.serviceCategory || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBookingForm(prev => ({ ...prev, serviceCategory: val }));
                    }}
                  >
                    <option value="">Select a category...</option>
                    {bookingForm.serviceType === 'regular-care' && (
                      <>
                        <option value="full-day-care">Full-day child care at home</option>
                        <option value="part-time-supervision">Part-time child supervision</option>
                        <option value="feeding-meal-assistance">Feeding and meal assistance</option>
                        <option value="bathing-hygiene">Bathing and hygiene care</option>
                        <option value="sleep-routine">Sleep routine management</option>
                        <option value="playtime-engagement">Playtime and engagement</option>
                      </>
                    )}
                    {bookingForm.serviceType === 'educational' && (
                      <>
                        <option value="homework-assistance">Homework assistance</option>
                        <option value="reading-storytelling">Reading and storytelling</option>
                        <option value="activity-learning">Activity-based learning</option>
                        <option value="language-practice">Language practice</option>
                        <option value="motor-skills">Motor skill activities</option>
                      </>
                    )}
                    {bookingForm.serviceType === 'health-safety' && (
                      <>
                        <option value="first-aid">Basic first-aid assistance</option>
                        <option value="medication-reminders">Medication reminders</option>
                        <option value="health-monitoring">Monitoring child health conditions</option>
                        <option value="emergency-support">Emergency support coordination</option>
                      </>
                    )}
                    {bookingForm.serviceType === 'short-term' && (
                      <>
                        <option value="babysitting-hours">Babysitting for a few hours</option>
                        <option value="emergency-care">Emergency care</option>
                        <option value="weekend-care">Weekend care</option>
                        <option value="holiday-care">Holiday care</option>
                      </>
                    )}
                    {bookingForm.serviceType === 'after-school' && (
                      <>
                        <option value="school-pickup">School pickup support</option>
                        <option value="homework-supervision">Homework supervision</option>
                        <option value="evening-care">Evening care until parents return</option>
                      </>
                    )}
                    {bookingForm.serviceType === 'subscription' && (
                      <>
                        <option value="weekly-plan">Weekly Plan</option>
                        <option value="monthly-plan">Monthly Plan</option>
                        <option value="custom-plan">Custom Plan</option>
                      </>
                    )}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {bookingForm.serviceType === 'subscription' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Fixed Hours per Week"
                    type="number"
                    value={bookingForm.subscriptionPlan?.fixedHours || ''}
                    onChange={(e) => setBookingForm({
                      ...bookingForm,
                      subscriptionPlan: {
                        ...bookingForm.subscriptionPlan,
                        planType: bookingForm.serviceCategory === 'weekly-plan' ? 'weekly' : bookingForm.serviceCategory === 'monthly-plan' ? 'monthly' : 'custom',
                        fixedHours: parseInt(e.target.value) || 0
                      }
                    })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Discount %"
                    type="number"
                    value={bookingForm.subscriptionPlan?.discountPercentage || 0}
                    onChange={(e) => setBookingForm({
                      ...bookingForm,
                      subscriptionPlan: {
                        ...bookingForm.subscriptionPlan,
                        discountPercentage: parseFloat(e.target.value) || 0
                      }
                    })}
                  />
                </Grid>
              </>
            )}
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
                label="Service Address *"
                placeholder="Enter your home address where service will be provided"
                value={bookingForm.parentAddress}
                onChange={(e) => setBookingForm({ ...bookingForm, parentAddress: e.target.value })}
                required
                helperText="This is where the nanny will come to provide service"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contact Phone *"
                placeholder="Your phone number"
                value={bookingForm.parentPhone}
                onChange={(e) => setBookingForm({ ...bookingForm, parentPhone: e.target.value })}
                required
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

      {/* Payment Confirmation Dialog */}
      <Dialog open={paymentConfirmDialog} onClose={() => setPaymentConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Service Completion & Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Please confirm that the service was completed satisfactorily. Your payment will be held by the platform until admin approval.
            </Alert>
            <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>Rate the Service</Typography>
            <Rating
              value={paymentConfirmForm.rating}
              onChange={(_, value) => setPaymentConfirmForm({ ...paymentConfirmForm, rating: value })}
              size="large"
            />
            <TextField
              fullWidth
              label="Feedback (Optional)"
              multiline
              rows={3}
              value={paymentConfirmForm.feedback}
              onChange={(e) => setPaymentConfirmForm({ ...paymentConfirmForm, feedback: e.target.value })}
              sx={{ mt: 2 }}
              placeholder="How was the service? Any comments?"
            />
            <TextField
              fullWidth
              label="Issues or Complaints (Optional)"
              multiline
              rows={2}
              value={paymentConfirmForm.issues}
              onChange={(e) => setPaymentConfirmForm({ ...paymentConfirmForm, issues: e.target.value })}
              sx={{ mt: 2 }}
              placeholder="Report any issues or concerns..."
            />
            {selectedBooking && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2"><strong>Total Amount:</strong> ${selectedBooking.totalAmount}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Platform Commission: ${selectedBooking.payment?.commissionAmount || 0} ({selectedBooking.payment?.commissionRate || 10}%)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Nanny Payout: ${selectedBooking.payment?.nannyPayoutAmount || 0}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentConfirmDialog(false)}>Cancel</Button>
          <Button 
            onClick={async () => {
              try {
                await api.post(`/nanny/bookings/${selectedBooking._id}/confirm-payment`, paymentConfirmForm);
                setPaymentConfirmDialog(false);
                fetchBookings();
                alert('Payment confirmed! Admin will review and approve the payout.');
              } catch (error) {
                console.error('Error confirming payment:', error);
                alert(error.response?.data?.message || 'Failed to confirm payment');
              }
            }} 
            variant="contained" 
            sx={{ bgcolor: '#1abc9c', '&:hover': { bgcolor: '#169b83' } }}
          >
            Confirm Payment
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
