import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Grid,
  InputAdornment,
  IconButton,
  MenuItem
} from '@mui/material';
import { Visibility, VisibilityOff, Person, Email, Lock, Phone, Event, Work, School, CloudUpload } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

// Parent registration styled to match the Child Admission form look
const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    // Parent / Staff basic details
    firstName: '',
    lastName: '',
    email: '',
    phone: '',

    // Staff-only details
    yearsOfExperience: '',
    qualification: '',
    certificateFile: null,

    // Child admission details (for parents)
    childName: '',
    childDob: '',
    medicalInfo: '',
    emergencyContactName: '',
    emergencyContactPhone: '',

    // Account
    password: '',
    confirmPassword: '',
    role: 'parent'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    // Staff-specific validations
    if (formData.role === 'staff') {
      if (!formData.yearsOfExperience) {
        setError('Years of Experience is required for staff');
        setLoading(false);
        return;
      }
      if (!formData.qualification) {
        setError('Qualification is required for staff');
        setLoading(false);
        return;
      }
      if (!formData.certificateFile) {
        setError('Certificate upload is required for staff');
        setLoading(false);
        return;
      }
      if (formData.certificateFile.size > 10 * 1024 * 1024) {
        setError('Certificate must be under 10MB');
        setLoading(false);
        return;
      }
    }

    // Build payload
    let payload;
    if (formData.role === 'staff' && formData.certificateFile) {
      // Use multipart for staff with certificate
      payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'certificateFile') {
          if (value) payload.append('certificate', value);
        } else if (key !== 'confirmPassword') {
          payload.append(key, value ?? '');
        }
      });
    } else {
      const { confirmPassword, certificateFile, ...rest } = formData;
      payload = rest;
    }

    const result = await register(payload);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.72), rgba(255,255,255,0.72)), url(/Landing_image.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <Container component="main" maxWidth="md" sx={{ px: { xs: 0, sm: 2 } }}>
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            width: '100%',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h5" sx={{ color: 'text.secondary', mb: 0.5 }}>
              {formData.role === 'staff' ? 'Staff Registration' : 'Admission Registration'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your registration will be reviewed by our admin team
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Grid container spacing={2}>
              {/* Role selector */}
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  name="role"
                  label="Registering As"
                  value={formData.role}
                  onChange={handleChange}
                  helperText="Choose your role"
                >
                  <MenuItem value="parent">Parent</MenuItem>
                  <MenuItem value="staff">Staff</MenuItem>
                  <MenuItem value="vendor">Vendor</MenuItem>
                </TextField>
              </Grid>

              {/* Details */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="firstName"
                  label={formData.role === 'staff' ? 'Full Name (First)' : 'Parent First Name'}
                  value={formData.firstName}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="lastName"
                  label={formData.role === 'staff' ? 'Full Name (Last)' : 'Parent Last Name'}
                  value={formData.lastName}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="email"
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="phone"
                  label="Phone Number"
                  value={formData.phone}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              {/* Staff-only fields */}
              {formData.role === 'staff' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      name="yearsOfExperience"
                      label="Years of Experience"
                      value={formData.yearsOfExperience}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Work />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      name="qualification"
                      label="Qualification"
                      placeholder="Early Childhood Education, Child Development, etc."
                      value={formData.qualification}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <School />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        color: 'text.secondary',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        id="certificateFile"
                        name="certificateFile"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="certificateFile" style={{ cursor: 'pointer' }}>
                        <CloudUpload style={{ verticalAlign: 'middle', marginRight: 8 }} />
                        {formData.certificateFile ? 'File selected: ' + formData.certificateFile.name : 'Click to upload certificate'}
                        <Typography variant="body2" color="text.secondary">PDF, JPG, PNG up to 10MB</Typography>
                      </label>
                    </Box>
                  </Grid>
                </>
              )}

              {/* Parent-only child details */}
              {formData.role !== 'staff' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      name="childName"
                      label="Child's Name"
                      value={formData.childName}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      name="childDob"
                      label="Child's Date of Birth"
                      type="date"
                      value={formData.childDob}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Event />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      name="medicalInfo"
                      label="Medical Information (allergies, medications, conditions)"
                      placeholder="Any allergies, medications, or medical conditions..."
                      value={formData.medicalInfo}
                      onChange={handleChange}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="emergencyContactName"
                      label="Emergency Contact Name (optional)"
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="emergencyContactPhone"
                      label="Emergency Contact Phone"
                      value={formData.emergencyContactPhone}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                </>
              )}

              {/* Account security */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: 2 }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  Already have an account? Sign In
                </Typography>
              </Link>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;