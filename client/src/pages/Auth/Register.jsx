/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { prefillWithGoogle } from '../../utils/googlePrefill';

// Parent registration styled to match the Child Admission form look
const Register = ({ fixedRole, fixedStaffType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  
  const initialRole = (() => {
    // Fixed role via route prop overrides everything
    // Then location.state.preselectRole if provided
    // Default to 'parent'
    // eslint-disable-next-line no-undef
    if (typeof fixedRole !== 'undefined' && fixedRole) return fixedRole;
    const st = location?.state;
    if (st && st.preselectRole === 'staff') return 'staff';
    if (st && st.preselectRole === 'parent') return 'parent';
    return 'parent';
  })();

  // Check if coming from twins registration
  const isTwinsRegistration = location?.pathname === '/register/twins' || location?.state?.isTwins === true;

  const initialStaffType = (() => {
    // Fixed staffType via route prop or location state
    if (typeof fixedStaffType !== 'undefined' && fixedStaffType) return fixedStaffType;
    const st = location?.state;
    if (st && st.staffType) return st.staffType;
    return 'teacher';
  })();

  const [formData, setFormData] = useState({
    // Parent / Staff basic details
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    username: '',

    // Staff-only details
    staffType: initialStaffType,
    yearsOfExperience: '',
    qualification: '',
    certificateFile: null,
    // Driver-specific
    licenseNumber: '',
    vehicleType: '',
    // Delivery-specific
    deliveryArea: '',
    // Nanny-specific
    serviceArea: '',
    availability: '',

    // Child admission details (for parents)
    hasMultipleChildren: isTwinsRegistration,
    numberOfChildren: isTwinsRegistration ? 2 : 1,
    childName: '',
    childDob: '',
    childGender: 'male',
    program: 'preschool',
    medicalInfo: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    // Additional children details (for twins, triplets, etc.)
    additionalChildren: [],

    // Account
    password: '',
    confirmPassword: '',
    role: initialRole, 

    // Email preference
    notifyByEmail: false
  });
  const [parentName, setParentName] = useState('');
  const [phoneCode, setPhoneCode] = useState('+91');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
    if (error) setError('');
  };

  const handleParentNameChange = (value) => {
    setParentName(value);
    const parts = value.trim().split(' ');
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ') || 'Parent';
    setFormData((prev) => ({
      ...prev,
      firstName: first,
      lastName: last
    }));
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

    // Strong password client-side check
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(formData.password)) {
      setError('Password must be 8+ chars, include upper & lower case, number, and special character');
      setLoading(false);
      return;
    }

    // Phone validation (optional but if provided must be 10 digits)
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      setError('Phone number must be exactly 10 digits (numbers only)');
      setLoading(false);
      return;
    }

    // Parent-specific child validations
    if (formData.role !== 'staff') {
      if (!formData.childName || !formData.childDob) {
        setError("Child name and date of birth are required for admission");
        setLoading(false);
        return;
      }
      const dob = new Date(formData.childDob);
      if (isNaN(dob.getTime())) {
        setError('Invalid child date of birth');
        setLoading(false);
        return;
      }
      const today = new Date();
      const minDob = new Date(today.getFullYear() - 7, today.getMonth(), today.getDate());
      const maxDob = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      if (!(dob >= minDob && dob <= maxDob)) {
        setError('Child age must be between 1 and 7 years');
        setLoading(false);
        return;
      }
      
      // Validate additional children if hasMultipleChildren is true
      if (formData.hasMultipleChildren && formData.additionalChildren.length > 0) {
        for (let i = 0; i < formData.additionalChildren.length; i++) {
          const child = formData.additionalChildren[i];
          if (!child.name || !child.dob) {
            setError(`Child ${i + 2} name and date of birth are required`);
            setLoading(false);
            return;
          }
          const childDob = new Date(child.dob);
          if (isNaN(childDob.getTime())) {
            setError(`Invalid date of birth for child ${i + 2}`);
            setLoading(false);
            return;
          }
          if (!(childDob >= minDob && childDob <= maxDob)) {
            setError(`Child ${i + 2} age must be between 1 and 7 years`);
            setLoading(false);
            return;
          }
        }
      }
      
      if (formData.emergencyContactPhone && !/^\d{10}$/.test(formData.emergencyContactPhone)) {
        setError('Emergency contact phone must be 10 digits');
        setLoading(false);
        return;
      }
    }

    // Staff-specific validations
    if (formData.role === 'staff') {
      if (!formData.staffType) {
        setError('Please select a staff type');
        setLoading(false);
        return;
      }
      
      // Teacher-specific validations
      if (formData.staffType === 'teacher') {
        if (!formData.qualification) {
          setError('Qualification is required for teachers');
          setLoading(false);
          return;
        }
        if (!formData.certificateFile) {
          setError('Certificate upload is required for teachers');
          setLoading(false);
          return;
        }
      }
      
      // Driver-specific validations
      if (formData.staffType === 'driver') {
        if (!formData.licenseNumber) {
          setError('Driver\'s license number is required');
          setLoading(false);
          return;
        }
        if (!formData.vehicleType) {
          setError('Vehicle type is required');
          setLoading(false);
          return;
        }
        if (!formData.certificateFile) {
          setError('License/certificate upload is required for drivers');
          setLoading(false);
          return;
        }
      }
      
      // Delivery-specific validations
      if (formData.staffType === 'delivery') {
        if (!formData.deliveryArea) {
          setError('Delivery area is required');
          setLoading(false);
          return;
        }
        if (!formData.certificateFile) {
          setError('ID/certificate upload is required for delivery staff');
          setLoading(false);
          return;
        }
      }
      
      // Nanny-specific validations
      if (formData.staffType === 'nanny') {
        if (!formData.serviceArea) {
          setError('Service area is required');
          setLoading(false);
          return;
        }
        if (!formData.availability) {
          setError('Availability is required');
          setLoading(false);
          return;
        }
        if (!formData.certificateFile) {
          setError('Certificate/background check upload is required for nannies');
          setLoading(false);
          return;
        }
      }
      
      
      // File size validation for all staff types
      if (formData.certificateFile && formData.certificateFile.size > 10 * 1024 * 1024) {
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
        } else if (key === 'address') {
          // Handle address object for FormData
          if (value && typeof value === 'object') {
            if (value.street) payload.append('address[street]', value.street);
            if (value.city) payload.append('address[city]', value.city);
            if (value.state) payload.append('address[state]', value.state);
            if (value.zipCode) payload.append('address[zipCode]', value.zipCode);
          }
        } else if (key !== 'confirmPassword') {
          // Do not send empty yearsOfExperience
          if (key === 'yearsOfExperience' && (value === '' || value === null || value === undefined)) return;
          // Only send staff-specific fields if they have values
          if (['licenseNumber', 'vehicleType', 'deliveryArea', 'serviceArea', 'availability'].includes(key) && (!value || value === '')) return;
          payload.append(key, value ?? '');
        }
      });
    } else {
      const { confirmPassword, certificateFile, yearsOfExperience, licenseNumber, vehicleType, deliveryArea, serviceArea, availability, ...rest } = formData;
      // Drop empty yearsOfExperience from JSON payload too
      if (rest.role === 'staff' && (yearsOfExperience === '' || yearsOfExperience === null || yearsOfExperience === undefined)) {
        // nothing to add
      } else if (yearsOfExperience !== undefined) {
        rest.yearsOfExperience = yearsOfExperience;
      }
      // Add staff-specific fields if they have values
      if (rest.role === 'staff') {
        if (licenseNumber) rest.licenseNumber = licenseNumber;
        if (vehicleType) rest.vehicleType = vehicleType;
        if (deliveryArea) rest.deliveryArea = deliveryArea;
        if (serviceArea) rest.serviceArea = serviceArea;
        if (availability) rest.availability = availability;
      }
      // Include multiple children data if hasMultipleChildren is true
      if (rest.hasMultipleChildren) {
        rest.hasMultipleChildren = true;
        rest.numberOfChildren = rest.numberOfChildren || 1;
        rest.additionalChildren = rest.additionalChildren || [];
      }
      // Address is already included in rest since it's an object
      payload = rest;
    }

    // Ensure notifyByEmail is included for backend optional email
    if (payload instanceof FormData) {
      payload.set('notifyByEmail', String(!!formData.notifyByEmail));
    } else {
      payload.notifyByEmail = !!formData.notifyByEmail;
      // Attach phone code for backend if needed
      payload.phoneCode = phoneCode;
    }

    const result = await register(payload);

    if (result.success && result.pending) {
      setSuccessMsg(result.message || (formData.role === 'staff' 
        ? 'Staff registration submitted. Awaiting admin approval.'
        : 'Admission request submitted. Awaiting admin approval.')
      );
      // Stay on the page; do not navigate
    } else if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Registration failed');
    }

    setLoading(false);
  };

  const isStaff = formData.role === 'staff';

  const renderParentLayout = () => (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 2,
        position: 'relative',
        overflow: 'hidden',
        background: '#f8f9fa'
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/child-toys-bg.jpg?v=3')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.8
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ pr: { md: 4 }, mb: { xs: 3, md: 0 } }}>
              <Typography variant="h3" sx={{ 
                fontWeight: 800, 
                color: '#000', 
                lineHeight: 1.1, 
                mb: 1,
                textShadow: '2px 2px 4px rgba(255,255,255,0.9), -1px -1px 2px rgba(255,255,255,0.9)'
              }}>
                Learning that feels like joy!
              </Typography>
              <Typography variant="h6" sx={{ 
                color: '#000', 
                fontWeight: 600,
                textShadow: '1px 1px 3px rgba(255,255,255,0.9), -1px -1px 2px rgba(255,255,255,0.9)'
              }}>
                Block your child's seat with a quick admission request.
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              elevation={6}
              sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: 4,
                boxShadow: '0 14px 36px rgba(0,0,0,0.12)',
                backgroundColor: 'white',
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Block Your Child's Seat at TinyTots
              </Typography>

              {successMsg && (
                <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
                  {successMsg}
                </Alert>
              )}
              {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      label="Parent's Name"
                      value={parentName}
                      onChange={(e) => handleParentNameChange(e.target.value)}
                      placeholder="Enter parent's full name"
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

                  <Grid item xs={12}>
                    <Grid container spacing={1}>
                      <Grid item xs={4} sm={3}>
                        <TextField
                          select
                          fullWidth
                          label="Code"
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                          <MenuItem value="+91">+91</MenuItem>
                          <MenuItem value="+1">+1</MenuItem>
                          <MenuItem value="+44">+44</MenuItem>
                          <MenuItem value="+971">+971</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={8} sm={9}>
                        <TextField
                          required
                          fullWidth
                          name="phone"
                          label="Phone Number"
                          placeholder="10 digit number"
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
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
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

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      Address
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="address.street"
                      label="Street Address"
                      value={formData.address.street}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, street: e.target.value }
                      }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="address.city"
                      label="City"
                      value={formData.address.city}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, city: e.target.value }
                      }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      name="address.state"
                      label="State"
                      value={formData.address.state}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, state: e.target.value }
                      }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      name="address.zipCode"
                      label="Zip Code"
                      value={formData.address.zipCode}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, zipCode: e.target.value }
                      }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      select
                      required
                      fullWidth
                      name="program"
                      label="Select Program Interested In"
                      value={formData.program}
                      onChange={handleChange}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      <MenuItem value="preschool">Preschool</MenuItem>
                      <MenuItem value="daycare">Daycare</MenuItem>
                      <MenuItem value="afterschool">Afterschool Enrichment</MenuItem>
                      <MenuItem value="caregiver_home">Caregiver @ Home</MenuItem>
                      <MenuItem value="teacher_home">Teacher @ Home</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>
                      Child Details
                    </Typography>
                  </Grid>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <input
                        id="hasMultipleChildren"
                        type="checkbox"
                        checked={!!formData.hasMultipleChildren}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({ 
                            ...prev, 
                            hasMultipleChildren: checked,
                            numberOfChildren: checked ? 2 : 1,
                            additionalChildren: checked ? [{ name: '', dob: '', gender: 'male', program: 'preschool', medicalInfo: '' }] : []
                          }));
                        }}
                      />
                      <label htmlFor="hasMultipleChildren" style={{ fontWeight: 600, cursor: 'pointer' }}>
                        I am registering multiple children (twins, triplets, etc.)
                      </label>
                    </Box>
                  </Grid>

                  {formData.hasMultipleChildren && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          fullWidth
                          label="Number of Children"
                          value={formData.numberOfChildren}
                          onChange={(e) => {
                            const count = parseInt(e.target.value);
                            const currentChildren = formData.additionalChildren || [];
                            const newChildren = [];
                            for (let i = 0; i < count - 1; i++) {
                              newChildren.push(currentChildren[i] || { name: '', dob: '', gender: 'male', program: 'preschool', medicalInfo: '' });
                            }
                            setFormData(prev => ({ 
                              ...prev, 
                              numberOfChildren: count,
                              additionalChildren: newChildren
                            }));
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                          <MenuItem value={2}>Twins (2 children)</MenuItem>
                          <MenuItem value={3}>Triplets (3 children)</MenuItem>
                          <MenuItem value={4}>Quadruplets (4 children)</MenuItem>
                          <MenuItem value={5}>5 children</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        {/* Spacer for alignment */}
                      </Grid>

                      {formData.additionalChildren.map((child, index) => (
                        <React.Fragment key={index}>
                          <Grid item xs={12}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 2, color: 'primary.main' }}>
                              Child {index + 2} Details
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              required
                              fullWidth
                              label={`Child ${index + 2}'s Name`}
                              value={child.name}
                              onChange={(e) => {
                                const newChildren = [...formData.additionalChildren];
                                newChildren[index] = { ...newChildren[index], name: e.target.value };
                                setFormData(prev => ({ ...prev, additionalChildren: newChildren }));
                              }}
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
                              label={`Child ${index + 2}'s Date of Birth`}
                              type="date"
                              value={child.dob}
                              onChange={(e) => {
                                const newChildren = [...formData.additionalChildren];
                                newChildren[index] = { ...newChildren[index], dob: e.target.value };
                                setFormData(prev => ({ ...prev, additionalChildren: newChildren }));
                              }}
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
                          <Grid item xs={12} sm={6}>
                            <TextField
                              select
                              fullWidth
                              label={`Child ${index + 2}'s Gender`}
                              value={child.gender}
                              onChange={(e) => {
                                const newChildren = [...formData.additionalChildren];
                                newChildren[index] = { ...newChildren[index], gender: e.target.value };
                                setFormData(prev => ({ ...prev, additionalChildren: newChildren }));
                              }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            >
                              <MenuItem value="male">Male</MenuItem>
                              <MenuItem value="female">Female</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              select
                              fullWidth
                              label={`Child ${index + 2}'s Program`}
                              value={child.program}
                              onChange={(e) => {
                                const newChildren = [...formData.additionalChildren];
                                newChildren[index] = { ...newChildren[index], program: e.target.value };
                                setFormData(prev => ({ ...prev, additionalChildren: newChildren }));
                              }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            >
                              <MenuItem value="toddler">Toddler (1-2 years)</MenuItem>
                              <MenuItem value="preschool">Preschool (3-4 years)</MenuItem>
                              <MenuItem value="prekindergarten">Pre-Kindergarten (5-7 years)</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              multiline
                              minRows={2}
                              label={`Child ${index + 2}'s Medical Information (optional)`}
                              placeholder="Any allergies, medications, or medical conditions..."
                              value={child.medicalInfo}
                              onChange={(e) => {
                                const newChildren = [...formData.additionalChildren];
                                newChildren[index] = { ...newChildren[index], medicalInfo: e.target.value };
                                setFormData(prev => ({ ...prev, additionalChildren: newChildren }));
                              }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                          </Grid>
                        </React.Fragment>
                      ))}
                    </>
                  )}

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="username"
                      label="Username (optional)"
                      value={formData.username}
                      onChange={handleChange}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
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
                  sx={{ mt: 3, py: 1.4, borderRadius: 2 }}
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Enquire Now'}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );

  if (!isStaff) return renderParentLayout();

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
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Back to landing */}
      <IconButton onClick={() => navigate('/')} sx={{ position: 'fixed', top: 16, left: 16, zIndex: 10, color: 'white', backgroundColor: 'rgba(0,0,0,0.35)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </IconButton>

      {/* Static background image - children with their teacher playing */}
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: "linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.15)), url('/child-toys-bg.jpg?v=2')",
        backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.95)'
      }} />

      <Container component="main" maxWidth="md" sx={{ px: { xs: 0, sm: 2 }, position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 3,
            width: '100%',
            backdropFilter: 'blur(8px)', backgroundColor: 'rgba(245,240,255,0.5)',
            border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h5" sx={{ color: 'text.secondary', mb: 0.5 }}>
              {formData.staffType === 'teacher' ? 'Teacher Registration'
                  : formData.staffType === 'driver' ? 'Driver Registration'
                  : formData.staffType === 'delivery' ? 'Delivery Staff Registration'
                  : formData.staffType === 'nanny' ? 'Nanny at Home Service Registration'
                : 'Staff Registration'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your registration will be reviewed by our admin team
            </Typography>
          </Box>

          {successMsg && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {successMsg}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Grid container spacing={2}>
              {/* Role selector (hidden when fixed role) */}
              {(!fixedRole) && (
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
                  </TextField>
                </Grid>
              )}

              {/* Prefill with Google */}
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    const res = await prefillWithGoogle();
                    if (res.success) {
                      const display = res.profile.displayName || '';
                      const [first, ...rest] = display.split(' ');
                      const last = rest.join(' ');
                      setFormData((prev) => ({
                        ...prev,
                        email: res.profile.email || prev.email,
                        firstName: first || prev.firstName,
                        lastName: last || prev.lastName,
                      }));
                    }
                  }}
                >
                  Use Google to prefill name & email
                </Button>
              </Grid>

              {/* Email preference */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input
                    id="notifyByEmail"
                    type="checkbox"
                    checked={!!formData.notifyByEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, notifyByEmail: e.target.checked }))}
                  />
                  <label htmlFor="notifyByEmail">Send me a confirmation email after I submit</label>
                </Box>
              </Grid>

              {/* Details */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="firstName"
                      label="Full Name (First)"
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
                      label="Full Name (Last)"
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
                  label="Phone Number (10 digits)"
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="username"
                  label="Username (optional)"
                  value={formData.username}
                  onChange={handleChange}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>

              {/* Staff-only fields */}
              {formData.role === 'staff' && (
                <>
                  {/* Staff Type selector - hidden when fixedStaffType is provided */}
                  {!fixedStaffType && (
                    <Grid item xs={12}>
                      <TextField
                        select
                        required
                        fullWidth
                        name="staffType"
                        label="Staff Type"
                        value={formData.staffType}
                        onChange={handleChange}
                        helperText="Select your staff role"
                      >
                        <MenuItem value="teacher">Teacher</MenuItem>
                        <MenuItem value="driver">Driver</MenuItem>
                        <MenuItem value="delivery">Delivery</MenuItem>
                        <MenuItem value="nanny">Nanny at Home Service</MenuItem>
                      </TextField>
                    </Grid>
                  )}
                  
                  {/* Teacher-specific fields */}
                  {formData.staffType === 'teacher' && (
                    <>
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

                  {/* Driver-specific fields */}
                  {formData.staffType === 'driver' && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          required
                          fullWidth
                          name="licenseNumber"
                          label="Driver's License Number"
                          value={formData.licenseNumber}
                          onChange={handleChange}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          required
                          fullWidth
                          name="vehicleType"
                          label="Vehicle Type"
                          placeholder="Car, Van, Bus, etc."
                          value={formData.vehicleType}
                          onChange={handleChange}
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
                            {formData.certificateFile ? 'File selected: ' + formData.certificateFile.name : 'Click to upload license/certificate'}
                            <Typography variant="body2" color="text.secondary">PDF, JPG, PNG up to 10MB</Typography>
                          </label>
                        </Box>
                      </Grid>
                    </>
                  )}

                  {/* Delivery-specific fields */}
                  {formData.staffType === 'delivery' && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          required
                          fullWidth
                          name="deliveryArea"
                          label="Delivery Area"
                          placeholder="City, Region, etc."
                          value={formData.deliveryArea}
                          onChange={handleChange}
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
                            {formData.certificateFile ? 'File selected: ' + formData.certificateFile.name : 'Click to upload ID/certificate'}
                            <Typography variant="body2" color="text.secondary">PDF, JPG, PNG up to 10MB</Typography>
                          </label>
                        </Box>
                      </Grid>
                    </>
                  )}

                  {/* Nanny-specific fields */}
                  {formData.staffType === 'nanny' && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          required
                          fullWidth
                          name="serviceArea"
                          label="Service Area"
                          placeholder="City, Region, etc."
                          value={formData.serviceArea}
                          onChange={handleChange}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          required
                          fullWidth
                          name="availability"
                          label="Availability"
                          placeholder="Full-time, Part-time, Weekends, etc."
                          value={formData.availability}
                          onChange={handleChange}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          name="qualification"
                          label="Qualification/Experience (optional)"
                          placeholder="Childcare certification, years of experience, etc."
                          value={formData.qualification}
                          onChange={handleChange}
                          multiline
                          rows={2}
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
                            {formData.certificateFile ? 'File selected: ' + formData.certificateFile.name : 'Click to upload certificate/background check'}
                            <Typography variant="body2" color="text.secondary">PDF, JPG, PNG up to 10MB</Typography>
                          </label>
                        </Box>
                      </Grid>
                    </>
                  )}
                    </>
                  )}

              {/* Parent-only child details */}
              {formData.role !== 'staff' && (
                <>
                  {/* Multiple children checkbox */}
                      <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <input
                        id="hasMultipleChildren2"
                        type="checkbox"
                        checked={!!formData.hasMultipleChildren}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({ 
                            ...prev, 
                            hasMultipleChildren: checked,
                            numberOfChildren: checked ? 2 : 1,
                            additionalChildren: checked ? [{ name: '', dob: '', gender: 'male', program: 'preschool', medicalInfo: '' }] : []
                          }));
                        }}
                          />
                      <label htmlFor="hasMultipleChildren2" style={{ fontWeight: 600, cursor: 'pointer' }}>
                        I am registering multiple children (twins, triplets, etc.)
                          </label>
                        </Box>
                      </Grid>

                  {formData.hasMultipleChildren && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          fullWidth
                          label="Number of Children"
                          value={formData.numberOfChildren}
                          onChange={(e) => {
                            const count = parseInt(e.target.value);
                            const currentChildren = formData.additionalChildren || [];
                            const newChildren = [];
                            for (let i = 0; i < count - 1; i++) {
                              newChildren.push(currentChildren[i] || { name: '', dob: '', gender: 'male', program: 'preschool', medicalInfo: '' });
                            }
                            setFormData(prev => ({ 
                              ...prev, 
                              numberOfChildren: count,
                              additionalChildren: newChildren
                            }));
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                          <MenuItem value={2}>Twins (2 children)</MenuItem>
                          <MenuItem value={3}>Triplets (3 children)</MenuItem>
                          <MenuItem value={4}>Quadruplets (4 children)</MenuItem>
                          <MenuItem value={5}>5 children</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        {/* Spacer for alignment */}
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      name="childName"
                      label="First Child's Name"
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
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      name="childGender"
                      label="Child's Gender"
                      value={formData.childGender}
                      onChange={handleChange}
                    >
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      name="program"
                      label="Program"
                      value={formData.program}
                      onChange={handleChange}
                    >
                      <MenuItem value="toddler">Toddler (1-2 years)</MenuItem>
                      <MenuItem value="preschool">Preschool (3-4 years)</MenuItem>
                      <MenuItem value="prekindergarten">Pre-Kindergarten (5-7 years)</MenuItem>
                    </TextField>
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
                  
                  {/* Additional children details - shown only if hasMultipleChildren is true */}
                  {formData.hasMultipleChildren && formData.additionalChildren.map((child, index) => (
                    <React.Fragment key={index}>
                      <Grid item xs={12}>
                        <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600, color: 'primary.main' }}>
                          Child {index + 2} Details
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          required
                          fullWidth
                          label={`Child ${index + 2}'s Name`}
                          value={child.name}
                          onChange={(e) => {
                            const newChildren = [...formData.additionalChildren];
                            newChildren[index] = { ...newChildren[index], name: e.target.value };
                            setFormData(prev => ({ ...prev, additionalChildren: newChildren }));
                          }}
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
                          label={`Child ${index + 2}'s Date of Birth`}
                          type="date"
                          value={child.dob}
                          onChange={(e) => {
                            const newChildren = [...formData.additionalChildren];
                            newChildren[index] = { ...newChildren[index], dob: e.target.value };
                            setFormData(prev => ({ ...prev, additionalChildren: newChildren }));
                          }}
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
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          fullWidth
                          label={`Child ${index + 2}'s Gender`}
                          value={child.gender}
                          onChange={(e) => {
                            const newChildren = [...formData.additionalChildren];
                            newChildren[index] = { ...newChildren[index], gender: e.target.value };
                            setFormData(prev => ({ ...prev, additionalChildren: newChildren }));
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                          <MenuItem value="male">Male</MenuItem>
                          <MenuItem value="female">Female</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          fullWidth
                          label={`Child ${index + 2}'s Program`}
                          value={child.program}
                          onChange={(e) => {
                            const newChildren = [...formData.additionalChildren];
                            newChildren[index] = { ...newChildren[index], program: e.target.value };
                            setFormData(prev => ({ ...prev, additionalChildren: newChildren }));
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                          <MenuItem value="toddler">Toddler (1-2 years)</MenuItem>
                          <MenuItem value="preschool">Preschool (3-4 years)</MenuItem>
                          <MenuItem value="prekindergarten">Pre-Kindergarten (5-7 years)</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          minRows={2}
                          label={`Child ${index + 2}'s Medical Information (optional)`}
                          placeholder="Any allergies, medications, or medical conditions..."
                          value={child.medicalInfo}
                          onChange={(e) => {
                            const newChildren = [...formData.additionalChildren];
                            newChildren[index] = { ...newChildren[index], medicalInfo: e.target.value };
                            setFormData(prev => ({ ...prev, additionalChildren: newChildren }));
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                    </React.Fragment>
                  ))}
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
            

          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;