const express = require('express');
const router = express.Router();
const AfterSchoolProgram = require('../models/AfterSchoolProgram');
const Child = require('../models/Child');
const User = require('../models/User');
const auth = require('../middleware/auth');

// ============================================
// ADMIN ROUTES - Creating and Managing Programs
// ============================================

// @route   GET /api/afterschool/programs
// @desc    Get all after school programs (with filters)
// @access  Public (parents view active programs)
router.get('/programs', auth, async (req, res) => {
  try {
    const { status, programType, ageGroup } = req.query;
    
    const filter = {};
    
    // Admin/Staff can see all, Parents only see active programs
    if (req.user.role === 'parent') {
      filter.status = 'active';
    } else if (status) {
      filter.status = status;
    }
    
    if (programType) filter.programType = programType;
    
    const programs = await AfterSchoolProgram.find(filter)
      .populate('enrolledChildren', 'firstName lastName dateOfBirth program')
      .populate('assignedStaff', 'firstName lastName email role')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    // Filter by age group if specified
    let filteredPrograms = programs;
    if (ageGroup) {
      const age = parseInt(ageGroup);
      filteredPrograms = programs.filter(p => age >= p.ageGroup.min && age <= p.ageGroup.max);
    }
    
    res.json(filteredPrograms);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/afterschool/programs/:id
// @desc    Get single program details
// @access  Private
router.get('/programs/:id', auth, async (req, res) => {
  try {
    const program = await AfterSchoolProgram.findById(req.params.id)
      .populate('enrolledChildren', 'firstName lastName dateOfBirth program parents')
      .populate('assignedStaff', 'firstName lastName email phone role')
      .populate('createdBy', 'firstName lastName')
      .populate('sessions.conductedBy', 'firstName lastName')
      .populate('sessions.attendees.child', 'firstName lastName')
      .populate('announcements.postedBy', 'firstName lastName');
    
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    
    res.json(program);
  } catch (error) {
    console.error('Error fetching program:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/afterschool/programs
// @desc    Create new after school program (ADMIN ONLY)
// @access  Admin
router.post('/programs', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create programs' });
    }
    
    const {
      programName,
      programType,
      description,
      ageGroup,
      schedule,
      fees,
      capacity,
      assignedStaff,
      startDate,
      endDate,
      location,
      requirements,
      maxAbsences
    } = req.body;
    
    // Validation
    if (!programName || !programType || !description || !ageGroup || !schedule || !fees || !capacity || !startDate || !location) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Calculate duration
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    const program = new AfterSchoolProgram({
      programName,
      programType,
      description,
      ageGroup,
      schedule: {
        ...schedule,
        duration
      },
      fees,
      capacity,
      assignedStaff: assignedStaff || [],
      startDate,
      endDate,
      location,
      requirements,
      maxAbsences: maxAbsences || 3,
      createdBy: req.user.userId,
      status: 'pending' // Admin can approve later
    });
    
    await program.save();
    await program.populate('assignedStaff', 'firstName lastName email');
    
    res.status(201).json({ message: 'Program created successfully', program });
  } catch (error) {
    console.error('Error creating program:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/afterschool/programs/:id
// @desc    Update program details (ADMIN ONLY)
// @access  Admin
router.put('/programs/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update programs' });
    }
    
    const program = await AfterSchoolProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    
    // Update fields
    const allowedUpdates = [
      'programName', 'programType', 'description', 'ageGroup', 'schedule',
      'fees', 'capacity', 'assignedStaff', 'startDate', 'endDate',
      'location', 'requirements', 'maxAbsences', 'status'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        program[field] = req.body[field];
      }
    });
    
    // Recalculate duration if schedule changed
    if (req.body.schedule) {
      const [startHour, startMin] = program.schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = program.schedule.endTime.split(':').map(Number);
      program.schedule.duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    }
    
    await program.save();
    await program.populate('assignedStaff', 'firstName lastName email');
    await program.populate('enrolledChildren', 'firstName lastName');
    
    res.json({ message: 'Program updated successfully', program });
  } catch (error) {
    console.error('Error updating program:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/afterschool/programs/:id/status
// @desc    Approve/disable program (ADMIN ONLY)
// @access  Admin
router.put('/programs/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can change program status' });
    }
    
    const { status } = req.body;
    
    if (!['active', 'inactive', 'pending', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const program = await AfterSchoolProgram.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('assignedStaff', 'firstName lastName');
    
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    
    res.json({ message: `Program ${status} successfully`, program });
  } catch (error) {
    console.error('Error updating program status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/afterschool/programs/:id
// @desc    Delete program (ADMIN ONLY)
// @access  Admin
router.delete('/programs/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete programs' });
    }
    
    const program = await AfterSchoolProgram.findByIdAndDelete(req.params.id);
    
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    
    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    console.error('Error deleting program:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================
// STAFF ROUTES - Conducting Programs
// ============================================

// @route   GET /api/afterschool/my-programs
// @desc    Get programs assigned to staff
// @access  Staff
router.get('/my-programs', auth, async (req, res) => {
  try {
    if (!['teacher', 'staff', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const programs = await AfterSchoolProgram.find({
      assignedStaff: req.user.userId,
      status: 'active'
    })
      .populate('enrolledChildren', 'firstName lastName dateOfBirth program')
      .sort({ 'schedule.startTime': 1 });
    
    res.json(programs);
  } catch (error) {
    console.error('Error fetching staff programs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/afterschool/programs/:id/session
// @desc    Record a session (attendance, activities) - STAFF
// @access  Staff assigned to program
router.post('/programs/:id/session', auth, async (req, res) => {
  try {
    const program = await AfterSchoolProgram.findById(req.params.id);
    
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    
    // Check if user is assigned staff or admin
    const isAssigned = program.assignedStaff.some(
      staff => staff.toString() === req.user.userId
    );
    
    if (!isAssigned && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not assigned to this program' });
    }
    
    const { date, attendees, activities, feedback } = req.body;
    
    if (!date || !attendees || !activities) {
      return res.status(400).json({ message: 'Please provide date, attendees, and activities' });
    }
    
    const session = {
      date: new Date(date),
      attendees,
      activities,
      conductedBy: req.user.userId,
      feedback: feedback || ''
    };
    
    program.sessions.push(session);
    await program.save();
    
    await program.populate('sessions.conductedBy', 'firstName lastName');
    
    res.status(201).json({ 
      message: 'Session recorded successfully', 
      session: program.sessions[program.sessions.length - 1]
    });
  } catch (error) {
    console.error('Error recording session:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/afterschool/programs/:id/announcement
// @desc    Post announcement for program - STAFF
// @access  Staff assigned to program
router.post('/programs/:id/announcement', auth, async (req, res) => {
  try {
    const program = await AfterSchoolProgram.findById(req.params.id);
    
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    
    const isAssigned = program.assignedStaff.some(
      staff => staff.toString() === req.user.userId
    );
    
    if (!isAssigned && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not assigned to this program' });
    }
    
    const { title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ message: 'Please provide title and message' });
    }
    
    const announcement = {
      title,
      message,
      date: new Date(),
      postedBy: req.user.userId
    };
    
    program.announcements.push(announcement);
    await program.save();
    
    await program.populate('announcements.postedBy', 'firstName lastName');
    
    res.status(201).json({ 
      message: 'Announcement posted successfully',
      announcement: program.announcements[program.announcements.length - 1]
    });
  } catch (error) {
    console.error('Error posting announcement:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================
// PARENT ROUTES - Enrollment
// ============================================

// @route   POST /api/afterschool/programs/:id/enroll
// @desc    Enroll child in program (PARENT)
// @access  Parent
router.post('/programs/:id/enroll', auth, async (req, res) => {
  try {
    const { childId } = req.body;
    
    if (!childId) {
      return res.status(400).json({ message: 'Please provide child ID' });
    }
    
    // Verify child belongs to parent
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }
    
    const isParent = child.parents.some(p => p.toString() === req.user.userId);
    if (!isParent && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to enroll this child' });
    }
    
    const program = await AfterSchoolProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    
    if (program.status !== 'active') {
      return res.status(400).json({ message: 'Program is not active' });
    }
    
    if (program.isFull()) {
      return res.status(400).json({ message: 'Program is full' });
    }
    
    // Check age eligibility
    const childAge = Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
    if (childAge < program.ageGroup.min || childAge > program.ageGroup.max) {
      return res.status(400).json({ 
        message: `Child age (${childAge}) is not within program age range (${program.ageGroup.min}-${program.ageGroup.max} years)`
      });
    }
    
    // Check if already enrolled
    if (program.enrolledChildren.includes(childId)) {
      return res.status(400).json({ message: 'Child is already enrolled in this program' });
    }
    
    await program.enrollChild(childId);
    await program.populate('enrolledChildren', 'firstName lastName');
    
    res.json({ message: 'Child enrolled successfully', program });
  } catch (error) {
    console.error('Error enrolling child:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/afterschool/programs/:id/unenroll
// @desc    Unenroll child from program (PARENT)
// @access  Parent
router.post('/programs/:id/unenroll', auth, async (req, res) => {
  try {
    const { childId } = req.body;
    
    if (!childId) {
      return res.status(400).json({ message: 'Please provide child ID' });
    }
    
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }
    
    const isParent = child.parents.some(p => p.toString() === req.user.userId);
    if (!isParent && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized' });
    }
    
    const program = await AfterSchoolProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }
    
    await program.unenrollChild(childId);
    
    res.json({ message: 'Child unenrolled successfully', program });
  } catch (error) {
    console.error('Error unenrolling child:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/afterschool/my-enrollments
// @desc    Get programs my children are enrolled in (PARENT)
// @access  Parent
router.get('/my-enrollments', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Find all children of this parent
    const children = await Child.find({ parents: req.user.userId });
    const childIds = children.map(c => c._id);
    
    // Find programs where any of these children are enrolled
    const programs = await AfterSchoolProgram.find({
      enrolledChildren: { $in: childIds },
      status: 'active'
    })
      .populate('enrolledChildren', 'firstName lastName')
      .populate('assignedStaff', 'firstName lastName email phone')
      .sort({ 'schedule.startTime': 1 });
    
    res.json(programs);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/afterschool/stats
// @desc    Get after school program statistics (ADMIN)
// @access  Admin
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const totalPrograms = await AfterSchoolProgram.countDocuments();
    const activePrograms = await AfterSchoolProgram.countDocuments({ status: 'active' });
    const pendingPrograms = await AfterSchoolProgram.countDocuments({ status: 'pending' });
    
    const programs = await AfterSchoolProgram.find();
    const totalEnrollments = programs.reduce((sum, p) => sum + p.enrolledChildren.length, 0);
    const totalCapacity = programs.reduce((sum, p) => sum + p.capacity, 0);
    
    const programsByType = await AfterSchoolProgram.aggregate([
      { $group: { _id: '$programType', count: { $sum: 1 } } }
    ]);
    
    res.json({
      totalPrograms,
      activePrograms,
      pendingPrograms,
      totalEnrollments,
      totalCapacity,
      utilizationRate: totalCapacity > 0 ? ((totalEnrollments / totalCapacity) * 100).toFixed(2) : 0,
      programsByType
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

