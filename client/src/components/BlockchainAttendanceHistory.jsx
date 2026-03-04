import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  GpsFixed,
  Photo,
  Fingerprint,
  VerifiedUser,
  Warning,
  Map,
  Info,
  Refresh
} from '@mui/icons-material';
import api from '../config/api';

/**
 * BlockchainAttendanceHistory Component
 * 
 * Displays immutable attendance records from blockchain with:
 * - GPS location verification
 * - Photo hash verification  
 * - Tamper detection
 * - Cryptographic proof
 */
const BlockchainAttendanceHistory = ({ entityType, entityId, entityName }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    if (entityType && entityId) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/blockchain/attendance/${entityType}/${entityId}`);
      if (response.data.success) {
        setRecords(response.data.records);
      }
    } catch (err) {
      console.error('Error loading blockchain history:', err);
      setError(err.response?.data?.error || 'Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  const verifyRecord = async (recordId) => {
    try {
      const response = await api.get(`/blockchain/attendance/verify/${recordId}`);
      setVerificationResult(response.data);
    } catch (err) {
      console.error('Error verifying record:', err);
      setVerificationResult({
        tampered: true,
        message: 'Verification failed'
      });
    }
  };

  const handleRecordClick = (record) => {
    setSelectedRecord(record);
    setVerificationResult(null);
    verifyRecord(record.id);
  };

  const handleCloseDialog = () => {
    setSelectedRecord(null);
    setVerificationResult(null);
  };

  const openMapLocation = (gpsLocation) => {
    if (!gpsLocation) return;
    const url = `https://www.openstreetmap.org/?mlat=${gpsLocation.latitude}&mlon=${gpsLocation.longitude}#map=18/${gpsLocation.latitude}/${gpsLocation.longitude}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button size="small" onClick={loadHistory} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (records.length === 0) {
    return (
      <Card sx={{ m: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            No blockchain attendance records found.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          🔒 Blockchain Attendance Records
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={loadHistory} size="small">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Alert severity="info" icon={<VerifiedUser />} sx={{ mb: 3 }}>
        <Typography variant="body2">
          These records are stored on a tamper-proof blockchain. They cannot be altered or deleted.
        </Typography>
      </Alert>

      <List sx={{ width: '100%' }}>
        {records.map((record, index) => (
          <React.Fragment key={record.id}>
            <Paper 
              elevation={2}
              sx={{ 
                mb: 2,
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': { 
                  boxShadow: 6,
                  transform: 'translateY(-2px)'
                }
              }}
              onClick={() => handleRecordClick(record)}
            >
              <ListItem
                alignItems="flex-start"
                sx={{ 
                  py: 2,
                  px: 3,
                  bgcolor: record.actionType === 'check-in' ? 'success.50' : 'error.50'
                }}
              >
                <ListItemIcon sx={{ minWidth: 56 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: record.actionType === 'check-in' ? 'success.main' : 'error.main',
                      color: 'white'
                    }}
                  >
                    {record.actionType === 'check-in' ? <CheckCircle /> : <Cancel />}
                  </Box>
                </ListItemIcon>

                <ListItemText
                  primaryTypographyProps={{ component: 'div' }}
                  secondaryTypographyProps={{ component: 'div' }}
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6" component="span">
                        {record.actionType === 'check-in' ? '📥 Check-In' : '📤 Check-Out'}
                      </Typography>
                      <Chip
                        size="small"
                        label={`Block #${record.blockNumber}`}
                        icon={<Fingerprint />}
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
                        {new Date(record.actionTime).toLocaleString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        {record.gpsLocation && (
                          <Chip
                            size="small"
                            icon={<GpsFixed />}
                            label="GPS Verified"
                            color="success"
                            variant="outlined"
                          />
                        )}
                        {record.photoHash && (
                          <Chip
                            size="small"
                            icon={<Photo />}
                            label="Photo Verified"
                            color="success"
                            variant="outlined"
                          />
                        )}
                        {record.verified && (
                          <Chip
                            size="small"
                            icon={<VerifiedUser />}
                            label="Verified"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          wordBreak: 'break-all'
                        }}
                      >
                        Hash: {record.hash?.substring(0, 24)}...
                      </Typography>

                      <Box sx={{ mt: 1 }}>
                        <Tooltip title="Click to view details">
                          <Chip
                            size="small"
                            icon={<Info />}
                            label="View Details"
                            clickable
                            sx={{ cursor: 'pointer' }}
                          />
                        </Tooltip>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            </Paper>
          </React.Fragment>
        ))}
      </List>

      {/* Detailed Record Dialog */}
      <Dialog
        open={!!selectedRecord}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedRecord && (
          <>
            <DialogTitle>
              {selectedRecord.actionType === 'check-in' ? '📥 Check-In' : '📤 Check-Out'} Details
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Blockchain Record #{selectedRecord.blockNumber}
              </Typography>
            </DialogTitle>

            <DialogContent>
              {/* Verification Status */}
              {verificationResult && (
                <Alert
                  severity={verificationResult.tampered ? 'error' : 'success'}
                  icon={verificationResult.tampered ? <Warning /> : <VerifiedUser />}
                  sx={{ mb: 3 }}
                >
                  <Typography variant="body2">
                    <strong>{verificationResult.message}</strong>
                  </Typography>
                  {verificationResult.tampered && verificationResult.storedHash && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                      Stored Hash: {verificationResult.storedHash}
                      <br />
                      Calculated Hash: {verificationResult.calculatedHash}
                    </Typography>
                  )}
                </Alert>
              )}

              <Grid container spacing={2}>
                {/* Basic Info */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Basic Information
                      </Typography>
                      <Typography variant="body2">
                        <strong>Action:</strong> {selectedRecord.actionType}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Time:</strong> {new Date(selectedRecord.actionTime).toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Performed By:</strong> {selectedRecord.performedBy?.name || 'Unknown'}
                      </Typography>
                      {selectedRecord.notes && (
                        <Typography variant="body2">
                          <strong>Notes:</strong> {selectedRecord.notes}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* GPS Location */}
                {selectedRecord.gpsLocation && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          <GpsFixed sx={{ verticalAlign: 'middle', mr: 1 }} />
                          GPS Location Proof
                        </Typography>
                        <Typography variant="body2">
                          <strong>Latitude:</strong> {selectedRecord.gpsLocation.latitude}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Longitude:</strong> {selectedRecord.gpsLocation.longitude}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Accuracy:</strong> ±{selectedRecord.gpsLocation.accuracy}m
                        </Typography>
                        {selectedRecord.gpsLocation.address && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {selectedRecord.gpsLocation.address}
                          </Typography>
                        )}
                        <Button
                          size="small"
                          startIcon={<Map />}
                          onClick={() => openMapLocation(selectedRecord.gpsLocation)}
                          sx={{ mt: 1 }}
                        >
                          View on Map
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Photo Hash */}
                {selectedRecord.photoHash && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          <Photo sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Photo Verification
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            wordBreak: 'break-all',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem'
                          }}
                        >
                          <strong>Hash:</strong> {selectedRecord.photoHash}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Taken:</strong> {new Date(selectedRecord.photoTimestamp).toLocaleString()}
                        </Typography>
                        <Chip
                          size="small"
                          icon={<VerifiedUser />}
                          label="Cryptographically Verified"
                          color="success"
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Blockchain Info */}
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        <Fingerprint sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Blockchain Information
                      </Typography>
                      <Typography variant="body2">
                        <strong>Block Number:</strong> #{selectedRecord.blockNumber}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          wordBreak: 'break-all',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem'
                        }}
                      >
                        <strong>Block Hash:</strong> {selectedRecord.hash}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Timestamp:</strong> {new Date(selectedRecord.timestamp).toLocaleString()}
                      </Typography>

                      <Alert severity="info" icon={<VerifiedUser />} sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          🔒 This record is immutable and cannot be altered or deleted.
                        </Typography>
                      </Alert>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Device Info */}
                {selectedRecord.deviceInfo && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Device & System Information
                        </Typography>
                        {selectedRecord.deviceInfo.userAgent && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {selectedRecord.deviceInfo.userAgent}
                          </Typography>
                        )}
                        {selectedRecord.deviceInfo.ipAddress && (
                          <Typography variant="caption" color="text.secondary">
                            IP: {selectedRecord.deviceInfo.ipAddress}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default BlockchainAttendanceHistory;
