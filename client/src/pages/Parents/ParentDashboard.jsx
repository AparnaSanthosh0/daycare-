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
  DialogActions,
  Alert,
  Menu,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Snackbar,
  CardActions,
  Stack
} from '@mui/material';
import {
  Person,
  ChildCare,
  PhotoCamera,
  Delete,
  Refresh,
  Event,
  Assessment,
  LocalHospital,
  Add,
  Edit,
  CheckCircle,
  Home,
  Favorite,
  ShoppingBag,
  Receipt,
  Message,
  ShoppingCart,
  KeyboardVoice,
  Notifications,
  Logout as LogoutIcon,
  DirectionsCar,
  Payment,
  EmojiEvents,
  SportsEsports,
  PlayArrow,
  CameraAlt,
  Download
} from '@mui/icons-material';
import api, { API_BASE_URL } from '../../config/api';
import { RAZORPAY_CONFIG } from '../../config/razorpay';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import MealRecommendation from '../../components/MealRecommendation';
import NannyServicesTab from '../../components/NannyServicesTab';
import TransportTracking from '../../components/TransportTracking';
import SmartSearch from '../../components/Common/SmartSearch';
import DaycareLocationMap from '../../components/Maps/DaycareLocationMap';
import PickupTracker from '../../components/Maps/PickupTracker';
import TransportRouteMap from '../../components/Maps/TransportRouteMap';
import VaccinationCard from '../../components/Parents/VaccinationCard';
import VoiceAssistant from '../../VoiceAssistant';
import Chatbot from '../../components/Chatbot';
import MilestoneTracker from '../../components/Milestones/MilestoneTracker';
import FeedbackForm from '../../components/FeedbackForm';

// Simple helper to format date strings
const formatDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString();
};

