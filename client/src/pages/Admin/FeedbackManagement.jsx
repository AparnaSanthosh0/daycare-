import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tab,
  Tabs,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Badge,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Feedback as FeedbackIcon,
  Reply,
  CheckCircle,
  Error as ErrorIcon,
  Info,
  MarkEmailRead,
  MarkEmailUnread,
  Refresh
} from '@mui/icons-material';
import api from '../../config/api';

const FeedbackManagement = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    high: 0,
    medium: 0,
    low: 0
  });

  useEffect(() => {
    fetchNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabValue]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filter = {};
      if (tabValue === 1) filter.read = 'false'; // Unread
      if (tabValue === 2) filter.read = 'true'; // Read
      if (tabValue === 3) filter.priority = 'high'; // High Priority
      
      const queryParams = new URLSearchParams(filter).toString();
      const response = await api.get(`/sentiment/notifications?${queryParams}`);
      
      if (response.data.success) {
        setNotifications(response.data.notifications);
        calculateStats(response.data.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load feedback notifications');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (notifs) => {
    const stats = {
      total: notifs.length,
      unread: notifs.filter(n => !n.read).length,
      high: notifs.filter(n => n.priority === 'high').length,
      medium: notifs.filter(n => n.priority === 'medium').length,
      low: notifs.filter(n => n.priority === 'low').length
    };
    setStats(stats);
  };

  const handleOpenResponse = (notification) => {
    setSelectedNotification(notification);
    setResponseText(notification.response || '');
    setResponseDialogOpen(true);
  };

  const handleCloseResponse = () => {
    setResponseDialogOpen(false);
    setSelectedNotification(null);
    setResponseText('');
  };

  const handleSendResponse = async () => {
    if (!responseText.trim()) {
      setError('Response cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const response = await api.post(`/sentiment/notifications/${selectedNotification._id}/respond`, {
        response: responseText
      });

      if (response.data.success) {
        setSuccess('Response sent successfully! Parent will see your reply.');
        handleCloseResponse();
        fetchNotifications(); // Refresh list
      }
    } catch (err) {
      console.error('Failed to send response:', err);
      setError(err.response?.data?.message || 'Failed to send response');
    } finally {
      setSubmitting(false);
    }
  };


  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'negative':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      case 'neutral':
        return <Info sx={{ color: 'info.main' }} />;
      default:
        return <Info sx={{ color: 'grey.500' }} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      meal: 'primary',
      activity: 'secondary',
      communication: 'info',
      staff: 'warning',
      facility: 'default',
      safety: 'error',
      general: 'default',
      feedback: 'success',
      complaint: 'error',
      suggestion: 'info'
    };
    return colors[category] || 'default';
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FeedbackIcon sx={{ fontSize: 40 }} />
            Feedback Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and respond to parent feedback and suggestions
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchNotifications}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Feedback
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Unread
              </Typography>
              <Typography variant="h4" color="primary">
                {stats.unread}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                High Priority
              </Typography>
              <Typography variant="h4" color="error">
                {stats.high}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Medium Priority
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.medium}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Low Priority
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.low}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} variant="scrollable">
          <Tab label="All Feedback" />
          <Tab 
            label={
              <Badge badgeContent={stats.unread} color="primary">
                Unread
              </Badge>
            } 
          />
          <Tab label="Read" />
          <Tab label="High Priority" />
        </Tabs>
      </Paper>

      {/* Feedback Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell>Status</TableCell>
              <TableCell>Parent</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No feedback found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((notification) => (
                <TableRow key={notification._id} hover sx={{ bgcolor: notification.read ? 'inherit' : 'action.hover' }}>
                  <TableCell>
                    <Tooltip title={notification.read ? 'Read' : 'Unread'}>
                      {notification.read ? (
                        <MarkEmailRead color="action" />
                      ) : (
                        <MarkEmailUnread color="primary" />
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={notification.read ? 'normal' : 'bold'}>
                      {notification.userName || 'Unknown'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notification.userId?.email || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={notification.category} 
                      size="small" 
                      color={getCategoryColor(notification.category)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {notification.subject}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                      {notification.message}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={notification.priority} 
                      size="small" 
                      color={getPriorityColor(notification.priority)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {new Date(notification.createdAt).toLocaleTimeString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title={notification.response ? 'View/Edit Response' : 'Send Response'}>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleOpenResponse(notification)}
                        >
                          <Reply />
                        </IconButton>
                      </Tooltip>
                      {notification.response && (
                        <Chip label="Responded" size="small" color="success" variant="outlined" />
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Response Dialog */}
      <Dialog 
        open={responseDialogOpen} 
        onClose={handleCloseResponse}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedNotification?.response ? 'View/Edit Response' : 'Send Response'}
        </DialogTitle>
        <DialogContent>
          {selectedNotification && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Parent: {selectedNotification.userName}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Category: {selectedNotification.category}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                {selectedNotification.subject}
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 3 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selectedNotification.message}
                </Typography>
              </Paper>
              {selectedNotification.feedbackId?.sentimentAnalysis && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                  <Chip 
                    icon={getSentimentIcon(selectedNotification.feedbackId.sentimentAnalysis.sentiment)}
                    label={`Sentiment: ${selectedNotification.feedbackId.sentimentAnalysis.sentiment}`}
                    size="small"
                  />
                  {selectedNotification.feedbackId.rating && (
                    <Chip 
                      label={`Rating: ${selectedNotification.feedbackId.rating}/5`}
                      size="small"
                      color="primary"
                    />
                  )}
                </Box>
              )}
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Your Response:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Type your response to the parent here..."
                variant="outlined"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResponse}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendResponse}
            variant="contained"
            disabled={submitting || !responseText.trim()}
            startIcon={submitting ? <CircularProgress size={16} /> : <Reply />}
          >
            {submitting ? 'Sending...' : 'Send Response'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FeedbackManagement;
