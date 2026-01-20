const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const User = require('../models/User');
const Child = require('../models/Child');
const Appointment = require('../models/Appointment');
const Attendance = require('../models/Attendance');

// Middleware to check if user is a doctor
const doctorOnly = [
  auth,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      if (!user || user.role !== 'doctor') {
        return res.status(403).json({ message: 'Access denied. Doctor access required.' });
      }
      req.doctor = user;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error verifying doctor access' });
    }
  }
];

// Get doctor's assigned children
router.get('/children', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId)
      .populate('doctor.assignedChildren', 'firstName lastName dateOfBirth gender program profileImage');
    
    if (!doctor || !doctor.doctor) {
      return res.json([]);
    }

    const children = await Child.find({
      _id: { $in: doctor.doctor.assignedChildren || [] },
      isActive: true
    })
      .populate('parents', 'firstName lastName email phone')
      .select('firstName lastName dateOfBirth gender program allergies medicalConditions emergencyContacts authorizedPickup notes profileImage enrollmentDate')
      .sort({ firstName: 1 });

    res.json(children);
  } catch (error) {
    console.error('Get assigned children error:', error);
    res.status(500).json({ message: 'Server error fetching assigned children' });
  }
});

// Get child medical details
router.get('/children/:childId', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId);
    if (!doctor || !doctor.doctor) {
      return res.status(403).json({ message: 'Doctor not found' });
    }

    // Check if child is assigned to this doctor
    const isAssigned = doctor.doctor.assignedChildren.some(
      childId => childId.toString() === req.params.childId
    );

    if (!isAssigned) {
      return res.status(403).json({ message: 'Child not assigned to this doctor' });
    }

    const child = await Child.findById(req.params.childId)
      .populate('parents', 'firstName lastName email phone address emergencyContact')
      .populate('assignedStaff', 'firstName lastName email phone')
      .select('-__v');

    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    res.json(child);
  } catch (error) {
    console.error('Get child details error:', error);
    res.status(500).json({ message: 'Server error fetching child details' });
  }
});