// Normalize any image/resource URL against API_BASE_URL.
// - Works whether API_BASE_URL is "http://host:port" or "http://host:port/api"
// - Returns absolute URL for relative resource paths (e.g., "/uploads/..." or "uploads/...")
const toAbsoluteUrl = (maybePath) => {
  if (!maybePath) return '';
  if (typeof maybePath === 'string' && /^https?:\/\//i.test(maybePath)) return maybePath;
  try {
    // Derive an origin (strip trailing '/api' if present). If API_BASE_URL is relative, fall back to window origin.
    let origin = API_BASE_URL.replace(/\/?api\/?$/i, '').replace(/\/$/, '');
    if (!/^https?:\/\//i.test(origin)) {
      if (typeof window !== 'undefined' && window.location?.origin) {
        origin = window.location.origin;
      }
    }
    const resource = String(maybePath).startsWith('/') ? String(maybePath) : `/${String(maybePath)}`;
    const u = new URL(resource, origin);
    return u.href;
  } catch (e) {
    return String(maybePath);
  }
};

const ParentDashboard = ({ initialTab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get tab from URL query parameter or location state or initialTab prop
  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) return parseInt(tabParam, 10);
    if (location.state?.initialTab !== undefined) return location.state.initialTab;
    if (initialTab !== undefined) return initialTab;
    return 0;
  };
  
  const [tab, setTab] = useState(getInitialTab());
  const [, setLoading] = useState(false);
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Notifications state
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Data for active child
  const [profile, setProfile] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [profileImageVersion] = useState(0);
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
  const [parentHealthSummary, setParentHealthSummary] = useState(null);
  const [parentHealthLoading, setParentHealthLoading] = useState(false);
  const [mealSubscriptionData, setMealSubscriptionData] = useState({
    approvedDaycarePlan: null,
    doctorSuggestedPlans: [],
    pricing: {},
    currentSubscription: null,
    doctorSuggestionNotes: ''
  });
  const [mealSubscriptionLoading, setMealSubscriptionLoading] = useState(false);
  const [mealSubscriptionSaving, setMealSubscriptionSaving] = useState(false);
  const [mealSubscriptionForm, setMealSubscriptionForm] = useState({
    preference: 'approved_daycare',
    selectedPlanTitle: '',
    durationType: 'specific_period',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: ''
  });
  const [mealSubscriptionMessage, setMealSubscriptionMessage] = useState({ type: '', text: '' });
  const [nannyServiceNotes, setNannyServiceNotes] = useState([]);
  const [nannyNotesLoading, setNannyNotesLoading] = useState(false);
  // Staff information
  const [assignedStaff, setAssignedStaff] = useState([]);
  
  // Billing states
  const [billingData, setBillingData] = useState({ invoices: [], payments: [] });
  const [feeOptionsData, setFeeOptionsData] = useState({ options: [], currentSelection: null, program: '' });
  const [feeSelectionLoading, setFeeSelectionLoading] = useState(false);
  const [feeSelectionSaving, setFeeSelectionSaving] = useState(false);
  const [feeSelectionMessage, setFeeSelectionMessage] = useState({ type: '', text: '' });
  const [paymentDialog, setPaymentDialog] = useState({ open: false, invoice: null });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Daycare sub-tabs state
  const [daycareTab, setDaycareTab] = useState(0);

  // Doctor Appointments states
  const [appointments, setAppointments] = useState([]);
  const [appointmentDialog, setAppointmentDialog] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    childId: '',
    appointmentDate: '',
    appointmentTime: '09:00',
    reason: '',
    appointmentType: 'onsite',
    isEmergency: false
  });
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [appointmentError, setAppointmentError] = useState('');
  const [appointmentSuccess, setAppointmentSuccess] = useState('');

  // Slot-based booking state
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [slotBookingDate, setSlotBookingDate] = useState(new Date().toISOString().slice(0, 10));
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotBookingReason, setSlotBookingReason] = useState('');
  const [slotBookingType, setSlotBookingType] = useState('onsite');
  const [slotBookingChildId, setSlotBookingChildId] = useState('');
  const [slotBookingStep, setSlotBookingStep] = useState(1); // 1=select slot, 2=pay

  // Transport enrollment states
  const [transportForm, setTransportForm] = useState({
    pickupAddress: '',
    pickupTime: '08:00',
    dropoffTime: '17:00',
    contactNumber: user?.phone || '',
    specialInstructions: ''
  });
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportRequests, setTransportRequests] = useState([]);
  const [transportAssignment, setTransportAssignment] = useState(null);
  const [transportMessage, setTransportMessage] = useState({ open: false, text: '', severity: 'success' });

  // Editable fields (parent-allowed)
  const [editFields, setEditFields] = useState({
    allergies: [],
    medicalConditions: [],
    emergencyContacts: [],
    authorizedPickup: [],
    notes: ''
  });

  // Feedback responses state
  const [feedbackResponses, setFeedbackResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Add Child Dialog State
  const [addChildDialog, setAddChildDialog] = useState(false);
  const [addChildForm, setAddChildForm] = useState({
    childName: '',
    childDob: '',
    childGender: 'male',
    program: 'preschool',
    medicalInfo: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });
  const [addChildLoading, setAddChildLoading] = useState(false);
  const [editChildDialog, setEditChildDialog] = useState(false);
  const [editChildLoading, setEditChildLoading] = useState(false);
  const [editChildError, setEditChildError] = useState('');
  const [editChildForm, setEditChildForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    program: 'preschool',
    notes: ''
  });

  // After School Program states
  const [afterSchoolPrograms, setAfterSchoolPrograms] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [afterSchoolDialog, setAfterSchoolDialog] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [afterSchoolMessage, setAfterSchoolMessage] = useState({ type: '', text: '' });
  const [parentTeacherMessages, setParentTeacherMessages] = useState([]);
  const [parentTeacherMessagesLoading, setParentTeacherMessagesLoading] = useState(false);
  const [addChildSuccess, setAddChildSuccess] = useState('');
  const [addChildError, setAddChildError] = useState('');

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  // Teacher-assigned games & stories (Learning Games tab)
  const [assignedGames, setAssignedGames] = useState([]);
  const [teacherStories, setTeacherStories] = useState([]);
  const [teacherContentLoading, setTeacherContentLoading] = useState(false);
  const [childScores, setChildScores] = useState({ scores: [], recentSessions: [] });

  // AI Recommendations state (kept for future use)
  // const [socialRecommendations, setSocialRecommendations] = useState(null);
  // const [nutritionRecommendations, setNutritionRecommendations] = useState(null);

  // const activeChild = useMemo(
  //   () => children.find((c) => c._id === activeChildId) || null,
  //   [children, activeChildId]
  // );

  // Map initialTab prop to tab index when component mounts
  useEffect(() => {
    const map = {
      notifications: 10,
      messaging: 11,
      billing: 12,
      feedback: 7,
      staff: 6,
      reports: 8,
      admissions: 9,
    };
    if (initialTab && map[initialTab] !== undefined) setTab(map[initialTab]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  // Load my children
  const loadChildren = useCallback(async () => {
    try {
      setErrorMsg('');
      setLoading(true);
      if (user?.role !== 'parent') {
        setChildren([]);
        setActiveChildId('');
        setErrorMsg('This area is for Parent accounts. Please sign in as a Parent to view your children and gallery.');
        return;
      }
      const res = await api.get('/parents/me/children');
      setChildren(res.data || []);
      if ((res.data || []).length > 0 && !activeChildId) {
        setActiveChildId(res.data[0]._id);
      }
    } catch (e) {
      console.error('Load children error:', e);
      const msg = e?.response?.data?.message || '';
      const status = e?.response?.status;
      const code = e?.response?.data?.code;
      
      // Handle the case when no child profiles exist
      if (status === 403 && code === 'NO_CHILD_PROFILE') {
        setChildren([]);
        setErrorMsg('No child profiles found. Please contact administration to create your child profile before accessing the dashboard.');
        return;
      }
      
      // Many deployments return 404 "Route not found" when the parent/children API isn't enabled yet.
      // Treat this as non-fatal and keep the dashboard usable without an orange banner.
      if (status === 404 || /route not found/i.test(msg)) {
        setChildren([]);
        setErrorMsg('');
      } else {
        setErrorMsg(msg || 'Failed to load children');
      }
    } finally {
      setLoading(false);
    }
  }, [activeChildId, user?.role]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  // Fetch teacher-assigned games + stories + scores when Learning Games tab is active
  useEffect(() => {
    if (tab === 11 && activeChildId) {
      const fetchTeacherContent = async () => {
        setTeacherContentLoading(true);
        try {
          const [storiesRes, gamesRes, scoresRes] = await Promise.allSettled([
            api.get('/stories'),
            api.get(`/games/assigned/${activeChildId}`),
            api.get(`/games/scores/${activeChildId}`)
          ]);
          if (storiesRes.status === 'fulfilled' && storiesRes.value.data?.success) {
            setTeacherStories(storiesRes.value.data.stories || []);
          }
          if (gamesRes.status === 'fulfilled' && gamesRes.value.data?.success) {
            setAssignedGames(gamesRes.value.data.assignments || []);
          }
          if (scoresRes.status === 'fulfilled' && scoresRes.value.data?.success) {
            setChildScores({ scores: scoresRes.value.data.scores || [], recentSessions: scoresRes.value.data.recentSessions || [] });
          }
        } catch (err) {
          // silent
        } finally {
          setTeacherContentLoading(false);
        }
      };
      fetchTeacherContent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeChildId]);

  // Update tab when location changes (e.g., from back button navigation)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setTab(parseInt(tabParam, 10));
    } else if (location.state?.initialTab !== undefined) {
      setTab(location.state.initialTab);
    }
  }, [location]);

  // Fetch feedback responses when on AI Assistant tab
  useEffect(() => {
    const fetchFeedbackResponses = async () => {
      if (tab === 9) {
        setLoadingResponses(true);
        try {
          const response = await api.get('/sentiment/feedback/responses');
          if (response.data.success) {
            setFeedbackResponses(response.data.responses || []);
          }
        } catch (error) {
          console.error('Failed to fetch feedback responses:', error);
        } finally {
          setLoadingResponses(false);
        }
      }
    };
    fetchFeedbackResponses();
  }, [tab]);

  // Handle Add New Child
  const handleAddChild = async () => {
    try {
      setAddChildLoading(true);
      setAddChildError('');
      setAddChildSuccess('');

      // Validate form
      if (!addChildForm.childName || !addChildForm.childDob) {
        setAddChildError('Child name and date of birth are required');
        setAddChildLoading(false);
        return;
      }

      // Validate DOB (1-7 years)
      const dob = new Date(addChildForm.childDob);
      const today = new Date();
      const age = (today - dob) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 1 || age > 7) {
        setAddChildError('Child must be between 1 and 7 years old');
        setAddChildLoading(false);
        return;
      }

      // Submit admission request
      await api.post('/parents/me/admissions', addChildForm);
      
      setAddChildSuccess('Child admission request submitted successfully! Awaiting admin approval.');
      
      // Reset form
      setAddChildForm({
        childName: '',
        childDob: '',
        childGender: 'male',
        program: 'preschool',
        medicalInfo: '',
        emergencyContactName: '',
        emergencyContactPhone: ''
      });

      // Close dialog after 2 seconds
      setTimeout(() => {
        setAddChildDialog(false);
        setAddChildSuccess('');
        loadChildren(); // Refresh children list
      }, 2000);

    } catch (error) {
      console.error('Add child error:', error);
      setAddChildError(error.response?.data?.message || 'Failed to submit admission request');
    } finally {
      setAddChildLoading(false);
    }
  };

  const openEditChildDialog = () => {
    if (!profile) return;
    setEditChildError('');
    setEditChildForm({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().slice(0, 10) : '',
      gender: profile.gender || 'male',
      program: profile.program || 'preschool',
      notes: profile.notes || ''
    });
    setEditChildDialog(true);
  };

  const handleSaveChildProfile = async () => {
    try {
      if (!activeChildId) return;
      setEditChildLoading(true);
      setEditChildError('');

      const payload = {
        firstName: editChildForm.firstName,
        lastName: editChildForm.lastName,
        dateOfBirth: editChildForm.dateOfBirth,
        gender: editChildForm.gender,
        program: editChildForm.program,
        notes: editChildForm.notes
      };

      await api.put(`/children/${activeChildId}`, payload);
      alert('Child profile updated successfully.');
      setEditChildDialog(false);
      fetchChildData(activeChildId);
      loadChildren();
    } catch (error) {
      setEditChildError(error.response?.data?.message || 'Failed to update child profile');
    } finally {
      setEditChildLoading(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      // Try to fetch recommendations/notifications
      const response = await api.get('/recommendations/received');
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // If API doesn't exist, use empty array
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'parent') {
      fetchNotifications();
    }
  }, [user?.role, fetchNotifications]);

  // Handle notifications menu
  const handleNotificationsOpen = (event) => {
    setNotificationsAnchor(event.currentTarget);
    fetchNotifications();
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchor(null);
  };

  // Auto-refresh children data every 30 seconds to pick up newly approved admissions
  useEffect(() => {
    if (user?.role !== 'parent') return;
    
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/parents/me/children');
        const newChildren = res.data || [];
        
        // Only update if the number of children changed (new admission approved)
        if (newChildren.length !== children.length) {
          console.log('New children detected, updating dashboard...');
          setChildren(newChildren);
          
          // If we have a new child but no active child selected, select the first one
          if (newChildren.length > 0 && !activeChildId) {
            setActiveChildId(newChildren[0]._id);
          }
        }
      } catch (e) {
        // Silent fail for background refresh
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [children.length, activeChildId, user?.role]);

  // Fetch detail for the active child
  const fetchChildData = useCallback(async (childId) => {
    if (!childId) return;
    try {
      if (user?.role !== 'parent') return;
      
      // Use Promise.allSettled to continue even if some endpoints fail
      const [pRes, gRes, aRes, actRes, mRes, rRes, sRes] = await Promise.allSettled([
        api.get(`/children/${childId}`),
        api.get(`/children/${childId}/gallery`),
        api.get(`/children/${childId}/attendance`),
        api.get(`/children/${childId}/activities`),
        api.get(`/children/${childId}/meals`),
        api.get(`/children/${childId}/reports`),
        api.get(`/children/${childId}/staff`)
      ]);
      
      // Extract data from settled promises, using defaults for failed ones
      setProfile(pRes.status === 'fulfilled' ? pRes.value.data : null);
      setGallery(gRes.status === 'fulfilled' ? (gRes.value.data || []) : []);
      setAttendance(aRes.status === 'fulfilled' ? (aRes.value.data || null) : null);
      setActivities(actRes.status === 'fulfilled' ? (actRes.value.data || { recent: [], count: 0 }) : { recent: [], count: 0 });
      setMeals(mRes.status === 'fulfilled' ? (mRes.value.data || { plan: [], weekOf: null }) : { plan: [], weekOf: null });
      setReports(rRes.status === 'fulfilled' ? (rRes.value.data || {
        attendance: { summary: null, history: [] },
        activities: { participation: [], trends: null },
        milestones: { completed: [], upcoming: [] },
        nutrition: { consumption: [], preferences: [] }
      }) : {
        attendance: { summary: null, history: [] },
        activities: { participation: [], trends: null },
        milestones: { completed: [], upcoming: [] },
        nutrition: { consumption: [], preferences: [] }
      });
      if (sRes.status === 'fulfilled') {
        console.log('Assigned staff response:', sRes.value.data);
        setAssignedStaff(sRes.value.data || []);
      } else {
        setAssignedStaff([]);
      }

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
      // Only log actual errors, not network issues or 404s
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || '';
      
      if (status === 404 || /route not found/i.test(msg) || e?.code === 'ERR_NETWORK') {
        // Ignore cosmetic 404s from optional endpoints and network errors
        setErrorMsg('');
      } else {
        console.error('Fetch child data error:', e);
        setErrorMsg(msg || 'Failed to load child data');
      }
    }
  }, [user?.role]);

  // When active child changes, fetch everything
  useEffect(() => {
    if (activeChildId) {
      fetchChildData(activeChildId);
      fetchBillingData();
      if (user?.role === 'parent') {
        fetchFeeOptions();
      }
    }
  }, [activeChildId, fetchChildData, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Parent dashboard simplified health workflow (growth -> status -> foods -> daily plan -> alerts)
  useEffect(() => {
    const fetchParentHealthSummary = async () => {
      if (!activeChildId || user?.role !== 'parent') {
        setParentHealthSummary(null);
        return;
      }

      try {
        setParentHealthLoading(true);
        const childrenResponse = await api.get('/child-health/parent/children');
        const parentChildren = childrenResponse.data?.children || [];
        const selectedBelongsToParent = parentChildren.some((child) => child.id === activeChildId);
        const targetChildId = selectedBelongsToParent ? activeChildId : (parentChildren[0]?.id || activeChildId);

        if (!selectedBelongsToParent && parentChildren[0]?.id && parentChildren[0].id !== activeChildId) {
          setActiveChildId(parentChildren[0].id);
        }

        const response = await api.get(`/child-health/parent/children/${targetChildId}/summary`);
        setParentHealthSummary(response.data || null);
      } catch (error) {
        // Fallback: derive a lightweight summary from existing reports/meals when endpoint not available.
        setParentHealthSummary({
          success: true,
          nutritionStatus: {
            prediction: reports?.nutrition?.preferences?.length ? 'Monitor Nutrition' : 'No Analysis Yet'
          },
          recommendedFoods: Array.isArray(reports?.nutrition?.preferences) ? reports.nutrition.preferences.slice(0, 5) : [],
          dailyDietPlan: {
            breakfast: meals?.plan?.[0]?.breakfast || 'As per daycare meal plan',
            lunch: meals?.plan?.[0]?.lunch || 'As per daycare meal plan',
            snack: meals?.plan?.[0]?.snack || 'As per daycare meal plan',
            dinner: meals?.plan?.[0]?.dinner || 'As per daycare meal plan'
          },
          mealPlanOptions: [
            {
              title: 'Plan A',
              breakfast: meals?.plan?.[0]?.breakfast || 'Oats porridge with fruit',
              lunch: meals?.plan?.[0]?.lunch || 'Rice and lentils with vegetables',
              snack: meals?.plan?.[0]?.snack || 'Yogurt with banana',
              dinner: meals?.plan?.[0]?.dinner || 'Soft khichdi with spinach'
            },
            {
              title: 'Plan B',
              breakfast: 'Milk and banana mash',
              lunch: 'Vegetable pulao with dal',
              snack: 'Fruit and nuts powder milk',
              dinner: 'Chapati roll with mixed vegetables'
            }
          ],
          healthAlerts: [],
          doctorSuggestion: {
            notes: 'Follow daycare meal plan and consult doctor for updated nutrition analysis.',
            nextCheckupInDays: 14
          }
        });
      } finally {
        setParentHealthLoading(false);
      }
    };

    fetchParentHealthSummary();
  }, [activeChildId, user?.role, reports, meals]);

  useEffect(() => {
    const fetchMealSubscriptionOptions = async () => {
      if (!activeChildId || user?.role !== 'parent') {
        setMealSubscriptionData({
          approvedDaycarePlan: null,
          doctorSuggestedPlans: [],
          pricing: {},
          currentSubscription: null,
          doctorSuggestionNotes: ''
        });
        return;
      }

      try {
        setMealSubscriptionLoading(true);
        const response = await api.get(`/meal-plans/parent/children/${activeChildId}/subscription-options`);
        const data = response.data || {};
        const currentSubscription = data.currentSubscription || null;
        const doctorSuggestedPlans = data.doctorSuggestedPlans || [];

        setMealSubscriptionData({
          approvedDaycarePlan: data.approvedDaycarePlan || null,
          doctorSuggestedPlans,
          pricing: data.pricing || {},
          currentSubscription,
          doctorSuggestionNotes: data.doctorSuggestionNotes || ''
        });

        setMealSubscriptionForm({
          preference: currentSubscription?.preference || 'approved_daycare',
          selectedPlanTitle: currentSubscription?.selectedPlanTitle || doctorSuggestedPlans?.[0]?.title || '',
          durationType: currentSubscription?.durationType || 'specific_period',
          startDate: currentSubscription?.startDate ? new Date(currentSubscription.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          endDate: currentSubscription?.endDate ? new Date(currentSubscription.endDate).toISOString().slice(0, 10) : ''
        });
      } catch (error) {
        console.error('Error fetching meal subscription options:', error);
      } finally {
        setMealSubscriptionLoading(false);
      }
    };

    fetchMealSubscriptionOptions();
  }, [activeChildId, user?.role]);

  useEffect(() => {
    const fetchNannyServiceNotes = async () => {
      if (user?.role !== 'parent') {
        setNannyServiceNotes([]);
        return;
      }

      try {
        setNannyNotesLoading(true);
        const response = await api.get('/nanny/bookings/parent');
        const bookings = Array.isArray(response.data) ? response.data : [];

        const notes = bookings
          .flatMap((booking) => (booking?.serviceNotes || []).map((note) => ({
            bookingId: booking._id,
            nannyName: booking.nannyName || 'Assigned Nanny',
            childName: booking?.child?.name || 'Child',
            serviceDate: booking.serviceDate,
            noteText: note?.note || '',
            timestamp: note?.timestamp || booking.updatedAt,
          })))
          .filter((entry) => entry.noteText)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 5);

        setNannyServiceNotes(notes);
      } catch (error) {
        console.error('Error loading nanny service notes:', error);
        setNannyServiceNotes([]);
      } finally {
        setNannyNotesLoading(false);
      }
    };

    fetchNannyServiceNotes();
  }, [user?.role]);

  const saveMealSubscription = async () => {
    if (!activeChildId) return;
    try {
      setMealSubscriptionSaving(true);
      const response = await api.put(`/meal-plans/parent/children/${activeChildId}/subscription`, mealSubscriptionForm);
      setMealSubscriptionMessage({ type: 'success', text: response.data?.message || 'Meal subscription updated successfully.' });
      const optionsResponse = await api.get(`/meal-plans/parent/children/${activeChildId}/subscription-options`);
      setMealSubscriptionData({
        approvedDaycarePlan: optionsResponse.data?.approvedDaycarePlan || null,
        doctorSuggestedPlans: optionsResponse.data?.doctorSuggestedPlans || [],
        pricing: optionsResponse.data?.pricing || {},
        currentSubscription: optionsResponse.data?.currentSubscription || null,
        doctorSuggestionNotes: optionsResponse.data?.doctorSuggestionNotes || ''
      });
      await fetchBillingData();
    } catch (error) {
      console.error('Error saving meal subscription:', error);
      setMealSubscriptionMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save meal subscription' });
    } finally {
      setMealSubscriptionSaving(false);
    }
  };

  const removeMealSubscription = async () => {
    if (!activeChildId) return;
    try {
      setMealSubscriptionSaving(true);
      const response = await api.delete(`/meal-plans/parent/children/${activeChildId}/subscription`);
      setMealSubscriptionMessage({ type: 'success', text: response.data?.message || 'Meal subscription removed successfully.' });
      const optionsResponse = await api.get(`/meal-plans/parent/children/${activeChildId}/subscription-options`);
      setMealSubscriptionData({
        approvedDaycarePlan: optionsResponse.data?.approvedDaycarePlan || null,
        doctorSuggestedPlans: optionsResponse.data?.doctorSuggestedPlans || [],
        pricing: optionsResponse.data?.pricing || {},
        currentSubscription: optionsResponse.data?.currentSubscription || null,
        doctorSuggestionNotes: optionsResponse.data?.doctorSuggestionNotes || ''
      });
      setMealSubscriptionForm((prev) => ({
        ...prev,
        preference: 'approved_daycare',
        selectedPlanTitle: optionsResponse.data?.doctorSuggestedPlans?.[0]?.title || '',
        durationType: 'specific_period',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: ''
      }));
      await fetchBillingData();
    } catch (error) {
      console.error('Error removing meal subscription:', error);
      setMealSubscriptionMessage({ type: 'error', text: error.response?.data?.message || 'Failed to remove meal subscription' });
    } finally {
      setMealSubscriptionSaving(false);
    }
  };

  const handleDownloadParentReport = useCallback(() => {
    if (!parentHealthSummary) return;
    const child = parentHealthSummary.child || {};
    const childName = `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Child';
    const now = new Date();
    const lines = [
      '='.repeat(60),
      `  CHILD HEALTH REPORT — ${childName.toUpperCase()}`,
      `  Generated: ${now.toLocaleString()}`,
      '='.repeat(60),
      '',
      '--- NUTRITION STATUS ---',
      `Status: ${parentHealthSummary.nutritionStatus?.prediction || 'Not analyzed'}`,
      `Confidence: ${parentHealthSummary.nutritionStatus?.confidence != null ? Math.round(parentHealthSummary.nutritionStatus.confidence * 100) + '%' : 'N/A'}`,
      `Last Analyzed: ${parentHealthSummary.measuredAt ? new Date(parentHealthSummary.measuredAt).toLocaleString() : 'Not yet'}`,
      `Next Checkup: ${parentHealthSummary.doctorSuggestion?.nextCheckupInDays || 14} days`,
      '',
      '--- GROWTH PROGRESS ---',
      `Weight: ${parentHealthSummary.growthProgress?.actual_weight_kg ?? 'N/A'} kg  (expected: ${parentHealthSummary.growthProgress?.expected_weight_kg ?? 'N/A'} kg)`,
      `Height: ${parentHealthSummary.growthProgress?.actual_height_cm ?? 'N/A'} cm  (expected: ${parentHealthSummary.growthProgress?.expected_height_cm ?? 'N/A'} cm)`,
      `BMI: ${parentHealthSummary.growthProgress?.bmi ?? 'N/A'}`,
      `Growth Status: ${parentHealthSummary.growthProgress?.growth_status || 'N/A'}`,
      '',
      '--- RECOMMENDED FOODS ---',
      (
        (parentHealthSummary.recommendedFoods || []).length > 0
          ? (parentHealthSummary.recommendedFoods || []).join(', ')
          : [
              parentHealthSummary.dailyDietPlan?.breakfast,
              parentHealthSummary.dailyDietPlan?.lunch,
              parentHealthSummary.dailyDietPlan?.snack,
              parentHealthSummary.dailyDietPlan?.dinner,
            ].filter(Boolean).join(', ')
      ) || 'None',
      '',
      '--- DAILY MEAL PLAN ---',
      `Breakfast: ${parentHealthSummary.dailyDietPlan?.breakfast || 'N/A'}`,
      `Lunch:     ${parentHealthSummary.dailyDietPlan?.lunch || 'N/A'}`,
      `Snack:     ${parentHealthSummary.dailyDietPlan?.snack || 'N/A'}`,
      `Dinner:    ${parentHealthSummary.dailyDietPlan?.dinner || 'N/A'}`,
      '',
      '--- HEALTH ALERTS ---',
      ...((parentHealthSummary.healthAlerts || []).length > 0
        ? (parentHealthSummary.healthAlerts).map((a, i) => `${i + 1}. ${typeof a === 'string' ? a : JSON.stringify(a)}`)
        : ['No active alerts']),
      '',
      '--- DOCTOR SUGGESTION ---',
      parentHealthSummary.doctorSuggestion?.notes || 'Follow balanced diet and continue routine monitoring.',
      '',
      '='.repeat(60),
      '  TinyTots Daycare — Health Management System',
      '='.repeat(60),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${childName.replace(/\s+/g, '-').toLowerCase()}-${now.toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [parentHealthSummary]);

  // Simple polling for attendance, activities, meals
  useEffect(() => {
    if (!activeChildId || user?.role !== 'parent') return;
    const interval = setInterval(async () => {
      try {
        const [aRes, actRes, mRes] = await Promise.all([
          api.get(`/children/${activeChildId}/attendance`),
          api.get(`/children/${activeChildId}/activities`),
          api.get(`/children/${activeChildId}/meals`)
        ]);
        setAttendance(aRes.data || null);
        setActivities(actRes.data || { recent: [], count: 0 });
        setMeals(mRes.data || { plan: [], weekOf: null });
      } catch (e) {
        // silent fail to avoid UI spam
      }
    }, 30000); // 30s
    return () => clearInterval(interval);
  }, [activeChildId, user?.role]);

  const handleUpload = async (file, caption = '') => {
    if (!activeChildId || !file) return;
    try {
      const form = new FormData();
      form.append('photo', file);
      form.append('caption', caption);
      const res = await api.post(`/children/${activeChildId}/gallery`, form, {
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
      await api.delete(`/children/${activeChildId}/gallery/${photoId}`);
      setGallery((g) => g.filter((p) => p._id !== photoId));
    } catch (e) {
      console.error('Delete photo error:', e);
    }
  };

  // Unused components - kept for future use
  // const AllergiesEditor = () => {
  //   const [input, setInput] = useState('');
  //   return (
  //     <Box>
  //       <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
  //         {editFields.allergies.map((a, idx) => (
  //           <Chip key={`${a}-${idx}`} label={a} onDelete={() => {
  //             setEditFields((f) => ({ ...f, allergies: f.allergies.filter((_, i) => i !== idx) }));
  //           }} />
  //         ))}
  //       </Box>
  //       <Box sx={{ display: 'flex', gap: 1 }}>
  //         <TextField size="small" value={input} onChange={(e) => setInput(e.target.value)} label="Add allergy" />
  //         <Button variant="outlined" onClick={() => {
  //           if (input.trim()) {
  //             setEditFields((f) => ({ ...f, allergies: [...f.allergies, input.trim()] }));
  //             setInput('');
  //           }
  //         }}>Add</Button>
  //       </Box>
  //     </Box>
  //   );
  // };

  // const MedicalEditor = () => {
  //   const [input, setInput] = useState('');
  //   return (
  //     <Box>
  //       <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
  //         {(editFields.medicalConditions || []).map((m, idx) => (
  //           <Chip key={`${m}-${idx}`} label={m} onDelete={() => {
  //             setEditFields((f) => ({ ...f, medicalConditions: f.medicalConditions.filter((_, i) => i !== idx) }));
  //           }} />
  //         ))}
  //       </Box>
  //       <Box sx={{ display: 'flex', gap: 1 }}>
  //         <TextField size="small" value={input} onChange={(e) => setInput(e.target.value)} label="Add medical note" />
  //         <Button variant="outlined" onClick={() => {
  //           if (input.trim()) {
  //             setEditFields((f) => ({ ...f, medicalConditions: [...f.medicalConditions, input.trim()] }));
  //             setInput('');
  //           }
  //         }}>Add</Button>
  //       </Box>
  //     </Box>
  //   );
  // };

  // const EmergencyEditor = () => {
  //   const [contact, setContact] = useState({ name: '', phone: '', relationship: 'Emergency' });
  //   return (
  //     <Box>
  //       {(editFields.emergencyContacts || []).map((c, idx) => (
  //         <Grid container spacing={1} key={idx} sx={{ mb: 1 }}>
  //           <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={c.name} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], name: v }; return { ...f, emergencyContacts: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={c.phone} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], phone: v }; return { ...f, emergencyContacts: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={10} sm={3}><TextField size="small" fullWidth label="Relationship" value={c.relationship || 'Emergency'} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], relationship: v }; return { ...f, emergencyContacts: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={2} sm={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
  //             <IconButton color="error" onClick={() => setEditFields((f) => ({ ...f, emergencyContacts: f.emergencyContacts.filter((_, i) => i !== idx) }))><Delete /></IconButton>
  //           </Grid>
  //         </Grid>
  //       ))}

  //       <Divider sx={{ my: 1 }} />
  //       <Grid container spacing={1}>
  //         <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Relationship" value={contact.relationship} onChange={(e) => setContact((c) => ({ ...c, relationship: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
  //           <Button variant="outlined" onClick={() => {
  //             if (contact.name && contact.phone) {
  //               setEditFields((f) => ({ ...f, emergencyContacts: [...(f.emergencyContacts || []), contact] }));
  //               setContact({ name: '', phone: '', relationship: 'Emergency' });
  //             }
  //           }}>Add</Button>
  //         </Grid>
  //       </Grid>
  //     </Box>
  //   );
  // };

  // const AuthorizedPickupEditor = () => {
  //   const [person, setPerson] = useState({ name: '', phone: '', relationship: '' });
  //   return (
  //     <Box>
  //       {(editFields.authorizedPickup || []).map((c, idx) => (
  //         <Grid container spacing={1} key={idx} sx={{ mb: 1 }}>
  //           <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={c.name || ''} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], name: v }; return { ...f, authorizedPickup: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={c.phone || ''} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], phone: v }; return { ...f, authorizedPickup: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={10} sm={3}><TextField size="small" fullWidth label="Relationship" value={c.relationship || ''} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], relationship: v }; return { ...f, authorizedPickup: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={2} sm={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
  //             <IconButton color="error" onClick={() => setEditFields((f) => ({ ...f, authorizedPickup: f.authorizedPickup.filter((_, i) => i !== idx) }))><Delete /></IconButton>
  //           </Grid>
  //         </Grid>
  //       ))}

  //       <Divider sx={{ my: 1 }} />
  //       <Grid container spacing={1}>
  //         <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={person.name} onChange={(e) => setPerson((c) => ({ ...c, name: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={person.phone} onChange={(e) => setPerson((c) => ({ ...c, phone: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Relationship" value={person.relationship} onChange={(e) => setPerson((c) => ({ ...c, relationship: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
  //           <Button variant="outlined" onClick={() => {
  //             if (person.name && person.phone) {
  //               setEditFields((f) => ({ ...f, authorizedPickup: [...(f.authorizedPickup || []), person] }));
  //               setPerson({ name: '', phone: '', relationship: '' });
  //             }
  //           }}>Add</Button>
  //         </Grid>
  //       </Grid>
  //     </Box>
  //   );
  // };

  // const Gallery = () => {
  //   const [file, setFile] = useState(null);
  //   const [caption, setCaption] = useState('');
  //   return (
  //     <Box>
  //       <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
  //         <Button variant="contained" component="label" startIcon={<PhotoCamera />} disabled={!activeChildId}>
  //           Upload Photo
  //           <input hidden type="file" accept="image/*" multiple onChange={(e) => setFile(e.target.files?.[0] || null)} />
  //         </Button>
  //         <TextField 
  //           size="small" 
  //           label="Caption" 
  //           value={caption} 
  //           onChange={(e) => setCaption(e.target.value)}
  //           sx={{ minWidth: 200 }}
  //         />
  //         <Button 
  //           variant="outlined" 
  //           onClick={() => { if (file) { handleUpload(file, caption); setFile(null); setCaption(''); } }} 
  //           disabled={!file}
  //         >
  //           Add Photo
  //         </Button>
  //         <IconButton onClick={() => fetchChildData(activeChildId)} title="Refresh Gallery">
  //           <Refresh />
  //         </IconButton>
  //       </Box>
  //       <Grid container spacing={2}>
  //         {gallery.map((p) => (
  //           <Grid item xs={12} sm={6} md={4} lg={3} key={p._id}>
  //             <Card sx={{ position: 'relative' }}>
  //               <CardMedia 
  //                 component="img" 
  //                 height="180" 
  //                 image={toAbsoluteUrl(p.url || '')} 
  //                 alt={p.caption || 'Child photo'}
  //                 sx={{ objectFit: 'cover', cursor: 'pointer' }}
  //                 title={toAbsoluteUrl(p.url || '')}
  //                 onError={(e) => {
  //                   const bad = e.currentTarget.getAttribute('src');
  //                   try {
  //                     const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
  //                     const resource = (p.url || '').startsWith('/') ? (p.url || '') : `/${p.url || ''}`;
  //                     const fallback = origin ? new URL(resource, origin).href : '';
  //                     if (fallback && fallback !== bad) {
  //                       console.warn('Gallery image failed, retrying with origin fallback', { bad, fallback });
  //                       e.currentTarget.src = fallback;
  //                       return;
  //                     }
  //                   } catch (err) {
  //                     // ignore
  //                   }
  //                   console.error('Gallery image failed to load:', bad);
  //                 }}
  //                 onClick={() => {
  //                   const fullUrl = toAbsoluteUrl(p.url || '');
  //                   setPhotoPreview({ open: true, url: fullUrl });
  //                 }}
  //               />
  //               <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  //                 <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, mr: 1 }}>
  //                   {p.caption || 'No caption'}
  //                 </Typography>
  //                 <Box sx={{ display: 'flex', gap: 0.5 }}>
  //                   <IconButton 
  //                     size="small" 
  //                     color="primary" 
  //                     onClick={() => {
  //                       api.post(`/api/children/${activeChildId}/gallery/${p._id}/set-profile`)
  //                         .then(() => {
  //                           fetchChildData(activeChildId);
  //                           setProfileImageVersion((v) => v + 1);
  //                         })
  //                         .catch(console.error);
  //                     }}
  //                     title="Set as profile image"
  //                   >
  //                     <Person />
  //                   </IconButton>
  //                   <IconButton 
  //                     size="small" 
  //                     color="error" 
  //                     onClick={() => handleDeletePhoto(p._id)}
  //                     title="Delete photo"
  //                   >
  //                     <Delete />
  //                   </IconButton>
  //                 </Box>
  //               </CardContent>
  //             </Card>
  //           </Grid>
  //         ))}
  //         {gallery.length === 0 && (
  //           <Grid item xs={12}>
  //             <Box sx={{ textAlign: 'center', py: 4 }}>
  //               <PhotoCamera sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
  //               <Typography variant="body2" color="text.secondary">
  //                 No photos yet. Upload some memories!
  //               </Typography>
  //             </Box>
  //           </Grid>
  //         )}
  //       </Grid>
  //       <Dialog open={photoPreview.open} onClose={() => setPhotoPreview({ open: false, url: '' })} maxWidth="md" fullWidth>
  //         <DialogTitle>Photo</DialogTitle>
  //         <DialogContent dividers>
  //           {photoPreview.url && (
  //             <Box sx={{ textAlign: 'center' }}>
  //               <Box 
  //                 component="img" 
  //                 src={photoPreview.url} 
  //                 alt="Preview" 
  //                 title={photoPreview.url}
  //                 sx={{ maxWidth: '100%', borderRadius: 1 }}
  //                 onError={(e) => {
  //                   const bad = e.currentTarget.getAttribute('src');
  //                   try {
  //                     const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
  //                     const resource = photoPreview.url?.replace(/^https?:\/\/[^/]+/i, '') || '';
  //                     const resourceFixed = resource.startsWith('/') ? resource : `/${resource}`;
  //                     const fallback = origin ? new URL(resourceFixed, origin).href : '';
  //                     if (fallback && fallback !== bad) {
  //                       console.warn('Preview image failed, retrying with origin fallback', { bad, fallback });
  //                       e.currentTarget.src = fallback;
  //                       return;
  //                     }
  //                   } catch (err) {
  //                     // ignore
  //                   }
  //                   console.error('Preview image failed to load:', bad);
  //                 }}
  //               />
  //             </Box>
  //           )}
  //         </DialogContent>
  //         <DialogActions>
  //           <Button onClick={() => setPhotoPreview({ open: false, url: '' })}>Close</Button>
  //         </DialogActions>
  //       </Dialog>
  //     </Box>
  //   );
  // };

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
                  src={`${toAbsoluteUrl(profile.profileImage)}?v=${profileImageVersion}`}
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

  // AI Recommendations Functions (kept for future use)
  // eslint-disable-next-line no-unused-vars
  // const generateEducationRecommendations = useCallback(() => {
  //   if (!profile) return [];
  //   // eslint-disable-next-line no-unused-vars
  //   const age = calculateAge(profile.dateOfBirth);
  //   const interests = profile.interests || [];
  //   const recommendations = [
  //     {
  //       id: 1,
  //       title: 'Interactive Storytelling',
  //       description: 'Enhance language skills through engaging story sessions',
  //       ageRange: '2-5',
  //       category: 'Language Development',
  //       benefits: ['Vocabulary building', 'Listening skills', 'Imagination'],
  //       suitable: true
  //     },
  //     {
  //       id: 2,
  //       title: 'Number Recognition Games',
  //       description: 'Fun counting and number games for early math skills',
  //       ageRange: '3-6',
  //       category: 'Mathematics',
  //       benefits: ['Number recognition', 'Counting', 'Pattern identification'],
  //       suitable: true
  //     },
  //     {
  //       id: 3,
  //       title: 'Arts & Crafts Projects',
  //       description: 'Creative activities to develop fine motor skills',
  //       ageRange: '2-6',
  //       category: 'Creative Development',
  //       benefits: ['Fine motor skills', 'Creativity', 'Following instructions'],
  //       suitable: age >= 2 || interests.includes('arts_crafts') || true
  //     },
  //     {
  //       id: 4,
  //       title: 'Science Discovery Time',
  //       description: 'Simple experiments and nature exploration',
  //       ageRange: '3-6',
  //       category: 'STEM',
  //       benefits: ['Critical thinking', 'Observation skills', 'Curiosity'],
  //       suitable: true
  //     },
  //     {
  //       id: 5,
  //       title: 'Musical Expression',
  //       description: 'Singing, dancing, and instrument play for development',
  //       ageRange: '1-6',
  //       category: 'Creative Arts',
  //       benefits: ['Rhythm', 'Memory', 'Emotional expression'],
  //       suitable: true
  //     }
  //   ];
  //   return recommendations.filter(rec => rec.suitable).slice(0, 3);
  // }, [profile]);

  // const generateSocialRecommendations = useCallback(async () => {
  //   if (!activeChildId) return null;
  //   try {
  //     const response = await api.get(`/api/recommendations/child/${activeChildId}`);
  //     return {
  //       playmates: response.data.recommendations || [],
  //       groupActivities: [
  //         'Circle Time Discussions',
  //         'Collaborative Art Projects', 
  //         'Team Building Games',
  //         'Group Storytelling'
  //       ],
  //       socialSkills: [
  //         'Sharing and taking turns',
  //         'Expressing feelings appropriately', 
  //         'Making friends',
  //         'Conflict resolution'
  //       ]
  //     };
  //   } catch (error) {
  //     console.error('Error fetching social recommendations:', error);
  //     return {
  //       playmates: [],
  //       groupActivities: ['Circle Time', 'Group Play', 'Team Activities'],
  //       socialSkills: ['Sharing', 'Communication', 'Empathy', 'Cooperation']
  //     };
  //   }
  // }, [activeChildId]);

  // const generateNutritionRecommendations = useCallback(async () => {
  //   if (!profile) return null;
  //   // eslint-disable-next-line no-unused-vars
  //   const age = calculateAge(profile.dateOfBirth);
  //   const allergies = profile.allergies || [];
  //   try {
  //     const response = await api.post('/meal-recommendations/predict', {
  //       age: age,
  //       dietaryPreference: 'balanced',
  //       hasAllergy: allergies.length > 0
  //     });
  //     return {
  //       ...response.data,
  //       tips: [
  //         'Introduce variety gradually',
  //         'Make mealtime enjoyable',
  //         'Involve child in food preparation',
  //         'Be patient with new foods'
  //       ],
  //       allergies: allergies
  //     };
  //   } catch (error) {
  //     console.error('Error fetching nutrition recommendations:', error);
  //     return {
  //       recommendations: [
  //         'Colorful fruit and vegetable plates',
  //         'Whole grain options for sustained energy',
  //         'Protein-rich snacks for growth',
  //         'Calcium sources for strong bones'
  //       ],
  //       tips: [
  //         'Encourage trying new foods',
  //         'Create positive mealtime environment',
  //         'Offer choices when possible'
  //       ],
  //       allergies: allergies
  //     };
  //   }
  // }, [profile]);

  // Fetch billing data for the active child
  const fetchBillingData = async () => {
    if (!activeChildId) return;
    
    try {
      const [invoicesRes, paymentsRes] = await Promise.all([
        api.get(`/billing/invoices/child/${activeChildId}`),
        api.get(`/billing/payments/child/${activeChildId}`)
      ]);
      
      setBillingData({
        invoices: invoicesRes.data || [],
        payments: paymentsRes.data || []
      });
    } catch (error) {
      console.error('Error fetching billing data:', error);
      // Generate sample billing data if API fails
      const defaultAmount = profile?.tuitionRate || 500;
      const childName = profile?.firstName && profile?.lastName 
        ? `${profile.firstName} ${profile.lastName}` 
        : 'Child';
      
      setBillingData({
        invoices: [{
          _id: '1',
          invoiceNumber: 'INV-001',
          amount: defaultAmount,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          description: `Monthly tuition for ${childName}`,
          childId: activeChildId
        }],
        payments: []
      });
    }
  };

  const fetchFeeOptions = useCallback(async () => {
    if (!activeChildId || user?.role !== 'parent') return;

    try {
      setFeeSelectionLoading(true);
      setFeeSelectionMessage({ type: '', text: '' });
      const response = await api.get(`/billing/fee-structures/child/${activeChildId}/options`);
      setFeeOptionsData({
        options: Array.isArray(response.data?.options) ? response.data.options : [],
        currentSelection: response.data?.currentSelection || null,
        program: response.data?.program || profile?.program || '',
      });
    } catch (error) {
      console.error('Error fetching fee options:', error);
      setFeeOptionsData({ options: [], currentSelection: null, program: profile?.program || '' });
    } finally {
      setFeeSelectionLoading(false);
    }
  }, [activeChildId, user?.role, profile?.program]);

  const handleSelectFeeStructure = async (feeStructureId) => {
    if (!activeChildId || !feeStructureId) return;

    try {
      setFeeSelectionSaving(true);
      setFeeSelectionMessage({ type: '', text: '' });
      await api.put(`/billing/fee-structures/child/${activeChildId}/select`, { feeStructureId });
      await Promise.all([fetchFeeOptions(), fetchChildData(activeChildId), fetchBillingData()]);
      setFeeSelectionMessage({ type: 'success', text: 'Fee structure selected successfully.' });
    } catch (error) {
      console.error('Error selecting fee structure:', error);
      setFeeSelectionMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Failed to select fee structure.'
      });
    } finally {
      setFeeSelectionSaving(false);
    }
  };

  // Process payment
  const processPayment = async (invoice) => {
    setPaymentLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update invoice status to paid
      const updatedInvoices = billingData.invoices.map(inv => 
        inv._id === invoice._id ? { ...inv, status: 'paid' } : inv
      );
      
      // Add payment record
      const newPayment = {
        _id: Date.now().toString(),
        invoiceId: invoice._id,
        amount: invoice.amount,
        paymentDate: new Date().toISOString(),
        method: 'card'
      };
      
      setBillingData({
        ...billingData,
        invoices: updatedInvoices,
        payments: [...billingData.payments, newPayment]
      });
      
      setPaymentDialog({ open: false, invoice: null });
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments/parent');
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  // Book appointment
  const handleBookAppointment = async () => {
    setAppointmentLoading(true);
    setAppointmentError('');
    setAppointmentSuccess('');

    try {
      if (!appointmentForm.childId) {
        setAppointmentError('Please select a child');
        setAppointmentLoading(false);
        return;
      }

      if (!appointmentForm.appointmentDate) {
        setAppointmentError('Please select appointment date');
        setAppointmentLoading(false);
        return;
      }

      if (!appointmentForm.reason) {
        setAppointmentError('Please provide a reason for consultation');
        setAppointmentLoading(false);
        return;
      }

      await api.post('/appointments', appointmentForm);
      
      setAppointmentSuccess('Appointment request submitted successfully! The doctor will review and confirm.');
      setAppointmentDialog(false);
      setAppointmentForm({
        childId: '',
        appointmentDate: '',
        appointmentTime: '09:00',
        reason: '',
        appointmentType: 'onsite',
        isEmergency: false
      });
      
      fetchAppointments();
    } catch (error) {
      console.error('Error booking appointment:', error);
      setAppointmentError(error.response?.data?.message || 'Failed to book appointment');
    } finally {
      setAppointmentLoading(false);
    }
  };

  const handlePayDoctor = async (appointment) => {
    try {
      const fee = appointment.payment?.consultationFee ?? 500;
      const res = await api.post('/payments/create-order-for-service', {
        paymentType: 'doctor',
        appointmentId: appointment._id,
        amount: fee,
        currency: 'INR'
      });
      if (!res.data?.success || !res.data?.order) {
        setAppointmentError(res.data?.message || 'Failed to create payment');
        return;
      }
      const loadRazorpay = () => new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.body.appendChild(s);
      });
      if (!(await loadRazorpay())) {
        setAppointmentError('Failed to load payment. Please try again.');
        return;
      }
      const options = {
        key: RAZORPAY_CONFIG.key_id,
        amount: res.data.order.amount,
        currency: res.data.order.currency || 'INR',
        name: RAZORPAY_CONFIG.name || 'TinyTots',
        description: 'Doctor consultation - held by platform until service completion',
        order_id: res.data.order.id,
        handler: async (response) => {
          try {
            const verify = await api.post('/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentType: 'doctor',
              appointmentId: appointment._id
            });
            if (verify.data?.success) {
              setAppointmentSuccess(verify.data.message || 'Payment successful! Amount held by platform.');
              fetchAppointments();
            } else {
              setAppointmentError(verify.data?.message || 'Payment verification failed');
            }
          } catch (e) {
            setAppointmentError(e.response?.data?.message || 'Payment verification failed');
          }
        },
        prefill: { name: user?.firstName ? `${user.firstName} ${user.lastName}` : '', email: user?.email || '', contact: user?.phone || '' },
        theme: RAZORPAY_CONFIG.theme || { color: '#1abc9c' },
        modal: { ondismiss: () => {} }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      setAppointmentError(error.response?.data?.message || 'Failed to initiate payment');
    }
  };

  const handleConfirmDoctorPayment = async (appointment, rating = 5, feedback = '', issues = '') => {
    try {
      await api.post(`/appointments/${appointment._id}/confirm-payment`, { rating, feedback, issues });
      setAppointmentSuccess('Payment confirmed. Admin will review and approve payout to doctor.');
      fetchAppointments();
    } catch (error) {
      setAppointmentError(error.response?.data?.message || 'Failed to confirm payment');
    }
  };

  // Slot-based booking helpers
  const fetchAvailableDoctors = async () => {
    try {
      const res = await api.get('/appointments/doctors/list');
      const docs = Array.isArray(res.data) ? res.data : [];
      setAvailableDoctors(docs);
      if (docs.length > 0) {
        const docId = docs[0]._id;
        setSelectedDoctorId(docId);
        // fetch slots for the first doctor immediately
        fetchAvailableSlots(docId, slotBookingDate);
      }
    } catch (err) {
      console.error('Fetch doctors error:', err);
    }
  };

  const fetchAvailableSlots = async (doctorId, date) => {
    if (!doctorId) return;
    try {
      setSlotsLoading(true);
      const res = await api.get(`/doctor/slots/available/${doctorId}`, { params: { date } });
      setAvailableSlots(res.data || []);
    } catch (err) {
      console.error('Fetch slots error:', err);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleBookSlot = async () => {
    if (!selectedSlot || !slotBookingChildId || !slotBookingReason) {
      setAppointmentError('Please select a child, slot, and provide a reason');
      return;
    }
    try {
      setAppointmentLoading(true);
      setAppointmentError('');
      const res = await api.post('/appointments/book-slot', {
        childId: slotBookingChildId,
        slotId: selectedSlot._id,
        reason: slotBookingReason,
        appointmentType: slotBookingType
      });
      // Proceed to payment
      setSlotBookingStep(2);
      // Trigger payment immediately
      await handlePayDoctor(res.data.appointment);
    } catch (err) {
      setAppointmentError(err.response?.data?.message || 'Failed to book slot');
    } finally {
      setAppointmentLoading(false);
    }
  };

  // After School Programs Functions
  const fetchAfterSchoolPrograms = async () => {
    try {
      const response = await api.get('/afterschool/programs');
      setAfterSchoolPrograms(response.data || []);
    } catch (error) {
      console.error('Error fetching after school programs:', error);
    }
  };

  const fetchMyEnrollments = async () => {
    try {
      const response = await api.get('/afterschool/my-enrollments');
      setMyEnrollments(response.data || []);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const fetchParentTeacherMessages = async () => {
    try {
      setParentTeacherMessagesLoading(true);
      const response = await api.get('/staff-ops/messages');
      const items = Array.isArray(response.data) ? response.data : [];
      setParentTeacherMessages(items.filter((item) => item.to === 'parent'));
    } catch (error) {
      console.error('Error fetching teacher messages:', error);
      setParentTeacherMessages([]);
    } finally {
      setParentTeacherMessagesLoading(false);
    }
  };

  const handleEnrollProgram = async (programId) => {
    setEnrollmentLoading(true);
    setAfterSchoolMessage({ type: '', text: '' });

    try {
      if (!activeChildId) {
        setAfterSchoolMessage({ type: 'error', text: 'Please select a child first' });
        setEnrollmentLoading(false);
        return;
      }

      await api.post(`/afterschool/programs/${programId}/enroll`, {
        childId: activeChildId
      });

      setAfterSchoolMessage({ 
        type: 'success', 
        text: 'Child enrolled successfully! Check "My Enrollments" section.' 
      });
      
      setAfterSchoolDialog(false);
      setSelectedProgram(null);
      
      fetchAfterSchoolPrograms();
      fetchMyEnrollments();
    } catch (error) {
      console.error('Error enrolling:', error);
      setAfterSchoolMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to enroll child' 
      });
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleUnenrollProgram = async (programId) => {
    if (!window.confirm('Are you sure you want to unenroll your child from this program?')) {
      return;
    }

    try {
      await api.post(`/afterschool/programs/${programId}/unenroll`, {
        childId: activeChildId
      });

      setAfterSchoolMessage({ 
        type: 'success', 
        text: 'Child unenrolled successfully' 
      });
      
      fetchAfterSchoolPrograms();
      fetchMyEnrollments();
    } catch (error) {
      console.error('Error unenrolling:', error);
      setAfterSchoolMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to unenroll child' 
      });
    }
  };

  // Fetch transport requests
  const fetchTransportRequests = useCallback(async () => {
    try {
      const response = await api.get('/transport/my-requests');
      setTransportRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching transport requests:', error);
    }
  }, []);

  // Fetch transport assignment
  const fetchTransportAssignment = useCallback(async () => {
    if (!profile?._id) {
      return;
    }
    try {
      const response = await api.get(`/transport/my-assignment/${profile._id}`);
      setTransportAssignment(response.data.assignment);
    } catch (error) {
      // No assignment found is okay
      console.log('No transport assignment found');
    }
  }, [profile?._id]);

  // Load appointments when tab changes
  useEffect(() => {
    if (tab === 7 && user?.role === 'parent') {
      fetchAppointments();
    }
  }, [tab, user?.role]);

  // Load transport data when tab changes
  useEffect(() => {
    if (tab === 3 && user?.role === 'parent') {
      fetchTransportRequests();
      if (profile?._id) {
        fetchTransportAssignment();
      }
    }
  }, [tab, user?.role, profile?._id, fetchTransportRequests, fetchTransportAssignment]);

  // Handle transport form submission
  const handleTransportEnrollment = async () => {
    if (!transportForm.pickupAddress || !transportForm.contactNumber) {
      setTransportMessage({ open: true, text: 'Please fill in all required fields', severity: 'warning' });
      return;
    }

    if (!profile?._id) {
      setTransportMessage({ open: true, text: 'Please select a child first', severity: 'warning' });
      return;
    }

    setTransportLoading(true);
    try {
      const response = await api.post('/transport/request', {
        childId: profile._id,
        childName: profile.firstName + ' ' + (profile.lastName || ''),
        pickupAddress: transportForm.pickupAddress,
        pickupTime: transportForm.pickupTime,
        dropoffTime: transportForm.dropoffTime,
        contactNumber: transportForm.contactNumber,
        specialInstructions: transportForm.specialInstructions
      });

      setTransportMessage({ 
        open: true, 
        text: response.data.message || 'Transport request submitted successfully! Admin will review shortly.', 
        severity: 'success' 
      });
      
      // Reset form
      setTransportForm({
        pickupAddress: '',
        pickupTime: '08:00',
        dropoffTime: '17:00',
        contactNumber: user?.phone || '',
        specialInstructions: ''
      });

      // Refresh requests
      fetchTransportRequests();
    } catch (error) {
      setTransportMessage({ 
        open: true, 
        text: error.response?.data?.message || 'Failed to submit transport request', 
        severity: 'error' 
      });
    } finally {
      setTransportLoading(false);
    }
  };

  // Cancel transport request
  const handleCancelTransportRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    try {
      await api.delete(`/transport/request/${requestId}`);
      alert('Transport request cancelled');
      fetchTransportRequests();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel request');
    }
  };

  // Fetch customer orders
  const fetchOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      setOrdersError('');
      const response = await api.get('/orders/my-orders');
      setOrders(response.data?.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrdersError(error.response?.data?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Load orders when tab changes to Orders tab
  useEffect(() => {
    if (tab === 4) {
      fetchOrders();
    }
  }, [tab, fetchOrders]);

  useEffect(() => {
    if (tab === 2 && user?.role === 'parent') {
      fetchAfterSchoolPrograms();
      fetchMyEnrollments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user?.role]);

  useEffect(() => {
    if (tab === 6 && user?.role === 'parent') {
      fetchParentTeacherMessages();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user?.role]);

  // Schedule display component (kept for future use)
  // const ScheduleCard = () => {
  //   if (!profile?.schedule) return null;
  //   const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  //   const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  //   return (
  //     <Card>
  //       <CardHeader title="Weekly Schedule" />
  //       <CardContent>
  //         <Grid container spacing={2}>
  //           {days.map((day, index) => {
  //             const daySchedule = profile.schedule[day];
  //             return (
  //               <Grid item xs={12} sm={6} md={4} key={day}>
  //                 <Box sx={{ 
  //                   p: 2, 
  //                   border: '1px solid', 
  //                   borderColor: daySchedule?.enrolled ? 'success.main' : 'grey.300',
  //                   borderRadius: 1,
  //                   bgcolor: daySchedule?.enrolled ? 'success.50' : 'grey.50'
  //                 }}>
  //                   <Typography variant="subtitle2" gutterBottom>
  //                     {dayNames[index]}
  //                   </Typography>
  //                   {daySchedule?.enrolled ? (
  //                     <Box>
  //                       <Typography variant="body2" color="success.main">
  //                         ✓ Enrolled
  //                       </Typography>
  //                       <Typography variant="body2">
  //                         {daySchedule.start} - {daySchedule.end}
  //                       </Typography>
  //                     </Box>
  //                   ) : (
  //                     <Typography variant="body2" color="text.secondary">
  //                       Not enrolled
  //                     </Typography>
  //                   )}
  //                 </Box>
  //               </Grid>
  //             );
  //           })}
  //         </Grid>
  //       </CardContent>
  //     </Card>
  //   );
  // };

  // StaffCard removed - moved to different location

  const [vaOpen, setVaOpen] = useState(false);
  const handleVaOpen = () => setVaOpen(true);
  const handleVaClose = () => setVaOpen(false);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ px: 3, py: 2 }}>
          <Grid container alignItems="center" justifyContent="space-between">
            {/* Left: Branding and Welcome */}
            <Grid item>
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: 'primary.main', 
                    fontWeight: 'bold',
                    mb: 0.5
                  }}
                >
                  TinyTots Parent Portal
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Welcome back, {user?.name || user?.firstName || 'Parent'}!
                </Typography>
              </Box>
            </Grid>

            {/* Right: Voice Assistant, Shopping Cart, Notifications, Logout */}
            <Grid item>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                {/* Voice Assistant */}
                <IconButton
                  color="inherit"
                  sx={{ color: 'text.secondary', p: 1 }}
                  onClick={handleVaOpen}
                  aria-label="Open voice assistant"
                  size="large"
                >
                  <KeyboardVoice fontSize="medium" />
                </IconButton>

                {/* Shopping Cart with Badge */}
                <IconButton 
                  color="inherit" 
                  sx={{ position: 'relative', color: 'text.secondary', p: 1 }}
                  onClick={() => navigate('/shop')}
                  aria-label="Shop"
                  size="large"
                >
                  <ShoppingCart fontSize="medium" />
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 5, 
                    right: 5, 
                    bgcolor: '#e91e63', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: 18, 
                    height: 18, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    3
                  </Box>
                </IconButton>

                {/* Notifications with Badge */}
                <IconButton 
                  color="inherit" 
                  sx={{ position: 'relative', color: 'text.secondary', p: 1 }}
                  onClick={handleNotificationsOpen}
                  aria-label="Notifications"
                  size="large"
                >
                  <Badge 
                    badgeContent={notifications.filter(n => !n.read).length} 
                    color="error"
                    overlap="circular"
                  >
                    <Notifications />
                  </Badge>
                </IconButton>

                {/* Notifications Menu */}
                <Menu
                  anchorEl={notificationsAnchor}
                  open={Boolean(notificationsAnchor)}
                  onClose={handleNotificationsClose}
                  PaperProps={{
                    sx: {
                      width: 360,
                      maxHeight: 400,
                      mt: 1.5
                    }
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Notifications
                    </Typography>
                  </Box>
                  {notificationsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : notifications.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No notifications
                      </Typography>
                    </Box>
                  ) : (
                    <List sx={{ maxHeight: 300, overflow: 'auto', p: 0 }}>
                      {notifications.slice(0, 10).map((notification, index) => (
                        <React.Fragment key={notification.id || index}>
                          <ListItem
                            button
                            onClick={() => {
                              handleNotificationsClose();
                              setTab(10); // Navigate to notifications tab
                            }}
                            sx={{
                              bgcolor: notification.read ? 'transparent' : 'action.hover',
                              '&:hover': { bgcolor: 'action.selected' }
                            }}
                          >
                            <ListItemIcon>
                              <Notifications 
                                sx={{ 
                                  color: notification.read ? 'text.secondary' : '#e91e63' 
                                }} 
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={notification.subject || notification.title || 'New Notification'}
                              secondary={notification.notes || notification.message || notification.description}
                              primaryTypographyProps={{
                                sx: {
                                  fontWeight: notification.read ? 400 : 600,
                                  fontSize: '0.9rem'
                                }
                              }}
                              secondaryTypographyProps={{
                                sx: {
                                  fontSize: '0.8rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }
                              }}
                            />
                            {!notification.read && (
                              <Chip 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#e91e63', 
                                  color: 'white',
                                  height: 16,
                                  fontSize: '0.65rem'
                                }} 
                                label="New"
                              />
                            )}
                          </ListItem>
                          {index < notifications.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                  {notifications.length > 10 && (
                    <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
                      <Button 
                        size="small" 
                        onClick={() => {
                          handleNotificationsClose();
                          setTab(10); // Navigate to notifications tab
                        }}
                      >
                        View All Notifications
                      </Button>
                    </Box>
                  )}
                </Menu>

                {/* Logout Button */}
                <Button 
                  startIcon={<LogoutIcon />} 
                  onClick={() => {
                    localStorage.clear();
                    window.location.href = '/login';
                  }}
                  sx={{ color: 'success.main', textTransform: 'none' }}
                >
                  Logout
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
        
        {/* Navigation Tabs */}
        <Box sx={{ px: 3 }}>
          <Tabs 
            value={tab} 
            onChange={(_, v) => setTab(v)} 
            variant="scrollable" 
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: '64px',
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#1abc9c'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#1abc9c',
                height: 3
              }
            }}
          >
            <Tab icon={<Home />} label="Home" iconPosition="start" />
            <Tab icon={<ChildCare />} label="Daycare" iconPosition="start" />
            <Tab icon={<Favorite />} label="Services" iconPosition="start" />
            <Tab icon={<DirectionsCar />} label="Transport" iconPosition="start" />
            <Tab icon={<ShoppingBag />} label="My Orders" iconPosition="start" />
            <Tab icon={<Receipt />} label="Billing" iconPosition="start" />
            <Tab icon={<Message />} label="Messages" iconPosition="start" />
            <Tab icon={<LocalHospital />} label="Doctor Appointments" iconPosition="start" />
            <Tab icon={<Assessment />} label="Feedback" iconPosition="start" />
            <Tab icon={<KeyboardVoice />} label="AI Assistant" iconPosition="start" />
            <Tab icon={<EmojiEvents />} label="Milestones" iconPosition="start" />
            <Tab icon={<SportsEsports />} label="Learning Games" iconPosition="start" />
          </Tabs>
        </Box>
      </Box>

      {/* Error Message */}
      {errorMsg && (
        <Box sx={{ m: 3, p: 1.5, borderRadius: 1, bgcolor: 'warning.light', color: 'warning.dark' }}>
          {errorMsg}
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ p: 3 }}>

        {/* Child Selector Bar */}
        {children.length > 0 && (
          <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#e91e63' }}><Person /></Avatar>
            <FormControl size="small" sx={{ minWidth: 250, flex: 1 }}>
              <InputLabel>Select Child</InputLabel>
              <Select
                value={activeChildId}
                onChange={(e) => setActiveChildId(e.target.value)}
                label="Select Child"
              >
                {children.map((c) => (
                  <MenuItem key={c._id} value={c._id}>{c.firstName} {c.lastName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setAddChildDialog(true)}
              sx={{ 
                bgcolor: '#14B8A6', 
                '&:hover': { bgcolor: '#0F766E' },
                textTransform: 'none'
              }}
            >
              Add Child
            </Button>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={openEditChildDialog}
              disabled={!activeChildId || !profile}
              sx={{ textTransform: 'none' }}
            >
              Edit Child Profile
            </Button>
            <IconButton onClick={() => activeChildId && fetchChildData(activeChildId)} color="primary">
              <Refresh />
            </IconButton>
          </Paper>
        )}

        {/* No Children State */}
        {user?.role === 'parent' && children.length === 0 && !errorMsg && (
          <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
            <ChildCare sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Child Profiles Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add your first child to get started with TinyTots services
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setAddChildDialog(true)}
              sx={{ 
                bgcolor: '#14B8A6', 
                '&:hover': { bgcolor: '#0F766E' },
                textTransform: 'none'
              }}
            >
              Add Your First Child
            </Button>
          </Paper>
        )}

        {/* Content Sections */}
        {user?.role === 'parent' && activeChildId && children.length > 0 && (
          <Box>
            {/* Tab 0: Home - Overview with Profile Card, Activities, and Meal Plan */}
            {tab === 0 && (
              <Box>
                {/* Child Profile Card - Teal Theme */}
                <Paper 
                  sx={{ 
                    p: 4, 
                    mb: 3, 
                    background: 'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)',
                    color: 'white',
                    borderRadius: 3,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  <Grid container spacing={3} alignItems="center">
                    <Grid item>
                      <Avatar 
                        src={toAbsoluteUrl(profile?.profileImage || profile?.photo)}
                        sx={{ width: 100, height: 100, border: '4px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                      >
                        {!profile?.profileImage && !profile?.photo && <ChildCare sx={{ fontSize: 50 }} />}
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} sm={3}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {profile?.firstName || ''} {profile?.lastName || ''}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Age</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {calculateAge(profile?.dateOfBirth) || 'N/A'} years
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Group</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {profile?.program ? profile.program.charAt(0).toUpperCase() + profile.program.slice(1) : 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Teacher</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {assignedStaff && assignedStaff.length > 0 
                              ? assignedStaff[0]?.name || assignedStaff[0]?.firstName 
                                ? `${assignedStaff[0].firstName || ''} ${assignedStaff[0].lastName || ''}`.trim() || `Ms. ${assignedStaff[0].name || 'Staff'}`
                                : `Ms. ${assignedStaff[0].name || 'Staff'}`
                              : profile?.assignedStaff && profile.assignedStaff.length > 0
                                ? profile.assignedStaff[0]
                                : 'Not Assigned'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Attendance</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {reports?.attendance?.summary?.attendanceRate 
                              ? `${reports.attendance.summary.attendanceRate}%`
                              : attendance && Array.isArray(attendance) && attendance.length > 0 
                                ? `${Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)}%`
                                : '0%'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Today's Activities and Meal Plan */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <Event sx={{ color: '#e91e63', mr: 1, fontSize: 20 }} />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>Today's Activities</Typography>
                        </Box>
                        {activities?.recent && activities.recent.length > 0 ? (
                          <Box>
                            {activities.recent.slice(0, 6).map((activity, idx) => {
                              // Parse activity time
                              let activityTime;
                              let timeStr = '';
                              
                              if (activity.date) {
                                activityTime = new Date(activity.date);
                                if (!isNaN(activityTime.getTime())) {
                                  const hour = activityTime.getHours();
                                  const minute = activityTime.getMinutes();
                                  const hour12 = hour % 12 || 12;
                                  const ampm = hour >= 12 ? 'PM' : 'AM';
                                  timeStr = `${hour12}:${minute < 10 ? '0' : ''}${minute} ${ampm}`;
                                }
                              } else if (activity.time) {
                                timeStr = activity.time;
                              } else if (activity.scheduledTime) {
                                timeStr = activity.scheduledTime;
                              }
                              
                              // Determine status
                              let status = 'pending'; // grey
                              if (activityTime && !isNaN(activityTime.getTime())) {
                                const now = new Date();
                                const oneHourFromNow = new Date(now.getTime() + 3600000);
                                if (activityTime < now) {
                                  status = 'completed'; // green
                                } else if (activityTime <= oneHourFromNow) {
                                  status = 'current'; // blue
                                }
                              } else if (activity.status === 'completed' || activity.completed) {
                                status = 'completed';
                              } else if (activity.status === 'in-progress' || activity.inProgress) {
                                status = 'current';
                              }
                              
                              const dotColor = status === 'completed' ? '#4caf50' : status === 'current' ? '#2196f3' : '#9e9e9e';
                              
                              return (
                                <Box 
                                  key={activity._id || idx} 
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    mb: 2.5,
                                    pb: 2.5,
                                    borderBottom: idx < activities.recent.length - 1 && idx < 5 ? '1px solid #f0f0f0' : 'none'
                                  }}
                                >
                                  <Box 
                                    sx={{ 
                                      width: 12, 
                                      height: 12, 
                                      borderRadius: '50%', 
                                      bgcolor: dotColor,
                                      mr: 2,
                                      flexShrink: 0
                                    }} 
                                  />
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                      {activity.title || activity.activity || activity.name || 'Activity'}
                                    </Typography>
                                  </Box>
                                  {timeStr && (
                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 2, flexShrink: 0 }}>
                                      {timeStr}
                                    </Typography>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        ) : (
                          <Typography color="text.secondary">No activities scheduled for today</Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <Favorite sx={{ color: '#e91e63', mr: 1, fontSize: 20 }} />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>Today's Meal Plan</Typography>
                        </Box>
                        {(() => {
                          // Get today's day name
                          const today = new Date();
                          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                          const todayDayName = dayNames[today.getDay()].toLowerCase();
                          
                          // Find today's meal plan
                          let todayMeals = [];
                          if (meals?.plan && Array.isArray(meals.plan)) {
                            const todayPlan = meals.plan.find(dayPlan => 
                              dayPlan.day && dayPlan.day.toLowerCase() === todayDayName
                            );
                            
                            if (todayPlan && todayPlan.menu) {
                              // Convert menu object to array of meals
                              if (todayPlan.menu.breakfast) {
                                todayMeals.push({
                                  type: 'Breakfast',
                                  description: todayPlan.menu.breakfast,
                                  consumption: todayPlan.consumption?.breakfast || todayPlan.menu.breakfastConsumption || 100
                                });
                              }
                              if (todayPlan.menu.morningSnack || todayPlan.menu.snack) {
                                todayMeals.push({
                                  type: 'Snack',
                                  description: todayPlan.menu.morningSnack || todayPlan.menu.snack,
                                  consumption: todayPlan.consumption?.snack || todayPlan.menu.snackConsumption || 80
                                });
                              }
                              if (todayPlan.menu.lunch) {
                                todayMeals.push({
                                  type: 'Lunch',
                                  description: todayPlan.menu.lunch,
                                  consumption: todayPlan.consumption?.lunch || todayPlan.menu.lunchConsumption || 0
                                });
                              }
                              if (todayPlan.menu.afternoonSnack && !todayPlan.menu.morningSnack) {
                                todayMeals.push({
                                  type: 'Snack',
                                  description: todayPlan.menu.afternoonSnack,
                                  consumption: todayPlan.consumption?.afternoonSnack || 0
                                });
                              }
                            } else {
                              // Fallback: if meals.plan is an array of meal objects (not day plans)
                              todayMeals = meals.plan.filter(meal => {
                                // Check if meal is for today
                                if (meal.date) {
                                  const mealDate = new Date(meal.date);
                                  return mealDate.toDateString() === today.toDateString();
                                }
                                return true; // If no date, assume it's for today
                              }).slice(0, 3).map(meal => ({
                                type: meal.mealType || meal.type || 'Meal',
                                description: meal.items 
                                  ? (Array.isArray(meal.items) ? meal.items.join(', ') : meal.items)
                                  : meal.description || meal.food || 'Nutritious meal',
                                consumption: meal.consumptionPercentage || meal.consumption || 0
                              }));
                            }
                          }
                          
                          if (todayMeals.length > 0) {
                            return (
                              <Box>
                                {todayMeals.slice(0, 3).map((meal, idx) => {
                                  // Determine color based on consumption
                                  let statusColor = '#9e9e9e'; // grey
                                  let statusText = 'Pending';
                                  
                                  if (meal.consumption === 100) {
                                    statusColor = '#4caf50'; // green
                                    statusText = '100%';
                                  } else if (meal.consumption >= 80) {
                                    statusColor = '#ffc107'; // yellow
                                    statusText = `${meal.consumption}%`;
                                  } else if (meal.consumption > 0) {
                                    statusColor = '#2196f3'; // blue
                                    statusText = 'In Progress';
                                  }
                                  
                                  return (
                                    <Box 
                                      key={idx}
                                      sx={{ 
                                        mb: 2.5,
                                        pb: 2.5,
                                        borderBottom: idx < todayMeals.length - 1 && idx < 2 ? '1px solid #f0f0f0' : 'none'
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                          {meal.type}
                                        </Typography>
                                        <Box
                                          sx={{
                                            bgcolor: statusColor,
                                            color: 'white',
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: 1,
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            minWidth: 80,
                                            textAlign: 'center'
                                          }}
                                        >
                                          {statusText}
                                        </Box>
                                      </Box>
                                      <Typography variant="body2" color="text.secondary">
                                        {meal.description}
                                      </Typography>
                                    </Box>
                                  );
                                })}
                              </Box>
                            );
                          } else {
                            return <Typography color="text.secondary">No meals scheduled for today</Typography>;
                          }
                        })()}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Tab 1: Daycare - All child management features */}
            {tab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Tabs 
                      value={daycareTab} 
                      onChange={(_, v) => setDaycareTab(v)} 
                      variant="scrollable"
                      sx={{ mb: 2, borderBottom: '1px solid #e0e0e0' }}
                    >
                      <Tab label="Profile" />
                      <Tab label="Medical & Emergency" />
                      <Tab label="Gallery" />
                      <Tab label="Attendance" />
                      <Tab label="Activities" />
                      <Tab label="Meals" />
                      <Tab label="Staff" />
                      <Tab label="📍 Location" />
                      <Tab label="💉 Vaccinations" />
                    </Tabs>

                    {/* Daycare Sub-tabs Content */}
                    {daycareTab === 0 && (
                      <Box>
                        <ProfileCard />
                      </Box>
                    )}

                    {daycareTab === 1 && (
                      <Box sx={{ p: 2 }}>
                        <Grid container spacing={3}>
                          {/* Allergies Section */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                Allergies
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  placeholder="Add allergy"
                                  value={editFields.newAllergy || ''}
                                  onChange={(e) => setEditFields({ ...editFields, newAllergy: e.target.value })}
                                />
                                <Button 
                                  variant="contained"
                                  sx={{ bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0F766E' }, minWidth: '80px' }}
                                  onClick={async () => {
                                    if (editFields.newAllergy?.trim()) {
                                      const updatedAllergies = [...(profile.allergies || []), editFields.newAllergy.trim()];
                                      try {
                                                  await api.put(`/children/${activeChildId}`, { allergies: updatedAllergies });
                                        setProfile({ ...profile, allergies: updatedAllergies });
                                        setEditFields({ ...editFields, newAllergy: '' });
                                      } catch (error) {
                                        console.error('Error adding allergy:', error);
                                      }
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </Box>
                            </Paper>
                          </Grid>

                          {/* Medical Information Section */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                Medical Information
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  placeholder="Add medical note"
                                  value={editFields.newMedicalCondition || ''}
                                  onChange={(e) => setEditFields({ ...editFields, newMedicalCondition: e.target.value })}
                                />
                                <Button 
                                  variant="contained"
                                  sx={{ bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0F766E' }, minWidth: '80px' }}
                                  onClick={async () => {
                                    if (editFields.newMedicalCondition?.trim()) {
                                      const updatedConditions = [...(profile?.medicalConditions || []), editFields.newMedicalCondition.trim()];
                                      try {
                                                  await api.put(`/children/${activeChildId}`, { medicalConditions: updatedConditions });
                                        setProfile({ ...profile, medicalConditions: updatedConditions });
                                        setEditFields({ ...editFields, newMedicalCondition: '' });
                                      } catch (error) {
                                        console.error('Error adding medical condition:', error);
                                      }
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </Box>
                            </Paper>
                          </Grid>

                          {/* Emergency Contacts Section */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                Emergency Contacts
                              </Typography>
                              <Grid container spacing={1}>
                                <Grid item xs={12} sm={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Name"
                                    value={editFields.emergencyName || ''}
                                    onChange={(e) => setEditFields({ ...editFields, emergencyName: e.target.value })}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Phone"
                                    value={editFields.emergencyPhone || ''}
                                    onChange={(e) => setEditFields({ ...editFields, emergencyPhone: e.target.value })}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      placeholder="Relationship"
                                      value={editFields.emergencyRelationship || 'Emergency'}
                                      onChange={(e) => setEditFields({ ...editFields, emergencyRelationship: e.target.value })}
                                    />
                                    <Button 
                                      variant="contained"
                                      sx={{ bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0F766E' }, minWidth: '60px' }}
                                      onClick={async () => {
                                        if (editFields.emergencyName && editFields.emergencyPhone) {
                                          const newContact = {
                                            name: editFields.emergencyName,
                                            phone: editFields.emergencyPhone,
                                            relationship: editFields.emergencyRelationship || 'Emergency'
                                          };
                                          const updatedContacts = [...(profile.emergencyContacts || []), newContact];
                                          try {
                                                  await api.put(`/children/${activeChildId}`, { emergencyContacts: updatedContacts });
                                            setProfile({ ...profile, emergencyContacts: updatedContacts });
                                            setEditFields({ 
                                              ...editFields, 
                                              emergencyName: '', 
                                              emergencyPhone: '', 
                                              emergencyRelationship: 'Emergency' 
                                            });
                                          } catch (error) {
                                            console.error('Error adding emergency contact:', error);
                                          }
                                        }
                                      }}
                                    >
                                      Add
                                    </Button>
                                  </Box>
                                </Grid>
                              </Grid>
                            </Paper>
                          </Grid>

                          {/* Authorized Pickups Section */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                Authorized Pickups
                              </Typography>
                              <Grid container spacing={1}>
                                <Grid item xs={12} sm={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Name"
                                    value={editFields.pickupName || ''}
                                    onChange={(e) => setEditFields({ ...editFields, pickupName: e.target.value })}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Phone"
                                    value={editFields.pickupPhone || ''}
                                    onChange={(e) => setEditFields({ ...editFields, pickupPhone: e.target.value })}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      placeholder="Relationship"
                                      value={editFields.pickupRelationship || ''}
                                      onChange={(e) => setEditFields({ ...editFields, pickupRelationship: e.target.value })}
                                    />
                                    <Button 
                                      variant="contained"
                                      sx={{ bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0F766E' }, minWidth: '60px' }}
                                      onClick={async () => {
                                        if (editFields.pickupName && editFields.pickupPhone) {
                                          const newPickup = {
                                            name: editFields.pickupName,
                                            phone: editFields.pickupPhone,
                                            relationship: editFields.pickupRelationship || ''
                                          };
                                          const updatedPickups = [...(profile.authorizedPickups || []), newPickup];
                                          try {
                                                  await api.put(`/children/${activeChildId}`, { authorizedPickups: updatedPickups });
                                            setProfile({ ...profile, authorizedPickups: updatedPickups });
                                            setEditFields({ 
                                              ...editFields, 
                                              pickupName: '', 
                                              pickupPhone: '', 
                                              pickupRelationship: '' 
                                            });
                                          } catch (error) {
                                            console.error('Error adding authorized pickup:', error);
                                          }
                                        }
                                      }}
                                    >
                                      Add
                                    </Button>
                                  </Box>
                                </Grid>
                              </Grid>
                            </Paper>
                          </Grid>

                          {/* Current Medical Information Display */}
                          <Grid item xs={12}>
                            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                                Current Medical Information
                              </Typography>
                              <Grid container spacing={3}>
                                {/* Allergies List */}
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                    Allergies
                                  </Typography>
                                  {profile && profile.allergies && profile.allergies.length > 0 ? (
                                    <List>
                                      {profile.allergies.map((allergy, index) => (
                                        <ListItem 
                                          key={index}
                                          secondaryAction={
                                            <IconButton 
                                              edge="end" 
                                              color="error"
                                              onClick={async () => {
                                                const updatedAllergies = profile.allergies.filter((_, i) => i !== index);
                                                try {
                                                  await api.put(`/children/${activeChildId}`, { allergies: updatedAllergies });
                                                  setProfile({ ...profile, allergies: updatedAllergies });
                                                } catch (error) {
                                                  console.error('Error removing allergy:', error);
                                                }
                                              }}
                                            >
                                              <Delete />
                                            </IconButton>
                                          }
                                          sx={{ bgcolor: '#fff3cd', borderRadius: 1, mb: 1 }}
                                        >
                                          <ListItemText primary={allergy} />
                                        </ListItem>
                                      ))}
                                    </List>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No allergies recorded
                                    </Typography>
                                  )}
                                </Grid>

                                {/* Medical Conditions List */}
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                    Medical Conditions
                                  </Typography>
                                  {profile?.medicalConditions && profile.medicalConditions.length > 0 ? (
                                    <List>
                                      {profile?.medicalConditions?.map((condition, index) => (
                                        <ListItem 
                                          key={index}
                                          secondaryAction={
                                            <IconButton 
                                              edge="end" 
                                              color="error"
                                              onClick={async () => {
                                                const updatedConditions = profile?.medicalConditions?.filter((_, i) => i !== index) || [];
                                                try {
                                                  await api.put(`/children/${activeChildId}`, { medicalConditions: updatedConditions });
                                                  setProfile({ ...profile, medicalConditions: updatedConditions });
                                                } catch (error) {
                                                  console.error('Error removing condition:', error);
                                                }
                                              }}
                                            >
                                              <Delete />
                                            </IconButton>
                                          }
                                          sx={{ bgcolor: '#f0f0f0', borderRadius: 1, mb: 1 }}
                                        >
                                          <ListItemText primary={condition} />
                                        </ListItem>
                                      ))}
                                    </List>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No medical conditions recorded
                                    </Typography>
                                  )}
                                </Grid>

                                {/* Emergency Contacts List */}
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                    Emergency Contacts
                                  </Typography>
                                  {profile && profile.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                                    <List>
                                      {profile.emergencyContacts.map((contact, index) => (
                                        <ListItem 
                                          key={index}
                                          secondaryAction={
                                            <IconButton 
                                              edge="end" 
                                              color="error"
                                              onClick={async () => {
                                                const updatedContacts = profile.emergencyContacts.filter((_, i) => i !== index);
                                                try {
                                                  await api.put(`/children/${activeChildId}`, { emergencyContacts: updatedContacts });
                                                  setProfile({ ...profile, emergencyContacts: updatedContacts });
                                                } catch (error) {
                                                  console.error('Error removing contact:', error);
                                                }
                                              }}
                                            >
                                              <Delete />
                                            </IconButton>
                                          }
                                          sx={{ bgcolor: '#e8f5e9', borderRadius: 1, mb: 1 }}
                                        >
                                          <ListItemText 
                                            primary={contact.name}
                                            secondary={`${contact.phone} - ${contact.relationship}`}
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No emergency contacts added
                                    </Typography>
                                  )}
                                </Grid>

                                {/* Authorized Pickups List */}
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                    Authorized Pickups
                                  </Typography>
                                  {profile && profile.authorizedPickups && profile.authorizedPickups.length > 0 ? (
                                    <List>
                                      {profile.authorizedPickups.map((pickup, index) => (
                                        <ListItem 
                                          key={index}
                                          secondaryAction={
                                            <IconButton 
                                              edge="end" 
                                              color="error"
                                              onClick={async () => {
                                                const updatedPickups = profile.authorizedPickups.filter((_, i) => i !== index);
                                                try {
                                                  await api.put(`/children/${activeChildId}`, { authorizedPickups: updatedPickups });
                                                  setProfile({ ...profile, authorizedPickups: updatedPickups });
                                                } catch (error) {
                                                  console.error('Error removing pickup:', error);
                                                }
                                              }}
                                            >
                                              <Delete />
                                            </IconButton>
                                          }
                                          sx={{ bgcolor: '#e3f2fd', borderRadius: 1, mb: 1 }}
                                        >
                                          <ListItemText 
                                            primary={pickup.name}
                                            secondary={`${pickup.phone}${pickup.relationship ? ` - ${pickup.relationship}` : ''}`}
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No authorized pickups added
                                    </Typography>
                                  )}
                                </Grid>
                              </Grid>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>
                    )}

                    {daycareTab === 2 && (
                      <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Button variant="contained" component="label" startIcon={<PhotoCamera />} disabled={!activeChildId}>
                            Upload Photo
                            <input hidden type="file" accept="image/*" multiple onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(file, '');
                            }} />
                          </Button>
                          <IconButton onClick={() => fetchChildData(activeChildId)} title="Refresh Gallery">
                            <Refresh />
                          </IconButton>
                        </Box>
                        
                        {/* Smart Search for Gallery Photos */}
                        {gallery.length > 0 && (
                          <Box sx={{ mb: 3 }}>
                            <SmartSearch
                              data={gallery}
                              searchKeys={['caption', 'date']}
                              onSelect={(photo) => {
                                const fullUrl = toAbsoluteUrl(photo.url || '');
                                setPhotoPreview({ open: true, url: fullUrl });
                              }}
                              placeholder="Search photos by caption or date..."
                              label="Search Gallery"
                              maxResults={6}
                              renderItem={(result) => {
                                const photo = result.item;
                                const matchScore = Math.round((1 - result.score) * 100);
                                
                                return (
                                  <ListItem
                                    button
                                    onClick={() => {
                                      const fullUrl = toAbsoluteUrl(photo.url || '');
                                      setPhotoPreview({ open: true, url: fullUrl });
                                    }}
                                    sx={{
                                      '&:hover': {
                                        bgcolor: 'rgba(26, 188, 156, 0.1)'
                                      }
                                    }}
                                  >
                                    <Avatar
                                      variant="square"
                                      src={toAbsoluteUrl(photo.url || '')}
                                      sx={{ width: 60, height: 60, mr: 2 }}
                                    />
                                    <ListItemText
                                      primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Typography variant="body1">
                                            {photo.caption || 'No caption'}
                                          </Typography>
                                          <Chip 
                                            label={`${matchScore}% match`} 
                                            size="small" 
                                            color="success"
                                            sx={{ height: 20 }}
                                          />
                                        </Box>
                                      }
                                      secondary={
                                        <Typography variant="caption">
                                          {new Date(photo.date).toLocaleDateString()}
                                        </Typography>
                                      }
                                    />
                                  </ListItem>
                                );
                              }}
                            />
                          </Box>
                        )}
                        
                        <Grid container spacing={2}>
                          {gallery.map((p) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={p._id}>
                              <Card sx={{ position: 'relative' }}>
                                <CardMedia 
                                  component="img" 
                                  height="180" 
                                  image={toAbsoluteUrl(p.url || '')} 
                                  alt={p.caption || 'Child photo'}
                                  sx={{ objectFit: 'cover', cursor: 'pointer' }}
                                  onClick={() => {
                                    const fullUrl = toAbsoluteUrl(p.url || '');
                                    setPhotoPreview({ open: true, url: fullUrl });
                                  }}
                                />
                                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, mr: 1 }}>
                                    {p.caption || 'No caption'}
                                  </Typography>
                                  <IconButton 
                                    size="small" 
                                    color="error" 
                                    onClick={() => handleDeletePhoto(p._id)}
                                    title="Delete photo"
                                  >
                                    <Delete />
                                  </IconButton>
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
                        <Dialog open={photoPreview.open} onClose={() => setPhotoPreview({ open: false, url: '' })} maxWidth="md" fullWidth>
                          <DialogTitle>Photo</DialogTitle>
                          <DialogContent dividers>
                            {photoPreview.url && (
                              <Box sx={{ textAlign: 'center' }}>
                                <Box 
                                  component="img" 
                                  src={photoPreview.url} 
                                  alt="Preview" 
                                  sx={{ maxWidth: '100%', borderRadius: 1 }}
                                />
                              </Box>
                            )}
                          </DialogContent>
                          <DialogActions>
                            <Button onClick={() => setPhotoPreview({ open: false, url: '' })}>Close</Button>
                          </DialogActions>
                        </Dialog>
                      </Box>
                    )}

                    {daycareTab === 3 && (
                      <Box sx={{ p: 2 }}>
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
                      </Box>
                    )}

                    {daycareTab === 4 && (
                      <Box sx={{ p: 2 }}>
                        <Card>
                          <CardHeader 
                            title="Activities" 
                            avatar={<Event />}
                            action={<IconButton onClick={() => fetchChildData(activeChildId)}><Refresh /></IconButton>}
                          />
                          <CardContent>
                            {activities?.recent && activities.recent.length > 0 ? (
                              <List>
                                {activities.recent.map((activity, idx) => (
                                  <ListItem key={activity._id || idx}>
                                    <ListItemText
                                      primary={activity.title || activity.activity || activity.name || 'Activity'}
                                      secondary={activity.date ? new Date(activity.date).toLocaleString() : ''}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No activities available yet.
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Box>
                    )}

                    {daycareTab === 5 && (
                      <Box sx={{ p: 2 }}>
                        <Card sx={{ mb: 3 }}>
                          <CardHeader title="Meal Plan" />
                          <CardContent>
                            {meals?.title && (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="h6" gutterBottom>{meals.title}</Typography>
                                {meals.description && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {meals.description}
                                  </Typography>
                                )}
                                {meals.createdBy && (
                                  <Typography variant="caption" color="text.secondary">
                                    Planned by: {meals.createdBy.firstName} {meals.createdBy.lastName}
                                  </Typography>
                                )}
                              </Box>
                            )}
                            
                            {(meals?.plan || []).length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                {meals?.message || 'No meal plan available for this week.'}
                              </Typography>
                            ) : (
                              <Box>
                                {meals.plan.map((dayPlan, idx) => (
                                  <Box key={idx} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                    <Typography variant="subtitle1" gutterBottom sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                                      {dayPlan.day}
                                    </Typography>
                                    
                                    <Grid container spacing={2}>
                                      {dayPlan.menu?.breakfast && (
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="body2" color="text.secondary">Breakfast:</Typography>
                                          <Typography variant="body2">{dayPlan.menu.breakfast || 'Not specified'}</Typography>
                                        </Grid>
                                      )}
                                      
                                      {dayPlan.menu?.morningSnack && (
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="body2" color="text.secondary">Morning Snack:</Typography>
                                          <Typography variant="body2">{dayPlan.menu.morningSnack || 'Not specified'}</Typography>
                                        </Grid>
                                      )}
                                      
                                      {dayPlan.menu?.lunch && (
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="body2" color="text.secondary">Lunch:</Typography>
                                          <Typography variant="body2">{dayPlan.menu.lunch || 'Not specified'}</Typography>
                                        </Grid>
                                      )}
                                      
                                      {dayPlan.menu?.afternoonSnack && (
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="body2" color="text.secondary">Afternoon Snack:</Typography>
                                          <Typography variant="body2">{dayPlan.menu.afternoonSnack || 'Not specified'}</Typography>
                                        </Grid>
                                      )}
                                    </Grid>
                                    
                                    {dayPlan.notes && (
                                      <Box sx={{ mt: 1 }}>
                                        <Typography variant="body2" color="text.secondary">Notes:</Typography>
                                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{dayPlan.notes}</Typography>
                                      </Box>
                                    )}
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                        
                        {/* Meal Recommendation System */}
                        <MealRecommendation />
                      </Box>
                    )}

                    {daycareTab === 6 && (
                      <Box sx={{ p: 2 }}>
                        <Card>
                          <CardHeader 
                            title="👥 Assigned Staff" 
                            subheader="Your child's dedicated caregivers"
                            avatar={<Person />}
                            action={
                              <IconButton onClick={() => fetchChildData(activeChildId)} title="Refresh Staff Info">
                                <Refresh />
                              </IconButton>
                            }
                          />
                          <CardContent>
                            {assignedStaff && assignedStaff.length > 0 ? (
                              <Grid container spacing={2}>
                                {assignedStaff.map((staff, index) => (
                                  <Grid item xs={12} md={6} key={staff._id || index}>
                                    <Card variant="outlined" sx={{ p: 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar 
                                          sx={{ 
                                            width: 64, 
                                            height: 64, 
                                            bgcolor: 'primary.main',
                                            fontSize: '1.5rem'
                                          }}
                                          src={staff.profileImage ? toAbsoluteUrl(staff.profileImage) : undefined}
                                        >
                                          {!staff.profileImage && (staff.firstName?.[0] || 'S')}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                          <Typography variant="h6" gutterBottom>
                                            {staff.firstName} {staff.lastName}
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary" gutterBottom>
                                            📧 {staff.email}
                                          </Typography>
                                          {staff.phone && (
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                              📞 {staff.phone}
                                            </Typography>
                                          )}
                                          <Chip 
                                            label="Primary Caregiver" 
                                            size="small" 
                                            color="primary" 
                                            sx={{ mt: 1 }}
                                          />
                                        </Box>
                                      </Box>
                                    </Card>
                                  </Grid>
                                ))}
                              </Grid>
                            ) : (
                              <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" gutterBottom color="text.secondary">
                                  No Staff Assigned Yet
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                  Your child hasn't been assigned to a staff member yet. Please contact the administration for assistance.
                                </Typography>
                                <Button 
                                  variant="outlined" 
                                  onClick={() => fetchChildData(activeChildId)}
                                  startIcon={<Refresh />}
                                >
                                  Check Again
                                </Button>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Box>
                    )}

                    {daycareTab === 7 && (
                      <Box sx={{ p: 2 }}>
                        <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                          📍 Daycare Location & Directions
                        </Typography>
                        
                        <Paper elevation={3} sx={{ p: 3 }}>
                          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                            View our daycare location, get directions from your location, or search from any address
                          </Typography>
                          <DaycareLocationMap showDirections={true} showSearch={true} />
                        </Paper>
                      </Box>
                    )}

                    {/* Vaccinations Tab */}
                    {daycareTab === 8 && (
                      <Box sx={{ p: 2 }}>
                        <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                          💉 Vaccination Records
                        </Typography>
                        
                        <VaccinationCard childId={activeChildId} />
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* Tab 2: Services */}
            {tab === 2 && (
              <Box>
                {/* Additional Services Header */}
                <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
                  Additional Services
                </Typography>

                {/* Service Cards Grid */}
                <Grid container spacing={3} sx={{ mb: 5 }}>
                  {/* Nanny at Home */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                      <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                        <Box sx={{ mb: 2 }}>
                          <Avatar sx={{ width: 80, height: 80, bgcolor: '#FFB800', margin: '0 auto', fontSize: '2.5rem' }}>
                            👶
                          </Avatar>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Nanny at Home
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Book a certified nanny for home childcare
                        </Typography>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => {
                            const nannySection = document.getElementById('nanny-booking-section');
                            if (nannySection) {
                              nannySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          sx={{
                            bgcolor: '#E91E63',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5,
                            '&:hover': { bgcolor: '#C2185B' }
                          }}
                        >
                          Book Now
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Doctor Appointment */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                      <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                        <Box sx={{ mb: 2 }}>
                          <Avatar sx={{ width: 80, height: 80, bgcolor: '#03A9F4', margin: '0 auto', fontSize: '2.5rem' }}>
                            🩺
                          </Avatar>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Doctor Appointment
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Schedule health check-ups and consultations
                        </Typography>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => { setAppointmentDialog(true); fetchAvailableDoctors(); fetchAvailableSlots(selectedDoctorId, slotBookingDate); }}
                          sx={{
                            bgcolor: '#E91E63',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5,
                            '&:hover': { bgcolor: '#C2185B' }
                          }}
                        >
                          Book Now
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* After School Program */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                      <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                        <Box sx={{ mb: 2 }}>
                          <Avatar sx={{ width: 80, height: 80, bgcolor: '#673AB7', margin: '0 auto', fontSize: '2.5rem' }}>
                            📚
                          </Avatar>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          After School Program
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Extended care and learning activities
                        </Typography>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => {
                            fetchAfterSchoolPrograms();
                            fetchMyEnrollments();
                            const programSection = document.getElementById('afterschool-programs-section');
                            if (programSection) {
                              programSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          sx={{
                            bgcolor: '#E91E63',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5,
                            '&:hover': { bgcolor: '#C2185B' }
                          }}
                        >
                          Browse Programs
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Fee Structure */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                      <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                        <Box sx={{ mb: 2 }}>
                          <Avatar sx={{ width: 80, height: 80, bgcolor: '#4CAF50', margin: '0 auto', fontSize: '2.5rem' }}>
                            💰
                          </Avatar>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Fee Structure
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          View detailed fee breakdown and payment plans
                        </Typography>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => setTab(5)}
                          sx={{
                            bgcolor: '#E91E63',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5,
                            '&:hover': { bgcolor: '#C2185B' }
                          }}
                        >
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Curriculum Plan */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                      <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                        <Box sx={{ mb: 2 }}>
                          <Avatar sx={{ width: 80, height: 80, bgcolor: '#FF9800', margin: '0 auto', fontSize: '2.5rem' }}>
                            📋
                          </Avatar>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Curriculum Plan
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Access your child's learning curriculum and activities
                        </Typography>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => {
                            setTab(1);
                            setDaycareTab(4);
                          }}
                          sx={{
                            bgcolor: '#E91E63',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5,
                            '&:hover': { bgcolor: '#C2185B' }
                          }}
                        >
                          View Curriculum
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Transport Services */}
                  <Grid item xs={12} md={6} lg={4}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                      <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                        <Box sx={{ mb: 2 }}>
                          <Avatar sx={{ width: 80, height: 80, bgcolor: '#00BCD4', margin: '0 auto', fontSize: '2.5rem' }}>
                            🚌
                          </Avatar>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Transport Services
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Track your child's transport and pickup schedule
                        </Typography>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => setTab(3)}
                          sx={{
                            bgcolor: '#E91E63',
                            color: 'white',
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5,
                            '&:hover': { bgcolor: '#C2185B' }
                          }}
                        >
                          View Transport
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Nanny Booking Section */}
                <Box id="nanny-booking-section" sx={{ scrollMarginTop: '20px' }}>
                  <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      📝 Latest Nanny Service Notes
                    </Typography>
                    {nannyNotesLoading ? (
                      <Typography color="text.secondary">Loading nanny notes...</Typography>
                    ) : nannyServiceNotes.length === 0 ? (
                      <Typography color="text.secondary">No service notes from nanny yet.</Typography>
                    ) : (
                      <List dense sx={{ py: 0 }}>
                        {nannyServiceNotes.map((entry, idx) => (
                          <ListItem key={`${entry.bookingId}-${idx}`} sx={{ px: 0, alignItems: 'flex-start' }}>
                            <ListItemText
                              primary={`${entry.nannyName} • ${entry.childName}`}
                              secondary={
                                <>
                                  <Typography component="span" variant="body2" color="text.primary">
                                    {entry.noteText}
                                  </Typography>
                                  <Typography component="div" variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Recent update'}
                                  </Typography>
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Paper>
                  <NannyServicesTab />
                </Box>

                {/* After School Programs Section */}
                <Box id="afterschool-programs-section" sx={{ scrollMarginTop: '20px', mt: 6 }}>
                  <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                    📚 After School Programs
                  </Typography>

                  {/* Success/Error Messages */}
                  {afterSchoolMessage.text && (
                    <Alert 
                      severity={afterSchoolMessage.type}
                      sx={{ mb: 3 }}
                      onClose={() => setAfterSchoolMessage({ type: '', text: '' })}
                    >
                      {afterSchoolMessage.text}
                    </Alert>
                  )}

                  {/* My Enrollments */}
                  {myEnrollments.length > 0 && (
                    <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#673AB7' }}>
                        ✓ My Enrolled Programs
                      </Typography>
                      <Grid container spacing={2}>
                        {myEnrollments.map((program) => (
                          <Grid item xs={12} md={6} key={program._id}>
                            <Card sx={{ border: '2px solid #673AB7', bgcolor: '#f3e5f5' }}>
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                  <Typography variant="h6" color="#673AB7" sx={{ fontWeight: 600 }}>
                                    {program.programName}
                                  </Typography>
                                  <Chip label="ENROLLED" size="small" color="success" />
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  {program.programType} • {program.schedule.days.join(', ')}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  ⏰ {program.schedule.startTime} - {program.schedule.endTime}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  📍 {program.location}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                  👨‍🏫 Instructor: {program.assignedStaff.map(s => `${s.firstName} ${s.lastName}`).join(', ')}
                                </Typography>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="error"
                                  fullWidth
                                  onClick={() => handleUnenrollProgram(program._id)}
                                >
                                  Unenroll
                                </Button>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  )}

                  {/* Available Programs */}
                  <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Available Programs
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<Refresh />}
                        onClick={() => {
                          fetchAfterSchoolPrograms();
                          fetchMyEnrollments();
                        }}
                        sx={{ color: '#673AB7' }}
                      >
                        Refresh
                      </Button>
                    </Box>

                    {afterSchoolPrograms.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Programs Available
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Check back later for new after school programs
                        </Typography>
                      </Box>
                    ) : (
                      <Grid container spacing={3}>
                        {afterSchoolPrograms.map((program) => {
                          const isEnrolled = myEnrollments.some(e => e._id === program._id);
                          const isFull = program.currentEnrollment >= program.capacity;
                          
                          return (
                            <Grid item xs={12} md={6} lg={4} key={program._id}>
                              <Card sx={{ height: '100%', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                <CardContent>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                      {program.programName}
                                    </Typography>
                                    <Chip 
                                      label={program.programType} 
                                      size="small" 
                                      sx={{ bgcolor: '#673AB7', color: 'white' }}
                                    />
                                  </Box>
                                  
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {program.description}
                                  </Typography>
                                  
                                  <Divider sx={{ my: 2 }} />
                                  
                                  <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                      <Typography variant="subtitle2" color="text.secondary">Enrolled Child</Typography>
                                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                        {children.find(c => c._id === activeChildId)?.firstName} {children.find(c => c._id === activeChildId)?.lastName}
                                      </Typography>
                                    </Grid>
                                    
                                    <Grid item xs={6}>
                                      <Typography variant="subtitle2" color="text.secondary">Schedule</Typography>
                                      <Typography variant="body2">
                                        {program.schedule.days.join(', ')}
                                      </Typography>
                                      <Typography variant="body2">
                                        {program.schedule.startTime} - {program.schedule.endTime}
                                      </Typography>
                                    </Grid>
                                    
                                    <Grid item xs={6}>
                                      <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                                      <Typography variant="body2">{program.location}</Typography>
                                    </Grid>
                                    
                                    <Grid item xs={6}>
                                      <Typography variant="subtitle2" color="text.secondary">Age Group</Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {program.ageGroup.min} - {program.ageGroup.max} years
                                      </Typography>
                                    </Grid>
                                    
                                    <Grid item xs={6}>
                                      <Typography variant="subtitle2" color="text.secondary">Fees</Typography>
                                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                                        {program.fees.amount === 0 ? 'FREE' : `$${program.fees.amount} ${program.fees.frequency}`}
                                      </Typography>
                                    </Grid>
                                    
                                    {program.requirements && (
                                      <Grid item xs={12}>
                                        <Alert severity="info">
                                          <Typography variant="subtitle2">Requirements</Typography>
                                          <Typography variant="body2">{program.requirements}</Typography>
                                        </Alert>
                                      </Grid>
                                    )}
                                  </Grid>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                                  <Button
                                    variant="contained"
                                    disabled={isEnrolled || isFull || !activeChildId}
                                    onClick={() => {
                                      setSelectedProgram(program);
                                      setAfterSchoolDialog(true);
                                    }}
                                    sx={{
                                      bgcolor: isEnrolled ? '#4CAF50' : '#673AB7',
                                      '&:hover': { bgcolor: isEnrolled ? '#388E3C' : '#512DA8' },
                                      '&:disabled': { bgcolor: '#e0e0e0' }
                                    }}
                                  >
                                    {isEnrolled ? '✓ Enrolled' : isFull ? 'Full' : !activeChildId ? 'Select Child First' : 'Enroll Now'}
                                  </Button>
                                </CardActions>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}
                  </Paper>
                </Box>
              </Box>
            )}

            {/* Tab 3: Transport */}
            {tab === 3 && (
              <Box>
                <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
                  🚗 Transport Services
                </Typography>

                <Grid container spacing={3}>
                  {/* Enroll in Transport Section */}
                  <Grid item xs={12}>
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        📝 Enroll Child in Transport
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Register your child for daily pickup and drop-off services
                      </Typography>
                      
                      {/* Child Selector */}
                      <TextField
                        select
                        label="Select Child *"
                        value={activeChildId}
                        onChange={(e) => setActiveChildId(e.target.value)}
                        fullWidth
                        size="small"
                        sx={{ mb: 2 }}
                        required
                      >
                        {children.map((child) => (
                          <MenuItem key={child._id} value={child._id}>
                            {child.firstName} {child.lastName}
                          </MenuItem>
                        ))}
                      </TextField>
                      
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                          label="Pickup Address *"
                          placeholder="Enter your home address"
                          value={transportForm.pickupAddress}
                          onChange={(e) => setTransportForm({ ...transportForm, pickupAddress: e.target.value })}
                          size="small"
                          sx={{ flexGrow: 1, minWidth: '250px' }}
                          required
                        />
                        <TextField
                          label="Contact Number *"
                          placeholder="Phone number"
                          value={transportForm.contactNumber}
                          onChange={(e) => setTransportForm({ ...transportForm, contactNumber: e.target.value })}
                          size="small"
                          sx={{ width: '180px' }}
                          required
                        />
                        <TextField
                          label="Pickup Time"
                          type="time"
                          value={transportForm.pickupTime}
                          onChange={(e) => setTransportForm({ ...transportForm, pickupTime: e.target.value })}
                          size="small"
                          sx={{ width: '150px' }}
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          label="Drop-off Time"
                          type="time"
                          value={transportForm.dropoffTime}
                          onChange={(e) => setTransportForm({ ...transportForm, dropoffTime: e.target.value })}
                          size="small"
                          sx={{ width: '150px' }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Box>
                      
                      <TextField
                        label="Special Instructions (Optional)"
                        placeholder="Any special instructions for the driver..."
                        value={transportForm.specialInstructions}
                        onChange={(e) => setTransportForm({ ...transportForm, specialInstructions: e.target.value })}
                        multiline
                        rows={2}
                        size="small"
                        fullWidth
                        sx={{ mt: 2 }}
                      />
                      
                      <Button 
                        variant="contained" 
                        color="primary"
                        startIcon={<Add />}
                        onClick={handleTransportEnrollment}
                        disabled={transportLoading || !profile?._id}
                        sx={{ mt: 2 }}
                      >
                        {transportLoading ? 'Submitting...' : 'Enroll in Transport'}
                      </Button>

                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Transport Fee:</strong> $50/month per child | Includes daily pickup & drop-off
                        </Typography>
                      </Alert>
                    </Paper>
                  </Grid>

                  {/* Transport Requests Status */}
                  {transportRequests.length > 0 && (
                    <Grid item xs={12}>
                      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          📋 Your Transport Requests
                        </Typography>
                        {transportRequests.map((request) => (
                          <Box key={request._id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} md={8}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {request.childName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Pickup: {request.pickupAddress}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Time: {request.pickupTime} - {request.dropoffTime}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Requested: {new Date(request.requestDate).toLocaleDateString()}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
                                <Chip 
                                  label={request.status?.toUpperCase() || 'N/A'}
                                  color={
                                    request.status === 'approved' ? 'success' : 
                                    request.status === 'rejected' ? 'error' : 
                                    request.status === 'on-hold' ? 'warning' : 'default'
                                  }
                                  sx={{ mb: 1 }}
                                />
                                {request.status === 'pending' && (
                                  <Button 
                                    size="small" 
                                    color="error"
                                    onClick={() => handleCancelTransportRequest(request._id)}
                                  >
                                    Cancel Request
                                  </Button>
                                )}
                                {request.status === 'rejected' && request.rejectionReason && (
                                  <Typography variant="caption" color="error" display="block">
                                    Reason: {request.rejectionReason}
                                  </Typography>
                                )}
                                {request.status === 'approved' && (
                                  <Typography variant="caption" color="success.main" display="block">
                                    Route: {request.assignedRoute}
                                  </Typography>
                                )}
                              </Grid>
                            </Grid>
                          </Box>
                        ))}
                      </Paper>
                    </Grid>
                  )}

                  {/* Transport Assignment Details */}
                  {transportAssignment && (
                    <Grid item xs={12}>
                      <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: 'success.50' }}>
                        <Typography variant="h6" gutterBottom color="success.main">
                          ✅ Active Transport Assignment
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2"><strong>Child:</strong> {transportAssignment.childName}</Typography>
                            <Typography variant="body2"><strong>Route:</strong> {transportAssignment.routeName}</Typography>
                            <Typography variant="body2"><strong>Driver:</strong> {transportAssignment.driverName}</Typography>
                            <Typography variant="body2"><strong>Driver Phone:</strong> {transportAssignment.driverPhone}</Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2"><strong>Vehicle:</strong> {transportAssignment.vehicleNumber}</Typography>
                            <Typography variant="body2"><strong>Pickup Time:</strong> {transportAssignment.pickupTime}</Typography>
                            <Typography variant="body2"><strong>Drop-off Time:</strong> {transportAssignment.dropoffTime}</Typography>
                            <Typography variant="body2"><strong>Monthly Fee:</strong> ${transportAssignment.monthlyFee}</Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  )}

                  {/* Transport Route Map */}
                  {transportAssignment && (
                    <Grid item xs={12}>
                      <TransportRouteMap assignment={transportAssignment} />
                    </Grid>
                  )}

                  {/* Live Pickup Tracking */}
                  <Grid item xs={12} lg={6}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        📍 Live Pickup Tracking
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Share your live location when coming to pick up {profile?.firstName || 'your child'}. 
                        Our staff will be notified when you're nearby!
                      </Typography>
                      <PickupTracker 
                        parentId={user?.id}
                        childId={profile?._id}
                        parentName={user?.firstName + ' ' + user?.lastName}
                        childName={profile?.firstName || 'Child'}
                      />
                      
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2" component="div">
                          <strong>How it works:</strong>
                          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                            <li>Click "Start Tracking My Pickup" when you're on your way</li>
                            <li>Your location updates automatically</li>
                            <li>Staff gets notified when you're within 500m</li>
                            <li>Your child will be ready when you arrive!</li>
                          </ul>
                        </Typography>
                      </Alert>
                    </Paper>
                  </Grid>

                  {/* Transport Schedule & Status */}
                  <Grid item xs={12} lg={6}>
                    <TransportTracking />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Tab 4: My Orders */}
            {tab === 4 && (
              <Box>
                <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Receipt />
                  My Orders
                </Typography>

                {ordersError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {ordersError}
                  </Alert>
                )}

                {ordersLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : orders.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <ShoppingBag sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>No Orders Yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      You haven't placed any orders yet. Start shopping for your little one!
                    </Typography>
                    <Button variant="contained" onClick={() => navigate('/shop')}>
                      Browse Products
                    </Button>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {orders.map((order) => (
                      <Grid item xs={12} key={order._id}>
                        <Card>
                          <CardContent>
                            <Grid container spacing={2}>
                              {/* Order Header */}
                              <Grid item xs={12} md={8}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                  <Box>
                                    <Typography variant="h6">
                                      Order #{order.orderNumber}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Grid>

                              {/* Order Status */}
                              <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                                <Chip 
                                  label={order.status?.toUpperCase() || 'N/A'}
                                  color={
                                    order.status === 'delivered' ? 'success' :
                                    order.status === 'shipped' || order.status === 'processing' ? 'primary' :
                                    order.status === 'confirmed' ? 'info' :
                                    order.status === 'cancelled' ? 'error' :
                                    'default'
                                  }
                                  sx={{ mb: 1 }}
                                />
                                <Typography variant="h6" color="primary">
                                  ₹{order.total?.toFixed(2) || '0.00'}
                                </Typography>
                              </Grid>

                              {/* Order Items */}
                              <Grid item xs={12}>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="subtitle2" gutterBottom>
                                  Items ({order.items?.length || 0})
                                </Typography>
                                {order.items && order.items.map((item, idx) => (
                                  <Box key={idx} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                    {item.product?.images?.[0] && (
                                      <Box
                                        component="img"
                                        src={toAbsoluteUrl(item.product.images[0])}
                                        alt={item.product?.name || 'Product'}
                                        sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }}
                                      />
                                    )}
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body2" fontWeight="medium">
                                        {item.product?.name || 'Product'}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Qty: {item.quantity} × ₹{item.price?.toFixed(2) || '0.00'}
                                      </Typography>
                                      {item.vendor?.businessName && (
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          Sold by: {item.vendor.businessName}
                                        </Typography>
                                      )}
                                    </Box>
                                    <Typography variant="body2" fontWeight="medium">
                                      ₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                                    </Typography>
                                  </Box>
                                ))}
                              </Grid>

                              {/* Delivery Address */}
                              {order.deliveryAddress && (
                                <Grid item xs={12}>
                                  <Divider sx={{ my: 2 }} />
                                  <Typography variant="subtitle2" gutterBottom>
                                    Delivery Address
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {order.deliveryAddress.name}<br />
                                    {order.deliveryAddress.street}, {order.deliveryAddress.city}<br />
                                    {order.deliveryAddress.state} {order.deliveryAddress.postalCode}
                                    {order.deliveryAddress.phone && <><br />Phone: {order.deliveryAddress.phone}</>}
                                  </Typography>
                                </Grid>
                              )}

                              {/* Action Buttons */}
                              <Grid item xs={12}>
                                <Divider sx={{ my: 2 }} />
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => navigate(`/track-order/${order.orderNumber}`)}
                                  >
                                    Track Order
                                  </Button>
                                  {order.status === 'pending' && (
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      onClick={async () => {
                                        if (window.confirm('Are you sure you want to cancel this order?')) {
                                          try {
                                            await api.put(`/api/orders/${order._id}/cancel`);
                                            fetchOrders(); // Refresh orders
                                            alert('Order cancelled successfully');
                                          } catch (error) {
                                            alert(error.response?.data?.message || 'Failed to cancel order');
                                          }
                                        }
                                      }}
                                    >
                                      Cancel Order
                                    </Button>
                                  )}
                                  {order.status === 'delivered' && (
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => {
                                        // TODO: Implement invoice download
                                        alert('Invoice download coming soon!');
                                      }}
                                    >
                                      Download Invoice
                                    </Button>
                                  )}
                                </Box>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Tab 5: Billing & Payments */}
            {tab === 5 && (
              <Box>
                {/* Fee Structure Selection */}
                <Card sx={{ mb: 3 }}>
                  <CardHeader
                    title="Daycare Fee Structure"
                    subheader={`Program: ${feeOptionsData.program || profile?.program || 'N/A'}`}
                  />
                  <CardContent>
                    {feeSelectionMessage.text && (
                      <Alert severity={feeSelectionMessage.type || 'info'} sx={{ mb: 2 }}>
                        {feeSelectionMessage.text}
                      </Alert>
                    )}

                    {feeSelectionLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={28} />
                      </Box>
                    ) : (
                      <>
                        {feeOptionsData.currentSelection?.feeName && (
                          <Alert severity="success" sx={{ mb: 2 }}>
                            Current Plan: {feeOptionsData.currentSelection.feeName} (${Number(feeOptionsData.currentSelection.baseAmount || 0).toFixed(2)} / {feeOptionsData.currentSelection.billingCycle || 'monthly'})
                          </Alert>
                        )}

                        {Array.isArray(feeOptionsData.options) && feeOptionsData.options.length > 0 ? (
                          <Grid container spacing={2}>
                            {feeOptionsData.options.map((feeOption) => {
                              const isSelected = String(feeOptionsData.currentSelection?.feeStructureId || '') === String(feeOption._id || '');
                              return (
                                <Grid item xs={12} md={6} key={feeOption._id}>
                                  <Card variant="outlined" sx={{ height: '100%', borderColor: isSelected ? 'success.main' : 'divider' }}>
                                    <CardContent>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="h6">{feeOption.name}</Typography>
                                        <Chip size="small" color={isSelected ? 'success' : 'default'} label={isSelected ? 'Selected' : (feeOption.program || 'all')} />
                                      </Box>
                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                        {feeOption.description || 'Structured daycare fee plan'}
                                      </Typography>
                                      <Typography variant="h5" color="primary.main" sx={{ mb: 1.5 }}>
                                        ${Number(feeOption.baseAmount || 0).toFixed(2)} / {feeOption.billingCycle || 'monthly'}
                                      </Typography>

                                      {Array.isArray(feeOption.includedServices) && feeOption.includedServices.length > 0 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                                          {feeOption.includedServices.map((service, index) => (
                                            <Chip key={`${service}-${index}`} size="small" variant="outlined" label={service} />
                                          ))}
                                        </Box>
                                      )}

                                      <Button
                                        variant={isSelected ? 'outlined' : 'contained'}
                                        disabled={feeSelectionSaving || isSelected}
                                        onClick={() => handleSelectFeeStructure(feeOption._id)}
                                        fullWidth
                                      >
                                        {isSelected ? 'Selected Plan' : (feeSelectionSaving ? 'Saving...' : 'Choose This Plan')}
                                      </Button>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              );
                            })}
                          </Grid>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No fee structures are available yet. Please contact admin.
                          </Typography>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Child Tuition Overview */}
                <Card sx={{ mb: 3 }}>
                  <CardHeader 
                    title={`Tuition & Billing - ${profile?.firstName || 'Child'} ${profile?.lastName || ''}`}
                    subheader={`Program: ${profile?.program || 'N/A'} | Monthly Rate: $${profile?.tuitionRate || 0}`}
                  />
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                          <CardContent>
                            <Typography variant="h4">${profile?.tuitionRate || 0}</Typography>
                            <Typography variant="body2">Monthly Tuition</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                          <CardContent>
                            <Typography variant="h4">{billingData.payments.length}</Typography>
                            <Typography variant="body2">Payments Made</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                          <CardContent>
                            <Typography variant="h4">
                              {billingData.invoices.filter(inv => inv.status === 'pending').length}
                            </Typography>
                            <Typography variant="body2">Pending Invoices</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                          <CardContent>
                            <Typography variant="h4">
                              ${billingData.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body2">Total Paid</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Pending Invoices */}
                <Card sx={{ mb: 3 }}>
                  <CardHeader title="Pending Invoices" subheader="Outstanding payments for your child" />
                  <CardContent>
                    {billingData.invoices.filter(inv => inv.status === 'pending').length > 0 ? (
                      <Grid container spacing={2}>
                        {billingData.invoices.filter(inv => inv.status === 'pending').map((invoice) => (
                          <Grid item xs={12} md={6} key={invoice._id}>
                            <Card variant="outlined" sx={{ border: '1px solid', borderColor: 'warning.main' }}>
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                  <Box>
                                    <Typography variant="h6" color="warning.main">
                                      {invoice.invoiceNumber}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {invoice.description}
                                    </Typography>
                                  </Box>
                                  <Chip label={invoice.status?.toUpperCase() || 'N/A'} color="warning" size="small" />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                  <Typography variant="h5" color="success.main">
                                    ${invoice.amount.toFixed(2)}
                                  </Typography>
                                  <Typography variant="body2" color="error.main">
                                    Due: {new Date(invoice.dueDate).toLocaleDateString()}
                                  </Typography>
                                </Box>
                                {(invoice.items || []).length > 0 && (
                                  <Box sx={{ mb: 2, p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Fee Breakdown</Typography>
                                    {(invoice.items || []).map((item, index) => (
                                      <Box key={`${item.name || 'item'}-${index}`} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2" color="text.secondary">{item.name}</Typography>
                                        <Typography variant="body2" fontWeight={600}>${Number(item.amount || 0).toFixed(2)}</Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                                <Button
                                  variant="contained"
                                  fullWidth
                                  onClick={() => setPaymentDialog({ open: true, invoice })}
                                  sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                                >
                                  Pay Now
                                </Button>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="h6" color="success.main">✅ All payments up to date!</Typography>
                        <Typography variant="body2" color="text.secondary">
                          No pending invoices for {profile?.firstName || 'your child'}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* Payment History */}
                <Card>
                  <CardHeader title="Payment History" subheader="Past payments and transactions" />
                  <CardContent>
                    {billingData.payments.length > 0 ? (
                      <Box>
                        {billingData.payments.map((payment) => (
                          <Box
                            key={payment._id}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 2,
                              borderBottom: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Box>
                              <Typography variant="body1" fontWeight="bold">
                                Payment #{payment._id}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(payment.paymentDate).toLocaleDateString()} • {payment.method}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="h6" color="success.main">
                                ${payment.amount.toFixed(2)}
                              </Typography>
                              <Chip label={payment.status?.toUpperCase() || 'N/A'} color="success" size="small" />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" align="center">
                        No payment history available
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Tab 6: Messages */}
            {tab === 6 && (
              <Paper sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Teacher Messages
                  </Typography>
                  <Button variant="outlined" onClick={fetchParentTeacherMessages} sx={{ textTransform: 'none' }}>
                    Refresh
                  </Button>
                </Box>

                {parentTeacherMessagesLoading ? (
                  <CircularProgress size={24} />
                ) : parentTeacherMessages.length === 0 ? (
                  <Alert severity="info">No teacher messages available yet.</Alert>
                ) : (
                  <Stack spacing={2}>
                    {parentTeacherMessages.map((msg) => (
                      <Paper key={msg._id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {msg.subject || 'No subject'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {msg.body || 'No message body'}
                            </Typography>
                          </Box>
                          <Chip size="small" label="Teacher" color="primary" variant="outlined" />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          {msg.byName ? `From: ${msg.byName} • ` : ''}{formatDate(msg.at)}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Paper>
            )}


            {/* Tab 8: AI Sentiment Analysis */}
            {tab === 8 && ( 
              <Box>
                <Card>
                  <CardHeader 
                    title="🧠 AI Sentiment Analysis" 
                    subheader="Analyze feedback sentiment in real-time"
                  />
                  <CardContent>
                    <Stack spacing={3}>
                      {/* Analysis Input */}
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        label="Feedback Text"
                        placeholder="Enter feedback text to analyze..."
                        value={editFields.aiFeedbackText || ''}
                        onChange={(e) => setEditFields(f => ({ ...f, aiFeedbackText: e.target.value }))}
                      />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Service Category</InputLabel>
                            <Select
                              value={editFields.aiServiceCategory || 'meal'}
                              onChange={(e) => setEditFields(f => ({ ...f, aiServiceCategory: e.target.value }))}
                              label="Service Category"
                            >
                              <MenuItem value="meal">Meal</MenuItem>
                              <MenuItem value="activity">Activity</MenuItem>
                              <MenuItem value="communication">Communication</MenuItem>
                              <MenuItem value="safety">Safety</MenuItem>
                              <MenuItem value="general">General</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                              <InputLabel>Rating (1-5)</InputLabel>
                              <Select
                                value={editFields.aiRating || 5}
                                onChange={(e) => setEditFields(f => ({ ...f, aiRating: e.target.value }))}
                                label="Rating (1-5)"
                              >
                                <MenuItem value={1}>1 - Very Poor</MenuItem>
                                <MenuItem value={2}>2 - Poor</MenuItem>
                                <MenuItem value={3}>3 - Average</MenuItem>
                                <MenuItem value={4}>4 - Good</MenuItem>
                                <MenuItem value={5}>5 - Excellent</MenuItem>
                              </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <Button 
                            variant="contained" 
                            color="secondary"
                            fullWidth
                            onClick={async () => {
                                try {
                                  if (!editFields.aiFeedbackText) {
                                    alert('Please enter feedback text to analyze');
                                    return;
                                  }
                                  
                                  const response = await api.post('/feedback-classification/predict', {
                                    text: editFields.aiFeedbackText,
                                    serviceCategory: editFields.aiServiceCategory || 'meal',
                                    rating: parseInt(editFields.aiRating) || 5
                                  });
                                  
                                  setEditFields(f => ({ 
                                    ...f, 
                                    aiResult: response.data.prediction,
                                    aiConfidence: response.data.confidence,
                                    aiAnalysis: response.data
                                  }));
                                } catch (e) {
                                  console.error('AI Classification error:', e);
                                  alert('Error analyzing feedback. Please try again.');
                                }
                              }}
                            >
                              Classify Sentiment
                            </Button>
                          </Grid>
                          
                          {/* Results Display */}
                          {editFields.aiResult && (
                            <Grid item xs={12}>
                              <Card variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="h6" gutterBottom>
                                  Analysis Results
                                </Typography>
                                <Box sx={{ mb: 2 }}>
                                  <Chip 
                                    label={editFields.aiResult === 'Positive' ? '✅ Positive' : '⚠️ Needs Improvement'} 
                                    color={editFields.aiResult === 'Positive' ? 'success' : 'warning'}
                                    size="large"
                                  />
                                </Box>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Confidence:</strong> {(editFields.aiConfidence * 100).toFixed(1)}%
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Service Category:</strong> {editFields.aiServiceCategory}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Rating:</strong> {editFields.aiRating}/5
                                </Typography>
                                {editFields.aiAnalysis?.explanation && (
                                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                                    {editFields.aiAnalysis.explanation}
                                  </Typography>
                                )}
                              </Card>
                            </Grid>
                          )}
                        </Grid>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              )}


            {/* Tab 9: AI Assistant - Chatbot & Feedback */}
            {tab === 9 && (
              <Box>
                <Grid container spacing={3}>
                  {/* AI Chatbot Section */}
                  <Grid item xs={12} lg={6}>
                    <Card sx={{ height: '100%' }}>
                      <CardHeader 
                        title="🤖 AI Assistant" 
                        subheader="Ask me anything about daycare policies, schedules, or your child's care"
                      />
                      <CardContent>
                        <Chatbot />
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Feedback Submission Form */}
                  <Grid item xs={12} lg={6}>
                    <Card sx={{ height: '100%' }}>
                      <CardHeader 
                        title="📝 Share Your Feedback" 
                        subheader="Get instant AI-powered sentiment analysis"
                      />
                      <CardContent>
                        <FeedbackForm />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* AI Features Info */}
                <Card sx={{ mt: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      ✨ AI-Powered Features
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            💬 Smart Chatbot
                          </Typography>
                          <Typography variant="body2">
                            Get instant answers to your questions 24/7. The AI assistant understands context and provides personalized responses.
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            😊 Sentiment Analysis
                          </Typography>
                          <Typography variant="body2">
                            Your feedback is automatically analyzed for sentiment, helping us understand and improve our services faster.
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            🎯 Actionable Insights
                          </Typography>
                          <Typography variant="body2">
                            AI identifies key topics and action items from feedback to ensure nothing important is missed.
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Feedback Responses from Admin */}
                <Card sx={{ mt: 3 }}>
                  <CardHeader 
                    title="💬 Admin Responses" 
                    subheader="Replies to your feedback and questions"
                  />
                  <CardContent>
                    {loadingResponses ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                      </Box>
                    ) : feedbackResponses.length === 0 ? (
                      <Alert severity="info">
                        No responses yet. Submit feedback above and admin will respond to you!
                      </Alert>
                    ) : (
                      <Stack spacing={2}>
                        {feedbackResponses.map((resp, idx) => (
                          <Card key={idx} variant="outlined">
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {resp.subject}
                                </Typography>
                                <Chip 
                                  label={resp.priority} 
                                  size="small"
                                  color={resp.priority === 'high' ? 'error' : resp.priority === 'medium' ? 'warning' : 'default'}
                                />
                              </Box>
                              
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                <strong>Your Feedback:</strong> {resp.message}
                              </Typography>
                              
                              <Divider sx={{ my: 1.5 }} />
                              
                              <Box sx={{ bgcolor: 'success.light', p: 2, borderRadius: 1 }}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                  Admin Response ({new Date(resp.respondedAt).toLocaleDateString()}):
                                </Typography>
                                <Typography variant="body2">
                                  {resp.response}
                                </Typography>
                                {resp.respondedBy && (
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    — {resp.respondedBy.name} ({resp.respondedBy.role})
                                  </Typography>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Tab 10: Milestones - Development Tracker with AR Celebration */}
            {tab === 10 && activeChildId && (
              <Box>
                <MilestoneTracker 
                  child={{
                    id: activeChildId,
                    name: profile?.firstName || 'Your child',
                    dateOfBirth: profile?.dateOfBirth || new Date().toISOString(),
                  }}
                />
              </Box>
            )}

            {tab === 10 && !activeChildId && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <EmojiEvents sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Select a Child First
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please select a child from the dropdown above to view their milestones and celebrate achievements!
                </Typography>
              </Paper>
            )}

            {/* Tab 11: Learning Games — Practice Mode */}
            {tab === 11 && (() => {
              const ALL_PRACTICE_GAMES = [
                { id: 'drag-match', title: 'Drag & Match', emoji: '🧩', ageGroup: '3-5 yrs', description: 'Match shapes, colors & objects!', route: '/drag-match', category: 'Cognitive', gradient: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' },
                { id: 'body-learning', title: 'Virtual Body', emoji: '🫁', ageGroup: '4-6 yrs', description: 'Explore body parts in 3D!', route: '/virtual-body-learning', category: 'Science', gradient: 'linear-gradient(135deg,#667eea,#764ba2)' },
                { id: 'vr-360', title: 'Interactive Explorer', emoji: '🔍', ageGroup: '3-7 yrs', description: 'Explore in 2D or 360°!', route: '/vr-360', category: 'Exploration', gradient: 'linear-gradient(135deg,#2196f3,#21CBF3)' },
                { id: 'vr-story', title: 'VR Story', emoji: '📖', ageGroup: '3-6 yrs', description: 'Immersive storytelling adventures!', route: '/vr-story', category: 'Stories', gradient: 'linear-gradient(135deg,#1abc9c,#2ecc71)' }
              ];

              // Compute total progress from childScores
              const totalScore = (childScores.scores || []).reduce((sum, s) => sum + (s.totalScore || 0), 0);
              const maxStars = (childScores.scores || []).reduce((sum, s) => sum + (s.maxStars || 0), 0);
              const totalPlays = (childScores.scores || []).reduce((sum, s) => sum + (s.playCount || 0), 0);

              const handlePracticeClick = async (assignmentId, gameRoute) => {
                try { api.put(`/games/play/${assignmentId}`).catch(() => {}); } catch {}
                navigate(gameRoute);
              };

              return (
                <Box>
                  {/* Hero Header */}
                  <Paper sx={{
                    p: 4, mb: 3, borderRadius: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SportsEsports sx={{ fontSize: 56 }} />
                        <Box>
                          <Typography variant="h4" fontWeight="bold">🎮 Learning Games</Typography>
                          <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>Practice Mode — play at home &amp; track progress!</Typography>
                          {profile?.firstName && <Typography variant="body2" sx={{ opacity: 0.8 }}>Learner: {profile.firstName}</Typography>}
                        </Box>
                      </Box>
                      {/* Progress Summary Pills */}
                      <Stack direction={{ xs: 'row', sm: 'row' }} spacing={2} flexWrap="wrap">
                        <Paper sx={{ px: 2.5, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold">{totalScore}</Typography>
                          <Typography variant="caption">Total Points</Typography>
                        </Paper>
                        <Paper sx={{ px: 2.5, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold">{'⭐'.repeat(Math.min(maxStars, 5)) || '—'}</Typography>
                          <Typography variant="caption">Stars Earned</Typography>
                        </Paper>
                        <Paper sx={{ px: 2.5, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold">{totalPlays}</Typography>
                          <Typography variant="caption">Games Played</Typography>
                        </Paper>
                        <Paper sx={{ px: 2.5, py: 1.5, bgcolor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight="bold">{assignedGames.length}</Typography>
                          <Typography variant="caption">Assigned</Typography>
                        </Paper>
                      </Stack>
                    </Box>
                  </Paper>

                  {teacherContentLoading ? (
                    <Box textAlign="center" py={3}><CircularProgress /></Box>
                  ) : (
                    <>
                      {/* ── Teacher Assigned Games ── */}
                      {assignedGames.length > 0 && (
                        <Box mb={4}>
                          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            🎯 Assigned by Teacher ({assignedGames.length})
                            <Chip label="Practice these first!" size="small" color="primary" variant="outlined" />
                          </Typography>
                          <Grid container spacing={2}>
                            {assignedGames.map(({ assignmentId, game, assignedBy, playCount, bestScore, stars }) => (
                              <Grid item xs={12} sm={6} md={4} key={assignmentId}>
                                <Card sx={{
                                  border: '2px solid #667eea', borderRadius: 2,
                                  transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
                                }}>
                                  <Box sx={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', p: 2, color: 'white' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                      <Typography variant="h3">{game?.emoji || '🎮'}</Typography>
                                      <Box>
                                        <Typography variant="subtitle1" fontWeight="bold">{game?.title}</Typography>
                                        <Chip label={game?.ageGroup} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontSize: '0.7rem' }} />
                                      </Box>
                                    </Box>
                                  </Box>
                                  <CardContent sx={{ pb: 1 }}>
                                    <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>{game?.description}</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                                      <Chip label={`By ${assignedBy}`} size="small" sx={{ bgcolor: '#667eea22', color: '#667eea', fontWeight: 600 }} />
                                      <Chip label={`Played ${playCount || 0}×`} size="small" color={playCount > 0 ? 'success' : 'default'} />
                                      {bestScore > 0 && <Chip label={`Best: ${bestScore} pts`} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100' }} icon={<EmojiEvents style={{ fontSize: 14 }} />} />}
                                      {stars > 0 && <Chip label={'⭐'.repeat(stars)} size="small" sx={{ bgcolor: '#fffde7', color: '#f9a825' }} />}
                                    </Box>
                                    {/* Score Progress Bar */}
                                    {bestScore > 0 && (
                                      <Box mb={1}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                          <Typography variant="caption" color="text.secondary">Best Score</Typography>
                                          <Typography variant="caption" fontWeight="bold">{bestScore}/100</Typography>
                                        </Box>
                                        <LinearProgress variant="determinate" value={Math.min(bestScore, 100)} sx={{ height: 6, borderRadius: 3, bgcolor: '#e3f2fd', '& .MuiLinearProgress-bar': { bgcolor: '#667eea' } }} />
                                      </Box>
                                    )}
                                  </CardContent>
                                  <CardActions sx={{ px: 2, pb: 2 }}>
                                    <Button
                                      fullWidth
                                      variant="contained"
                                      startIcon={<PlayArrow />}
                                      onClick={() => handlePracticeClick(assignmentId, game?.gameRoute || '/')}
                                      sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' }, fontWeight: 700, borderRadius: 2 }}
                                    >
                                      ▶ Practice Now
                                    </Button>
                                  </CardActions>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )}

                      {/* ── Teacher's Video Stories ── */}
                      {teacherStories.length > 0 && (
                        <Box mb={4}>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            📚 Teacher's Video Stories ({teacherStories.length})
                          </Typography>
                          <Grid container spacing={2}>
                            {teacherStories.map(story => (
                              <Grid item xs={12} sm={6} md={4} key={story._id}>
                                <Card sx={{ cursor: 'pointer', borderRadius: 2, overflow: 'hidden', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}
                                  onClick={() => navigate('/vr-story')}>
                                  <Box sx={{ bgcolor: '#000', height: 120, overflow: 'hidden', position: 'relative' }}>
                                    <video src={`http://localhost:5000${story.videoUrl}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} preload="metadata" />
                                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Box sx={{ bgcolor: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <PlayArrow sx={{ color: 'white', fontSize: 24 }} />
                                      </Box>
                                    </Box>
                                  </Box>
                                  <CardContent sx={{ pb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" noWrap>{story.title}</Typography>
                                    <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
                                      <Chip label={story.ageGroup} size="small" color="primary" />
                                      <Chip label={story.category} size="small" variant="outlined" />
                                    </Box>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )}
                    </>
                  )}

                  <Divider sx={{ my: 3 }}>
                    <Chip label="🎮 All Available Games — Practice Mode" sx={{ fontWeight: 600, bgcolor: '#f5f0ff', color: '#667eea', px: 1 }} />
                  </Divider>

                  {/* ── All Games with Score Display ── */}
                  <Grid container spacing={3}>
                    {ALL_PRACTICE_GAMES.map(game => {
                      const scoreData = (childScores.scores || []).find(s => s.gameName === game.title || s.gameName?.toLowerCase().includes(game.id));
                      return (
                        <Grid item xs={12} sm={6} md={3} key={game.id}>
                          <Card sx={{
                            height: '100%', borderRadius: 3, overflow: 'hidden',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': { transform: 'translateY(-6px)', boxShadow: 8 }
                          }}>
                            {/* Gradient Header */}
                            <Box sx={{ background: game.gradient, p: 3, color: 'white', textAlign: 'center' }}>
                              <Typography variant="h2" mb={0.5}>{game.emoji}</Typography>
                              <Typography variant="subtitle1" fontWeight="bold">{game.title}</Typography>
                              <Chip label={game.ageGroup} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', mt: 0.5 }} />
                            </Box>
                            {/* Content */}
                            <CardContent sx={{ pb: 1 }}>
                              <Typography variant="body2" color="text.secondary" mb={1.5}>{game.description}</Typography>
                              {/* Score Display */}
                              {scoreData ? (
                                <Box sx={{ bgcolor: '#f9f9f9', borderRadius: 1.5, p: 1.5, mb: 1 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">Best Score</Typography>
                                    <Typography variant="caption" fontWeight="bold" color="#e65100">{scoreData.bestScore} pts</Typography>
                                  </Box>
                                  <LinearProgress variant="determinate" value={Math.min(scoreData.bestScore, 100)} sx={{ height: 5, borderRadius: 3, bgcolor: '#e0e0e0' }} />
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                    <Chip label={`Played ${scoreData.playCount}×`} size="small" color="success" />
                                    <Chip label={'⭐'.repeat(scoreData.maxStars || 0) || 'No stars yet'} size="small" sx={{ bgcolor: '#fffde7', color: '#f9a825' }} />
                                  </Box>
                                </Box>
                              ) : (
                                <Box sx={{ bgcolor: '#f5f5f5', borderRadius: 1.5, p: 1.5, mb: 1, textAlign: 'center' }}>
                                  <Typography variant="caption" color="text.secondary">Not played yet — be the first!</Typography>
                                </Box>
                              )}
                              <Chip label={game.category} size="small" variant="outlined" />
                            </CardContent>
                            <CardActions sx={{ px: 2, pb: 2 }}>
                              <Button
                                fullWidth
                                variant="contained"
                                startIcon={<PlayArrow />}
                                onClick={() => navigate(game.route)}
                                sx={{
                                  background: game.gradient, color: 'white',
                                  fontWeight: 700, borderRadius: 2,
                                  '&:hover': { opacity: 0.9, background: game.gradient }
                                }}
                              >
                                ▶ Play
                              </Button>
                            </CardActions>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>

                  {/* Learning Benefits Footer */}
                  <Paper sx={{ mt: 4, p: 3, borderRadius: 2, bgcolor: '#f8f9ff', border: '1px solid #e8eaff' }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>💡 Learning Benefits</Typography>
                    <Grid container spacing={2}>
                      {[
                        { icon: '🧠', title: 'Cognitive Development', desc: 'Enhance memory, problem solving & critical thinking' },
                        { icon: '🎨', title: 'Interactive Learning', desc: 'Hands-on experiences make learning fun & engaging' },
                        { icon: '📈', title: 'Progress Tracking', desc: 'Monitor scores, stars & achievements over time' },
                        { icon: '👨‍👩‍👧', title: 'Family Learning', desc: 'Play together and celebrate every achievement!' }
                      ].map(b => (
                        <Grid item xs={12} sm={6} md={3} key={b.title}>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <Typography fontSize={24}>{b.icon}</Typography>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">{b.title}</Typography>
                              <Typography variant="caption" color="text.secondary">{b.desc}</Typography>
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>

                  {/* ── AR Learning Section ── */}
                  <Box mt={4}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CameraAlt sx={{ color: '#667eea' }} /> AR Learning Tools
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Card sx={{ borderRadius: 3, overflow: 'hidden', border: '2px solid #667eea', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                          <Box sx={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', p: 3, color: 'white', textAlign: 'center' }}>
                            <Typography variant="h2">🔤</Typography>
                            <Typography variant="h6" fontWeight="bold" mt={1}>AR Alphabet Scanner</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.85 }}>Interactive Letter Learning</Typography>
                          </Box>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                              {'Camera scans card "A", then 3D Apple appears, then audio says "A for Apple". Works for all 26 letters and makes learning interactive.'}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                              {['Ages 2-6', '26 Letters', 'Audio Pronunciation', 'Camera Required'].map(tag => (
                                <Chip key={tag} label={tag} size="small" sx={{ bgcolor: '#667eea22', color: '#667eea', fontWeight: 600 }} />
                              ))}
                            </Box>
                            <Button fullWidth variant="contained" onClick={() => navigate('/alphabet-ar')}
                              sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' }, borderRadius: 2, fontWeight: 700 }}>
                              🚀 Start Card Scanner Game
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Card sx={{ borderRadius: 3, overflow: 'hidden', border: '2px solid #16a34a', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                          <Box sx={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', p: 3, color: 'white', textAlign: 'center' }}>
                            <Typography variant="h2">🥕</Typography>
                            <Typography variant="h6" fontWeight="bold" mt={1}>AR Healthy Food Game</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>Scan Food Cards and Learn</Typography>
                          </Box>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                              Scan food cards like CARROT or BURGER. Kids see a 3D food view and instantly learn Healthy vs Unhealthy.
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                              {['Ages 3-7', 'Healthy vs Unhealthy', 'Food Cards', 'Camera Required'].map(tag => (
                                <Chip key={tag} label={tag} size="small" sx={{ bgcolor: '#16a34a22', color: '#15803d', fontWeight: 600 }} />
                              ))}
                            </Box>
                            <Button fullWidth variant="contained" onClick={() => navigate('/healthy-food-ar')}
                              sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, borderRadius: 2, fontWeight: 700 }}>
                              🥗 Start Healthy Food Scanner
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              );
            })()}

            {/* Tab 6: Doctor Appointments */}
            {/* Tab 7: Doctor Appointments */}
            {tab === 7 && (
              <Box>
                {/* Success/Error Messages */}
                {appointmentSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAppointmentSuccess('')}>
                    {appointmentSuccess}
                  </Alert>
                )}
                {appointmentError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAppointmentError('')}>
                    {appointmentError}
                  </Alert>
                )}

                <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
                  <CardHeader
                    title="Child Growth and Nutrition Summary"
                    subheader="Growth progress · Nutrition status · Recommended meals · Daycare plan · Subscription options"
                    action={
                      parentHealthSummary && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Download />}
                          onClick={handleDownloadParentReport}
                          sx={{ mt: 1, mr: 1 }}
                        >
                          Download Report
                        </Button>
                      )
                    }
                  />
                  <CardContent>
                    {parentHealthLoading ? (
                      <CircularProgress size={24} />
                    ) : !parentHealthSummary ? (
                      <Alert severity="info">No health summary available yet for this child. Ask the doctor to run an analysis.</Alert>
                    ) : (
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Grid container spacing={1.5} alignItems="center">
                              <Grid item>
                                <Chip
                                  label={parentHealthSummary?.nutritionStatus?.prediction || 'No Analysis Yet'}
                                  color={
                                    (parentHealthSummary?.nutritionStatus?.prediction || '').toLowerCase().includes('severe') ? 'error' :
                                    (parentHealthSummary?.nutritionStatus?.prediction || '').toLowerCase().includes('moderate') ? 'warning' : 'success'
                                  }
                                  sx={{ fontWeight: 700 }}
                                />
                              </Grid>
                              <Grid item>
                                <Divider orientation="vertical" flexItem sx={{ height: 36 }} />
                              </Grid>
                              <Grid item>
                                <Typography variant="caption" color="text.secondary" display="block">Next Checkup</Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {parentHealthSummary?.doctorSuggestion?.nextCheckupInDays || 14} days
                                </Typography>
                              </Grid>
                              <Grid item>
                                <Divider orientation="vertical" flexItem sx={{ height: 36 }} />
                              </Grid>
                              <Grid item>
                                <Typography variant="caption" color="text.secondary" display="block">Last Analyzed</Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {parentHealthSummary?.measuredAt ? new Date(parentHealthSummary.measuredAt).toLocaleDateString() : 'Not yet'}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Paper>
                        </Grid>

                        <Grid item xs={12}>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>📈 View Child Growth Progress</Typography>
                          <Grid container spacing={2}>
                            {[
                              { label: 'Weight', actual: parentHealthSummary?.growthProgress?.actual_weight_kg, expected: parentHealthSummary?.growthProgress?.expected_weight_kg, unit: 'kg', emoji: '⚖️' },
                              { label: 'Height', actual: parentHealthSummary?.growthProgress?.actual_height_cm, expected: parentHealthSummary?.growthProgress?.expected_height_cm, unit: 'cm', emoji: '📏' },
                              { label: 'BMI', actual: parentHealthSummary?.growthProgress?.bmi, expected: null, unit: '', emoji: '🏥' },
                            ].map((stat) => (
                              <Grid item xs={12} sm={4} key={stat.label}>
                                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                                  <Typography variant="h5" sx={{ mb: 0.5 }}>{stat.emoji}</Typography>
                                  <Typography variant="subtitle2" color="text.secondary">{stat.label}</Typography>
                                  <Typography variant="h6" fontWeight={700} color="primary.main">
                                    {stat.actual != null ? `${stat.actual} ${stat.unit}` : 'N/A'}
                                  </Typography>
                                  {stat.expected != null && (
                                    <Typography variant="caption" color="text.secondary">
                                      Expected: {stat.expected} {stat.unit}
                                    </Typography>
                                  )}
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>🩺 View Nutrition Status</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Chip
                                label={parentHealthSummary?.nutritionStatus?.prediction || 'No Analysis Yet'}
                                color={
                                  (parentHealthSummary?.nutritionStatus?.prediction || '').toLowerCase().includes('severe') ? 'error' :
                                  (parentHealthSummary?.nutritionStatus?.prediction || '').toLowerCase().includes('moderate') ? 'warning' : 'success'
                                }
                                sx={{ fontWeight: 700, fontSize: '0.85rem' }}
                              />
                            </Box>
                            {parentHealthSummary?.nutritionStatus?.confidence != null && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Confidence: {Math.round((parentHealthSummary.nutritionStatus.confidence || 0) * 100)}%
                              </Typography>
                            )}
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2"><strong>Next Checkup:</strong> {parentHealthSummary?.doctorSuggestion?.nextCheckupInDays || 14} days</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              <strong>Doctor Note:</strong> {parentHealthSummary?.doctorSuggestion?.notes || 'Follow balanced diet and routine monitoring.'}
                            </Typography>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>🥗 View Recommended Meal Plan</Typography>
                            <Stack spacing={1}>
                              {(() => {
                                const primaryPlan = (parentHealthSummary?.mealPlanOptions || [])[0];
                                const planMeals = primaryPlan
                                  ? [
                                      { label: 'Breakfast', value: primaryPlan.breakfast },
                                      { label: 'Lunch', value: primaryPlan.lunch },
                                      { label: 'Snack', value: primaryPlan.snack },
                                      { label: 'Dinner', value: primaryPlan.dinner },
                                    ]
                                  : [];

                                return planMeals.length > 0 ? planMeals.map((meal) => (
                                  <Box key={meal.label} sx={{ p: 1.25, bgcolor: '#f7fbf7', borderRadius: 1.5, border: '1px solid #dcefdc' }}>
                                    <Typography variant="body2"><strong>{meal.label}:</strong> {meal.value}</Typography>
                                  </Box>
                                )) : <Typography variant="body2" color="text.secondary">No food recommendations yet.</Typography>;
                              })()}
                            </Stack>
                          </Paper>
                        </Grid>

                        <Grid item xs={12}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>🍽️ View Daycare Diet Plan</Typography>
                            <Grid container spacing={1}>
                              {[
                                { meal: 'Breakfast', value: parentHealthSummary?.dailyDietPlan?.breakfast, emoji: '🌅' },
                                { meal: 'Lunch', value: parentHealthSummary?.dailyDietPlan?.lunch, emoji: '☀️' },
                                { meal: 'Snack', value: parentHealthSummary?.dailyDietPlan?.snack, emoji: '🍎' },
                                { meal: 'Dinner', value: parentHealthSummary?.dailyDietPlan?.dinner, emoji: '🌙' },
                              ].map(({ meal, value, emoji }) => (
                                <Grid item xs={12} sm={6} key={meal}>
                                  <Box sx={{ p: 1.5, bgcolor: '#f9fafb', borderRadius: 1.5, border: '1px solid #e0e0e0' }}>
                                    <Typography variant="body2"><strong>{emoji} {meal}:</strong> {value || 'Balanced nutritious meal'}</Typography>
                                  </Box>
                                </Grid>
                              ))}
                            </Grid>
                          </Paper>
                        </Grid>

                        <Grid item xs={12}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>🧾 View Different Meal Plans</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                              These options are auto-generated after doctor analysis. The teacher can follow one of them, but the options themselves do not need to be created manually by the teacher.
                            </Typography>
                            <Grid container spacing={2}>
                              {(parentHealthSummary?.mealPlanOptions || []).length > 0 ? (
                                (parentHealthSummary?.mealPlanOptions || []).map((plan, idx) => (
                                  <Grid item xs={12} md={4} key={`${plan?.title || 'plan'}-${idx}`}>
                                    <Box sx={{ p: 1.5, bgcolor: '#f8f9ff', borderRadius: 1.5, border: '1px solid #d9e1ff' }}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{plan?.title || `Plan ${idx + 1}`}</Typography>
                                      <Typography variant="body2"><strong>Breakfast:</strong> {plan?.breakfast || '-'}</Typography>
                                      <Typography variant="body2"><strong>Lunch:</strong> {plan?.lunch || '-'}</Typography>
                                      <Typography variant="body2"><strong>Snack:</strong> {plan?.snack || '-'}</Typography>
                                      <Typography variant="body2"><strong>Dinner:</strong> {plan?.dinner || '-'}</Typography>
                                    </Box>
                                  </Grid>
                                ))
                              ) : (
                                <Grid item xs={12}>
                                  <Typography variant="body2" color="text.secondary">Meal plan options will appear after doctor analysis.</Typography>
                                </Grid>
                              )}
                            </Grid>
                          </Paper>
                        </Grid>

                        <Grid item xs={12}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>💳 Doctor Meal Subscription</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              The standard daycare menu is already admin-approved. If the doctor has suggested a special meal plan, you can subscribe to it here, choose a time period, or decide to bring food from home.
                            </Typography>

                            {mealSubscriptionMessage.text && (
                              <Alert severity={mealSubscriptionMessage.type || 'info'} sx={{ mb: 2 }} onClose={() => setMealSubscriptionMessage({ type: '', text: '' })}>
                                {mealSubscriptionMessage.text}
                              </Alert>
                            )}

                            {mealSubscriptionLoading ? (
                              <CircularProgress size={24} />
                            ) : (
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <Paper sx={{ p: 1.5, bgcolor: '#fafcff', border: '1px solid #d9e1ff' }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Approved Daycare Plan</Typography>
                                    <Typography variant="body2"><strong>Plan:</strong> {mealSubscriptionData?.approvedDaycarePlan?.title || meals?.title || 'Published daycare meal plan'}</Typography>
                                    <Typography variant="body2"><strong>Status:</strong> Admin approved and published</Typography>
                                    <Typography variant="body2"><strong>Program:</strong> {profile?.program || 'N/A'}</Typography>
                                  </Paper>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Paper sx={{ p: 1.5, bgcolor: '#fffaf3', border: '1px solid #f1d9a8' }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Current Preference</Typography>
                                    <Typography variant="body2"><strong>Choice:</strong> {mealSubscriptionData?.currentSubscription?.selectedPlanTitle || 'Admin Approved Daycare Meal Plan'}</Typography>
                                    <Typography variant="body2"><strong>Status:</strong> {mealSubscriptionData?.currentSubscription?.status || 'inactive'}</Typography>
                                    <Typography variant="body2"><strong>Extra Fee:</strong> ${Number(mealSubscriptionData?.currentSubscription?.extraFee || 0).toFixed(2)}</Typography>
                                  </Paper>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                  <FormControl fullWidth>
                                    <InputLabel>Meal Arrangement</InputLabel>
                                    <Select
                                      value={mealSubscriptionForm.preference}
                                      label="Meal Arrangement"
                                      onChange={(e) => setMealSubscriptionForm((prev) => ({ ...prev, preference: e.target.value }))}
                                    >
                                      <MenuItem value="approved_daycare">Use approved daycare plan</MenuItem>
                                      <MenuItem value="doctor_recommended">Subscribe to doctor suggested plan</MenuItem>
                                      <MenuItem value="bring_from_home">Bring food from home</MenuItem>
                                    </Select>
                                  </FormControl>
                                </Grid>

                                {mealSubscriptionForm.preference === 'doctor_recommended' && (
                                  <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                      <InputLabel>Doctor Suggested Plan</InputLabel>
                                      <Select
                                        value={mealSubscriptionForm.selectedPlanTitle}
                                        label="Doctor Suggested Plan"
                                        onChange={(e) => setMealSubscriptionForm((prev) => ({ ...prev, selectedPlanTitle: e.target.value }))}
                                      >
                                        {(mealSubscriptionData?.doctorSuggestedPlans || []).map((plan, idx) => (
                                          <MenuItem key={`${plan.title || 'plan'}-${idx}`} value={plan.title}>{plan.title}</MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </Grid>
                                )}

                                <Grid item xs={12} md={4}>
                                  <FormControl fullWidth>
                                    <InputLabel>Subscription Period</InputLabel>
                                    <Select
                                      value={mealSubscriptionForm.durationType}
                                      label="Subscription Period"
                                      onChange={(e) => setMealSubscriptionForm((prev) => ({ ...prev, durationType: e.target.value }))}
                                    >
                                      <MenuItem value="specific_period">Specific period</MenuItem>
                                      <MenuItem value="entire_daycare">Whole daycare duration</MenuItem>
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                  <TextField
                                    fullWidth
                                    label="Start Date"
                                    type="date"
                                    value={mealSubscriptionForm.startDate}
                                    InputLabelProps={{ shrink: true }}
                                    onChange={(e) => setMealSubscriptionForm((prev) => ({ ...prev, startDate: e.target.value }))}
                                  />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                  <TextField
                                    fullWidth
                                    label="End Date"
                                    type="date"
                                    value={mealSubscriptionForm.endDate}
                                    InputLabelProps={{ shrink: true }}
                                    disabled={mealSubscriptionForm.durationType !== 'specific_period'}
                                    onChange={(e) => setMealSubscriptionForm((prev) => ({ ...prev, endDate: e.target.value }))}
                                  />
                                </Grid>

                                <Grid item xs={12}>
                                  <Alert severity={mealSubscriptionForm.preference === 'doctor_recommended' ? 'info' : mealSubscriptionForm.preference === 'bring_from_home' ? 'warning' : 'success'}>
                                    {mealSubscriptionForm.preference === 'doctor_recommended'
                                      ? `Doctor suggestion: ${mealSubscriptionData?.doctorSuggestionNotes || 'Custom plan based on doctor review.'} Extra fee will be added to billing.`
                                      : mealSubscriptionForm.preference === 'bring_from_home'
                                        ? 'Parents may bring food from home. No extra meal subscription fee will be billed.'
                                        : 'Your child will continue on the admin-approved daycare meal plan already included in normal daycare operations.'}
                                  </Alert>
                                </Grid>

                                {mealSubscriptionForm.preference === 'doctor_recommended' && (mealSubscriptionData?.doctorSuggestedPlans || []).length > 0 && (
                                  <Grid item xs={12}>
                                    <Grid container spacing={2}>
                                      {(mealSubscriptionData.doctorSuggestedPlans || [])
                                        .filter((plan) => plan.title === mealSubscriptionForm.selectedPlanTitle)
                                        .map((plan) => (
                                          <Grid item xs={12} key={plan.title}>
                                            <Paper sx={{ p: 1.5, bgcolor: '#f7fbf7', border: '1px solid #dcefdc' }}>
                                              <Typography variant="subtitle2" sx={{ mb: 1 }}>{plan.title}</Typography>
                                              <Typography variant="body2"><strong>Breakfast:</strong> {plan.breakfast}</Typography>
                                              <Typography variant="body2"><strong>Lunch:</strong> {plan.lunch}</Typography>
                                              <Typography variant="body2"><strong>Snack:</strong> {plan.snack}</Typography>
                                              <Typography variant="body2"><strong>Dinner:</strong> {plan.dinner}</Typography>
                                            </Paper>
                                          </Grid>
                                        ))}
                                    </Grid>
                                  </Grid>
                                )}

                                <Grid item xs={12}>
                                  <Stack direction="row" spacing={1} flexWrap="wrap">
                                    <Button variant="contained" onClick={saveMealSubscription} disabled={mealSubscriptionSaving}>
                                      {mealSubscriptionSaving ? 'Saving...' : 'Save Meal Preference'}
                                    </Button>
                                    <Button variant="outlined" color="error" onClick={removeMealSubscription} disabled={mealSubscriptionSaving}>
                                      Remove Custom Subscription
                                    </Button>
                                  </Stack>
                                </Grid>
                              </Grid>
                            )}
                          </Paper>
                        </Grid>

                        <Grid item xs={12}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: (parentHealthSummary?.healthAlerts || []).length > 0 ? '#fff8e1' : 'inherit' }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>⚠️ Health Alerts</Typography>
                            {(parentHealthSummary?.healthAlerts || []).length === 0 ? (
                              <Alert severity="success" sx={{ py: 0.5 }}>No active health alerts — your child is on track!</Alert>
                            ) : (
                              <Stack spacing={1}>
                                {parentHealthSummary.healthAlerts.map((alert, idx) => (
                                  <Alert key={idx} severity="warning" sx={{ py: 0.5 }}>
                                    {typeof alert === 'string' ? alert : JSON.stringify(alert)}
                                  </Alert>
                                ))}
                              </Stack>
                            )}
                          </Paper>
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>

                <Card sx={{ mb: 3 }}>
                  <CardHeader 
                    title="Doctor Appointments" 
                    subheader="Book and manage doctor consultations for your children"
                    action={
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => {
                          setSlotBookingChildId(activeChildId || '');
                          setAppointmentDialog(true);
                          fetchAvailableDoctors();
                          fetchAvailableSlots(selectedDoctorId, slotBookingDate);
                        }}
                      >
                        Book Appointment
                      </Button>
                    }
                  />
                  <CardContent>
                    {/* Appointments List */}
                    <Grid container spacing={2}>
                      {appointments.length === 0 ? (
                        <Grid item xs={12}>
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <LocalHospital sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                              No Appointments Yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Book your first doctor appointment for your child
                            </Typography>
                            <Button
                              variant="contained"
                              startIcon={<Add />}
                              onClick={() => {
                                setSlotBookingChildId(activeChildId || '');
                                setAppointmentDialog(true);
                                fetchAvailableDoctors();
                                fetchAvailableSlots(selectedDoctorId, slotBookingDate);
                              }}
                            >
                              Book Now
                            </Button>
                          </Box>
                        </Grid>
                      ) : (
                        appointments.map((appointment) => (
                          <Grid item xs={12} md={6} key={appointment._id}>
                            <Card variant="outlined">
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                      {appointment.child?.firstName?.[0]}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="h6">
                                        {appointment.child?.firstName} {appointment.child?.lastName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                                          weekday: 'long',
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <Chip
                                    label={appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'N/A'}
                                    size="small"
                                    color={
                                      appointment.status === 'confirmed' ? 'success' :
                                      appointment.status === 'completed' ? 'info' :
                                      appointment.status === 'cancelled' ? 'error' :
                                      'warning'
                                    }
                                  />
                                </Box>

                                <Divider sx={{ my: 2 }} />

                                <Grid container spacing={1}>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Time</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {appointment.appointmentTime}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Type</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {appointment.appointmentType === 'online' ? 'Online' : 'On-site'}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">Reason</Typography>
                                    <Typography variant="body2">{appointment.reason}</Typography>
                                  </Grid>

                                  {appointment.diagnosis && (
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">Diagnosis</Typography>
                                      <Typography variant="body2">{appointment.diagnosis}</Typography>
                                    </Grid>
                                  )}

                                  {appointment.prescription && (
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">Prescription</Typography>
                                      <Typography variant="body2">{appointment.prescription}</Typography>
                                    </Grid>
                                  )}

                                  {appointment.healthAdvice && (
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">Health Advice</Typography>
                                      <Typography variant="body2">{appointment.healthAdvice}</Typography>
                                    </Grid>
                                  )}

                                  {appointment.isEmergency && (
                                    <Grid item xs={12}>
                                      <Chip label="Emergency" size="small" color="error" />
                                    </Grid>
                                  )}

                                  {/* Meeting link for online consultations */}
                                  {appointment.appointmentType === 'online' && appointment.meetingLink && appointment.status === 'confirmed' && (
                                    <Grid item xs={12} sx={{ mt: 1 }}>
                                      <Alert severity="info" icon={false}>
                                        <Typography variant="body2" fontWeight={600}>Online Consultation</Typography>
                                        <Typography variant="caption">Time: {appointment.appointmentTime}</Typography>
                                        <Box sx={{ mt: 1 }}>
                                          <Button size="small" variant="contained" color="info"
                                            onClick={() => window.open(appointment.meetingLink, '_blank')}>
                                            Join Meeting
                                          </Button>
                                        </Box>
                                      </Alert>
                                    </Grid>
                                  )}

                                  {/* Prescription details */}
                                  {appointment.prescriptionDetails?.diagnosis && (
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">Prescription</Typography>
                                      <Typography variant="body2" fontWeight={600}>{appointment.prescriptionDetails.diagnosis}</Typography>
                                      {appointment.prescriptionDetails.medicines?.map((m, i) => (
                                        <Typography key={i} variant="caption" display="block">• {m.name} {m.dosage} — {m.frequency} for {m.duration}</Typography>
                                      ))}
                                      {appointment.prescriptionDetails.advice && (
                                        <Typography variant="caption" color="text.secondary">Advice: {appointment.prescriptionDetails.advice}</Typography>
                                      )}
                                    </Grid>
                                  )}

                                  {/* Escrow payment: Pay when confirmed, Confirm when completed */}
                                  {appointment.status === 'confirmed' && (!appointment.payment?.status || appointment.payment?.status === 'pending') && (
                                    <Grid item xs={12} sx={{ mt: 2 }}>
                                      <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<Payment />}
                                        sx={{ bgcolor: '#1abc9c', '&:hover': { bgcolor: '#169b83' } }}
                                        onClick={() => handlePayDoctor(appointment)}
                                      >
                                        Pay ₹{appointment.payment?.consultationFee ?? 500} (UPI / Card / Net Banking)
                                      </Button>
                                    </Grid>
                                  )}
                                  {appointment.payment?.status === 'payment_held' && appointment.status !== 'completed' && (
                                    <Grid item xs={12} sx={{ mt: 2 }}>
                                      <Alert severity="success">Payment held by platform. Doctor will be paid after consultation.</Alert>
                                    </Grid>
                                  )}
                                  {appointment.status === 'completed' && appointment.payment?.status === 'payment_held' && (
                                    <Grid item xs={12} sx={{ mt: 2 }}>
                                      <Button
                                        fullWidth
                                        variant="contained"
                                        startIcon={<CheckCircle />}
                                        sx={{ bgcolor: '#1abc9c', '&:hover': { bgcolor: '#169b83' } }}
                                        onClick={() => handleConfirmDoctorPayment(appointment)}
                                      >
                                        Confirm Service & Release Payment
                                      </Button>
                                    </Grid>
                                  )}
                                  {appointment.payment?.status === 'parent_confirmed' && (
                                    <Grid item xs={12} sx={{ mt: 2 }}>
                                      <Alert severity="info">Payment confirmed. Waiting for admin to release to doctor.</Alert>
                                    </Grid>
                                  )}
                                </Grid>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}


          </Box>
        )}
      </Box>

      {/* Payment Processing Dialog */}

      {/* Payment Processing Dialog */}
      <Dialog 
        open={paymentDialog.open} 
        onClose={() => setPaymentDialog({ open: false, invoice: null })}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Process Payment
        </DialogTitle>
        <DialogContent>
          {paymentDialog.invoice && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Invoice: {paymentDialog.invoice.invoiceNumber}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Description: {paymentDialog.invoice.description}
              </Typography>
              <Typography variant="h5" color="success.main" gutterBottom>
                Amount: ${paymentDialog.invoice.amount.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="error.main" gutterBottom>
                Due Date: {new Date(paymentDialog.invoice.dueDate).toLocaleDateString()}
              </Typography>
              
              <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2">
                  💳 This is a demo payment system. In production, this would integrate with a real payment gateway like Stripe or Razorpay.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setPaymentDialog({ open: false, invoice: null })}
            disabled={paymentLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => processPayment(paymentDialog.invoice)}
            variant="contained"
            disabled={paymentLoading}
            sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
          >
            {paymentLoading ? <CircularProgress size={20} /> : 'Pay Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Book Appointment Dialog — Slot-based */}
      <Dialog
        open={appointmentDialog}
        onClose={() => { if (!appointmentLoading) { setAppointmentDialog(false); setSlotBookingStep(1); setSelectedSlot(null); setAvailableSlots([]); setAppointmentError(''); } }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Book Doctor Appointment</DialogTitle>
        <DialogContent dividers>
          {appointmentError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAppointmentError('')}>{appointmentError}</Alert>}
          {appointmentSuccess && <Alert severity="success" sx={{ mb: 2 }}>{appointmentSuccess}</Alert>}

          <Grid container spacing={2} sx={{ pt: 1 }}>
            {/* Child */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Select Child</InputLabel>
                <Select value={slotBookingChildId} onChange={(e) => setSlotBookingChildId(e.target.value)} label="Select Child">
                  {children.map((child) => (
                    <MenuItem key={child._id} value={child._id}>{child.firstName} {child.lastName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Consultation Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Consultation Type</InputLabel>
                <Select value={slotBookingType} onChange={(e) => setSlotBookingType(e.target.value)} label="Consultation Type">
                  <MenuItem value="onsite">On-site Visit</MenuItem>
                  <MenuItem value="online">Online Consultation (Video Call)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Date */}
            <Grid item xs={12} sm={availableDoctors.length > 1 ? 6 : 12}>
              <TextField fullWidth type="date" label="Select Date" value={slotBookingDate}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().slice(0, 10) }}
                onChange={(e) => {
                  setSlotBookingDate(e.target.value);
                  setSelectedSlot(null);
                  if (selectedDoctorId) fetchAvailableSlots(selectedDoctorId, e.target.value);
                }} />
            </Grid>

            {/* Doctor selector — only show if multiple doctors */}
            {availableDoctors.length > 1 ? (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Doctor</InputLabel>
                  <Select value={selectedDoctorId} label="Doctor"
                    onChange={(e) => { setSelectedDoctorId(e.target.value); setSelectedSlot(null); fetchAvailableSlots(e.target.value, slotBookingDate); }}>
                    {availableDoctors.map((d) => (
                      <MenuItem key={d._id} value={d._id}>Dr. {d.firstName} {d.lastName}{d.doctor?.specialization ? ` — ${d.doctor.specialization}` : ''}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ) : availableDoctors.length === 1 ? (
              <Grid item xs={12}>
                <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
                  Doctor: Dr. {availableDoctors[0]?.firstName} {availableDoctors[0]?.lastName}
                  {availableDoctors[0]?.doctor?.specialization ? ` — ${availableDoctors[0].doctor.specialization}` : ''}
                </Alert>
              </Grid>
            ) : null}

            {/* Available Slots */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Available Time Slots</Typography>
              {slotsLoading ? (
                <Typography color="text.secondary">Loading slots...</Typography>
              ) : availableSlots.length === 0 ? (
                <Alert severity="info">No available slots for this date. Try another date.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availableSlots.map((slot) => {
                    const isCompatible = slot.appointmentType === 'both' || slot.appointmentType === slotBookingType;
                    return (
                      <Chip
                        key={slot._id}
                        label={`${slot.startTime} – ${slot.endTime}  ₹${slot.consultationFee}`}
                        onClick={() => isCompatible && setSelectedSlot(slot)}
                        color={selectedSlot?._id === slot._id ? 'primary' : 'default'}
                        variant={selectedSlot?._id === slot._id ? 'filled' : 'outlined'}
                        disabled={!isCompatible}
                        sx={{ cursor: isCompatible ? 'pointer' : 'not-allowed', fontSize: '0.85rem', py: 2 }}
                      />
                    );
                  })}
                </Box>
              )}
            </Grid>

            {/* Selected slot summary */}
            {selectedSlot && (
              <Grid item xs={12}>
                <Alert severity="success" icon={false}>
                  Selected: {selectedSlot.startTime} – {selectedSlot.endTime} &nbsp;|&nbsp;
                  Fee: ₹{selectedSlot.consultationFee} &nbsp;|&nbsp;
                  {slotBookingType === 'online' ? '🎥 Online — meeting link will be generated after payment' : '🏥 On-site visit'}
                </Alert>
              </Grid>
            )}

            {/* Reason */}
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Reason for Consultation"
                placeholder="e.g., Fever, Allergy symptoms, Routine check-up..."
                value={slotBookingReason} onChange={(e) => setSlotBookingReason(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAppointmentDialog(false); setSlotBookingStep(1); setSelectedSlot(null); setAvailableSlots([]); setAppointmentError(''); }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleBookSlot}
            disabled={appointmentLoading || !selectedSlot || !slotBookingChildId || !slotBookingReason}>
            {appointmentLoading ? 'Processing...' : `Book & Pay ₹${selectedSlot?.consultationFee || ''}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Child Dialog */}
      <Dialog 
        open={addChildDialog} 
        onClose={() => {
          setAddChildDialog(false);
          setAddChildError('');
          setAddChildSuccess('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#14B8A6', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add />
            Add New Child
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {addChildError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addChildError}
            </Alert>
          )}
          {addChildSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {addChildSuccess}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Submit an admission request for your child. The admin will review and approve the registration.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Child's Full Name"
                value={addChildForm.childName}
                onChange={(e) => setAddChildForm({ ...addChildForm, childName: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={addChildForm.childDob}
                onChange={(e) => setAddChildForm({ ...addChildForm, childDob: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
                helperText="Age must be between 1-7 years"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={addChildForm.childGender}
                  onChange={(e) => setAddChildForm({ ...addChildForm, childGender: e.target.value })}
                  label="Gender"
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Program</InputLabel>
                <Select
                  value={addChildForm.program}
                  onChange={(e) => setAddChildForm({ ...addChildForm, program: e.target.value })}
                  label="Program"
                >
                  <MenuItem value="toddler">Toddler (1-2 years)</MenuItem>
                  <MenuItem value="preschool">Preschool (3-4 years)</MenuItem>
                  <MenuItem value="prekindergarten">Pre-Kindergarten (5-7 years)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Medical Information (Optional)"
                value={addChildForm.medicalInfo}
                onChange={(e) => setAddChildForm({ ...addChildForm, medicalInfo: e.target.value })}
                multiline
                rows={2}
                helperText="Any allergies, medications, or medical conditions"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={addChildForm.emergencyContactName}
                onChange={(e) => setAddChildForm({ ...addChildForm, emergencyContactName: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={addChildForm.emergencyContactPhone}
                onChange={(e) => setAddChildForm({ ...addChildForm, emergencyContactPhone: e.target.value })}
                helperText="10 digits only"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setAddChildDialog(false);
              setAddChildError('');
              setAddChildSuccess('');
            }}
            disabled={addChildLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddChild}
            variant="contained"
            disabled={addChildLoading}
            startIcon={addChildLoading ? <CircularProgress size={20} /> : <CheckCircle />}
            sx={{ bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0F766E' } }}
          >
            {addChildLoading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Child Profile Dialog */}
      <Dialog
        open={editChildDialog}
        onClose={() => {
          if (editChildLoading) return;
          setEditChildDialog(false);
          setEditChildError('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#0ea5e9', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit />
            Edit Child Profile
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {editChildError && <Alert severity="error" sx={{ mb: 2 }}>{editChildError}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={editChildForm.firstName}
                onChange={(e) => setEditChildForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={editChildForm.lastName}
                onChange={(e) => setEditChildForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date of Birth"
                InputLabelProps={{ shrink: true }}
                value={editChildForm.dateOfBirth}
                onChange={(e) => setEditChildForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  label="Gender"
                  value={editChildForm.gender}
                  onChange={(e) => setEditChildForm((f) => ({ ...f, gender: e.target.value }))}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Program</InputLabel>
                <Select
                  label="Program"
                  value={editChildForm.program}
                  onChange={(e) => setEditChildForm((f) => ({ ...f, program: e.target.value }))}
                >
                  <MenuItem value="toddler">Toddler</MenuItem>
                  <MenuItem value="preschool">Preschool</MenuItem>
                  <MenuItem value="prekindergarten">Pre-Kindergarten</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={editChildForm.notes}
                onChange={(e) => setEditChildForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditChildDialog(false);
              setEditChildError('');
            }}
            disabled={editChildLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveChildProfile}
            disabled={editChildLoading}
            startIcon={editChildLoading ? <CircularProgress size={18} /> : <CheckCircle />}
          >
            {editChildLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* After School Program Enrollment Dialog */}
      <Dialog
        open={afterSchoolDialog}
        onClose={() => !enrollmentLoading && setAfterSchoolDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#673AB7', color: 'white' }}>
          Enroll in After School Program
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedProgram && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {selectedProgram.programName}
              </Typography>
              <Chip 
                label={selectedProgram.programType} 
                size="small" 
                sx={{ bgcolor: '#673AB7', color: 'white', mb: 2 }}
              />
              
              <Typography variant="body2" paragraph>
                {selectedProgram.description}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Enrolled Child</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {children.find(c => c._id === activeChildId)?.firstName} {children.find(c => c._id === activeChildId)?.lastName}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Schedule</Typography>
                  <Typography variant="body2">
                    {selectedProgram.schedule.days.join(', ')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedProgram.schedule.startTime} - {selectedProgram.schedule.endTime}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                  <Typography variant="body2">{selectedProgram.location}</Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Age Group</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedProgram.ageGroup.min} - {selectedProgram.ageGroup.max} years
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Fees</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                    {selectedProgram.fees.amount === 0 ? 'FREE' : `$${selectedProgram.fees.amount} ${selectedProgram.fees.frequency}`}
                  </Typography>
                </Grid>
                
                {selectedProgram.requirements && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      <Typography variant="subtitle2">Requirements</Typography>
                      <Typography variant="body2">{selectedProgram.requirements}</Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setAfterSchoolDialog(false)}
            disabled={enrollmentLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleEnrollProgram(selectedProgram._id)}
            variant="contained"
            disabled={enrollmentLoading}
            startIcon={enrollmentLoading ? <CircularProgress size={20} /> : <CheckCircle />}
            sx={{ bgcolor: '#673AB7', '&:hover': { bgcolor: '#512DA8' } }}
          >
            {enrollmentLoading ? 'Enrolling...' : 'Confirm Enrollment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transport Message Snackbar */}
      <Snackbar 
        open={transportMessage.open} 
        autoHideDuration={6000} 
        onClose={() => setTransportMessage({ ...transportMessage, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setTransportMessage({ ...transportMessage, open: false })} 
          severity={transportMessage.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {transportMessage.text}
        </Alert>
      </Snackbar>

      {/* Voice Assistant Dialog */}
        <Dialog open={vaOpen} onClose={handleVaClose} maxWidth="xs" fullWidth>
          <Box sx={{ p: 2, bgcolor: '#f6f8fa' }}>
          <VoiceAssistant themeColor="#1abc9c" activeChildId={activeChildId} />
          </Box>
        </Dialog>
    </Box>
  );
};

export default ParentDashboard;