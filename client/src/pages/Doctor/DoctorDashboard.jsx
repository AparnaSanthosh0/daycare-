import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Stack
} from '@mui/material';
import {
  People,
  Add,
  Edit,
  Visibility,
  MedicalServices,
  CalendarToday,
  Medication,
  WarningAmber,
  EventAvailable,
  LocalHospital,
  ShoppingCart,
  Logout,
  KeyboardVoice
} from '@mui/icons-material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import VoiceAssistant from '../../VoiceAssistant';

const asArray = (value) => (Array.isArray(value) ? value : []);
const safeTrim = (value) => (typeof value === 'string' ? value.trim() : '');
const KNOWN_MEDICATION_TOKENS = [
  // pain/fever
  'paracetamol',
  'acetaminophen',
  'ibuprofen',
  // antibiotics
  'amoxicillin',
  'azithromycin',
  'cefixime',
  'ceftriaxone',
  'cephalexin',
  'augmentin',
  // allergy/cold
  'cetirizine',
  'loratadine',
  'diphenhydramine',
  // respiratory
  'salbutamol',
  'albuterol',
  'budesonide',
  // GI
  'ors',
  'oral rehydration',
  'ondansetron',
  // common “class” words that your backend demo logic understands
  'antibiotic',
  'antihistamine'
];

