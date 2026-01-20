import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  InputAdornment
} from '@mui/material';
import {
  Assignment,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Cancel,
  Add,
  Delete,
  Info
} from '@mui/icons-material';
import api from '../../config/api';

const DoctorManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [licensePictureFile, setLicensePictureFile] = useState(null);
  const [licensePicturePreview, setLicensePicturePreview] = useState(null);
  
  // Doctor management states
  const [doctors, setDoctors] = useState([]);
  const [doctorDialog, setDoctorDialog] = useState({ open: false, doctor: null, mode: 'create' });
  const [doctorForm, setDoctorForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    licenseNumber: '',
    specialization: '',
    qualification: '',
    yearsOfExperience: '',
    password: '',
    // Legal & Licensing Requirements
    medicalLicenseNumber: '',
    licenseIssuingAuthority: '',
    licenseExpiryDate: '',
    professionalRegistrationNumber: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceExpiryDate: '',
    backgroundCheckDate: '',
    backgroundCheckStatus: 'pending',
    certifications: []
  });
  const [createdDoctorInfo, setCreatedDoctorInfo] = useState(null);
  const [assignChildrenDialog, setAssignChildrenDialog] = useState({ open: false, doctor: null, selectedChildIds: [] });
  const [viewDetailsDialog, setViewDetailsDialog] = useState({ open: false, doctor: null });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, doctor: null });
  const [allChildren, setAllChildren] = useState([]);

  // Fetch doctors
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/doctors');
      setDoctors(response.data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setError('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  // Fetch children for assignment
  const fetchChildren = async () => {
    try {
      const response = await api.get('/children');
      setAllChildren(response.data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchChildren();
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading doctors...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3, whiteSpace: 'pre-line' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Doctor Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setDoctorForm({
              firstName: '',
              lastName: '',
              email: '',
              username: '',
              phone: '',
              licenseNumber: '',
              specialization: '',
              qualification: '',
              yearsOfExperience: '',
              password: '',
              medicalLicenseNumber: '',
              licenseIssuingAuthority: '',
              licenseExpiryDate: '',
              professionalRegistrationNumber: '',
              insuranceProvider: '',
              insurancePolicyNumber: '',
              insuranceExpiryDate: '',
              backgroundCheckDate: '',
              backgroundCheckStatus: 'pending',
              certifications: []
            });
            setLicensePictureFile(null);
            setLicensePicturePreview(null);
            setCreatedDoctorInfo(null);
            setDoctorDialog({ open: true, doctor: null, mode: 'create' });
          }}
        >
          Add Doctor
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
              <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>License Number</TableCell>
              <TableCell>Specialization</TableCell>
              <TableCell>Assigned Children</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {doctors.map((doctor) => (
              <TableRow key={doctor._id}>
                <TableCell>
                  <Typography variant="body1" fontWeight="bold">
                    {doctor.firstName} {doctor.lastName}
                  </Typography>
                </TableCell>
                <TableCell>{doctor.username || 'N/A'}</TableCell>
                <TableCell>{doctor.email}</TableCell>
                <TableCell>{doctor.phone || 'N/A'}</TableCell>
                <TableCell>{doctor.doctor?.licenseNumber || 'N/A'}</TableCell>
                <TableCell>{doctor.doctor?.specialization || 'N/A'}</TableCell>
                <TableCell>
                  {doctor.doctor?.assignedChildren?.length > 0 ? (
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        {doctor.doctor.assignedChildren.length} children
                      </Typography>
                      {doctor.doctor.assignedChildren.slice(0, 3).map((child) => (
                        <Chip
                          key={child._id}
                          label={`${child.firstName} ${child.lastName}`}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                          color="primary"
                        />
                      ))}
                      {doctor.doctor.assignedChildren.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{doctor.doctor.assignedChildren.length - 3} more
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No assignments
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={doctor.isActive ? 'Active' : 'Inactive'}
                    color={doctor.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setViewDetailsDialog({ open: true, doctor });
                        }}
                      >
                        <Info />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Assign Children">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setAssignChildrenDialog({
                            open: true,
                            doctor,
                            selectedChildIds: doctor.doctor?.assignedChildren?.map(c => c._id || c) || []
                          });
                        }}
                      >
                        <Assignment />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setDoctorForm({
                            firstName: doctor.firstName,
                            lastName: doctor.lastName,
                            email: doctor.email,
                            username: doctor.username || '',
                            phone: doctor.phone || '',
                            licenseNumber: doctor.doctor?.licenseNumber || '',
                            specialization: doctor.doctor?.specialization || '',
                            qualification: doctor.doctor?.qualification || '',
                            yearsOfExperience: doctor.doctor?.yearsOfExperience || '',
                            password: '',
                            medicalLicenseNumber: doctor.doctor?.medicalLicenseNumber || '',
                            licenseIssuingAuthority: doctor.doctor?.licenseIssuingAuthority || '',
                            licenseExpiryDate: doctor.doctor?.licenseExpiryDate ? new Date(doctor.doctor.licenseExpiryDate).toISOString().split('T')[0] : '',
                            professionalRegistrationNumber: doctor.doctor?.professionalRegistrationNumber || '',
                            insuranceProvider: doctor.doctor?.insuranceProvider || '',
                            insurancePolicyNumber: doctor.doctor?.insurancePolicyNumber || '',
                            insuranceExpiryDate: doctor.doctor?.insuranceExpiryDate ? new Date(doctor.doctor.insuranceExpiryDate).toISOString().split('T')[0] : '',
                            backgroundCheckDate: doctor.doctor?.backgroundCheckDate ? new Date(doctor.doctor.backgroundCheckDate).toISOString().split('T')[0] : '',
                            backgroundCheckStatus: doctor.doctor?.backgroundCheckStatus || 'pending',
                            certifications: doctor.doctor?.certifications || []
                          });
                          setLicensePictureFile(null);
                          setLicensePicturePreview(null);
                          setDoctorDialog({ open: true, doctor, mode: 'edit' });
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={doctor.isActive ? 'Deactivate' : 'Activate'}>
                      <IconButton
                        size="small"
                        onClick={async () => {
                          try {
                            await api.put(`/api/admin/doctors/${doctor._id}/toggle-status`);
                            setSuccess('Doctor status updated successfully');
                            fetchDoctors();
                          } catch (error) {
                            setError('Failed to update doctor status');
                          }
                        }}
                      >
                        {doctor.isActive ? <Cancel /> : <CheckCircle />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setDeleteConfirmDialog({ open: true, doctor });
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
                    {doctors.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center">
                          <Typography color="text.secondary">No doctors found</Typography>
                        </TableCell>
                      </TableRow>
                    )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Doctor Dialog */}
      <Dialog
        open={doctorDialog.open}
        onClose={() => {
          setDoctorDialog({ open: false, doctor: null, mode: 'create' });
          setLicensePictureFile(null);
          setLicensePicturePreview(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {doctorDialog.mode === 'create' ? 'Add New Doctor' : 'Edit Doctor'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={doctorForm.firstName}
                  onChange={(e) => setDoctorForm({ ...doctorForm, firstName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={doctorForm.lastName}
                  onChange={(e) => setDoctorForm({ ...doctorForm, lastName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={doctorForm.email}
                  onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username (auto-generated if empty)"
                  value={doctorForm.username}
                  onChange={(e) => setDoctorForm({ ...doctorForm, username: e.target.value })}
                  helperText="Leave empty to auto-generate"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={doctorForm.phone}
                  onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="License Number"
                  value={doctorForm.licenseNumber}
                  onChange={(e) => setDoctorForm({ ...doctorForm, licenseNumber: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mb: 1 }}>Medical License Certificate Photo (Required)</Typography>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="license-picture-upload"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Validate file type
                      if (!file.type.startsWith('image/')) {
                        setError('Please upload an image file (JPG, PNG, etc.)');
                        return;
                      }
                      // Validate file size (10MB max)
                      if (file.size > 10 * 1024 * 1024) {
                        setError('Image file size must be less than 10MB');
                        return;
                      }
                      setLicensePictureFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setLicensePicturePreview(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label htmlFor="license-picture-upload">
                  <Button variant="outlined" component="span" fullWidth>
                    {licensePictureFile ? 'Change Certificate Photo' : 'Upload Certificate Photo'}
                  </Button>
                </label>
                {licensePicturePreview && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <img
                      src={licensePicturePreview}
                      alt="Certificate preview"
                      style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }}
                    />
                  </Box>
                )}
                {doctorDialog.mode === 'edit' && doctorDialog.doctor?.doctor?.licensePicture && !licensePicturePreview && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Current Certificate Photo:
                    </Typography>
                    <img
                      src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${doctorDialog.doctor.doctor.licensePicture}`}
                      alt="Current certificate"
                      style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </Box>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Specialization"
                  value={doctorForm.specialization}
                  onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Qualification"
                  value={doctorForm.qualification}
                  onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Years of Experience"
                  type="number"
                  value={doctorForm.yearsOfExperience}
                  onChange={(e) => setDoctorForm({ ...doctorForm, yearsOfExperience: e.target.value })}
                />
              </Grid>
              {doctorDialog.mode === 'create' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Password (optional - auto-generated if empty)"
                    type={showPassword ? 'text' : 'password'}
                    value={doctorForm.password}
                    onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                    helperText="Leave empty to auto-generate a secure password. Password will be sent to doctor's email."
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              )}
              
              {/* Legal & Licensing Requirements Section */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Legal & Licensing Requirements</Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Medical License Number"
                  value={doctorForm.medicalLicenseNumber}
                  onChange={(e) => setDoctorForm({ ...doctorForm, medicalLicenseNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="License Issuing Authority"
                  value={doctorForm.licenseIssuingAuthority}
                  onChange={(e) => setDoctorForm({ ...doctorForm, licenseIssuingAuthority: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="License Expiry Date"
                  type="date"
                  value={doctorForm.licenseExpiryDate}
                  onChange={(e) => setDoctorForm({ ...doctorForm, licenseExpiryDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Professional Registration Number"
                  value={doctorForm.professionalRegistrationNumber}
                  onChange={(e) => setDoctorForm({ ...doctorForm, professionalRegistrationNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Insurance Provider"
                  value={doctorForm.insuranceProvider}
                  onChange={(e) => setDoctorForm({ ...doctorForm, insuranceProvider: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Insurance Policy Number"
                  value={doctorForm.insurancePolicyNumber}
                  onChange={(e) => setDoctorForm({ ...doctorForm, insurancePolicyNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Insurance Expiry Date"
                  type="date"
                  value={doctorForm.insuranceExpiryDate}
                  onChange={(e) => setDoctorForm({ ...doctorForm, insuranceExpiryDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Background Check Date"
                  type="date"
                  value={doctorForm.backgroundCheckDate}
                  onChange={(e) => setDoctorForm({ ...doctorForm, backgroundCheckDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Background Check Status</InputLabel>
                  <Select
                    value={doctorForm.backgroundCheckStatus}
                    onChange={(e) => setDoctorForm({ ...doctorForm, backgroundCheckStatus: e.target.value })}
                    label="Background Check Status"
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDoctorDialog({ open: false, doctor: null, mode: 'create' })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                // Validate certificate photo for new doctors
                if (doctorDialog.mode === 'create' && !licensePictureFile) {
                  setError('Please upload a medical license certificate photo before creating the doctor account');
                  return;
                }

                // Create FormData for file upload
                const formData = new FormData();
                // Required fields that must always be sent
                const requiredFields = ['firstName', 'lastName', 'email', 'licenseNumber'];
                // Fields to exclude from the loop (handled separately)
                const excludedFields = ['username', 'password', 'certifications'];
                
                Object.keys(doctorForm).forEach(key => {
                  // Skip excluded fields - they're handled separately
                  if (excludedFields.includes(key)) return;
                  
                  const value = doctorForm[key];
                  // Always send required fields, even if empty (server will validate)
                  if (requiredFields.includes(key)) {
                    formData.append(key, value || '');
                  } else if (value !== '' && value !== null && value !== undefined) {
                    formData.append(key, value);
                  }
                });

                // Handle certifications separately
                if (doctorForm.certifications && Array.isArray(doctorForm.certifications) && doctorForm.certifications.length > 0) {
                  formData.append('certifications', JSON.stringify(doctorForm.certifications));
                }

                // Handle license picture
                if (licensePictureFile) {
                  formData.append('licensePicture', licensePictureFile);
                }

                // Handle username and password for create mode only
                if (doctorDialog.mode === 'create') {
                  if (doctorForm.password && doctorForm.password.trim() !== '') {
                    formData.append('password', doctorForm.password);
                  }
                  // Username is optional - server will auto-generate if not provided
                  if (doctorForm.username && doctorForm.username.trim() !== '') {
                    formData.append('username', doctorForm.username);
                  }
                  
                  const response = await api.post('/admin/doctors', formData);
                  setSuccess('Doctor created successfully. Credentials have been sent to the doctor\'s email.');
                  // Show username and password
                  if (response.data.username && response.data.tempPassword) {
                    setCreatedDoctorInfo({
                      username: response.data.username,
                      password: response.data.tempPassword
                    });
                  }
                } else {
                  // For update, don't send password
                  formData.delete('password');
                  await api.put(`/api/admin/doctors/${doctorDialog.doctor._id}`, formData);
                  setSuccess('Doctor updated successfully');
                }
                setLicensePictureFile(null);
                setLicensePicturePreview(null);
                setDoctorDialog({ open: false, doctor: null, mode: 'create' });
                fetchDoctors();
              } catch (error) {
                console.error('Doctor creation error:', error.response?.data);
                console.error('Full error:', error);
                let errorMessage = 'Failed to save doctor';
                if (error.response?.data) {
                  if (error.response.data.errors && error.response.data.errors.length > 0) {
                    const errorDetails = error.response.data.errors.map(e => {
                      const field = e.param || e.path || 'field';
                      const msg = e.msg || e.message || 'Invalid value';
                      // Make field names more readable
                      const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
                      return `${fieldName}: ${msg}`;
                    });
                    errorMessage = errorDetails.join('\n');
                    console.error('Validation errors:', errorDetails);
                  } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                  }
                } else if (error.message) {
                  errorMessage = error.message;
                }
                setError(errorMessage);
              }
            }}
          >
            {doctorDialog.mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Children to Doctor Dialog */}
      <Dialog
        open={assignChildrenDialog.open}
        onClose={() => setAssignChildrenDialog({ open: false, doctor: null, selectedChildIds: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Children to Doctor</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select children to assign to Dr. {assignChildrenDialog.doctor?.firstName} {assignChildrenDialog.doctor?.lastName}
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Select Children</InputLabel>
              <Select
                multiple
                value={assignChildrenDialog.selectedChildIds}
                onChange={(e) => setAssignChildrenDialog({
                  ...assignChildrenDialog,
                  selectedChildIds: e.target.value
                })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((childId) => {
                      const child = allChildren.find(c => c._id === childId);
                      return child ? (
                        <Chip key={childId} label={`${child.firstName} ${child.lastName}`} size="small" />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {allChildren.map((child) => (
                  <MenuItem key={child._id} value={child._id}>
                    {child.firstName} {child.lastName} - {child.program}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignChildrenDialog({ open: false, doctor: null, selectedChildIds: [] })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                await api.put(`/api/admin/doctors/${assignChildrenDialog.doctor._id}/assign-children`, {
                  childIds: assignChildrenDialog.selectedChildIds
                });
                setSuccess('Children assigned successfully');
                setAssignChildrenDialog({ open: false, doctor: null, selectedChildIds: [] });
                fetchDoctors();
              } catch (error) {
                setError(error.response?.data?.message || 'Failed to assign children');
              }
            }}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Created Doctor Info Dialog - Shows username and password */}
      <Dialog
        open={!!createdDoctorInfo}
        onClose={() => setCreatedDoctorInfo(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Doctor Account Created Successfully</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Doctor account has been created. Credentials have been sent to the doctor's email. You can also view them here:
          </Alert>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  value={createdDoctorInfo?.username || ''}
                  InputProps={{ readOnly: true }}
                  helperText="Doctor can use this username to login"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Auto-Generated Password"
                  value={createdDoctorInfo?.password || ''}
                  InputProps={{ readOnly: true }}
                  helperText="Please share this password with the doctor securely"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatedDoctorInfo(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Doctor Details Dialog */}
      <Dialog
        open={viewDetailsDialog.open}
        onClose={() => setViewDetailsDialog({ open: false, doctor: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Doctor Details - {viewDetailsDialog.doctor?.firstName} {viewDetailsDialog.doctor?.lastName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Username</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.username || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.email}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.phone || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">License Number</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.doctor?.licenseNumber || 'N/A'}</Typography>
              </Grid>
              {viewDetailsDialog.doctor?.doctor?.licensePicture && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Medical License Certificate Photo</Typography>
                  <Box sx={{ mt: 1 }}>
                    <img
                      src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${viewDetailsDialog.doctor.doctor.licensePicture}`}
                      alt="Medical License Certificate"
                      style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', border: '1px solid #ddd' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <Typography variant="caption" color="error" sx={{ display: 'none' }}>
                      Failed to load certificate photo
                    </Typography>
                  </Box>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Specialization</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.doctor?.specialization || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Qualification</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.doctor?.qualification || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Years of Experience</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.doctor?.yearsOfExperience || 0} years</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>Legal & Licensing Requirements</Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Medical License Number</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.doctor?.medicalLicenseNumber || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">License Issuing Authority</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.doctor?.licenseIssuingAuthority || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">License Expiry Date</Typography>
                <Typography variant="body1" gutterBottom>
                  {viewDetailsDialog.doctor?.doctor?.licenseExpiryDate 
                    ? new Date(viewDetailsDialog.doctor.doctor.licenseExpiryDate).toLocaleDateString() 
                    : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Professional Registration Number</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.doctor?.professionalRegistrationNumber || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Insurance Provider</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.doctor?.insuranceProvider || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Insurance Policy Number</Typography>
                <Typography variant="body1" gutterBottom>{viewDetailsDialog.doctor?.doctor?.insurancePolicyNumber || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Insurance Expiry Date</Typography>
                <Typography variant="body1" gutterBottom>
                  {viewDetailsDialog.doctor?.doctor?.insuranceExpiryDate 
                    ? new Date(viewDetailsDialog.doctor.doctor.insuranceExpiryDate).toLocaleDateString() 
                    : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Background Check Date</Typography>
                <Typography variant="body1" gutterBottom>
                  {viewDetailsDialog.doctor?.doctor?.backgroundCheckDate 
                    ? new Date(viewDetailsDialog.doctor.doctor.backgroundCheckDate).toLocaleDateString() 
                    : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Background Check Status</Typography>
                <Chip 
                  label={viewDetailsDialog.doctor?.doctor?.backgroundCheckStatus || 'pending'} 
                  color={
                    viewDetailsDialog.doctor?.doctor?.backgroundCheckStatus === 'approved' ? 'success' :
                    viewDetailsDialog.doctor?.doctor?.backgroundCheckStatus === 'rejected' ? 'error' : 'warning'
                  }
                  size="small"
                />
              </Grid>
              {viewDetailsDialog.doctor?.doctor?.certifications?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Certifications</Typography>
                  {viewDetailsDialog.doctor.doctor.certifications.map((cert, index) => (
                    <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="body2"><strong>{cert.name}</strong></Typography>
                      <Typography variant="caption">Issued by: {cert.issuingOrganization}</Typography>
                      {cert.expiryDate && (
                        <Typography variant="caption" display="block">
                          Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDetailsDialog({ open: false, doctor: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={() => setDeleteConfirmDialog({ open: false, doctor: null })}
      >
        <DialogTitle>Delete Doctor</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete Dr. {deleteConfirmDialog.doctor?.firstName} {deleteConfirmDialog.doctor?.lastName}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog({ open: false, doctor: null })}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              try {
                await api.delete(`/api/admin/doctors/${deleteConfirmDialog.doctor._id}`);
                setSuccess('Doctor deleted successfully');
                setDeleteConfirmDialog({ open: false, doctor: null });
                fetchDoctors();
              } catch (error) {
                setError(error.response?.data?.message || 'Failed to delete doctor');
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DoctorManagement;

