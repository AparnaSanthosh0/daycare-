import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  Avatar,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Chip,
  Divider,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Person,
  ChildCare,
  PhotoCamera,
  Delete,
  Save,
  Edit,
  Refresh,
  Event,
  LocalDining,
  PhotoAlbum,
  // Analytics,
  TrendingUp,
  Assessment,
  // People,
  SupervisorAccount,
  ContactPhone,
  Email
} from '@mui/icons-material';
import api, { API_BASE_URL } from '../../config/api';

// Simple helper to format date strings
const formatDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString();
};

const ParentDashboard = ({ initialTab }) => {
  const [tab, setTab] = useState(0);
  const [, setLoading] = useState(false);
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState('');

  // Data for active child
  const [profile, setProfile] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [profileImageVersion, setProfileImageVersion] = useState(0);
  const [photoPreview, setPhotoPreview] = useState({ open: false, url: '' });
  const [attendance, setAttendance] = useState(null);
  const [activities, setActivities] = useState({ recent: [], count: 0 });
  const [meals, setMeals] = useState({ plan: [], weekOf: null });
  const [reports, setReports] = useState({
    attendance: { summary: null, history: [] },
    activities: { participation: [], trends: null },
    milestones: { completed: [], upcoming: [] },
    nutrition: { consumption: [], preferences: [] }
  });
  // Staff information
  const [assignedStaff, setAssignedStaff] = useState([]);
  // Admissions state for adding additional children
  const [admissions, setAdmissions] = useState([]);
  const [admissionForm, setAdmissionForm] = useState({
    childName: '',
    childDob: '',
    childGender: 'male',
    program: 'preschool',
    medicalInfo: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });
  const [admissionMsg, setAdmissionMsg] = useState('');
  const [admissionError, setAdmissionError] = useState('');
  const [admissionLoading, setAdmissionLoading] = useState(false);

  // Editable fields (parent-allowed)
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({
    allergies: [],
    medicalConditions: [], // store as array of strings for simplicity; server accepts objects or strings; keep minimal
    emergencyContacts: [],
    authorizedPickup: [],
    notes: ''
  });

  // const activeChild = useMemo(
  //   () => children.find((c) => c._id === activeChildId) || null,
  //   [children, activeChildId]
  // );

  // Map initialTab prop to tab index when component mounts
  useEffect(() => {
    const map = {
      notifications: 9,
      messaging: 10,
      billing: 11,
      feedback: 12,
      staff: 6,
      reports: 7,
      admissions: 8,
    };
    if (initialTab && map[initialTab] !== undefined) setTab(map[initialTab]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  // Load my children
  const loadChildren = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/parents/me/children');
      setChildren(res.data || []);
      if ((res.data || []).length > 0 && !activeChildId) {
        setActiveChildId(res.data[0]._id);
      }
    } catch (e) {
      console.error('Load children error:', e);
    } finally {
      setLoading(false);
    }
  }, [activeChildId]);

  useEffect(() => {
    loadChildren();
    // Load my admissions list for visibility of pending statuses
    (async () => {
      try {
        const res = await api.get('/api/parents/me/admissions');
        setAdmissions(res.data || []);
      } catch (e) {
        // ignore
      }
    })();
  }, [loadChildren]);

  // Fetch detail for the active child
  const fetchChildData = useCallback(async (childId) => {
    if (!childId) return;
    try {
      const [pRes, gRes, aRes, actRes, mRes, rRes, sRes] = await Promise.all([
        api.get(`/api/children/${childId}`),
        api.get(`/api/children/${childId}/gallery`),
        api.get(`/api/children/${childId}/attendance`),
        api.get(`/api/children/${childId}/activities`),
        api.get(`/api/children/${childId}/meals`),
        api.get(`/api/children/${childId}/reports`),
        api.get(`/api/children/${childId}/staff`)
      ]);
      setProfile(pRes.data);
      setGallery(gRes.data || []);
      setAttendance(aRes.data || null);
      setActivities(actRes.data || { recent: [], count: 0 });
      setMeals(mRes.data || { plan: [], weekOf: null });
      setReports(rRes.data || {
        attendance: { summary: null, history: [] },
        activities: { participation: [], trends: null },
        milestones: { completed: [], upcoming: [] },
        nutrition: { consumption: [], preferences: [] }
      });
      setAssignedStaff(sRes.data || []);

      // Seed edit fields from profile
      const pf = pRes.data || {};
      setEditFields({
        allergies: Array.isArray(pf.allergies) ? pf.allergies : [],
        medicalConditions: Array.isArray(pf.medicalConditions)
          ? pf.medicalConditions.map((m) => (typeof m === 'string' ? m : (m?.condition || ''))).filter(Boolean)
          : [],
        emergencyContacts: Array.isArray(pf.emergencyContacts) ? pf.emergencyContacts : [],
        authorizedPickup: Array.isArray(pf.authorizedPickup) ? pf.authorizedPickup : [],
        notes: pf.notes || ''
      });
    } catch (e) {
      console.error('Fetch child data error:', e);
    }
  }, []);

  // When active child changes, fetch everything
  useEffect(() => {
    if (activeChildId) {
      fetchChildData(activeChildId);
    }
  }, [activeChildId, fetchChildData]);

  // Simple polling for attendance, activities, meals
  useEffect(() => {
    if (!activeChildId) return;
    const interval = setInterval(async () => {
      try {
        const [aRes, actRes, mRes] = await Promise.all([
          api.get(`/api/children/${activeChildId}/attendance`),
          api.get(`/api/children/${activeChildId}/activities`),
          api.get(`/api/children/${activeChildId}/meals`)
        ]);
        setAttendance(aRes.data || null);
        setActivities(actRes.data || { recent: [], count: 0 });
        setMeals(mRes.data || { plan: [], weekOf: null });
      } catch (e) {
        // silent fail to avoid UI spam
      }
    }, 30000); // 30s
    return () => clearInterval(interval);
  }, [activeChildId]);

  const handleSave = async () => {
    if (!activeChildId) return;
    try {
      const payload = {
        allergies: editFields.allergies,
        medicalConditions: editFields.medicalConditions.map((c) => ({ condition: c })),
        emergencyContacts: editFields.emergencyContacts,
        authorizedPickup: editFields.authorizedPickup,
        notes: editFields.notes
      };
      const res = await api.put(`/api/children/${activeChildId}`, payload);
      setProfile(res.data.child);
      setEditMode(false);
    } catch (e) {
      console.error('Save child edit error:', e);
    }
  };

  const handleUpload = async (file, caption = '') => {
    if (!activeChildId || !file) return;
    try {
      const form = new FormData();
      form.append('photo', file);
      form.append('caption', caption);
      const res = await api.post(`/api/children/${activeChildId}/gallery`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setGallery((g) => [...g, res.data.photo]);
    } catch (e) {
      console.error('Upload error:', e);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!activeChildId || !photoId) return;
    try {
      await api.delete(`/api/children/${activeChildId}/gallery/${photoId}`);
      setGallery((g) => g.filter((p) => p._id !== photoId));
    } catch (e) {
      console.error('Delete photo error:', e);
    }
  };

  const AllergiesEditor = () => {
    const [input, setInput] = useState('');
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          {editFields.allergies.map((a, idx) => (
            <Chip key={`${a}-${idx}`} label={a} onDelete={() => {
              setEditFields((f) => ({ ...f, allergies: f.allergies.filter((_, i) => i !== idx) }));
            }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" value={input} onChange={(e) => setInput(e.target.value)} label="Add allergy" />
          <Button variant="outlined" onClick={() => {
            if (input.trim()) {
              setEditFields((f) => ({ ...f, allergies: [...f.allergies, input.trim()] }));
              setInput('');
            }
          }}>Add</Button>
        </Box>
      </Box>
    );
  };

  const MedicalEditor = () => {
    const [input, setInput] = useState('');
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          {(editFields.medicalConditions || []).map((m, idx) => (
            <Chip key={`${m}-${idx}`} label={m} onDelete={() => {
              setEditFields((f) => ({ ...f, medicalConditions: f.medicalConditions.filter((_, i) => i !== idx) }));
            }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" value={input} onChange={(e) => setInput(e.target.value)} label="Add medical note" />
          <Button variant="outlined" onClick={() => {
            if (input.trim()) {
              setEditFields((f) => ({ ...f, medicalConditions: [...f.medicalConditions, input.trim()] }));
              setInput('');
            }
          }}>Add</Button>
        </Box>
      </Box>
    );
  };

  const EmergencyEditor = () => {
    const [contact, setContact] = useState({ name: '', phone: '', relationship: 'Emergency' });
    return (
      <Box>
        {(editFields.emergencyContacts || []).map((c, idx) => (
          <Grid container spacing={1} key={idx} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={c.name} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], name: v }; return { ...f, emergencyContacts: arr }; });
            }} /></Grid>
            <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={c.phone} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], phone: v }; return { ...f, emergencyContacts: arr }; });
            }} /></Grid>
            <Grid item xs={10} sm={3}><TextField size="small" fullWidth label="Relationship" value={c.relationship || 'Emergency'} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], relationship: v }; return { ...f, emergencyContacts: arr }; });
            }} /></Grid>
            <Grid item xs={2} sm={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <IconButton color="error" onClick={() => setEditFields((f) => ({ ...f, emergencyContacts: f.emergencyContacts.filter((_, i) => i !== idx) }))}><Delete /></IconButton>
            </Grid>
          </Grid>
        ))}

        <Divider sx={{ my: 1 }} />
        <Grid container spacing={1}>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Relationship" value={contact.relationship} onChange={(e) => setContact((c) => ({ ...c, relationship: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button variant="outlined" onClick={() => {
              if (contact.name && contact.phone) {
                setEditFields((f) => ({ ...f, emergencyContacts: [...(f.emergencyContacts || []), contact] }));
                setContact({ name: '', phone: '', relationship: 'Emergency' });
              }
            }}>Add</Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const AuthorizedPickupEditor = () => {
    const [person, setPerson] = useState({ name: '', phone: '', relationship: '' });
    return (
      <Box>
        {(editFields.authorizedPickup || []).map((c, idx) => (
          <Grid container spacing={1} key={idx} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={c.name || ''} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], name: v }; return { ...f, authorizedPickup: arr }; });
            }} /></Grid>
            <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={c.phone || ''} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], phone: v }; return { ...f, authorizedPickup: arr }; });
            }} /></Grid>
            <Grid item xs={10} sm={3}><TextField size="small" fullWidth label="Relationship" value={c.relationship || ''} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], relationship: v }; return { ...f, authorizedPickup: arr }; });
            }} /></Grid>
            <Grid item xs={2} sm={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <IconButton color="error" onClick={() => setEditFields((f) => ({ ...f, authorizedPickup: f.authorizedPickup.filter((_, i) => i !== idx) }))}><Delete /></IconButton>
            </Grid>
          </Grid>
        ))}

        <Divider sx={{ my: 1 }} />
        <Grid container spacing={1}>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={person.name} onChange={(e) => setPerson((c) => ({ ...c, name: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={person.phone} onChange={(e) => setPerson((c) => ({ ...c, phone: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Relationship" value={person.relationship} onChange={(e) => setPerson((c) => ({ ...c, relationship: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button variant="outlined" onClick={() => {
              if (person.name && person.phone) {
                setEditFields((f) => ({ ...f, authorizedPickup: [...(f.authorizedPickup || []), person] }));
                setPerson({ name: '', phone: '', relationship: '' });
              }
            }}>Add</Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const Gallery = () => {
    const [file, setFile] = useState(null);
    const [caption, setCaption] = useState('');
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="contained" component="label" startIcon={<PhotoCamera />} disabled={!activeChildId}>
            Upload Photo
            <input hidden type="file" accept="image/*" multiple onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
          <TextField 
            size="small" 
            label="Caption" 
            value={caption} 
            onChange={(e) => setCaption(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <Button 
            variant="outlined" 
            onClick={() => { if (file) { handleUpload(file, caption); setFile(null); setCaption(''); } }} 
            disabled={!file}
          >
            Add Photo
          </Button>
          <IconButton onClick={() => fetchChildData(activeChildId)} title="Refresh Gallery">
            <Refresh />
          </IconButton>
        </Box>
        <Grid container spacing={2}>
          {gallery.map((p) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={p._id}>
              <Card sx={{ position: 'relative' }}>
                <CardMedia 
                  component="img" 
                  height="180" 
                  image={p.url && p.url.startsWith('http') ? p.url : `${API_BASE_URL}${p.url || ''}`} 
                  alt={p.caption || 'Child photo'}
                  sx={{ objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => {
                    const fullUrl = p.url && p.url.startsWith('http') ? p.url : `${API_BASE_URL}${p.url || ''}`;
                    setPhotoPreview({ open: true, url: fullUrl });
                  }}
                />
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, mr: 1 }}>
                    {p.caption || 'No caption'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={() => {
                        // Set as profile image
                        api.post(`/api/children/${activeChildId}/gallery/${p._id}/set-profile`)
                          .then(() => {
                            fetchChildData(activeChildId);
                            setProfileImageVersion((v) => v + 1);
                          })
                          .catch(console.error);
                      }}
                      title="Set as profile image"
                    >
                      <Person />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleDeletePhoto(p._id)}
                      title="Delete photo"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {gallery.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <PhotoCamera sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  No photos yet. Upload some memories!
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {/* Photo Preview Dialog */}
        <Dialog open={photoPreview.open} onClose={() => setPhotoPreview({ open: false, url: '' })} maxWidth="md" fullWidth>
          <DialogTitle>Photo</DialogTitle>
          <DialogContent dividers>
            {photoPreview.url && (
              <Box sx={{ textAlign: 'center' }}>
                <Box component="img" src={photoPreview.url} alt="Preview" sx={{ maxWidth: '100%', borderRadius: 1 }} />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPhotoPreview({ open: false, url: '' })}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  const ProfileCard = () => {
    const fullName = profile ? `${profile.firstName} ${profile.lastName}` : '';
    const age = profile ? calculateAge(profile.dateOfBirth) : '';
    
    return (
      <Card>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {profile?.profileImage ? (
                <img 
                  src={(profile.profileImage.startsWith('http') ? profile.profileImage : `${API_BASE_URL}${profile.profileImage}`) + `?v=${profileImageVersion}`}
                  alt={fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <ChildCare />
              )}
            </Avatar>
          }
          title={fullName}
          subheader={profile ? `${profile.gender?.toUpperCase() || ''} • ${age} years old • DOB: ${formatDate(profile.dateOfBirth)}` : ''}
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Program" 
                value={profile?.program ? profile.program.charAt(0).toUpperCase() + profile.program.slice(1) : ''} 
                InputProps={{ readOnly: true }} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Enrollment Date" 
                value={formatDate(profile?.enrollmentDate)} 
                InputProps={{ readOnly: true }} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Medical Info" 
                value={profile?.medicalConditions?.[0]?.condition || 'None provided'} 
                InputProps={{ readOnly: true }} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Status" 
                value={profile?.isActive ? 'Active' : 'Inactive'} 
                InputProps={{ readOnly: true }} 
                color={profile?.isActive ? 'success' : 'error'}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Helper function to calculate age
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Schedule display component
  const ScheduleCard = () => {
    if (!profile?.schedule) return null;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    return (
      <Card>
        <CardHeader title="Weekly Schedule" />
        <CardContent>
          <Grid container spacing={2}>
            {days.map((day, index) => {
              const daySchedule = profile.schedule[day];
              return (
                <Grid item xs={12} sm={6} md={4} key={day}>
                  <Box sx={{ 
                    p: 2, 
                    border: '1px solid', 
                    borderColor: daySchedule?.enrolled ? 'success.main' : 'grey.300',
                    borderRadius: 1,
                    bgcolor: daySchedule?.enrolled ? 'success.50' : 'grey.50'
                  }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {dayNames[index]}
                    </Typography>
                    {daySchedule?.enrolled ? (
                      <Box>
                        <Typography variant="body2" color="success.main">
                          ✓ Enrolled
                        </Typography>
                        <Typography variant="body2">
                          {daySchedule.start} - {daySchedule.end}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not enrolled
                      </Typography>
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const StaffCard = () => {
    return (
      <Card>
        <CardHeader 
          title="Assigned Staff" 
          avatar={<SupervisorAccount />}
          action={<IconButton onClick={() => fetchChildData(activeChildId)}><Refresh /></IconButton>}
        />
        <CardContent>
          {assignedStaff.length > 0 ? (
            <Grid container spacing={2}>
              {assignedStaff.map((staff, index) => (
                <Grid item xs={12} sm={6} md={4} key={staff._id || index}>
                  <Card sx={{ height: '100%', border: '1px solid', borderColor: 'primary.main', bgcolor: 'primary.50' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                          {staff.profileImage ? (
                            <img 
                              src={staff.profileImage.startsWith('http') ? staff.profileImage : `${API_BASE_URL}${staff.profileImage}`} 
                              alt={staff.firstName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Person />
                          )}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" component="div">
                            {staff.firstName} {staff.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {staff.role || 'Staff Member'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {staff.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ContactPhone fontSize="small" color="action" />
                            <Typography variant="body2">{staff.phone}</Typography>
                          </Box>
                        )}
                        {staff.email && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Email fontSize="small" color="action" />
                            <Typography variant="body2">{staff.email}</Typography>
                          </Box>
                        )}
                      </Box>

                      {staff.specializations && staff.specializations.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Specializations:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {staff.specializations.map((spec, idx) => (
                              <Chip key={idx} label={spec} size="small" color="primary" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {staff.notes && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Notes:</strong> {staff.notes}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <SupervisorAccount sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                No staff assigned yet. Staff will be assigned by the administration.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Parent Dashboard</Typography>

      {/* Parent + Child summary */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Parent</Typography>
              <Typography variant="body1">You are logged in as the parent. Manage your child's information below.</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Selected Child</Typography>
              <Typography variant="body1">{(children.find(c => c._id === activeChildId)?.firstName || '-') + ' ' + (children.find(c => c._id === activeChildId)?.lastName || '')}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Child selector */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar><Person /></Avatar>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="child-select-label">Select Child</InputLabel>
              <Select
                labelId="child-select-label"
                label="Select Child"
                value={activeChildId}
                onChange={(e) => setActiveChildId(e.target.value)}
              >
                {children.map((c) => (
                  <MenuItem key={c._id} value={c._id}>{c.firstName} {c.lastName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item>
            <IconButton onClick={() => activeChildId && fetchChildData(activeChildId)}><Refresh /></IconButton>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs - show only up to Meals (index 0..5). Sidebar links open others. */}
      <Paper sx={{ p: 2 }}>
        {tab <= 5 && (
          <>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons allowScrollButtonsMobile>
          <Tab label="Profile" icon={<ChildCare />} iconPosition="start" />
          <Tab label="Medical & Emergency" icon={<Event />} iconPosition="start" />
          <Tab label="Gallery" icon={<PhotoAlbum />} iconPosition="start" />
          <Tab label="Attendance" icon={<Event />} iconPosition="start" />
          <Tab label="Activities" icon={<Event />} iconPosition="start" />
          <Tab label="Meals" icon={<LocalDining />} iconPosition="start" />
        </Tabs>
        <Divider sx={{ mb: 2 }} />
          </>
        )}

        {/* Content */}
        {(!activeChildId || children.length === 0) && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {children.length === 0 ? 'No approved children yet. Submit an admission for your child.' : 'No child selected.'}
            </Typography>
            <Button variant="contained" onClick={() => setTab(7)}>Go to Admissions</Button>
          </Box>
        )}

        {activeChildId && children.length > 0 && (
          <Box>
            {tab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <ProfileCard />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Notes" action={
                      editMode ? <Button size="small" startIcon={<Save />} onClick={handleSave}>Save</Button>
                               : <Button size="small" startIcon={<Edit />} onClick={() => setEditMode(true)}>Edit</Button>
                    } />
                    <CardContent>
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        value={editFields.notes}
                        onChange={(e) => setEditFields((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="Any notes you'd like to add"
                        disabled={!editMode}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <ScheduleCard />
                </Grid>
              </Grid>
            )}

            {tab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Allergies" />
                    <CardContent>
                      <AllergiesEditor />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Medical Information" />
                    <CardContent>
                      <MedicalEditor />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Emergency Contacts" />
                    <CardContent>
                      <EmergencyEditor />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Authorized Pickups" />
                    <CardContent>
                      <AuthorizedPickupEditor />
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Display current medical information */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Current Medical Information" />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="h6" gutterBottom>Allergies</Typography>
                          {profile?.allergies && profile.allergies.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {profile.allergies.map((allergy, idx) => (
                                <Chip key={idx} label={allergy} color="warning" size="small" />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">No allergies recorded</Typography>
                          )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="h6" gutterBottom>Medical Conditions</Typography>
                          {profile?.medicalConditions && profile.medicalConditions.length > 0 ? (
                            <Box>
                              {profile.medicalConditions.map((condition, idx) => (
                                <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                  <Typography variant="body2"><strong>{condition.condition}</strong></Typography>
                                  {condition.medication && (
                                    <Typography variant="caption" color="text.secondary">
                                      Medication: {condition.medication}
                                    </Typography>
                                  )}
                                  {condition.instructions && (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      Instructions: {condition.instructions}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">No medical conditions recorded</Typography>
                          )}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  {editMode ? (
                    <Button variant="contained" startIcon={<Save />} onClick={handleSave}>Save Changes</Button>
                  ) : (
                    <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditMode(true)}>Enable Editing</Button>
                  )}
                </Grid>
              </Grid>
            )}

            {tab === 2 && (
              <Gallery />
            )}

            {tab === 3 && (
              <Card>
                <CardHeader 
                  title="Attendance (View Only)" 
                  subheader="Attendance is managed by staff members"
                  avatar={<Event />}
                />
                <CardContent>
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
                    <Typography variant="body2" color="info.main">
                      <strong>Note:</strong> Parents can view attendance records but cannot modify them. 
                      Only staff members can update attendance.
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>Today's Status</Typography>
                      <Typography variant="body1" color="primary.main" sx={{ mb: 1 }}>
                        {attendance?.today?.status || 'Not checked in'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Check-in: {attendance?.today?.checkIn || 'Not recorded'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Check-out: {attendance?.today?.checkOut || 'Not recorded'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>This Week</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Days present: {attendance?.week?.present || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Days absent: {attendance?.week?.absent || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Attendance rate: {attendance?.week?.rate || 0}%
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="h6" gutterBottom>Recent History</Typography>
                  {attendance?.history && attendance.history.length > 0 ? (
                    <Box>
                      {attendance.history.slice(0, 5).map((record, idx) => (
                        <Box key={idx} sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          p: 1,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          borderRadius: 1,
                          mb: 1
                        }}>
                          <Box>
                            <Typography variant="body2">
                              {formatDate(record.date)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {record.checkIn} - {record.checkOut || 'Not checked out'}
                            </Typography>
                          </Box>
                          <Chip 
                            label={record.status} 
                            size="small" 
                            color={record.status === 'present' ? 'success' : 'error'}
                          />
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No attendance history available yet.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === 4 && (
              <Card>
                <CardHeader title="Recent Activities" />
                <CardContent>
                  {(activities?.recent || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No recent activities.</Typography>
                  ) : (
                    (activities.recent).map((a, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="body2">{a.title || 'Activity'}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatDate(a.date)}</Typography>
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {tab === 5 && (
              <Card>
                <CardHeader title="Meal Plan" />
                <CardContent>
                  {(meals?.plan || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No meal plan available.</Typography>
                  ) : (
                    (meals.plan).map((m, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="body2">{m.day || 'Day'}: {m.menu || '-'}</Typography>
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {tab === 6 && (
              <StaffCard />
            )}

            {/* Reports & Analytics */}
            {tab === 7 && (
              <Box>
                <Grid container spacing={3}>
                  {/* Attendance Summary */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader 
                    title="Attendance Summary" 
                    avatar={<Assessment />}
                    action={<IconButton onClick={() => fetchChildData(activeChildId)}><Refresh /></IconButton>}
                  />
                  <CardContent>
                    {reports.attendance.summary ? (
                      <Box>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="h4" color="primary">
                              {reports.attendance.summary.presentDays || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Days Present
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="h4" color="error">
                              {reports.attendance.summary.absentDays || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Days Absent
                            </Typography>
                          </Grid>
                        </Grid>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2">
                              <strong>Attendance Rate:</strong> {reports.attendance.summary.attendanceRate || 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {reports.attendance.summary.attendanceRate >= 90 ? 'Excellent' : 
                               reports.attendance.summary.attendanceRate >= 80 ? 'Good' : 
                               reports.attendance.summary.attendanceRate >= 70 ? 'Fair' : 'Needs Improvement'}
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={reports.attendance.summary.attendanceRate || 0} 
                            sx={{ height: 8, borderRadius: 4 }}
                            color={reports.attendance.summary.attendanceRate >= 90 ? 'success' : 
                                   reports.attendance.summary.attendanceRate >= 80 ? 'primary' : 
                                   reports.attendance.summary.attendanceRate >= 70 ? 'warning' : 'error'}
                          />
                        </Box>
                        <Typography variant="body2">
                          <strong>This Month:</strong> {reports.attendance.summary.thisMonth || 0} days
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No attendance data available yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Activity Participation */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader 
                    title="Activity Participation" 
                    avatar={<TrendingUp />}
                  />
                  <CardContent>
                    {reports.activities.participation && reports.activities.participation.length > 0 ? (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Recent Activities
                        </Typography>
                        {reports.activities.participation.slice(0, 5).map((activity, idx) => (
                          <Box key={idx} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">{activity.name}</Typography>
                            <Chip 
                              label={activity.participation} 
                              size="small" 
                              color={activity.participation === 'Active' ? 'success' : 'default'}
                            />
                          </Box>
                        ))}
                        {reports.activities.trends && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              <strong>Participation Trend:</strong> {reports.activities.trends}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No activity participation data available yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Development Milestones */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="Development Milestones" />
                  <CardContent>
                    {reports.milestones.completed && reports.milestones.completed.length > 0 ? (
                      <Box>
                        <Typography variant="h6" gutterBottom color="success.main">
                          Recently Achieved
                        </Typography>
                        {reports.milestones.completed.slice(0, 3).map((milestone, idx) => (
                          <Box key={idx} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">✓ {milestone.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(milestone.achievedDate)}
                            </Typography>
                          </Box>
                        ))}
                        {reports.milestones.upcoming && reports.milestones.upcoming.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" gutterBottom color="warning.main">
                              Upcoming Goals
                            </Typography>
                            {reports.milestones.upcoming.slice(0, 2).map((milestone, idx) => (
                              <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                                • {milestone.name}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No milestone data available yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Nutrition Insights */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="Nutrition Insights" />
                  <CardContent>
                    {reports.nutrition.consumption && reports.nutrition.consumption.length > 0 ? (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Meal Consumption
                        </Typography>
                        {reports.nutrition.consumption.slice(0, 4).map((meal, idx) => (
                          <Box key={idx} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                              <CircularProgress
                                variant="determinate"
                                value={meal.consumption}
                                size={40}
                                thickness={4}
                                color={meal.consumption >= 80 ? 'success' : meal.consumption >= 60 ? 'primary' : 'warning'}
                              />
                              <Box
                                sx={{
                                  top: 0,
                                  left: 0,
                                  bottom: 0,
                                  right: 0,
                                  position: 'absolute',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Typography variant="caption" component="div" color="text.secondary">
                                  {meal.consumption}%
                                </Typography>
                              </Box>
                            </Box>
                            <Box>
                              <Typography variant="body2">{meal.type}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {meal.consumption >= 80 ? 'Great!' : meal.consumption >= 60 ? 'Good' : 'Needs attention'}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                        {reports.nutrition.preferences && reports.nutrition.preferences.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              <strong>Favorites:</strong> {reports.nutrition.preferences.join(', ')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No nutrition data available yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Quick Stats */}
              <Grid item xs={12}>
                <Card>
                  <CardHeader title="Quick Overview" />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {activities.count || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Activities
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main">
                            {gallery.length || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Photos Shared
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="info.main">
                            {meals.plan?.length || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Meal Plans
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="warning.main">
                            {reports.milestones.completed?.length || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Milestones Achieved
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

            {/* Admissions: add additional child */}
            {tab === 8 && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader title="Add Another Child (Admission)" subheader="Your request will be reviewed by admin" />
                      <CardContent>
                        {admissionMsg && (
                          <Typography color="success.main" sx={{ mb: 1 }}>{admissionMsg}</Typography>
                        )}
                        {admissionError && (
                          <Typography color="error.main" sx={{ mb: 1 }}>{admissionError}</Typography>
                        )}
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Child Name" value={admissionForm.childName} onChange={(e) => setAdmissionForm(f => ({ ...f, childName: e.target.value }))} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth type="date" label="Date of Birth" value={admissionForm.childDob} onChange={(e) => setAdmissionForm(f => ({ ...f, childDob: e.target.value }))} InputLabelProps={{ shrink: true }} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField select fullWidth label="Gender" value={admissionForm.childGender} onChange={(e) => setAdmissionForm(f => ({ ...f, childGender: e.target.value }))}>
                              <MenuItem value="male">Male</MenuItem>
                              <MenuItem value="female">Female</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField select fullWidth label="Program" value={admissionForm.program} onChange={(e) => setAdmissionForm(f => ({ ...f, program: e.target.value }))}>
                              <MenuItem value="infant">Infant</MenuItem>
                              <MenuItem value="toddler">Toddler</MenuItem>
                              <MenuItem value="preschool">Preschool</MenuItem>
                              <MenuItem value="prekindergarten">Pre-Kindergarten</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth multiline minRows={3} label="Medical Info" value={admissionForm.medicalInfo} onChange={(e) => setAdmissionForm(f => ({ ...f, medicalInfo: e.target.value }))} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Emergency Contact Name" value={admissionForm.emergencyContactName} onChange={(e) => setAdmissionForm(f => ({ ...f, emergencyContactName: e.target.value }))} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Emergency Contact Phone (10 digits)" value={admissionForm.emergencyContactPhone} onChange={(e) => setAdmissionForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} />
                          </Grid>
                        </Grid>
                      </CardContent>
                      <CardContent>
                        <Button variant="contained" disabled={admissionLoading} onClick={async () => {
                          setAdmissionError('');
                          setAdmissionMsg('');
                          setAdmissionLoading(true);
                          try {
                            const payload = { ...admissionForm };
                            const res = await api.post('/api/parents/me/admissions', payload);
                            setAdmissionMsg('Admission submitted. Awaiting admin approval.');
                            setAdmissions(a => [res.data.admission, ...a]);
                            setAdmissionForm({ childName: '', childDob: '', childGender: 'male', program: 'preschool', medicalInfo: '', emergencyContactName: '', emergencyContactPhone: '' });
                          } catch (e) {
                            setAdmissionError(e?.response?.data?.message || 'Failed to submit admission');
                          } finally {
                            setAdmissionLoading(false);
                          }
                        }}>Submit Admission</Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader title="My Admissions" />
                      <CardContent>
                        {admissions.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">No admissions yet.</Typography>
                        ) : (
                          <Box>
                            {admissions.map((a) => (
                              <Box key={a._id} sx={{ mb: 1, p: 1, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                                <Typography variant="body2"><strong>{a.child?.name}</strong> — {new Date(a.child?.dateOfBirth).toLocaleDateString()} • {a.child?.gender}</Typography>
                                <Typography variant="caption" color="text.secondary">Status: {a.status}</Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Notifications: visitor, pickup, emergency alerts */}
            {tab === 9 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Visitor & Pickup Notifications" subheader="Real-time alerts from the center" />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        You will receive notifications when someone arrives for pickup or visits your child.
                      </Typography>
                      <Box sx={{ p: 2, bgcolor: 'warning.50', border: '1px dashed', borderColor: 'warning.main', borderRadius: 1 }}>
                        <Typography variant="body2"><strong>Example:</strong> Grandma approved for pickup at 3:10 PM.</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Emergency Alerts" subheader="Immediate notifications during emergencies" />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Critical alerts will be shown here and pushed to your device.
                      </Typography>
                      <Box sx={{ p: 2, bgcolor: 'error.50', border: '1px dashed', borderColor: 'error.main', borderRadius: 1 }}>
                        <Typography variant="body2"><strong>Example:</strong> Shelter-in-place drill completed successfully.</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Messaging: direct messages to staff/admin */}
            {tab === 10 && (
              <Card>
                <CardHeader title="Messages" subheader="Send a message to staff or administration" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField select fullWidth label="To" value={editFields.to || 'staff'} onChange={(e) => setEditFields(f => ({ ...f, to: e.target.value }))}>
                        <MenuItem value="staff">Assigned Staff</MenuItem>
                        <MenuItem value="admin">Administration</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <TextField fullWidth label="Subject" value={editFields.subject || ''} onChange={(e) => setEditFields(f => ({ ...f, subject: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth multiline minRows={4} label="Message" value={editFields.body || ''} onChange={(e) => setEditFields(f => ({ ...f, body: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" onClick={async () => {
                        try {
                          const payload = { to: editFields.to || 'staff', subject: editFields.subject || '', body: editFields.body || '' };
                          if (!payload.subject || !payload.body) return;
                          await api.post('/api/parents/me/messages', payload);
                          await api.get('/api/parents/me/messages');
                          setActivities(a => ({ ...a, recent: a.recent }));
                          setEditFields(f => ({ ...f, subject: '', body: '' }));
                          setGallery(g => g);
                          // optionally store messages state if needed
                        } catch (e) { console.error('Send message error:', e); }
                      }}>Send</Button>
                      <Button variant="text" onClick={async () => {
                        try { await api.get('/api/parents/me/messages'); } catch (e) { /* ignore */ }
                      }}>Refresh</Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Billing & Payments */}
            {tab === 11 && (
              <Card>
                <CardHeader title="Billing & Payments" subheader="View invoices and pay online" />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This is a preview. Integrate with your billing API to load invoices.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="outlined">View Latest Invoice</Button>
                    <Button variant="contained">Pay Now</Button>
                    <Button variant="text">Manage Subscription</Button>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Feedback & Complaints */}
            {tab === 12 && (
              <Card>
                <CardHeader title="Feedback & Complaints" subheader="Share your suggestions or concerns" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField select fullWidth label="Category" value={editFields.fbCategory || 'feedback'} onChange={(e) => setEditFields(f => ({ ...f, fbCategory: e.target.value }))}>
                        <MenuItem value="feedback">Feedback</MenuItem>
                        <MenuItem value="complaint">Complaint</MenuItem>
                        <MenuItem value="suggestion">Suggestion</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth label="Subject" value={editFields.fbSubject || ''} onChange={(e) => setEditFields(f => ({ ...f, fbSubject: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth multiline minRows={4} label="Details" value={editFields.fbDetails || ''} onChange={(e) => setEditFields(f => ({ ...f, fbDetails: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12}>
                      <Button variant="contained" onClick={async () => {
                        try {
                          const payload = { category: editFields.fbCategory || 'feedback', subject: editFields.fbSubject || '', details: editFields.fbDetails || '' };
                          if (!payload.subject || !payload.details) return;
                          await api.post('/api/parents/me/feedback', payload);
                          setEditFields(f => ({ ...f, fbSubject: '', fbDetails: '' }));
                        } catch (e) { console.error('Feedback submit error:', e); }
                      }}>Submit</Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}


          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ParentDashboard;