const KNOWN_SYMPTOM_KEYWORDS = [
  // fever
  'fever', 'temperature', 'hot', 'burning', 'pyrexia',
  // respiratory
  'cough', 'coughing', 'wheeze', 'wheezing', 'breathing', 'shortness', 'sneezing', 'sneeze',
  'runny nose', 'congestion', 'nasal', 'asthma', 'respiratory',
  // GI
  'stomach', 'vomit', 'vomiting', 'nausea', 'diarrhea', 'diarrhoea', 'constipation', 'abdominal', 'belly',
  // skin
  'rash', 'rashy', 'itching', 'itchy', 'red', 'swelling', 'swollen', 'hives', 'bumps',
  // general
  'pain', 'ache', 'aching', 'headache', 'sore', 'throat', 'ear', 'tired', 'fatigue', 'lethargy',
  'irritability', 'fussy', 'cranky', 'refusing', 'not eating', 'poor appetite', 'loss of appetite',
  // infection indicators
  'infection', 'infected', 'discharge', 'pus', 'pus-like', 'green', 'yellow', 'phlegm'
];

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [children, setChildren] = useState([]);
  const [allChildren, setAllChildren] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [statistics, setStatistics] = useState({
    totalChildren: 0,
    childrenWithAllergies: 0,
    childrenWithMedicalConditions: 0,
    recentCheckups: 0
  });
  const [activeTab, setActiveTab] = useState(0);
  const [selectedChild, setSelectedChild] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [childDialog, setChildDialog] = useState({ open: false, child: null });
  const [medicalRecordDialog, setMedicalRecordDialog] = useState({ open: false, child: null });
  const [medicalForm, setMedicalForm] = useState({
    allergies: [],
    medicalConditions: [],
    notes: ''
  });
  const [recordForm, setRecordForm] = useState({
    childId: '',
    childName: '',
    date: new Date().toISOString().split('T')[0],
    type: 'checkup',
    description: '',
    prescription: '',
    followUpDate: ''
  });
  const [appointments, setAppointments] = useState([]);
  const [appointmentFilter, setAppointmentFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [consultationDialog, setConsultationDialog] = useState({ open: false, appointment: null });
  const [consultationForm, setConsultationForm] = useState({
    diagnosis: '',
    prescription: '',
    healthAdvice: '',
    notes: ''
  });
  const [vaOpen, setVaOpen] = useState(false);
  const [aiHealthSummary, setAiHealthSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [healthAlerts, setHealthAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertExplanation, setAlertExplanation] = useState(null);
  const [symptomAnalysis, setSymptomAnalysis] = useState(null);
  const [symptomForm, setSymptomForm] = useState({ symptoms: '', duration: '', severity: 'low' });
  const [growthPrediction, setGrowthPrediction] = useState(null);
  const [growthForm, setGrowthForm] = useState({ height: '', weight: '', headCircumference: '' });
  const [medicationCheck, setMedicationCheck] = useState(null);
  const [medicationForm, setMedicationForm] = useState({ medications: '' });
  const [riskScore, setRiskScore] = useState(null);
  const [riskScoreLoading, setRiskScoreLoading] = useState(false);
  const [medicalReport, setMedicalReport] = useState(null);
  const [reportForm, setReportForm] = useState({ reportType: 'summary', dateRange: { start: '', end: '' } });
  const [healthPatterns, setHealthPatterns] = useState(null);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [aiFieldErrors, setAiFieldErrors] = useState({
    symptom: {},
    growth: {},
    medication: {},
    report: {}
  });

  const [prescriptionLog, setPrescriptionLog] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [emergenciesLoading, setEmergenciesLoading] = useState(false);
  const [emergencyDialog, setEmergencyDialog] = useState({ open: false });
  const [emergencyForm, setEmergencyForm] = useState({
    childId: '',
    reason: '',
    appointmentType: 'onsite',
    severity: 'medium',
    description: ''
  });
  const [aiInsightsLog, setAiInsightsLog] = useState(() => {
    try {
      const raw = localStorage.getItem('tinytots_doctor_ai_insights_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [editInsightDialog, setEditInsightDialog] = useState({ open: false, insight: null });
  const [editInsightNotes, setEditInsightNotes] = useState('');

  // Fetch assigned children
  const fetchChildren = async () => {
    try {
      setLoading(true);
      const assignedRes = await api.get('/doctor/children');
      const assignedList = Array.isArray(assignedRes.data) ? assignedRes.data : assignedRes.data?.children || [];
      setChildren(assignedList);

      try {
        const allRes = await api.get('/doctor/children/all');
        const allList = Array.isArray(allRes.data) ? allRes.data : allRes.data?.children || [];
        setAllChildren(allList);
      } catch (errorAll) {
        if (errorAll.response?.status === 403) {
          console.warn('Doctor account not authorized to view all children. Falling back to assigned list.');
          setAllChildren(assignedList);
        } else {
          console.error('Error fetching all children:', errorAll);
          setAllChildren(assignedList);
        }
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      setError('Failed to load children');
      setChildren([]);
      setAllChildren([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const [doctorStats, appointmentStats] = await Promise.all([
        api.get('/doctor/statistics'),
        api.get('/appointments/stats/doctor')
      ]);
      
      setStatistics({
        totalChildren: doctorStats.data?.totalChildren || 0,
        childrenWithAllergies: doctorStats.data?.childrenWithAllergies || 0,
        childrenWithMedicalConditions: doctorStats.data?.childrenWithMedicalConditions || 0,
        recentCheckups: appointmentStats.data?.today || 0
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

  // Fetch appointments
  const fetchAppointments = async (status = 'all') => {
    try {
      const response = await api.get('/appointments/doctor', {
        params: { status }
      });
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to load appointments');
    }
  };

  // Fetch doctor profile (for header name/specialization)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/doctor/profile');
        setDoctorProfile(response.data || null);
      } catch (err) {
        console.error('Error fetching doctor profile:', err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchChildren();
    fetchStatistics();
  }, [fetchStatistics]);

  // Persist prescriptions recorded in dashboard (medical records etc.)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tinytots_doctor_prescription_log_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      setPrescriptionLog(Array.isArray(parsed) ? parsed : []);
    } catch {
      // ignore
    }
  }, []);

  // Persist AI insights to localStorage (state is initialized from localStorage)
  useEffect(() => {
    try {
      localStorage.setItem('tinytots_doctor_ai_insights_v1', JSON.stringify(aiInsightsLog));
    } catch {
      // ignore
    }
  }, [aiInsightsLog]);

  useEffect(() => {
    try {
      localStorage.setItem('tinytots_doctor_prescription_log_v1', JSON.stringify(prescriptionLog));
    } catch {
      // ignore
    }
  }, [prescriptionLog]);

  const selectableChildren = useMemo(() => {
    const all = asArray(allChildren);
    const assigned = asArray(children);
    return all.length > 0 ? all : assigned;
  }, [allChildren, children]);
  const selectedChildForTools = useMemo(() => selectableChildren.find(child => child._id === selectedChildId) || null, [selectableChildren, selectedChildId]);
  const prescriptionRows = useMemo(() => {
    const rows = [];

    // Persisted appointment prescriptions
    asArray(appointments)
      .filter((a) => safeTrim(a?.prescription))
      .forEach((a) => {
        rows.push({
          id: `appointment:${a._id}`,
          source: 'appointment',
          appointmentId: a._id,
          childId: a.child?._id || a.child,
          childName: a.child ? `${a.child.firstName || ''} ${a.child.lastName || ''}`.trim() : '',
          date: a.completedAt || a.appointmentDate || a.createdAt,
          diagnosis: a.diagnosis || '',
          prescription: a.prescription,
          status: a.status || ''
        });
      });

    // Locally stored prescriptions (medical records, etc.)
    asArray(prescriptionLog).forEach((p) => {
      if (!safeTrim(p?.prescription)) return;
      rows.push({
        id: p.id || `log:${p.source || 'unknown'}:${p.appointmentId || p.childId || ''}:${p.date || ''}`,
        source: p.source || 'log',
        appointmentId: p.appointmentId,
        childId: p.childId,
        childName: p.childName || '',
        date: p.date,
        diagnosis: p.diagnosis || '',
        prescription: p.prescription,
        status: p.status || ''
      });
    });

    // de-dupe by id
    const byId = new Map();
    rows.forEach((r) => {
      if (!byId.has(r.id)) byId.set(r.id, r);
    });

    return Array.from(byId.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [appointments, prescriptionLog]);

  const addPrescriptionLogEntry = useCallback((entry) => {
    if (!entry) return;
    const id = entry.id || `${entry.source || 'unknown'}:${entry.appointmentId || entry.childId || 'unknown'}:${entry.date || Date.now()}`;
    setPrescriptionLog((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const next = [{ ...entry, id }, ...list.filter((p) => p?.id !== id)];
      return next.slice(0, 200); // keep recent 200
    });
  }, []);

  const addAiInsight = useCallback((insight) => {
    if (!insight) return;
    const id = insight.id || `${insight.type || 'unknown'}:${insight.childId || 'unknown'}:${insight.timestamp || Date.now()}`;
    setAiInsightsLog((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const next = [{ ...insight, id, timestamp: insight.timestamp || new Date().toISOString() }, ...list.filter((i) => i?.id !== id)];
      return next.slice(0, 100); // keep recent 100
    });
  }, []);

  const validateSymptomInputs = useCallback(() => {
    const errors = {};
    if (!selectedChildForTools?._id) errors.childId = 'Please select a child';
    const sym = safeTrim(symptomForm.symptoms);
    if (!sym) {
      errors.symptoms = 'Symptoms are required';
    } else if (sym.length < 3) {
      errors.symptoms = 'Please enter at least 3 characters';
    } else {
      // Check for valid symptom keywords
      const symLower = sym.toLowerCase();
      const hasValidSymptom = KNOWN_SYMPTOM_KEYWORDS.some((keyword) => symLower.includes(keyword));
      if (!hasValidSymptom) {
        // Block invalid inputs (like "bjjbod") - require real symptom keywords
        errors.symptoms = 'Please enter valid symptoms (e.g., fever, cough, rash, stomach pain, headache). Invalid text like "bjjbod" will not produce results.';
      }
    }
    const duration = symptomForm.duration === '' ? null : Number(symptomForm.duration);
    if (duration != null && (!Number.isFinite(duration) || duration <= 0)) errors.duration = 'Duration must be a positive number';
    if (duration != null && duration > 60) errors.duration = 'Duration looks too high (max 60 days)';
    setAiFieldErrors((prev) => ({ ...prev, symptom: errors }));
    if (Object.keys(errors).length > 0) {
      // Hide any old results if inputs become invalid
      setSymptomAnalysis(null);
    }
    return Object.keys(errors).length === 0;
  }, [selectedChildForTools, symptomForm.duration, symptomForm.symptoms]);

  const validateGrowthInputs = useCallback(() => {
    const errors = {};
    if (!selectedChildForTools?._id) errors.childId = 'Please select a child';
    const height = Number(growthForm.height);
    const weight = Number(growthForm.weight);
    const head = growthForm.headCircumference === '' ? null : Number(growthForm.headCircumference);
    if (!Number.isFinite(height) || height <= 0) errors.height = 'Height must be a positive number';
    if (!Number.isFinite(weight) || weight <= 0) errors.weight = 'Weight must be a positive number';
    if (head != null && (!Number.isFinite(head) || head <= 0)) errors.headCircumference = 'Head circumference must be a positive number';
    if (Number.isFinite(height) && (height < 30 || height > 220)) errors.height = 'Height should be between 30 and 220 cm';
    if (Number.isFinite(weight) && (weight < 1 || weight > 200)) errors.weight = 'Weight should be between 1 and 200 kg';
    if (head != null && Number.isFinite(head) && (head < 20 || head > 70)) errors.headCircumference = 'Head circumference should be between 20 and 70 cm';
    setAiFieldErrors((prev) => ({ ...prev, growth: errors }));
    if (Object.keys(errors).length > 0) {
      setGrowthPrediction(null);
    }
    return Object.keys(errors).length === 0;
  }, [selectedChildForTools, growthForm.height, growthForm.weight, growthForm.headCircumference]);

  const validateMedicationInputs = useCallback(() => {
    const errors = {};
    if (!selectedChildForTools?._id) errors.childId = 'Please select a child';
    const meds = medicationForm.medications
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    if (meds.length === 0) errors.medications = 'Enter at least one medication';
    const normalized = meds.map((m) => m.toLowerCase());
    const unknown = normalized
      .filter((m) => m.replace(/[^a-z]/g, '').length < 3)
      .map((m) => m);
    if (unknown.length > 0) {
      errors.medications = 'Medication names must contain letters (min 3 chars)';
    } else if (normalized.length > 0) {
      const notRecognized = normalized.filter(
        (m) => !KNOWN_MEDICATION_TOKENS.some((t) => m.includes(t))
      );
      if (notRecognized.length > 0) {
        errors.medications = `Unknown medication(s): ${notRecognized.join(', ')}. Use real medicine names (e.g., Paracetamol, Ibuprofen, Amoxicillin).`;
      }
    }
    setAiFieldErrors((prev) => ({ ...prev, medication: errors }));
    if (Object.keys(errors).length > 0) {
      // hide old result if user typed something invalid/unknown
      setMedicationCheck(null);
    }
    return { ok: Object.keys(errors).length === 0, meds };
  }, [selectedChildForTools, medicationForm.medications]);

  // Clear old AI results when inputs change (prevents stale "success" showing for new/invalid input)
  useEffect(() => {
    setSymptomAnalysis(null);
  }, [selectedChildId, symptomForm.symptoms, symptomForm.duration, symptomForm.severity]);

  useEffect(() => {
    setGrowthPrediction(null);
  }, [selectedChildId, growthForm.height, growthForm.weight, growthForm.headCircumference]);

  useEffect(() => {
    setMedicationCheck(null);
  }, [selectedChildId, medicationForm.medications]);

  useEffect(() => {
    setRiskScore(null);
  }, [selectedChildId]);

  useEffect(() => {
    setMedicalReport(null);
  }, [selectedChildId, reportForm.reportType, reportForm.dateRange?.start, reportForm.dateRange?.end]);

  const fetchEmergencies = async (status = 'all') => {
    try {
      setEmergenciesLoading(true);
      const response = await api.get('/doctor/emergencies', { params: { status } });
      setEmergencies(response.data || []);
    } catch (error) {
      console.error('Error fetching emergencies:', error);
      if (error.response?.status === 404) {
        // Route might not exist yet (server needs restart) - show empty list with hint
        setEmergencies([]);
        // Don't show error toast - just log
      } else {
        setError('Failed to load emergencies. Please ensure the server has been restarted.');
        setEmergencies([]);
      }
    } finally {
      setEmergenciesLoading(false);
    }
  };

  const handleSubmitEmergency = async () => {
    const childId = emergencyForm.childId || selectedChildId || '';
    const reason = safeTrim(emergencyForm.reason);
    if (!childId || !reason) {
      setError('Please select a child and enter an emergency reason');
      return;
    }

    try {
      const payload = {
        childId,
        reason,
        appointmentType: emergencyForm.appointmentType || 'onsite',
        severity: emergencyForm.severity || 'medium',
        description: safeTrim(emergencyForm.description)
      };
      await api.post('/doctor/emergencies', payload);
      setSuccess('Emergency reported successfully');
      setEmergencyDialog({ open: false });
      setEmergencyForm({ childId: '', reason: '', appointmentType: 'onsite', severity: 'medium', description: '' });
      fetchEmergencies('all');
      fetchAppointments('all');
      fetchStatistics();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to report emergency');
    }
  };

  const handleUpdateEmergencyStatus = async (appointmentId, status) => {
    try {
      await api.patch(`/doctor/emergencies/${appointmentId}/status`, { status });
      setSuccess('Emergency updated successfully');
      fetchEmergencies('all');
      fetchAppointments('all');
      fetchStatistics();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update emergency');
    }
  };

  // View child details
  const handleViewChild = async (childId) => {
    try {
      const response = await api.get(`/doctor/children/${childId}`);
      setSelectedChild(response.data);
      setMedicalForm({
        allergies: response.data.allergies || [],
        medicalConditions: response.data.medicalConditions || [],
        notes: response.data.notes || ''
      });
      setChildDialog({ open: true, child: response.data });
    } catch (error) {
      setError('Failed to load child details');
    }
  };

  // Update medical information
  const handleUpdateMedical = async () => {
    try {
      await api.put(`/doctor/children/${selectedChild._id}/medical`, medicalForm);
      setSuccess('Medical information updated successfully');
      setChildDialog({ open: false, child: null });
      fetchChildren();
      fetchStatistics();
    } catch (error) {
      setError('Failed to update medical information');
    }
  };

  // Add medical record
  const handleAddMedicalRecord = async () => {
    const childIdForRecord = recordForm.childId || selectedChild?._id;
    if (!childIdForRecord) {
      setError('Select a child before saving the medical record');
      return;
    }

    try {
      const payload = {
        date: recordForm.date,
        type: recordForm.type,
        description: recordForm.description,
        prescription: recordForm.prescription,
        followUpDate: recordForm.followUpDate
      };
      const res = await api.post(`/doctor/children/${childIdForRecord}/medical-records`, payload);
      const record = res.data?.record;
      if (payload.prescription && safeTrim(payload.prescription)) {
        addPrescriptionLogEntry({
          source: 'medical-record',
          childId: childIdForRecord,
          childName:
            recordForm.childName ||
            (selectedChild ? `${selectedChild.firstName || ''} ${selectedChild.lastName || ''}`.trim() : ''),
          date: payload.date || new Date().toISOString(),
          diagnosis: payload.type || '',
          prescription: payload.prescription,
          notes: payload.description || ''
        });
      }
      setSuccess('Medical record added successfully');
      setMedicalRecordDialog({ open: false, child: null });
      setRecordForm({
        childId: '',
        childName: '',
        date: new Date().toISOString().split('T')[0],
        type: 'checkup',
        description: '',
        prescription: '',
        followUpDate: ''
      });
      if (selectedChild) {
        handleViewChild(selectedChild._id);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to add medical record');
    }
  };

  // Add allergy
  const handleAddAllergy = () => {
    const allergy = prompt('Enter allergy:');
    if (allergy && allergy.trim()) {
      setMedicalForm({
        ...medicalForm,
        allergies: [...medicalForm.allergies, allergy.trim()]
      });
    }
  };

  // Remove allergy
  const handleRemoveAllergy = (index) => {
    setMedicalForm({
      ...medicalForm,
      allergies: medicalForm.allergies.filter((_, i) => i !== index)
    });
  };

  // Add medical condition
  const handleAddMedicalCondition = () => {
    const condition = prompt('Enter medical condition:');
    if (condition && condition.trim()) {
      setMedicalForm({
        ...medicalForm,
        medicalConditions: [
          ...medicalForm.medicalConditions,
          { condition: condition.trim(), medication: '', instructions: '' }
        ]
      });
    }
  };

  // Remove medical condition
  const handleRemoveMedicalCondition = (index) => {
    setMedicalForm({
      ...medicalForm,
      medicalConditions: medicalForm.medicalConditions.filter((_, i) => i !== index)
    });
  };

  // Appointment Functions
  const handleUpdateAppointmentStatus = async (appointmentId, status, additionalData = {}) => {
    try {
      await api.patch(`/api/appointments/${appointmentId}/status`, {
        status,
        ...additionalData
      });
      setSuccess(`Appointment ${status} successfully`);
      fetchAppointments(appointmentFilter);
      fetchStatistics();
    } catch (error) {
      setError(`Failed to update appointment: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleOpenConsultation = (appointment) => {
    setSelectedAppointment(appointment);
    setConsultationForm({
      diagnosis: appointment.diagnosis || '',
      prescription: appointment.prescription || '',
      healthAdvice: appointment.healthAdvice || '',
      notes: appointment.notes || ''
    });
    setConsultationDialog({ open: true, appointment });
  };

  const handleSaveConsultation = async () => {
    try {
      if (!selectedAppointment) return;

      const res = await api.patch(`/api/appointments/${selectedAppointment._id}/consultation`, consultationForm);
      const updatedAppointment = res.data?.appointment || res.data;
      if (updatedAppointment?.prescription && safeTrim(updatedAppointment.prescription)) {
        addPrescriptionLogEntry({
          source: 'appointment',
          appointmentId: updatedAppointment._id,
          childId: updatedAppointment.child?._id || updatedAppointment.child,
          childName: updatedAppointment.child
            ? `${updatedAppointment.child.firstName || ''} ${updatedAppointment.child.lastName || ''}`.trim()
            : selectedAppointment.child
            ? `${selectedAppointment.child.firstName || ''} ${selectedAppointment.child.lastName || ''}`.trim()
            : '',
          date: updatedAppointment.completedAt || updatedAppointment.appointmentDate || new Date().toISOString(),
          diagnosis: updatedAppointment.diagnosis || consultationForm.diagnosis || '',
          prescription: updatedAppointment.prescription,
          notes: updatedAppointment.notes || consultationForm.notes || ''
        });
      }
      setSuccess('Consultation details saved successfully');
      setConsultationDialog({ open: false, appointment: null });
      fetchAppointments(appointmentFilter);
      fetchStatistics();
    } catch (error) {
      setError(`Failed to save consultation: ${error.response?.data?.message || error.message}`);
    }
  };

  useEffect(() => {
    if (activeTab === 2) {
      fetchAppointments(appointmentFilter);
    }
  }, [activeTab, appointmentFilter]);

  useEffect(() => {
    if (activeTab === 4) {
      // Prescriptions tab needs full appointment history to list prescriptions
      fetchAppointments('all');
    }
    if (activeTab === 5) {
      fetchEmergencies('all');
    }
  }, [activeTab]);

  const handleVaOpen = () => setVaOpen(true);
  const handleVaClose = () => setVaOpen(false);

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Doctor Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {doctorProfile
              ? `Dr. ${doctorProfile.firstName} ${doctorProfile.lastName} • ${doctorProfile.doctor?.specialization || 'Pediatric Specialist'}`
              : 'Pediatric Specialist'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            color="inherit"
            sx={{ position: 'relative', color: 'text.secondary', p: 1 }}
            onClick={handleVaOpen}
            aria-label="Open voice assistant"
          >
            <KeyboardVoice sx={{ color: '#14B8A6' }} />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<ShoppingCart />}
            onClick={() => navigate('/shop')}
            sx={{
              bgcolor: '#14B8A6',
              '&:hover': { bgcolor: '#0d9488' },
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Shop
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<WarningAmber />}
            onClick={() => {
              setEmergencyForm((prev) => ({
                ...prev,
                childId: prev.childId || selectedChildId || ''
              }));
              setEmergencyDialog({ open: true });
              setActiveTab(5);
            }}
          >
            Report Emergency
          </Button>
          <Button
            variant="outlined"
            startIcon={<Logout />}
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Logout
          </Button>
        </Stack>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <People color="primary" />
                <Typography color="text.secondary">Total Patients</Typography>
              </Stack>
              <Typography variant="h4" sx={{ mt: 1 }}>{statistics.totalChildren}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <EventAvailable color="success" />
                <Typography color="text.secondary">Today's Appointments</Typography>
              </Stack>
              <Typography variant="h4" sx={{ mt: 1 }}>{statistics.recentCheckups || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Medication color="warning" />
                <Typography color="text.secondary">Active Prescriptions</Typography>
              </Stack>
              <Typography variant="h4" sx={{ mt: 1 }}>{statistics.childrenWithMedicalConditions}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <WarningAmber color="error" />
                <Typography color="text.secondary">Incidents This Month</Typography>
              </Stack>
              <Typography variant="h4" sx={{ mt: 1 }}>{statistics.childrenWithAllergies}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" icon={<People />} />
        <Tab label="Medical Records" icon={<MedicalServices />} />
        <Tab label="Appointments" icon={<CalendarToday />} />
        <Tab label="AI Health Insights" icon={<LocalHospital />} />
        <Tab label="Prescriptions" icon={<Medication />} />
        <Tab label="Emergencies" icon={<WarningAmber />} />
      </Tabs>

      {/* Assigned Children Tab */}
      {activeTab === 0 && (
        <>
          {/* Today schedule mock (placeholder) */}
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Today's Schedule
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Typography>
            {[...(children.slice(0, 3)).map((child, idx) => ({
              time: `${9 + idx}:00 AM`,
              name: `${child.firstName} ${child.lastName}`,
              note: child.program || 'Routine Check-up',
              status: idx === 0 ? 'Completed' : idx === 1 ? 'In Progress' : 'Scheduled'
            }))].map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: idx === 2 ? 'none' : '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">{item.time}</Typography>
                  <Typography variant="body1" fontWeight={600}>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.note}</Typography>
                </Box>
                <Chip
                  label={item.status}
                  color={item.status === 'Completed' ? 'success' : item.status === 'In Progress' ? 'primary' : 'default'}
                  variant="outlined"
                  size="small"
                  sx={{ minWidth: 96, justifyContent: 'center' }}
                />
              </Box>
            ))}
          </Paper>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Child</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Program</TableCell>
                  <TableCell>Allergies</TableCell>
                  <TableCell>Medical Conditions</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {children.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">No children assigned</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  children.map((child) => (
                    <TableRow key={child._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={child.profileImage ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${child.profileImage}` : null}>
                            {child.firstName?.[0] || 'C'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {child.firstName} {child.lastName}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {child.dateOfBirth
                          ? `${Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))} years`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip label={child.program || 'N/A'} size="small" />
                      </TableCell>
                      <TableCell>
                        {child.allergies && child.allergies.length > 0 ? (
                          <Chip label={`${child.allergies.length} allergies`} color="warning" size="small" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">None</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {child.medicalConditions && child.medicalConditions.length > 0 ? (
                          <Chip label={`${child.medicalConditions.length} conditions`} color="error" size="small" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">None</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewChild(child._id)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Add Medical Record">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setRecordForm({ ...recordForm, childId: child._id });
                                setMedicalRecordDialog({ open: true, child });
                              }}
                            >
                              <Add />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Medical Records Tab */}
      {activeTab === 1 && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Medical Records</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => setMedicalRecordDialog({ open: true, child: null })}
              >
                Add New Record
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Child Name</TableCell>
                    <TableCell>Age</TableCell>
                    <TableCell>Allergies</TableCell>
                    <TableCell>Last Visit</TableCell>
                    <TableCell>Health Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {children.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">No medical records found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    children.slice(0, 4).map((child) => (
                      <TableRow key={child._id}>
                        <TableCell>{child.firstName} {child.lastName}</TableCell>
                        <TableCell>
                          {child.dateOfBirth
                            ? `${Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))} years`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {child.allergies && child.allergies.length > 0 ? (
                            <Chip label={child.allergies[0]} color="error" size="small" variant="outlined" />
                          ) : (
                            <Chip label="None" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          {child.lastVisit 
                            ? new Date(child.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Dec 1, 2025'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={child.healthStatus || 'Good'} 
                            color={child.healthStatus === 'Monitor' ? 'warning' : 'success'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="text"
                            color="primary"
                            onClick={() => handleViewChild(child._id)}
                          >
                            View Full Record
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Create Medical Record Form */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Create Medical Record</Typography>
            
            {/* List of Children */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Registered Children</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Child Name</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell>Allergies</TableCell>
                      <TableCell>Program</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {children.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">No children registered</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      children.map((child) => (
                        <TableRow key={child._id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar 
                                src={child.profileImage ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${child.profileImage}` : null}
                                sx={{ width: 32, height: 32 }}
                              >
                                {child.firstName?.[0] || 'C'}
                              </Avatar>
                              <Typography variant="body2">
                                {child.firstName} {child.lastName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {child.dateOfBirth
                              ? `${Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))} years`
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {child.allergies && child.allergies.length > 0 ? (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {child.allergies.slice(0, 2).map((allergy, idx) => (
                                  <Chip key={idx} label={allergy} color="error" size="small" variant="outlined" />
                                ))}
                                {child.allergies.length > 2 && (
                                  <Chip label={`+${child.allergies.length - 2}`} size="small" variant="outlined" />
                                )}
                              </Box>
                            ) : (
                              <Chip label="None" size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip label={child.program || 'N/A'} size="small" />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setRecordForm({ 
                                  ...recordForm, 
                                  childId: child._id,
                                  childName: `${child.firstName} ${child.lastName}`
                                });
                              }}
                            >
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Divider sx={{ my: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Select Child"
                  value={recordForm.childName || 'No child selected'}
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Visit Type</InputLabel>
                  <Select
                    value={recordForm.type || 'checkup'}
                    onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
                    label="Visit Type"
                  >
                    <MenuItem value="checkup">Routine Check-up</MenuItem>
                    <MenuItem value="vaccination">Vaccination</MenuItem>
                    <MenuItem value="illness">Illness</MenuItem>
                    <MenuItem value="emergency">Emergency</MenuItem>
                    <MenuItem value="followup">Follow-up</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Diagnosis / Observations"
                  placeholder="Enter medical observations..."
                  value={recordForm.description || ''}
                  onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Treatment / Recommendations"
                  placeholder="Enter treatment details..."
                  value={recordForm.prescription || ''}
                  onChange={(e) => setRecordForm({ ...recordForm, prescription: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<Add />}
                  onClick={handleAddMedicalRecord}
                >
                  Save Record
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}

      {/* Appointments Tab */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Appointments</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={appointmentFilter}
                onChange={(e) => {
                  setAppointmentFilter(e.target.value);
                  fetchAppointments(e.target.value);
                }}
                label="Filter"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Child</TableCell>
                  <TableCell>Parent</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">No appointments found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((appointment) => (
                    <TableRow key={appointment._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {appointment.appointmentTime}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {appointment.child?.firstName?.[0]}
                          </Avatar>
                          <Typography variant="body2">
                            {appointment.child?.firstName} {appointment.child?.lastName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {appointment.parent?.firstName} {appointment.parent?.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{appointment.reason}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appointment.appointmentType === 'online' ? 'Online' : 'On-site'}
                          size="small"
                          color={appointment.appointmentType === 'online' ? 'info' : 'default'}
                        />
                        {appointment.isEmergency && (
                          <Chip label="Emergency" size="small" color="error" sx={{ ml: 0.5 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          size="small"
                          color={
                            appointment.status === 'confirmed' ? 'success' :
                            appointment.status === 'completed' ? 'info' :
                            appointment.status === 'cancelled' ? 'error' :
                            'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {appointment.status === 'pending' && (
                            <>
                              <Tooltip title="Confirm">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleUpdateAppointmentStatus(appointment._id, 'confirmed')}
                                >
                                  <EventAvailable fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancel">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    const reason = prompt('Reason for cancellation:');
                                    if (reason) {
                                      handleUpdateAppointmentStatus(appointment._id, 'cancelled', { cancelReason: reason });
                                    }
                                  }}
                                >
                                  <WarningAmber fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {(appointment.status === 'confirmed' || appointment.status === 'completed') && (
                            <Tooltip title="Add Consultation">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenConsultation(appointment)}
                              >
                                <Add fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedAppointment(appointment)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* AI Health Insights Tab */}
      {activeTab === 3 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">AI Health Summary Generator</Typography>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select Child</InputLabel>
                <Select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  label="Select Child"
                >
                  {selectableChildren.map((child) => (
                    <MenuItem key={child._id} value={child._id}>
                      {child.firstName} {child.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {selectedChildId && (
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={async () => {
                    try {
                      setAiSummaryLoading(true);
                      const response = await api.post(`/doctor/ai/health-summary/${selectedChildId}`, {});
                      setAiHealthSummary(response.data);
                      setSuccess('Health summary generated successfully');
                    } catch (error) {
                      setError('Failed to generate health summary: ' + (error.response?.data?.message || error.message));
                      console.error('Health summary error:', error);
                    } finally {
                      setAiSummaryLoading(false);
                    }
                  }}
                  disabled={aiSummaryLoading}
                >
                  {aiSummaryLoading ? 'Generating...' : 'Generate AI Health Summary'}
                </Button>
              </Box>
            )}

            {aiHealthSummary && (
              <Box>
                <Card sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Health Summary for {aiHealthSummary.childInfo.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Age: {aiHealthSummary.childInfo.age} • Gender: {aiHealthSummary.childInfo.gender}
                    </Typography>
                    <Chip 
                      label={`Overall Health: ${aiHealthSummary.overallHealth}`}
                      color={aiHealthSummary.overallHealth === 'Good' ? 'success' : aiHealthSummary.overallHealth === 'Fair' ? 'warning' : 'error'}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>

                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Health Summary
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {aiHealthSummary.healthSummary}
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Recent Visit Notes
                    </Typography>
                    {asArray(aiHealthSummary.visitNotes).map((note, idx) => (
                      <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {note.date} • {note.status}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                          Reason: {note.reason}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          <strong>Diagnosis:</strong> {note.diagnosis}
                        </Typography>
                        {note.prescription !== 'No prescription' && (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            <strong>Prescription:</strong> {note.prescription}
                          </Typography>
                        )}
                        {note.advice !== 'No specific advice recorded' && (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            <strong>Advice:</strong> {note.advice}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </CardContent>
                </Card>

                {aiHealthSummary.keyFindings && aiHealthSummary.keyFindings.length > 0 && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Key Findings
                      </Typography>
                      {aiHealthSummary.keyFindings.map((finding, idx) => (
                        <Alert 
                          key={idx} 
                          severity={finding.severity === 'high' ? 'error' : 'warning'} 
                          sx={{ mt: 1 }}
                        >
                          <Typography variant="body2">
                            <strong>{finding.type.replace('_', ' ').toUpperCase()}:</strong> {finding.description}
                          </Typography>
                        </Alert>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {aiHealthSummary.recommendations && aiHealthSummary.recommendations.length > 0 && (
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        AI Recommendations
                      </Typography>
                      {asArray(aiHealthSummary.recommendations).map((rec, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f0f7ff', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip 
                              label={rec.priority.toUpperCase()} 
                              color={rec.priority === 'high' ? 'error' : 'warning'} 
                              size="small" 
                            />
                            <Chip label={rec.category.replace('_', ' ')} size="small" variant="outlined" />
                          </Box>
                          <Typography variant="body2" fontWeight={600} gutterBottom>
                            {rec.recommendation}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            <strong>Explanation:</strong> {rec.explanation}
                          </Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}
          </Paper>

          {/* Predictive Health Alerts */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Predictive Health Alerts</Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={async () => {
                  try {
                    setAlertsLoading(true);
                    const response = await api.get('/doctor/ai/health-alerts', {});
                    setHealthAlerts(response.data.alerts || []);
                  } catch (error) {
                    setError('Failed to fetch health alerts: ' + (error.response?.data?.message || error.message));
                    console.error('Health alerts error:', error);
                  } finally {
                    setAlertsLoading(false);
                  }
                }}
                disabled={alertsLoading}
              >
                {alertsLoading ? 'Analyzing...' : 'Refresh Alerts'}
              </Button>
            </Box>

            {healthAlerts.length === 0 ? (
              <Alert severity="info">
                No health alerts detected. Click "Refresh Alerts" to analyze all assigned children.
              </Alert>
            ) : (
              <Box>
                {healthAlerts.map((childAlert) => (
                  <Card key={childAlert.childId} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {childAlert.childName}
                      </Typography>
                      {asArray(childAlert.alerts).map((alert, idx) => (
                        <Alert 
                          key={idx}
                          severity={alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info'}
                          sx={{ mt: 1 }}
                          action={
                            <Button
                              size="small"
                              onClick={async () => {
                                try {
                                  const response = await api.post('/doctor/ai/explain', {
                                    alertType: alert.type,
                                    childId: childAlert.childId,
                                    data: alert
                                  });
                                  setAlertExplanation(response.data);
                                  setSelectedAlert(alert);
                                } catch (error) {
                                  setError('Failed to generate explanation');
                                }
                              }}
                            >
                              Explain
                            </Button>
                          }
                        >
                          <Typography variant="subtitle2" fontWeight={600}>
                            {alert.title}
                          </Typography>
                          <Typography variant="body2">
                            {alert.description}
                          </Typography>
                          {alert.recommendedAction && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                              <strong>Recommended:</strong> {alert.recommendedAction}
                            </Typography>
                          )}
                        </Alert>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>

          {/* Explainable AI Dialog */}
          <Dialog
            open={!!alertExplanation}
            onClose={() => {
              setAlertExplanation(null);
              setSelectedAlert(null);
            }}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Explainable AI: Why was this alert generated?
            </DialogTitle>
            <DialogContent>
              {alertExplanation && (
                <Box sx={{ pt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {selectedAlert?.title}
                  </Typography>
                  
                  <Card sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Why was this alert generated?
                      </Typography>
                      <Typography variant="body2">
                        {alertExplanation.explanation.why}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Factors Considered
                      </Typography>
                      <List>
                        {asArray(alertExplanation?.explanation?.factors).map((factor, idx) => (
                          <ListItem key={idx}>
                            <ListItemText primary={factor} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>

                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        AI Reasoning
                      </Typography>
                      <Typography variant="body2">
                        {alertExplanation.explanation.reasoning}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Confidence Level:
                    </Typography>
                    <Chip 
                      label={alertExplanation.confidence.toUpperCase()} 
                      color={alertExplanation.confidence === 'high' ? 'success' : 'warning'} 
                      size="small" 
                    />
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setAlertExplanation(null);
                setSelectedAlert(null);
              }}>
                Close
              </Button>
            </DialogActions>
          </Dialog>

          {/* AI Insights Log - Saved AI Analysis Results */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Saved AI Insights</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  try {
                    const blob = new Blob([JSON.stringify(aiInsightsLog, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `doctor-ai-insights-${Date.now()}.json`;
                    a.click();
                  } catch {
                    setError('Failed to export AI insights');
                  }
                }}
              >
                Export
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              All AI analysis results (symptom analysis, growth predictions, medication checks, health summaries, risk scores) are automatically saved here.
            </Typography>
            {aiInsightsLog.length === 0 ? (
              <Alert severity="info">No AI insights saved yet. Run any AI tool to see results here.</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {aiInsightsLog.slice(0, 20).map((insight) => (
                  <Card key={insight.id} variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Chip
                          size="small"
                          label={insight.type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
                          color="primary"
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="subtitle2" fontWeight={600}>
                          {insight.childName || 'Unknown Child'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {insight.timestamp ? new Date(insight.timestamp).toLocaleString() : 'Unknown date'}
                        </Typography>
                      </Box>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditInsightDialog({ open: true, insight });
                            setEditInsightNotes(insight.notes || '');
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {insight.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                        <strong>Notes:</strong> {insight.notes}
                      </Typography>
                    )}
                    {insight.type === 'symptom-analysis' && insight.result && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Input:</strong> {insight.input?.symptoms || 'N/A'} (Duration: {insight.input?.duration || 0} days, Severity: {insight.input?.severity || 'N/A'})
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          <strong>Urgency:</strong> {insight.result.urgency || 'N/A'} • <strong>Confidence:</strong> {insight.result.aiConfidence || 'N/A'}
                        </Typography>
                        {insight.result.possibleConditions && insight.result.possibleConditions.length > 0 && (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            <strong>Possible Conditions:</strong> {insight.result.possibleConditions.slice(0, 3).map((c) => c.condition || c).join(', ')}
                          </Typography>
                        )}
                      </Box>
                    )}
                    {insight.type === 'growth-prediction' && insight.result && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Current:</strong> H: {insight.input?.height || 'N/A'}cm, W: {insight.input?.weight || 'N/A'}kg
                        </Typography>
                        {insight.result.percentiles && (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            <strong>Percentiles:</strong> Height {insight.result.percentiles.height?.toFixed(0) || 'N/A'}th, Weight {insight.result.percentiles.weight?.toFixed(0) || 'N/A'}th
                          </Typography>
                        )}
                      </Box>
                    )}
                    {insight.type === 'medication-check' && insight.result && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Medications:</strong> {Array.isArray(insight.input?.medications) ? insight.input.medications.join(', ') : 'N/A'}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          <strong>Status:</strong> {insight.result.safeToPrescribe ? '✅ Safe to prescribe' : '⚠️ Interactions detected'}
                        </Typography>
                      </Box>
                    )}
                    {insight.type === 'risk-score' && insight.result && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Risk Score:</strong> {insight.result.overallRiskScore || 'N/A'} ({insight.result.riskLevel || 'N/A'} risk)
                        </Typography>
                      </Box>
                    )}
                    {insight.type === 'health-summary' && insight.result && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Overall Health:</strong> {insight.result.overallHealth || 'N/A'}
                        </Typography>
                      </Box>
                    )}
                  </Card>
                ))}
                {aiInsightsLog.length > 20 && (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
                    Showing 20 most recent. Total: {aiInsightsLog.length}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* Edit AI Insight Dialog */}
      <Dialog
        open={editInsightDialog.open}
        onClose={() => setEditInsightDialog({ open: false, insight: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit AI Insight</DialogTitle>
        <DialogContent>
          {editInsightDialog.insight && (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Doctor's notes"
              value={editInsightNotes}
              onChange={(e) => setEditInsightNotes(e.target.value)}
              placeholder="Add or edit notes for this insight..."
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditInsightDialog({ open: false, insight: null })}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const id = editInsightDialog.insight?.id;
              if (id) {
                setAiInsightsLog((prev) =>
                  prev.map((i) => (i.id === id ? { ...i, notes: editInsightNotes } : i))
                );
              }
              setEditInsightDialog({ open: false, insight: null });
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Consultation Dialog */}
      <Dialog
        open={consultationDialog.open}
        onClose={() => setConsultationDialog({ open: false, appointment: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Add Consultation - {selectedAppointment?.child?.firstName} {selectedAppointment?.child?.lastName}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Diagnosis"
                value={consultationForm.diagnosis}
                onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
                placeholder="Enter diagnosis..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Prescription"
                value={consultationForm.prescription}
                onChange={(e) => setConsultationForm({ ...consultationForm, prescription: e.target.value })}
                placeholder="Enter prescription details..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Health Advice"
                value={consultationForm.healthAdvice}
                onChange={(e) => setConsultationForm({ ...consultationForm, healthAdvice: e.target.value })}
                placeholder="Enter health advice..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Additional Notes"
                value={consultationForm.notes}
                onChange={(e) => setConsultationForm({ ...consultationForm, notes: e.target.value })}
                placeholder="Enter additional notes..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConsultationDialog({ open: false, appointment: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveConsultation}
            disabled={!consultationForm.diagnosis}
          >
            Save Consultation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Child Details Dialog */}
      <Dialog
        open={childDialog.open}
        onClose={() => setChildDialog({ open: false, child: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Medical Information - {selectedChild?.firstName} {selectedChild?.lastName}
        </DialogTitle>
        <DialogContent>
          {selectedChild && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Date of Birth</Typography>
                  <Typography variant="body1">
                    {selectedChild.dateOfBirth
                      ? new Date(selectedChild.dateOfBirth).toLocaleDateString()
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Program</Typography>
                  <Typography variant="body1">{selectedChild.program || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">Allergies</Typography>
                    <Button size="small" startIcon={<Add />} onClick={handleAddAllergy}>
                      Add
                    </Button>
                  </Box>
                  {medicalForm.allergies.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {medicalForm.allergies.map((allergy, index) => (
                        <Chip
                          key={index}
                          label={allergy}
                          onDelete={() => handleRemoveAllergy(index)}
                          color="warning"
                          size="small"
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No allergies recorded</Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">Medical Conditions</Typography>
                    <Button size="small" startIcon={<Add />} onClick={handleAddMedicalCondition}>
                      Add
                    </Button>
                  </Box>
                  {medicalForm.medicalConditions.length > 0 ? (
                    <List>
                      {medicalForm.medicalConditions.map((condition, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={condition.condition || condition}
                            secondary={
                              typeof condition === 'object'
                                ? `${condition.medication ? `Medication: ${condition.medication}` : ''} ${condition.instructions ? ` | Instructions: ${condition.instructions}` : ''}`
                                : ''
                            }
                          />
                          <IconButton size="small" onClick={() => handleRemoveMedicalCondition(index)}>
                            <Edit />
                          </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No medical conditions recorded</Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Medical Notes"
                    value={medicalForm.notes}
                    onChange={(e) => setMedicalForm({ ...medicalForm, notes: e.target.value })}
                    placeholder="Enter medical notes, observations, or records..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChildDialog({ open: false, child: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateMedical}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Medical Record Dialog */}
      <Dialog
        open={medicalRecordDialog.open}
        onClose={() => {
          setMedicalRecordDialog({ open: false, child: null });
          setRecordForm({
            date: new Date().toISOString().split('T')[0],
            type: 'checkup',
            description: '',
            prescription: '',
            followUpDate: ''
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Add Medical Record - {medicalRecordDialog.child?.firstName} {medicalRecordDialog.child?.lastName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="Date"
              value={recordForm.date}
              onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
              required
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Record Type</InputLabel>
              <Select
                value={recordForm.type}
                onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
                label="Record Type"
              >
                <MenuItem value="checkup">Checkup</MenuItem>
                <MenuItem value="vaccination">Vaccination</MenuItem>
                <MenuItem value="illness">Illness</MenuItem>
                <MenuItem value="injury">Injury</MenuItem>
                <MenuItem value="medication">Medication</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={recordForm.description}
              onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
              placeholder="Describe the medical record..."
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Prescription (if any)"
              value={recordForm.prescription}
              onChange={(e) => setRecordForm({ ...recordForm, prescription: e.target.value })}
              placeholder="Enter prescription details..."
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="date"
              label="Follow-up Date (optional)"
              value={recordForm.followUpDate}
              onChange={(e) => setRecordForm({ ...recordForm, followUpDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setMedicalRecordDialog({ open: false, child: null });
            setRecordForm({
              date: new Date().toISOString().split('T')[0],
              type: 'checkup',
              description: '',
              prescription: '',
              followUpDate: ''
            });
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddMedicalRecord} disabled={!recordForm.description}>
            Add Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Tools (AI/ML) */}
      {activeTab === 3 && (
        <Box>
          <Grid container spacing={3}>
            {/* AI Symptom Analyzer */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🤖 AI Symptom Analyzer & Diagnosis Assistant
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={selectedChildId}
                    onChange={(e) => {
                      setSelectedChildId(e.target.value);
                      setAiFieldErrors((prev) => ({ ...prev, symptom: { ...prev.symptom, childId: undefined } }));
                    }}
                    label="Select Child"
                  >
                    {selectableChildren.map((child) => (
                      <MenuItem key={child._id} value={child._id}>
                        {child.firstName} {child.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Symptoms"
                  value={symptomForm.symptoms}
                  onChange={(e) => {
                    setSymptomForm({ ...symptomForm, symptoms: e.target.value });
                    setAiFieldErrors((prev) => ({ ...prev, symptom: { ...prev.symptom, symptoms: undefined } }));
                  }}
                  placeholder="Describe symptoms (e.g., fever, cough, rash)..."
                  error={!!aiFieldErrors.symptom.symptoms}
                  helperText={aiFieldErrors.symptom.symptoms || ''}
                  sx={{ mb: 2 }}
                />
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Duration (days)"
                      value={symptomForm.duration}
                      onChange={(e) => {
                        setSymptomForm({ ...symptomForm, duration: e.target.value });
                        setAiFieldErrors((prev) => ({ ...prev, symptom: { ...prev.symptom, duration: undefined } }));
                      }}
                      error={!!aiFieldErrors.symptom.duration}
                      helperText={aiFieldErrors.symptom.duration || ''}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Severity</InputLabel>
                      <Select
                        value={symptomForm.severity}
                        onChange={(e) => setSymptomForm({ ...symptomForm, severity: e.target.value })}
                        label="Severity"
                      >
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={async () => {
                    const ok = validateSymptomInputs();
                    if (!ok) {
                      setError('Please fix the highlighted fields');
                      return;
                    }
                    try {
                      const dobMs = selectedChildForTools?.dateOfBirth ? new Date(selectedChildForTools.dateOfBirth).getTime() : NaN;
                      const computedAge = Number.isFinite(dobMs)
                        ? Math.max(0, Math.floor((Date.now() - dobMs) / (365.25 * 24 * 60 * 60 * 1000)))
                        : Number.isFinite(Number(selectedChildForTools?.age))
                        ? Number(selectedChildForTools.age)
                        : 0;
                      const durationDays = symptomForm.duration === '' ? 1 : Math.max(1, parseInt(symptomForm.duration, 10) || 1);
                      const response = await api.post('/doctor/ai/symptom-analyzer', {
                        childId: selectedChildForTools._id,
                        symptoms: symptomForm.symptoms,
                        age: computedAge,
                        duration: durationDays,
                        severity: symptomForm.severity
                      });
                      setSymptomAnalysis(response.data);
                      // Save AI insight
                      addAiInsight({
                        type: 'symptom-analysis',
                        childId: selectedChildForTools._id,
                        childName: `${selectedChildForTools.firstName || ''} ${selectedChildForTools.lastName || ''}`.trim(),
                        input: {
                          symptoms: symptomForm.symptoms,
                          duration: durationDays,
                          severity: symptomForm.severity
                        },
                        result: response.data,
                        timestamp: new Date().toISOString()
                      });
                    } catch (error) {
                      setError('Failed to analyze symptoms');
                    }
                  }}
                >
                  Analyze Symptoms
                </Button>
                {symptomAnalysis && (
                  <Box sx={{ mt: 3 }}>
                    <Alert severity={symptomAnalysis.urgency === 'high' ? 'error' : symptomAnalysis.urgency === 'medium' ? 'warning' : 'info'} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Urgency: {symptomAnalysis.urgency.toUpperCase()}</Typography>
                      <Typography variant="caption">AI Confidence: {symptomAnalysis.aiConfidence}</Typography>
                    </Alert>
                    <Typography variant="subtitle2" gutterBottom>Possible Conditions:</Typography>
                    {asArray(symptomAnalysis.possibleConditions).map((cond, idx) => (
                      <Chip key={idx} label={`${cond.condition} (${(cond.probability * 100).toFixed(0)}%)`} sx={{ m: 0.5 }} />
                    ))}
                    {asArray(symptomAnalysis.recommendedTests).length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Recommended Tests:</Typography>
                        {asArray(symptomAnalysis.recommendedTests).map((test, idx) => (
                          <Chip key={idx} label={test} color="primary" sx={{ m: 0.5 }} />
                        ))}
                      </Box>
                    )}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
                      {asArray(symptomAnalysis.recommendations).map((rec, idx) => (
                        <Typography key={idx} variant="body2" sx={{ mt: 0.5 }}>• {rec}</Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* ML Growth Chart Predictions */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📊 ML Growth Chart Predictions
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={selectedChildId}
                    onChange={(e) => {
                      setSelectedChildId(e.target.value);
                      setAiFieldErrors((prev) => ({ ...prev, growth: { ...prev.growth, childId: undefined } }));
                    }}
                    label="Select Child"
                  >
                    {selectableChildren.map((child) => (
                      <MenuItem key={child._id} value={child._id}>
                        {child.firstName} {child.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Height (cm)"
                      value={growthForm.height}
                      onChange={(e) => {
                        setGrowthForm({ ...growthForm, height: e.target.value });
                        setAiFieldErrors((prev) => ({ ...prev, growth: { ...prev.growth, height: undefined } }));
                      }}
                      error={!!aiFieldErrors.growth.height}
                      helperText={aiFieldErrors.growth.height || ''}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Weight (kg)"
                      value={growthForm.weight}
                      onChange={(e) => {
                        setGrowthForm({ ...growthForm, weight: e.target.value });
                        setAiFieldErrors((prev) => ({ ...prev, growth: { ...prev.growth, weight: undefined } }));
                      }}
                      error={!!aiFieldErrors.growth.weight}
                      helperText={aiFieldErrors.growth.weight || ''}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Head (cm)"
                      value={growthForm.headCircumference}
                      onChange={(e) => {
                        setGrowthForm({ ...growthForm, headCircumference: e.target.value });
                        setAiFieldErrors((prev) => ({ ...prev, growth: { ...prev.growth, headCircumference: undefined } }));
                      }}
                      error={!!aiFieldErrors.growth.headCircumference}
                      helperText={aiFieldErrors.growth.headCircumference || ''}
                    />
                  </Grid>
                </Grid>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={async () => {
                    const ok = validateGrowthInputs();
                    if (!ok) {
                      setError('Please fix the highlighted fields');
                      return;
                    }
                    try {
                      const response = await api.post(`/doctor/ai/growth-prediction/${selectedChildForTools._id}`, {
                        height: parseFloat(growthForm.height),
                        weight: parseFloat(growthForm.weight),
                        headCircumference: parseFloat(growthForm.headCircumference) || null
                      });
                      setGrowthPrediction(response.data);
                      addAiInsight({
                        type: 'growth-prediction',
                        childId: selectedChildForTools._id,
                        childName: `${selectedChildForTools.firstName || ''} ${selectedChildForTools.lastName || ''}`.trim(),
                        input: {
                          height: growthForm.height,
                          weight: growthForm.weight,
                          headCircumference: growthForm.headCircumference
                        },
                        result: response.data,
                        timestamp: new Date().toISOString()
                      });
                    } catch (error) {
                      setError('Failed to predict growth');
                    }
                  }}
                >
                  Predict Growth
                </Button>
                {growthPrediction && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Current Percentiles:</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip label={`Height: ${growthPrediction.percentiles.height.toFixed(0)}th percentile`} />
                      <Chip label={`Weight: ${growthPrediction.percentiles.weight.toFixed(0)}th percentile`} />
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>6-Month Predictions:</Typography>
                    {asArray(growthPrediction.predictions).map((pred, idx) => (
                      <Box key={idx} sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                        <Typography variant="caption">
                          Age {pred.age} years: Height {pred.predictedHeight}cm, Weight {pred.predictedWeight}kg
                        </Typography>
                      </Box>
                    ))}
                    {asArray(growthPrediction.alerts).length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        {asArray(growthPrediction.alerts).map((alert, idx) => (
                          <Alert key={idx} severity="warning" sx={{ mt: 1 }}>
                            {alert.message}
                          </Alert>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Medication Interaction Checker */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  💊 Medication Interaction Checker
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={selectedChildId}
                    onChange={(e) => {
                      setSelectedChildId(e.target.value);
                      setAiFieldErrors((prev) => ({ ...prev, medication: { ...prev.medication, childId: undefined } }));
                    }}
                    label="Select Child"
                  >
                    {selectableChildren.map((child) => (
                      <MenuItem key={child._id} value={child._id}>
                        {child.firstName} {child.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="New Medications"
                  value={medicationForm.medications}
                  onChange={(e) => {
                    setMedicationForm({ ...medicationForm, medications: e.target.value });
                    setAiFieldErrors((prev) => ({ ...prev, medication: { ...prev.medication, medications: undefined } }));
                  }}
                  placeholder="Enter medications separated by commas (e.g., Ibuprofen, Amoxicillin)..."
                  error={!!aiFieldErrors.medication.medications}
                  helperText={aiFieldErrors.medication.medications || ''}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  fullWidth
                  onClick={async () => {
                    const { ok, meds } = validateMedicationInputs();
                    if (!ok) {
                      setError('Please fix the highlighted fields');
                      return;
                    }
                    try {
                      // clear any previous result immediately
                      setMedicationCheck(null);
                      const response = await api.post('/doctor/ai/medication-checker', {
                        childId: selectedChildForTools._id,
                        newMedications: meds
                      });
                      setMedicationCheck(response.data);
                      addAiInsight({
                        type: 'medication-check',
                        childId: selectedChildForTools._id,
                        childName: `${selectedChildForTools.firstName || ''} ${selectedChildForTools.lastName || ''}`.trim(),
                        input: {
                          medications: meds
                        },
                        result: response.data,
                        timestamp: new Date().toISOString()
                      });
                    } catch (error) {
                      setError('Failed to check medications');
                    }
                  }}
                >
                  Check Interactions
                </Button>
                {medicationCheck && (
                  <Box sx={{ mt: 3 }}>
                    <Alert severity={medicationCheck.safeToPrescribe ? 'success' : 'error'} sx={{ mb: 2 }}>
                      {medicationCheck.safeToPrescribe ? '✅ Safe to prescribe' : '⚠️ Interactions detected'}
                    </Alert>
                    {asArray(medicationCheck.interactions).length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Drug Interactions:</Typography>
                        {asArray(medicationCheck.interactions).map((interaction, idx) => (
                          <Alert key={idx} severity="error" sx={{ mt: 1 }}>
                            {interaction.message}
                          </Alert>
                        ))}
                      </Box>
                    )}
                    {(
                      asArray(medicationCheck.allergyChecks).length > 0 ||
                      asArray(medicationCheck.allergies).length > 0
                    ) && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Allergy Warnings:</Typography>
                        {(asArray(medicationCheck.allergyChecks).length > 0
                          ? asArray(medicationCheck.allergyChecks)
                          : asArray(medicationCheck.allergies)
                        ).map((check, idx) => (
                          <Alert key={idx} severity="error" sx={{ mt: 1 }}>
                            {check.message}
                          </Alert>
                        ))}
                      </Box>
                    )}
                    {asArray(medicationCheck.recommendations).length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
                        {asArray(medicationCheck.recommendations).map((rec, idx) => (
                          <Typography key={idx} variant="body2" sx={{ mt: 0.5 }}>• {rec}</Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Health Risk Scoring */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  ⚠️ Health Risk Scoring
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                    label="Select Child"
                  >
                    {selectableChildren.map((child) => (
                      <MenuItem key={child._id} value={child._id}>
                        {child.firstName} {child.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={async () => {
                    if (!selectedChildForTools) {
                      setError('Please select a child');
                      return;
                    }
                    try {
                      setRiskScoreLoading(true);
                      const response = await api.get(`/doctor/ai/risk-score/${selectedChildForTools._id}`);
                      setRiskScore(response.data);
                      addAiInsight({
                        type: 'risk-score',
                        childId: selectedChildForTools._id,
                        childName: `${selectedChildForTools.firstName || ''} ${selectedChildForTools.lastName || ''}`.trim(),
                        input: {},
                        result: response.data,
                        timestamp: new Date().toISOString()
                      });
                    } catch (error) {
                      setError('Failed to calculate risk score');
                    } finally {
                      setRiskScoreLoading(false);
                    }
                  }}
                  disabled={riskScoreLoading}
                >
                  {riskScoreLoading ? 'Calculating...' : 'Calculate Risk Score'}
                </Button>
                {riskScore && (
                  <Box sx={{ mt: 3 }}>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Typography variant="h3" color={riskScore.riskLevel === 'high' ? 'error' : riskScore.riskLevel === 'medium' ? 'warning' : 'success'}>
                        {riskScore.overallRiskScore}
                      </Typography>
                      <Chip 
                        label={riskScore.riskLevel.toUpperCase()} 
                        color={riskScore.riskLevel === 'high' ? 'error' : riskScore.riskLevel === 'medium' ? 'warning' : 'success'}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>Risk Factors:</Typography>
                    {riskScore.factors.map((factor, idx) => (
                      <Box key={idx} sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                        <Typography variant="body2">
                          <strong>{factor.factor}:</strong> {factor.details} (Score: {factor.score})
                        </Typography>
                      </Box>
                    ))}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
                      {riskScore.recommendations.map((rec, idx) => (
                        <Typography key={idx} variant="body2" sx={{ mt: 0.5 }}>• {rec}</Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Automated Report Generation */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📄 Automated Report Generation
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                    label="Select Child"
                  >
                    {selectableChildren.map((child) => (
                      <MenuItem key={child._id} value={child._id}>
                        {child.firstName} {child.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportForm.reportType}
                    onChange={(e) => setReportForm({ ...reportForm, reportType: e.target.value })}
                    label="Report Type"
                  >
                    <MenuItem value="summary">Summary Report</MenuItem>
                    <MenuItem value="detailed">Detailed Report</MenuItem>
                    <MenuItem value="growth">Growth Report</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={async () => {
                    if (!selectedChildForTools) {
                      setError('Please select a child');
                      return;
                    }
                    try {
                      const response = await api.post(`/doctor/ai/generate-report/${selectedChildForTools._id}`, {
                        reportType: reportForm.reportType,
                        dateRange: reportForm.dateRange
                      });
                      setMedicalReport(response.data);
                    } catch (error) {
                      setError('Failed to generate report');
                    }
                  }}
                >
                  Generate Report
                </Button>
                {medicalReport && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Report Summary:</Typography>
                    <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap', p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      {medicalReport.summary}
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => {
                        const blob = new Blob([medicalReport.report || medicalReport.content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `medical-report-${Date.now()}.txt`;
                        a.click();
                      }}
                    >
                      Download Report
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Pattern Recognition Dashboard */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    🔍 Pattern Recognition Dashboard
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={async () => {
                      try {
                        setPatternsLoading(true);
                        const response = await api.get('/doctor/ai/patterns');
                        setHealthPatterns(response.data);
                      } catch (error) {
                        setError('Failed to analyze patterns');
                      } finally {
                        setPatternsLoading(false);
                      }
                    }}
                    disabled={patternsLoading}
                  >
                    {patternsLoading ? 'Analyzing...' : 'Analyze Patterns'}
                  </Button>
                </Box>
                {healthPatterns && (
                  <Grid container spacing={2}>
                    {asArray(healthPatterns.seasonalPatterns).length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>Seasonal Patterns</Typography>
                            {asArray(healthPatterns.seasonalPatterns).map((pattern, idx) => (
                              <Box key={idx} sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                                <Typography variant="body2">
                                  <strong>{pattern.month}:</strong> {pattern.visits} visits
                                </Typography>
                                <Typography variant="caption">{pattern.insight}</Typography>
                              </Box>
                            ))}
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                    {asArray(healthPatterns.symptomClusters).length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>Symptom Clusters</Typography>
                            {asArray(healthPatterns.symptomClusters).map((cluster, idx) => (
                              <Box key={idx} sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                                <Typography variant="body2">
                                  <strong>{cluster.symptom}:</strong> {cluster.frequency} occurrences
                                </Typography>
                                <Typography variant="caption">{cluster.insight}</Typography>
                              </Box>
                            ))}
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                    {asArray(healthPatterns.insights).length > 0 && (
                      <Grid item xs={12}>
                        <Alert severity="info">
                          {asArray(healthPatterns.insights).map((insight, idx) => (
                            <Typography key={idx} variant="body2">{insight}</Typography>
                          ))}
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Prescriptions Tab */}
      {activeTab === 4 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Prescriptions</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    try {
                      const payload = {
                        exportedAt: new Date().toISOString(),
                        prescriptions: prescriptionRows,
                        count: prescriptionRows.length
                      };
                      const str = JSON.stringify(payload, null, 2);
                      const blob = new Blob([str], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `doctor-prescriptions-${Date.now()}.json`;
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => {
                        if (a.parentNode) document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }, 100);
                    } catch {
                      setError('Failed to export prescriptions');
                    }
                  }}
                >
                  Export (JSON)
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    try {
                      const exportedAt = new Date().toISOString();
                      let txt = `TinyTots - Prescription Export\nExported: ${exportedAt}\n\n`;
                      if (prescriptionRows.length === 0) {
                        txt += 'No prescriptions recorded.\n';
                      } else {
                        prescriptionRows.forEach((p, i) => {
                          txt += `${'='.repeat(40)}\nPrescription ${i + 1} of ${prescriptionRows.length}\n${'='.repeat(40)}\n`;
                          txt += `Date: ${p.date ? new Date(p.date).toLocaleString() : '—'}\n`;
                          txt += `Child: ${p.childName || '—'}\n`;
                          txt += `Source: ${p.source === 'medical-record' ? 'Medical record' : p.source || '—'}\n`;
                          txt += `Diagnosis: ${p.diagnosis || '—'}\n`;
                          txt += `Prescription:\n${p.prescription || '—'}\n\n`;
                        });
                      }
                      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `doctor-prescriptions-${Date.now()}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => {
                        if (a.parentNode) document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }, 100);
                    } catch {
                      setError('Failed to export prescriptions');
                    }
                  }}
                >
                  Export (TXT)
                </Button>
              </Stack>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Prescriptions saved from completed consultations and medical record entries.
            </Typography>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 2 }}>
            {prescriptionRows.length === 0 ? (
              <Alert severity="info">No prescriptions recorded yet.</Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Child</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Diagnosis / Type</TableCell>
                      <TableCell>Prescription</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {prescriptionRows.slice(0, 50).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {p.date ? new Date(p.date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>{p.childName || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={p.source === 'medical-record' ? 'Medical record' : 'Appointment'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{p.diagnosis || '—'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{p.prescription}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}

      {/* Emergencies Tab */}
      {activeTab === 5 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Emergencies</Typography>
              <Button
                variant="contained"
                color="error"
                startIcon={<WarningAmber />}
                onClick={() => setEmergencyDialog({ open: true })}
              >
                Report Emergency
              </Button>
            </Box>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 2 }}>
            {emergenciesLoading ? (
              <Typography color="text.secondary" sx={{ p: 2 }}>Loading emergencies...</Typography>
            ) : emergencies.length === 0 ? (
              <Alert severity="info">No emergency cases found.</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Child</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {emergencies.map((e) => (
                      <TableRow key={e._id}>
                        <TableCell>
                          {e.appointmentDate ? new Date(e.appointmentDate).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>
                          {e.child ? `${e.child.firstName || ''} ${e.child.lastName || ''}`.trim() : '—'}
                        </TableCell>
                        <TableCell>{e.reason || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={(e.status || 'pending').toUpperCase()}
                            color={e.status === 'completed' ? 'success' : e.status === 'cancelled' ? 'error' : 'warning'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenConsultation(e)}
                            >
                              Add Prescription
                            </Button>
                            <Button
                              size="small"
                              color="success"
                              variant="contained"
                              onClick={() => handleUpdateEmergencyStatus(e._id, 'completed')}
                              disabled={e.status === 'completed'}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={async () => {
                                const reason = prompt('Reason for cancellation:');
                                if (!reason) return;
                                try {
                                  await api.patch(`/doctor/emergencies/${e._id}/status`, { status: 'cancelled', cancelReason: reason });
                                  setSuccess('Emergency cancelled');
                                  fetchEmergencies('all');
                                } catch (err) {
                                  setError(err.response?.data?.message || 'Failed to cancel emergency');
                                }
                              }}
                              disabled={e.status === 'cancelled'}
                            >
                              Cancel
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}

      {/* Report Emergency Dialog */}
      <Dialog
        open={emergencyDialog.open}
        onClose={() => setEmergencyDialog({ open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Report Emergency</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Child</InputLabel>
              <Select
                value={emergencyForm.childId || selectedChildId}
                onChange={(e) => setEmergencyForm((prev) => ({ ...prev, childId: e.target.value }))}
                label="Select Child"
              >
                {selectableChildren.map((child) => (
                  <MenuItem key={child._id} value={child._id}>
                    {child.firstName} {child.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Emergency reason"
              value={emergencyForm.reason}
              onChange={(e) => setEmergencyForm((prev) => ({ ...prev, reason: e.target.value }))}
              sx={{ mb: 2 }}
              required
            />

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={emergencyForm.severity}
                    onChange={(e) => setEmergencyForm((prev) => ({ ...prev, severity: e.target.value }))}
                    label="Severity"
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={emergencyForm.appointmentType}
                    onChange={(e) => setEmergencyForm((prev) => ({ ...prev, appointmentType: e.target.value }))}
                    label="Type"
                  >
                    <MenuItem value="onsite">On-site</MenuItem>
                    <MenuItem value="online">Online</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description (optional)"
              value={emergencyForm.description}
              onChange={(e) => setEmergencyForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmergencyDialog({ open: false })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleSubmitEmergency}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Voice Assistant Dialog */}
      <Dialog open={vaOpen} onClose={handleVaClose} maxWidth="xs" fullWidth>
        <DialogTitle>Voice Assistant</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, bgcolor: '#f6f8fa' }}>
            <VoiceAssistant />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DoctorDashboard;