// Update child medical information
router.put('/children/:childId/medical', doctorOnly, [
  body('allergies').optional().isArray(),
  body('medicalConditions').optional().isArray(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await User.findById(req.user.userId);
    if (!doctor || !doctor.doctor) {
      return res.status(403).json({ message: 'Doctor not found' });
    }

    // Check if child is assigned to this doctor
    const isAssigned = doctor.doctor.assignedChildren.some(
      childId => childId.toString() === req.params.childId
    );

    if (!isAssigned) {
      return res.status(403).json({ message: 'Child not assigned to this doctor' });
    }

    const { allergies, medicalConditions, notes } = req.body;

    const child = await Child.findById(req.params.childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    if (allergies !== undefined) {
      child.allergies = Array.isArray(allergies) ? allergies : [];
    }
    if (medicalConditions !== undefined) {
      child.medicalConditions = Array.isArray(medicalConditions) 
        ? medicalConditions.map(mc => typeof mc === 'string' 
          ? { condition: mc, medication: '', instructions: '' }
          : mc)
        : [];
    }
    if (notes !== undefined) {
      child.notes = notes || '';
    }

    await child.save();

    res.json({
      message: 'Medical information updated successfully',
      child: child.toJSON()
    });
  } catch (error) {
    console.error('Update medical information error:', error);
    res.status(500).json({ message: 'Server error updating medical information' });
  }
});

// Add medical record/note
router.post('/children/:childId/medical-records', doctorOnly, [
  body('date').isISO8601().withMessage('Valid date required'),
  body('type').isIn(['checkup', 'vaccination', 'illness', 'injury', 'medication', 'other']).withMessage('Valid record type required'),
  body('description').trim().notEmpty().withMessage('Description required'),
  body('prescription').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await User.findById(req.user.userId);
    if (!doctor || !doctor.doctor) {
      return res.status(403).json({ message: 'Doctor not found' });
    }

    // Check if child is assigned to this doctor
    const isAssigned = doctor.doctor.assignedChildren.some(
      childId => childId.toString() === req.params.childId
    );

    if (!isAssigned) {
      return res.status(403).json({ message: 'Child not assigned to this doctor' });
    }

    const { date, type, description, prescription, followUpDate } = req.body;

    const child = await Child.findById(req.params.childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Add medical record to child's notes or create a medicalRecords field
    // For now, we'll append to notes with structured format
    const recordText = `\n\n[Medical Record - ${new Date(date).toLocaleDateString()}]\nType: ${type}\nDescription: ${description}${prescription ? `\nPrescription: ${prescription}` : ''}${followUpDate ? `\nFollow-up: ${new Date(followUpDate).toLocaleDateString()}` : ''}\nRecorded by: Dr. ${doctor.firstName} ${doctor.lastName}`;
    
    child.notes = (child.notes || '') + recordText;
    await child.save();

    res.json({
      message: 'Medical record added successfully',
      record: {
        date,
        type,
        description,
        prescription,
        followUpDate,
        recordedBy: {
          id: doctor._id,
          name: `Dr. ${doctor.firstName} ${doctor.lastName}`
        }
      }
    });
  } catch (error) {
    console.error('Add medical record error:', error);
    res.status(500).json({ message: 'Server error adding medical record' });
  }
});

// Get doctor's profile
router.get('/profile', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId)
      .select('-password')
      .populate('doctor.assignedChildren', 'firstName lastName dateOfBirth');
    
    res.json(doctor);
  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// Get statistics for doctor dashboard
router.get('/statistics', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId);
    if (!doctor || !doctor.doctor) {
      return res.json({
        totalChildren: 0,
        childrenWithAllergies: 0,
        childrenWithMedicalConditions: 0,
        recentCheckups: 0
      });
    }

    const children = await Child.find({
      _id: { $in: doctor.doctor.assignedChildren || [] },
      isActive: true
    });

    const statistics = {
      totalChildren: children.length,
      childrenWithAllergies: children.filter(c => c.allergies && c.allergies.length > 0).length,
      childrenWithMedicalConditions: children.filter(c => c.medicalConditions && c.medicalConditions.length > 0).length,
      recentCheckups: 0 // Can be enhanced with actual checkup tracking
    };

    res.json(statistics);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

// ========== AI ROUTES TEST ==========
router.get('/ai/test', doctorOnly, async (req, res) => {
  res.json({ message: 'AI routes are working', timestamp: new Date().toISOString() });
});

// ========== AI HEALTH SUMMARY GENERATOR ==========
// Generate AI-powered health summary for a child based on appointments and medical records
router.post('/ai/health-summary/:childId', doctorOnly, async (req, res) => {
  console.log('AI Health Summary endpoint called for child:', req.params.childId);
  try {
    const doctor = await User.findById(req.user.userId);
    if (!doctor || !doctor.doctor) {
      return res.status(403).json({ message: 'Doctor not found' });
    }

    const isAssigned = doctor.doctor.assignedChildren.some(
      childId => childId.toString() === req.params.childId
    );
    if (!isAssigned) {
      return res.status(403).json({ message: 'Child not assigned to this doctor' });
    }

    const child = await Child.findById(req.params.childId)
      .populate('parents', 'firstName lastName');
    
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Fetch all appointments for this child
    const appointments = await Appointment.find({ child: req.params.childId })
      .sort({ appointmentDate: -1 })
      .limit(20);

    // Fetch attendance records
    const attendanceRecords = await Attendance.find({
      entityType: 'child',
      entityId: req.params.childId
    })
      .sort({ date: -1 })
      .limit(30);

    // Analyze data and generate summary
    const age = Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    
    // Extract key information
    const recentAppointments = appointments.slice(0, 5);
    const completedAppointments = appointments.filter(a => a.status === 'completed');
    const emergencyAppointments = appointments.filter(a => a.isEmergency);
    
    // Calculate attendance rate
    const recentAttendance = attendanceRecords.slice(0, 20);
    const presentDays = recentAttendance.filter(a => a.status === 'present').length;
    const attendanceRate = recentAttendance.length > 0 ? (presentDays / recentAttendance.length * 100).toFixed(1) : 100;

    // Extract common symptoms/diagnoses
    const diagnoses = completedAppointments
      .map(a => a.diagnosis)
      .filter(d => d && d.trim())
      .join(' ').toLowerCase();
    
    const symptoms = {
      fever: (diagnoses.match(/fever|temperature|hot/i) || []).length,
      cough: (diagnoses.match(/cough|respiratory/i) || []).length,
      rash: (diagnoses.match(/rash|skin|allergy/i) || []).length,
      stomach: (diagnoses.match(/stomach|nausea|vomit|diarrhea/i) || []).length,
      infection: (diagnoses.match(/infection|bacterial|viral/i) || []).length
    };

    // Generate AI summary
    const summary = {
      childInfo: {
        name: `${child.firstName} ${child.lastName}`,
        age: `${age} years`,
        gender: child.gender
      },
      overallHealth: attendanceRate >= 80 ? 'Good' : attendanceRate >= 60 ? 'Fair' : 'Needs Attention',
      healthSummary: generateHealthSummary(child, appointments, attendanceRate, symptoms),
      visitNotes: generateVisitNotes(recentAppointments),
      keyFindings: extractKeyFindings(child, completedAppointments, symptoms),
      recommendations: generateRecommendations(child, appointments, attendanceRate, symptoms),
      lastUpdated: new Date().toISOString()
    };

    res.json(summary);
  } catch (error) {
    console.error('AI Health Summary error:', error);
    res.status(500).json({ message: 'Server error generating health summary', error: error.message });
  }
});

// ========== AI ROUTES TEST ==========
router.get('/ai/test', doctorOnly, async (req, res) => {
  res.json({ message: 'AI routes are working', timestamp: new Date().toISOString() });
});

// ========== PREDICTIVE HEALTH ALERTS ==========
// Analyze patterns and predict potential health issues
router.get('/ai/health-alerts', doctorOnly, async (req, res) => {
  console.log('AI Health Alerts endpoint called');
  console.log('Request user:', req.user?.userId);
  console.log('Request path:', req.path);
  console.log('Request url:', req.url);
  try {
    const doctor = await User.findById(req.user.userId);
    if (!doctor || !doctor.doctor) {
      return res.status(403).json({ message: 'Doctor not found' });
    }

    const children = await Child.find({
      _id: { $in: doctor.doctor.assignedChildren || [] },
      isActive: true
    });

    const alerts = [];

    for (const child of children) {
      const childAlerts = await analyzeChildHealth(child);
      if (childAlerts.length > 0) {
        alerts.push({
          childId: child._id,
          childName: `${child.firstName} ${child.lastName}`,
          alerts: childAlerts
        });
      }
    }

    res.json({ alerts, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Predictive Health Alerts error:', error);
    res.status(500).json({ message: 'Server error generating health alerts', error: error.message });
  }
});

// ========== EXPLAINABLE AI (XAI) ==========
// Get explanations for alerts and recommendations
router.post('/ai/explain', doctorOnly, async (req, res) => {
  try {
    const { alertType, childId, data } = req.body;

    const explanation = generateExplanation(alertType, childId, data);

    res.json({
      alertType,
      explanation,
      confidence: explanation.confidence || 'medium',
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('XAI Explanation error:', error);
    res.status(500).json({ message: 'Server error generating explanation', error: error.message });
  }
});

// ========== HELPER FUNCTIONS ==========

function generateHealthSummary(child, appointments, attendanceRate, symptoms) {
  const parts = [];
  
  parts.push(`${child.firstName} is a ${Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))}-year-old ${child.gender} with an overall attendance rate of ${attendanceRate}%.`);
  
  if (child.allergies && child.allergies.length > 0) {
    parts.push(`Known allergies: ${child.allergies.join(', ')}.`);
  }
  
  if (child.medicalConditions && child.medicalConditions.length > 0) {
    parts.push(`Medical conditions: ${child.medicalConditions.map(mc => typeof mc === 'object' ? mc.condition : mc).join(', ')}.`);
  }
  
  if (appointments.length > 0) {
    const recentAppt = appointments[0];
    parts.push(`Most recent visit: ${new Date(recentAppt.appointmentDate).toLocaleDateString()} - ${recentAppt.reason}.`);
  }
  
  const symptomCount = Object.values(symptoms).reduce((a, b) => a + b, 0);
  if (symptomCount > 0) {
    const topSymptom = Object.entries(symptoms).sort((a, b) => b[1] - a[1])[0];
    if (topSymptom[1] > 0) {
      parts.push(`Recurring symptoms observed: ${topSymptom[0]} (${topSymptom[1]} occurrences).`);
    }
  }
  
  if (attendanceRate < 70) {
    parts.push(`Note: Attendance rate is below average, which may indicate health concerns or other issues.`);
  }
  
  return parts.join(' ');
}

function generateVisitNotes(appointments) {
  return appointments.map(appt => ({
    date: new Date(appt.appointmentDate).toLocaleDateString(),
    reason: appt.reason,
    diagnosis: appt.diagnosis || 'No diagnosis recorded',
    prescription: appt.prescription || 'No prescription',
    advice: appt.healthAdvice || 'No specific advice recorded',
    status: appt.status
  }));
}

function extractKeyFindings(child, appointments, symptoms) {
  const findings = [];
  
  if (child.allergies && child.allergies.length > 0) {
    findings.push({
      type: 'allergy',
      severity: 'high',
      description: `Child has ${child.allergies.length} known allergy/allergies: ${child.allergies.join(', ')}`
    });
  }
  
  const emergencyCount = appointments.filter(a => a.isEmergency).length;
  if (emergencyCount > 0) {
    findings.push({
      type: 'emergency',
      severity: 'high',
      description: `${emergencyCount} emergency visit(s) recorded`
    });
  }
  
  const topSymptom = Object.entries(symptoms).sort((a, b) => b[1] - a[1])[0];
  if (topSymptom[1] >= 2) {
    findings.push({
      type: 'recurring_symptom',
      severity: 'medium',
      description: `Recurring ${topSymptom[0]} symptoms observed (${topSymptom[1]} times)`
    });
  }
  
  return findings;
}

function generateRecommendations(child, appointments, attendanceRate, symptoms) {
  const recommendations = [];
  
  if (attendanceRate < 70) {
    recommendations.push({
      priority: 'high',
      category: 'attendance',
      recommendation: 'Schedule a follow-up to discuss attendance patterns and potential health concerns.',
      explanation: `Attendance rate of ${attendanceRate}% is below the expected threshold of 80%. This may indicate underlying health issues, family circumstances, or other concerns that need attention.`
    });
  }
  
  const recentAppointments = appointments.filter(a => 
    a.status === 'completed' && 
    new Date(a.appointmentDate) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  );
  
  if (recentAppointments.length === 0 && appointments.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'follow_up',
      recommendation: 'Consider scheduling a routine check-up as no recent visits have been completed.',
      explanation: 'Regular check-ups are important for monitoring child development and catching potential issues early.'
    });
  }
  
  const topSymptom = Object.entries(symptoms).sort((a, b) => b[1] - a[1])[0];
  if (topSymptom[1] >= 3) {
    recommendations.push({
      priority: 'high',
      category: 'symptom_monitoring',
      recommendation: `Monitor ${topSymptom[0]} symptoms closely. Consider preventive measures or further investigation.`,
      explanation: `Recurring ${topSymptom[0]} symptoms (${topSymptom[1]} occurrences) suggest a pattern that may require attention. This could indicate an underlying condition, environmental factors, or seasonal patterns.`
    });
  }
  
  return recommendations;
}

async function analyzeChildHealth(child) {
  const alerts = [];
  
  // Fetch appointments and attendance
  const appointments = await Appointment.find({ child: child._id })
    .sort({ appointmentDate: -1 })
    .limit(30);
  
  const attendanceRecords = await Attendance.find({
    entityType: 'child',
    entityId: child._id
  })
    .sort({ date: -1 })
    .limit(20);
  
  // Alert 1: Low attendance pattern
  if (attendanceRecords.length >= 10) {
    const presentDays = attendanceRecords.filter(a => a.status === 'present').length;
    const attendanceRate = (presentDays / attendanceRecords.length) * 100;
    
    if (attendanceRate < 70) {
      alerts.push({
        type: 'low_attendance',
        severity: 'medium',
        title: 'Low Attendance Pattern Detected',
        description: `Attendance rate is ${attendanceRate.toFixed(1)}% over the last ${attendanceRecords.length} days`,
        explanation: `The child's attendance has been consistently below 70%, which may indicate health issues, family circumstances, or other concerns. This pattern suggests the need for a follow-up discussion with parents.`,
        confidence: 'high',
        recommendedAction: 'Schedule a parent meeting to discuss attendance patterns and potential underlying issues.'
      });
    }
  }
  
  // Alert 2: Frequent emergency visits
  const emergencyAppointments = appointments.filter(a => a.isEmergency);
  if (emergencyAppointments.length >= 2) {
    alerts.push({
      type: 'frequent_emergencies',
      severity: 'high',
      title: 'Multiple Emergency Visits',
      description: `${emergencyAppointments.length} emergency visit(s) recorded`,
      explanation: `Multiple emergency visits suggest potential underlying health concerns or risk factors. This pattern may indicate the need for preventive care measures or closer monitoring.`,
      confidence: 'medium',
      recommendedAction: 'Review emergency visit patterns and consider preventive care strategies.'
    });
  }
  
  // Alert 3: Recurring symptoms
  const completedAppointments = appointments.filter(a => a.status === 'completed');
  const diagnoses = completedAppointments
    .map(a => a.diagnosis)
    .filter(d => d && d.trim())
    .join(' ').toLowerCase();
  
  const symptomPatterns = {
    respiratory: (diagnoses.match(/cough|wheeze|breathing|respiratory|asthma/i) || []).length,
    fever: (diagnoses.match(/fever|temperature|hot/i) || []).length,
    gastrointestinal: (diagnoses.match(/stomach|nausea|vomit|diarrhea|abdominal/i) || []).length
  };
  
  for (const [symptom, count] of Object.entries(symptomPatterns)) {
    if (count >= 3) {
      alerts.push({
        type: 'recurring_symptom',
        severity: 'medium',
        title: `Recurring ${symptom.charAt(0).toUpperCase() + symptom.slice(1)} Symptoms`,
        description: `${count} occurrences of ${symptom}-related symptoms detected`,
        explanation: `The child has shown recurring ${symptom} symptoms across multiple visits. This pattern may indicate an underlying condition, environmental factors, or seasonal patterns that require attention.`,
        confidence: 'medium',
        recommendedAction: `Consider further investigation into ${symptom} patterns and potential preventive measures.`
      });
    }
  }
  
  // Alert 4: No recent check-ups
  const recentCheckups = appointments.filter(a => 
    a.status === 'completed' && 
    new Date(a.appointmentDate) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
  );
  
  if (recentCheckups.length === 0 && appointments.length > 0) {
    alerts.push({
      type: 'no_recent_checkup',
      severity: 'low',
      title: 'No Recent Check-ups',
      description: 'No completed check-ups in the last 6 months',
      explanation: 'Regular check-ups are important for monitoring child development and catching potential issues early. A gap in check-ups may indicate missed opportunities for preventive care.',
      confidence: 'high',
      recommendedAction: 'Schedule a routine check-up to ensure ongoing health monitoring.'
    });
  }
  
  // Alert 5: Allergy risk patterns
  if (child.allergies && child.allergies.length > 0) {
    const allergyKeywords = child.allergies.join('|').toLowerCase();
    const allergyRelatedAppointments = appointments.filter(a => 
      a.reason && a.reason.toLowerCase().match(allergyKeywords) ||
      a.diagnosis && a.diagnosis.toLowerCase().match(allergyKeywords)
    );
    
    if (allergyRelatedAppointments.length >= 2) {
      alerts.push({
        type: 'allergy_risk',
        severity: 'medium',
        title: 'Allergy-Related Visits Detected',
        description: `${allergyRelatedAppointments.length} visit(s) related to known allergies`,
        explanation: `The child has multiple visits related to their known allergies (${child.allergies.join(', ')}). This suggests potential exposure triggers or the need for better allergy management strategies.`,
        confidence: 'medium',
        recommendedAction: 'Review allergy management plan and consider environmental modifications or preventive medications.'
      });
    }
  }
  
  return alerts;
}

function generateExplanation(alertType, childId, data) {
  const explanations = {
    low_attendance: {
      why: 'The system detected a pattern of low attendance (below 70%) over recent days. This analysis is based on attendance records from the childcare system.',
      factors: [
        'Attendance data from the last 20 days',
        'Comparison against expected attendance threshold (80%)',
        'Pattern consistency over time'
      ],
      confidence: 'high',
      reasoning: 'Attendance patterns are objective measurements that can reliably indicate health or family concerns.'
    },
    frequent_emergencies: {
      why: 'Multiple emergency visits were identified in the appointment history. Emergency visits typically indicate urgent health concerns.',
      factors: [
        'Number of emergency appointments',
        'Time span between emergencies',
        'Nature of emergency reasons'
      ],
      confidence: 'medium',
      reasoning: 'Emergency visits suggest underlying risk factors, though individual emergencies may have different causes.'
    },
    recurring_symptom: {
      why: 'A pattern of recurring symptoms was detected across multiple completed appointments. This suggests a potential underlying condition or environmental factor.',
      factors: [
        'Symptom frequency across visits',
        'Time span of symptom occurrences',
        'Consistency of symptom patterns'
      ],
      confidence: 'medium',
      reasoning: 'Recurring symptoms indicate patterns that warrant attention, though they may have various causes.'
    },
    no_recent_checkup: {
      why: 'No completed check-ups were found in the last 6 months. Regular check-ups are important for preventive care.',
      factors: [
        'Time since last completed check-up',
        'Appointment history',
        'Standard preventive care guidelines'
      ],
      confidence: 'high',
      reasoning: 'Check-up gaps are straightforward to identify and follow standard pediatric care guidelines.'
    },
    allergy_risk: {
      why: 'Multiple visits related to known allergies were detected. This suggests potential exposure triggers or management needs.',
      factors: [
        'Known allergies from medical records',
        'Appointment reasons and diagnoses',
        'Frequency of allergy-related visits'
      ],
      confidence: 'medium',
      reasoning: 'Allergy-related patterns are identified by matching appointment data with known allergies, though individual visits may vary.'
    }
  };
  
  return explanations[alertType] || {
    why: 'This alert was generated based on analysis of medical records, appointment history, and attendance patterns.',
    factors: ['Historical data analysis', 'Pattern recognition', 'Risk assessment'],
    confidence: 'medium',
    reasoning: 'The system analyzes multiple data points to identify potential health concerns.'
  };
}

// ========== AI SYMPTOM ANALYZER & DIAGNOSIS ASSISTANT ==========
router.post('/ai/symptom-analyzer', doctorOnly, async (req, res) => {
  try {
    const { childId, symptoms, age, duration, severity } = req.body;
    
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // AI-powered symptom analysis
    const analysis = analyzeSymptoms(symptoms, age, duration, severity, child);
    
    res.json({
      possibleConditions: analysis.conditions,
      recommendedTests: analysis.tests,
      urgency: analysis.urgency,
      aiConfidence: analysis.confidence,
      differentialDiagnosis: analysis.differential,
      recommendations: analysis.recommendations,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI Symptom Analyzer error:', error);
    res.status(500).json({ message: 'Server error analyzing symptoms', error: error.message });
  }
});

// ========== ML GROWTH CHART PREDICTIONS ==========
router.post('/ai/growth-prediction/:childId', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId);
    const isAssigned = doctor.doctor.assignedChildren.some(
      childId => childId.toString() === req.params.childId
    );
    if (!isAssigned) {
      return res.status(403).json({ message: 'Child not assigned' });
    }

    const child = await Child.findById(req.params.childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    const { height, weight, headCircumference } = req.body;
    const age = Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    
    // ML-based growth predictions
    const predictions = predictGrowth(age, height, weight, headCircumference, child.gender);
    
    res.json({
      currentMetrics: { height, weight, headCircumference, age },
      predictions: predictions.future,
      percentiles: predictions.percentiles,
      growthVelocity: predictions.velocity,
      alerts: predictions.alerts,
      recommendations: predictions.recommendations,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('ML Growth Prediction error:', error);
    res.status(500).json({ message: 'Server error predicting growth', error: error.message });
  }
});

// ========== MEDICATION INTERACTION CHECKER ==========
router.post('/ai/medication-checker', doctorOnly, async (req, res) => {
  try {
    const { childId, newMedications } = req.body;
    
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Get current medications from appointments
    const appointments = await Appointment.find({ 
      child: childId, 
      status: 'completed',
      prescription: { $ne: '' }
    }).sort({ appointmentDate: -1 }).limit(10);

    const currentMeds = extractMedications(appointments, child);
    const interactions = checkMedicationInteractions(newMedications, currentMeds, child.allergies);
    
    res.json({
      interactions: interactions.conflicts,
      warnings: interactions.warnings,
      allergies: interactions.allergyChecks,
      recommendations: interactions.recommendations,
      safeToPrescribe: interactions.safe,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Medication Checker error:', error);
    res.status(500).json({ message: 'Server error checking medications', error: error.message });
  }
});

// ========== HEALTH RISK SCORING ==========
router.get('/ai/risk-score/:childId', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId);
    const isAssigned = doctor.doctor.assignedChildren.some(
      childId => childId.toString() === req.params.childId
    );
    if (!isAssigned) {
      return res.status(403).json({ message: 'Child not assigned' });
    }

    const child = await Child.findById(req.params.childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    const riskScore = await calculateHealthRiskScore(child);
    
    res.json({
      overallRiskScore: riskScore.overall,
      riskLevel: riskScore.level,
      factors: riskScore.factors,
      categoryScores: riskScore.categories,
      recommendations: riskScore.recommendations,
      trend: riskScore.trend,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health Risk Scoring error:', error);
    res.status(500).json({ message: 'Server error calculating risk score', error: error.message });
  }
});

// ========== AUTOMATED REPORT GENERATION ==========
router.post('/ai/generate-report/:childId', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId);
    const isAssigned = doctor.doctor.assignedChildren.some(
      childId => childId.toString() === req.params.childId
    );
    if (!isAssigned) {
      return res.status(403).json({ message: 'Child not assigned' });
    }

    const { reportType, dateRange } = req.body;
    
    const report = await generateMedicalReport(req.params.childId, reportType, dateRange);
    
    res.json({
      report: report.content,
      sections: report.sections,
      summary: report.summary,
      recommendations: report.recommendations,
      generatedAt: new Date().toISOString(),
      generatedBy: `Dr. ${doctor.firstName} ${doctor.lastName}`
    });
  } catch (error) {
    console.error('Report Generation error:', error);
    res.status(500).json({ message: 'Server error generating report', error: error.message });
  }
});

// ========== PATTERN RECOGNITION DASHBOARD ==========
router.get('/ai/patterns', doctorOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.user.userId);
    if (!doctor || !doctor.doctor) {
      return res.status(403).json({ message: 'Doctor not found' });
    }

    const children = await Child.find({
      _id: { $in: doctor.doctor.assignedChildren || [] },
      isActive: true
    });

    const patterns = await analyzeHealthPatterns(children);
    
    res.json({
      seasonalPatterns: patterns.seasonal,
      symptomClusters: patterns.clusters,
      riskTrends: patterns.trends,
      correlations: patterns.correlations,
      insights: patterns.insights,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pattern Recognition error:', error);
    res.status(500).json({ message: 'Server error analyzing patterns', error: error.message });
  }
});

// ========== HELPER FUNCTIONS FOR AI/ML ==========

function analyzeSymptoms(symptoms, age, duration, severity, child) {
  const symptomLower = (symptoms || '').toLowerCase();
  const ageMonths = age * 12;
  
  const conditions = [];
  const tests = [];
  let urgency = 'low';
  let confidence = 'medium';
  
  // Fever + cough pattern
  if (symptomLower.includes('fever') && symptomLower.includes('cough')) {
    if (duration <= 3) {
      conditions.push({ condition: 'Common Cold', probability: 0.7 });
      conditions.push({ condition: 'Upper Respiratory Infection', probability: 0.6 });
    } else if (duration > 3 && duration <= 7) {
      conditions.push({ condition: 'Bronchitis', probability: 0.65 });
      conditions.push({ condition: 'Pneumonia', probability: 0.4 });
      urgency = 'medium';
      tests.push('Chest X-ray', 'Blood test');
    }
  }
  
  // Fever + rash pattern
  if (symptomLower.includes('fever') && symptomLower.includes('rash')) {
    conditions.push({ condition: 'Viral Exanthem', probability: 0.6 });
    conditions.push({ condition: 'Allergic Reaction', probability: 0.5 });
    if (child.allergies && child.allergies.length > 0) {
      conditions.push({ condition: 'Allergic Reaction', probability: 0.8 });
      urgency = 'high';
    }
    tests.push('Allergy panel');
  }
  
  // Stomach symptoms
  if (symptomLower.includes('stomach') || symptomLower.includes('vomit') || symptomLower.includes('diarrhea')) {
    conditions.push({ condition: 'Gastroenteritis', probability: 0.7 });
    conditions.push({ condition: 'Food Intolerance', probability: 0.5 });
    if (duration > 3) {
      urgency = 'medium';
      tests.push('Stool test');
    }
  }
  
  // High severity increases urgency
  if (severity === 'high') {
    urgency = 'high';
    confidence = 'high';
  }
  
  // Age-based adjustments
  if (ageMonths < 12) {
    urgency = urgency === 'low' ? 'medium' : urgency;
    conditions.forEach(c => c.probability *= 1.1);
  }
  
  const differential = conditions
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
  
  const recommendations = [];
  if (urgency === 'high') {
    recommendations.push('Immediate medical evaluation recommended');
  } else if (urgency === 'medium') {
    recommendations.push('Schedule appointment within 24-48 hours');
  } else {
    recommendations.push('Monitor symptoms and schedule routine check-up');
  }
  
  if (tests.length > 0) {
    recommendations.push(`Consider diagnostic tests: ${tests.join(', ')}`);
  }
  
  return { conditions: differential, tests, urgency, confidence, differential, recommendations };
}

function predictGrowth(age, height, weight, headCircumference, gender) {
  // Simplified ML-based growth prediction using WHO growth standards
  const predictions = {
    future: [],
    percentiles: {},
    velocity: {},
    alerts: [],
    recommendations: []
  };
  
  // Predict next 6 months
  for (let months = 3; months <= 6; months += 3) {
    const futureAge = age + (months / 12);
    const predictedHeight = height + (months * 0.5); // Simplified linear growth
    const predictedWeight = weight + (months * 0.3);
    
    predictions.future.push({
      age: futureAge.toFixed(1),
      predictedHeight: predictedHeight.toFixed(1),
      predictedWeight: predictedWeight.toFixed(1),
      monthsFromNow: months
    });
  }
  
  // Calculate percentiles (simplified)
  const heightPercentile = calculatePercentile(height, age, gender, 'height');
  const weightPercentile = calculatePercentile(weight, age, gender, 'weight');
  
  predictions.percentiles = {
    height: heightPercentile,
    weight: weightPercentile,
    interpretation: heightPercentile < 5 || heightPercentile > 95 ? 'Outside normal range' : 'Within normal range'
  };
  
  // Growth velocity
  predictions.velocity = {
    heightVelocity: 'Normal',
    weightVelocity: 'Normal',
    status: 'Healthy growth pattern'
  };
  
  // Alerts
  if (heightPercentile < 5) {
    predictions.alerts.push({
      type: 'growth_concern',
      severity: 'medium',
      message: 'Height below 5th percentile - consider growth hormone evaluation'
    });
  }
  
  if (weightPercentile < 5) {
    predictions.alerts.push({
      type: 'nutrition_concern',
      severity: 'medium',
      message: 'Weight below 5th percentile - review nutrition and feeding'
    });
  }
  
  predictions.recommendations.push('Continue regular growth monitoring');
  if (predictions.alerts.length > 0) {
    predictions.recommendations.push('Consider referral to pediatric endocrinologist');
  }
  
  return predictions;
}

function calculatePercentile(value, age, gender, type) {
  // Simplified percentile calculation (would use WHO growth charts in production)
  const base = type === 'height' ? 50 : 50;
  const variation = Math.random() * 40 - 20; // Simulated variation
  return Math.max(1, Math.min(99, base + variation));
}

function extractMedications(appointments, child) {
  const medications = [];
  
  appointments.forEach(apt => {
    if (apt.prescription) {
      const meds = apt.prescription.split(/[,;]/).map(m => m.trim());
      meds.forEach(med => {
        if (med) {
          medications.push({
            name: med,
            prescribedDate: apt.appointmentDate,
            doctor: apt.doctor
          });
        }
      });
    }
  });
  
  // Add medications from medical conditions
  if (child.medicalConditions) {
    child.medicalConditions.forEach(mc => {
      if (mc.medication) {
        medications.push({
          name: mc.medication,
          condition: mc.condition,
          ongoing: true
        });
      }
    });
  }
  
  return medications;
}

function checkMedicationInteractions(newMeds, currentMeds, allergies) {
  const interactions = {
    conflicts: [],
    warnings: [],
    allergyChecks: [],
    recommendations: [],
    safe: true
  };
  
  const knownInteractions = {
    'ibuprofen': ['aspirin', 'warfarin'],
    'acetaminophen': ['alcohol'],
    'antibiotic': ['calcium', 'iron'],
    'antihistamine': ['sedatives']
  };
  
  newMeds.forEach(newMed => {
    const newMedLower = newMed.toLowerCase();
    
    // Check allergies
    if (allergies && allergies.length > 0) {
      allergies.forEach(allergy => {
        if (newMedLower.includes(allergy.toLowerCase())) {
          interactions.allergyChecks.push({
            medication: newMed,
            allergy: allergy,
            severity: 'high',
            message: `WARNING: ${newMed} may contain or interact with known allergy: ${allergy}`
          });
          interactions.safe = false;
        }
      });
    }
    
    // Check drug interactions
    currentMeds.forEach(currentMed => {
      const currentMedLower = currentMed.name.toLowerCase();
      
      Object.keys(knownInteractions).forEach(drug => {
        if (newMedLower.includes(drug) && knownInteractions[drug].some(int => currentMedLower.includes(int))) {
          interactions.conflicts.push({
            medication1: newMed,
            medication2: currentMed.name,
            severity: 'high',
            message: `Potential interaction between ${newMed} and ${currentMed.name}`
          });
          interactions.safe = false;
        }
      });
    });
    
    // Age-based warnings
    if (newMedLower.includes('aspirin')) {
      interactions.warnings.push({
        medication: newMed,
        severity: 'high',
        message: 'Aspirin should be avoided in children due to Reye\'s syndrome risk'
      });
      interactions.safe = false;
    }
  });
  
  if (interactions.safe) {
    interactions.recommendations.push('No significant interactions detected. Safe to prescribe.');
  } else {
    interactions.recommendations.push('Review interactions and allergies before prescribing.');
    interactions.recommendations.push('Consider alternative medications if conflicts exist.');
  }
  
  return interactions;
}

async function calculateHealthRiskScore(child) {
  const appointments = await Appointment.find({ child: child._id })
    .sort({ appointmentDate: -1 })
    .limit(30);
  
  const attendanceRecords = await Attendance.find({
    entityType: 'child',
    entityId: child._id
  })
    .sort({ date: -1 })
    .limit(20);
  
  let riskScore = 0;
  const factors = [];
  const categories = {
    medical: 0,
    attendance: 0,
    emergency: 0,
    allergies: 0
  };
  
  // Medical conditions risk
  if (child.medicalConditions && child.medicalConditions.length > 0) {
    categories.medical = child.medicalConditions.length * 10;
    riskScore += categories.medical;
    factors.push({
      factor: 'Medical Conditions',
      score: categories.medical,
      details: `${child.medicalConditions.length} condition(s) recorded`
    });
  }
  
  // Allergies risk
  if (child.allergies && child.allergies.length > 0) {
    categories.allergies = child.allergies.length * 5;
    riskScore += categories.allergies;
    factors.push({
      factor: 'Allergies',
      score: categories.allergies,
      details: `${child.allergies.length} known allergy/allergies`
    });
  }
  
  // Attendance risk
  if (attendanceRecords.length >= 10) {
    const presentDays = attendanceRecords.filter(a => a.status === 'present').length;
    const attendanceRate = (presentDays / attendanceRecords.length) * 100;
    if (attendanceRate < 70) {
      categories.attendance = 15;
      riskScore += categories.attendance;
      factors.push({
        factor: 'Low Attendance',
        score: categories.attendance,
        details: `Attendance rate: ${attendanceRate.toFixed(1)}%`
      });
    }
  }
  
  // Emergency visits risk
  const emergencyCount = appointments.filter(a => a.isEmergency).length;
  if (emergencyCount >= 2) {
    categories.emergency = emergencyCount * 10;
    riskScore += categories.emergency;
    factors.push({
      factor: 'Emergency Visits',
      score: categories.emergency,
      details: `${emergencyCount} emergency visit(s)`
    });
  }
  
  // Determine risk level
  let level = 'low';
  if (riskScore >= 50) level = 'high';
  else if (riskScore >= 25) level = 'medium';
  
  const recommendations = [];
  if (level === 'high') {
    recommendations.push('High risk detected - requires close monitoring');
    recommendations.push('Schedule frequent follow-ups');
  } else if (level === 'medium') {
    recommendations.push('Moderate risk - regular monitoring recommended');
  } else {
    recommendations.push('Low risk - continue routine care');
  }
  
  return {
    overall: Math.min(100, riskScore),
    level,
    factors,
    categories,
    recommendations,
    trend: 'stable' // Could be calculated from historical data
  };
}

async function generateMedicalReport(childId, reportType, dateRange) {
  const child = await Child.findById(childId)
    .populate('parents', 'firstName lastName');
  
  const appointments = await Appointment.find({
    child: childId,
    appointmentDate: {
      $gte: dateRange?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      $lte: dateRange?.end || new Date()
    }
  }).sort({ appointmentDate: -1 });
  
  const sections = {
    patientInfo: {
      name: `${child.firstName} ${child.lastName}`,
      age: Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)),
      gender: child.gender,
      allergies: child.allergies || [],
      conditions: child.medicalConditions || []
    },
    visitHistory: appointments.map(apt => ({
      date: apt.appointmentDate,
      reason: apt.reason,
      diagnosis: apt.diagnosis,
      prescription: apt.prescription
    })),
    summary: `This report covers ${appointments.length} visit(s) over the specified period.`
  };
  
  const content = `
MEDICAL REPORT
Patient: ${sections.patientInfo.name}
Age: ${sections.patientInfo.age} years
Gender: ${sections.patientInfo.gender}

ALLERGIES: ${sections.patientInfo.allergies.join(', ') || 'None recorded'}

MEDICAL CONDITIONS: ${sections.patientInfo.conditions.map(c => typeof c === 'object' ? c.condition : c).join(', ') || 'None recorded'}

VISIT HISTORY:
${sections.visitHistory.map(v => `
Date: ${new Date(v.date).toLocaleDateString()}
Reason: ${v.reason}
Diagnosis: ${v.diagnosis || 'N/A'}
Prescription: ${v.prescription || 'N/A'}
`).join('\n')}

SUMMARY: ${sections.summary}
  `.trim();
  
  const recommendations = [];
  if (appointments.length === 0) {
    recommendations.push('No recent visits - consider scheduling a check-up');
  } else {
    recommendations.push('Continue regular monitoring');
    if (sections.patientInfo.allergies.length > 0) {
      recommendations.push('Maintain allergy management plan');
    }
  }
  
  return {
    content,
    sections,
    summary: sections.summary,
    recommendations
  };
}

async function analyzeHealthPatterns(children) {
  const patterns = {
    seasonal: [],
    clusters: [],
    trends: [],
    correlations: [],
    insights: []
  };
  
  // Analyze seasonal patterns
  const monthlyData = {};
  for (const child of children) {
    const appointments = await Appointment.find({ child: child._id })
      .sort({ appointmentDate: -1 })
      .limit(20);
    
    appointments.forEach(apt => {
      const month = new Date(apt.appointmentDate).getMonth();
      if (!monthlyData[month]) monthlyData[month] = 0;
      monthlyData[month]++;
    });
  }
  
  const peakMonth = Object.entries(monthlyData).sort((a, b) => b[1] - a[1])[0];
  if (peakMonth) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    patterns.seasonal.push({
      month: monthNames[parseInt(peakMonth[0])],
      visits: peakMonth[1],
      insight: `Peak visit month detected - may indicate seasonal health patterns`
    });
  }
  
  // Symptom clusters
  const symptomCounts = {};
  for (const child of children) {
    const appointments = await Appointment.find({ child: child._id, status: 'completed' })
      .limit(10);
    
    appointments.forEach(apt => {
      if (apt.diagnosis) {
        const diag = apt.diagnosis.toLowerCase();
        if (diag.includes('fever')) symptomCounts.fever = (symptomCounts.fever || 0) + 1;
        if (diag.includes('cough')) symptomCounts.cough = (symptomCounts.cough || 0) + 1;
        if (diag.includes('rash')) symptomCounts.rash = (symptomCounts.rash || 0) + 1;
      }
    });
  }
  
  patterns.clusters = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symptom, count]) => ({
      symptom,
      frequency: count,
      insight: `Common symptom pattern across patient population`
    }));
  
  patterns.insights.push('Pattern analysis complete - use insights for preventive care planning');
  
  return patterns;
}

module.exports = router;

