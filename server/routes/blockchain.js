const router = require('express').Router();
const BlockchainRecord = require('../models/BlockchainRecord');
const Child = require('../models/Child');
const User = require('../models/User');
const VaccineReminder = require('../models/VaccineReminder');
const auth = require('../middleware/auth');
const multer = require('multer');
const AttendanceBlockchainService = require('../services/attendanceBlockchainService');

// Configure multer for photo uploads (memory storage for hashing)
const photoStorage = multer.memoryStorage();
const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Add vaccination to blockchain (Admin/Staff/Parent)
router.post('/vaccination', auth, async (req, res) => {
  try {
    // Get user
    const user = await User.findById(req.user.userId || req.user._id);
    
    // Get last block to link the chain
    const lastBlock = await BlockchainRecord.findOne().sort({ blockNumber: -1 });
    const nextBlockNumber = await BlockchainRecord.getNextBlockNumber();
    
    // Get child info
    const childId = req.body.childId;
    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }
    
    // If parent, verify they own this child
    if (user.role === 'parent') {
      const isParent = child.parents.some(parentId => parentId.toString() === user._id.toString());
      if (!isParent) {
        return res.status(403).json({ error: 'You can only add vaccinations for your own children' });
      }
    }
    
    // Create new block
    const newBlock = new BlockchainRecord({
      blockNumber: nextBlockNumber,
      dataType: 'vaccination',
      data: {
        childId: childId,
        childName: child.name,
        vaccine: req.body.vaccine,
        vaccineName: req.body.vaccineName || req.body.vaccine,
        date: req.body.date || new Date(),
        batchNumber: req.body.batchNumber,
        provider: req.body.provider,
        location: req.body.location,
        nextDoseDate: req.body.nextDoseDate,
        administeredBy: req.body.administeredBy || user.name,
        status: 'completed',
        notes: req.body.notes
      },
      previousHash: lastBlock ? lastBlock.hash : '0',
      createdBy: req.user.userId || req.user._id
    });
    
    await newBlock.save(); // Hash auto-calculated by pre-save hook!
    
    res.json({ 
      success: true, 
      message: 'Vaccination added to blockchain',
      blockNumber: newBlock.blockNumber,
      hash: newBlock.hash,
      data: newBlock
    });
  } catch (error) {
    console.error('Error adding vaccination:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get child's vaccination history from blockchain
router.get('/vaccination/:childId', auth, async (req, res) => {
  try {
    const records = await BlockchainRecord.find({
      dataType: 'vaccination',
      'data.childId': req.params.childId
    }).sort({ blockNumber: 1 }).populate('createdBy', 'name email');
    
    res.json({ 
      success: true,
      count: records.length,
      vaccinations: records.map(r => ({
        id: r._id,
        vaccine: r.data.vaccine || r.data.vaccineName,
        vaccineName: r.data.vaccineName,
        date: r.data.date,
        provider: r.data.provider,
        location: r.data.location,
        nextDoseDate: r.data.nextDoseDate,
        administeredBy: r.data.administeredBy,
        batchNumber: r.data.batchNumber,
        status: r.data.status,
        notes: r.data.notes,
        blockNumber: r.blockNumber,
        hash: r.hash,
        timestamp: r.timestamp,
        createdBy: r.createdBy
      }))
    });
  } catch (error) {
    console.error('Error fetching vaccinations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all vaccinations (Admin only)
router.get('/vaccination', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user._id);
    if (user.role !== 'admin' && user.role !== 'staff') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const records = await BlockchainRecord.find({
      dataType: 'vaccination'
    }).sort({ blockNumber: -1 }).populate('data.childId', 'name').populate('createdBy', 'name');
    
    res.json({ 
      success: true,
      count: records.length,
      vaccinations: records
    });
  } catch (error) {
    console.error('Error fetching all vaccinations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get overdue vaccinations (Admin only)
router.get('/vaccination/overdue/all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user._id);
    if (user.role !== 'admin' && user.role !== 'staff') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find records with nextDoseDate in the past
    const overdueRecords = await BlockchainRecord.find({
      dataType: 'vaccination',
      'data.nextDoseDate': { $lt: today }
    }).sort({ 'data.nextDoseDate': 1 }).populate('data.childId', 'name parentId');
    
    const overdueList = overdueRecords.map(r => {
      const daysOverdue = Math.floor((today - new Date(r.data.nextDoseDate)) / (1000 * 60 * 60 * 24));
      return {
        id: r._id,
        childId: r.data.childId?._id,
        childName: r.data.childName,
        vaccine: r.data.vaccine || r.data.vaccineName,
        nextDoseDate: r.data.nextDoseDate,
        daysOverdue,
        parentId: r.data.childId?.parentId,
        blockNumber: r.blockNumber
      };
    });
    
    res.json({ 
      success: true,
      count: overdueList.length,
      overdueVaccinations: overdueList
    });
  } catch (error) {
    console.error('Error fetching overdue vaccinations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming vaccinations (next 30 days)
router.get('/vaccination/upcoming/all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user._id);
    if (user.role !== 'admin' && user.role !== 'staff') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const upcomingRecords = await BlockchainRecord.find({
      dataType: 'vaccination',
      'data.nextDoseDate': { 
        $gte: today,
        $lte: in30Days 
      }
    }).sort({ 'data.nextDoseDate': 1 }).populate('data.childId', 'name parentId');
    
    const upcomingList = upcomingRecords.map(r => {
      const daysUntil = Math.ceil((new Date(r.data.nextDoseDate) - today) / (1000 * 60 * 60 * 24));
      return {
        id: r._id,
        childId: r.data.childId?._id,
        childName: r.data.childName,
        vaccine: r.data.vaccine || r.data.vaccineName,
        nextDoseDate: r.data.nextDoseDate,
        daysUntil,
        parentId: r.data.childId?.parentId,
        blockNumber: r.blockNumber
      };
    });
    
    res.json({ 
      success: true,
      count: upcomingList.length,
      upcomingVaccinations: upcomingList
    });
  } catch (error) {
    console.error('Error fetching upcoming vaccinations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify blockchain integrity
router.get('/verify', auth, async (req, res) => {
  try {
    const result = await BlockchainRecord.verifyChain();
    res.json(result);
  } catch (error) {
    console.error('Error verifying blockchain:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete vaccination record (Admin only - for corrections)
router.delete('/vaccination/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user._id);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete records' });
    }

    // Note: In real blockchain, you can't delete. But for corrections, we allow admin to mark as invalid
    const record = await BlockchainRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    record.verified = false;
    record.data.notes = (record.data.notes || '') + ' [DELETED BY ADMIN]';
    await record.save();
    
    res.json({ 
      success: true, 
      message: 'Record marked as deleted (blockchain preserved)' 
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get vaccination reminder history (Admin only)
router.get('/vaccination/reminders/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user._id);
    
    if (user.role !== 'admin' && user.role !== 'staff') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const reminders = await VaccineReminder.find()
      .populate('childId', 'firstName lastName')
      .populate('parentId', 'name email phone')
      .sort({ sentAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: reminders.length,
      reminders: reminders.map(r => ({
        id: r._id,
        childName: r.childId ? `${r.childId.firstName} ${r.childId.lastName}` : 'Unknown',
        parentName: r.parentId?.name || 'Unknown',
        parentEmail: r.parentId?.email,
        parentPhone: r.parentId?.phone,
        vaccine: r.vaccine,
        dueDate: r.dueDate,
        reminderType: r.reminderType,
        notificationMethod: r.notificationMethod,
        message: r.message,
        sentAt: r.sentAt,
        status: r.status
      }))
    });
  } catch (error) {
    console.error('Error fetching reminder history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ATTENDANCE BLOCKCHAIN ROUTES
// ==========================================

/**
 * Record attendance check-in to blockchain
 * POST /api/blockchain/attendance/check-in
 * 
 * Immutable record with GPS location and photo verification
 * Cannot be altered or deleted once recorded
 */
router.post('/attendance/check-in', [auth, photoUpload.single('photo')], async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      entityName,
      latitude,
      longitude,
      accuracy,
      address,
      notes,
      deviceId
    } = req.body;

    // Validate inputs
    if (!entityType || !entityId || !entityName) {
      return res.status(400).json({
        error: 'entityType, entityId, and entityName are required'
      });
    }

    // Verify entity exists
    let entity;
    if (entityType === 'child') {
      entity = await Child.findById(entityId);
      if (!entity) {
        return res.status(404).json({ error: 'Child not found' });
      }
    } else if (entityType === 'staff') {
      entity = await User.findById(entityId);
      if (!entity || entity.role !== 'staff') {
        return res.status(404).json({ error: 'Staff not found' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid entityType' });
    }

    // Prepare GPS location data
    const gpsLocation = (latitude && longitude) ? {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      address,
      timestamp: new Date()
    } : null;

    // Prepare device info
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceId
    };

    // Get photo buffer if uploaded
    const photoBuffer = req.file ? req.file.buffer : null;
    let photoUrl = null;
    
    // TODO: In production, upload photo to cloud storage (S3, Cloudinary, etc.)
    // For now, store path placeholder
    if (photoBuffer) {
      photoUrl = `/uploads/attendance/${Date.now()}_${entityId}.jpg`;
      // Save photo to disk or cloud storage here
    }

    // Record to blockchain (immutable)
    const result = await AttendanceBlockchainService.recordAttendance({
      entityType,
      entityId,
      entityName,
      actionType: 'check-in',
      actionTime: new Date(),
      gpsLocation,
      photoBuffer,
      photoUrl,
      deviceInfo,
      performedBy: req.user.userId || req.user._id,
      notes
    });

    res.json({
      success: true,
      message: 'Check-in recorded to blockchain - IMMUTABLE',
      blockNumber: result.blockNumber,
      hash: result.hash,
      actionTime: result.record.data.actionTime,
      gpsVerified: !!gpsLocation,
      photoVerified: !!photoBuffer,
      record: {
        id: result.record._id,
        blockNumber: result.blockNumber,
        hash: result.hash,
        actionType: 'check-in',
        actionTime: result.record.data.actionTime,
        entityName: result.record.data.entityName,
        gpsLocation: result.record.data.gpsLocation,
        photoHash: result.record.data.photoHash,
        timestamp: result.record.timestamp
      }
    });
  } catch (error) {
    console.error('Error recording check-in to blockchain:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Record attendance check-out to blockchain
 * POST /api/blockchain/attendance/check-out
 * 
 * Immutable record with GPS location and photo verification
 */
router.post('/attendance/check-out', [auth, photoUpload.single('photo')], async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      entityName,
      latitude,
      longitude,
      accuracy,
      address,
      notes,
      deviceId
    } = req.body;

    // Validate inputs
    if (!entityType || !entityId || !entityName) {
      return res.status(400).json({
        error: 'entityType, entityId, and entityName are required'
      });
    }

    // Prepare GPS location data
    const gpsLocation = (latitude && longitude) ? {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      address,
      timestamp: new Date()
    } : null;

    // Prepare device info
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceId
    };

    // Get photo buffer if uploaded
    const photoBuffer = req.file ? req.file.buffer : null;
    let photoUrl = null;
    
    if (photoBuffer) {
      photoUrl = `/uploads/attendance/${Date.now()}_${entityId}.jpg`;
    }

    // Record to blockchain (immutable)
    const result = await AttendanceBlockchainService.recordAttendance({
      entityType,
      entityId,
      entityName,
      actionType: 'check-out',
      actionTime: new Date(),
      gpsLocation,
      photoBuffer,
      photoUrl,
      deviceInfo,
      performedBy: req.user.userId || req.user._id,
      notes
    });

    res.json({
      success: true,
      message: 'Check-out recorded to blockchain - IMMUTABLE',
      blockNumber: result.blockNumber,
      hash: result.hash,
      actionTime: result.record.data.actionTime,
      gpsVerified: !!gpsLocation,
      photoVerified: !!photoBuffer,
      record: {
        id: result.record._id,
        blockNumber: result.blockNumber,
        hash: result.hash,
        actionType: 'check-out',
        actionTime: result.record.data.actionTime,
        entityName: result.record.data.entityName,
        gpsLocation: result.record.data.gpsLocation,
        photoHash: result.record.data.photoHash,
        timestamp: result.record.timestamp
      }
    });
  } catch (error) {
    console.error('Error recording check-out to blockchain:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get attendance history from blockchain
 * GET /api/blockchain/attendance/:entityType/:entityId
 * 
 * Returns immutable attendance records with GPS and photo verification
 */
router.get('/attendance/:entityType/:entityId', auth, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { startDate, endDate, actionType } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (actionType) filters.actionType = actionType;

    const history = await AttendanceBlockchainService.getAttendanceHistory(
      entityType,
      entityId,
      filters
    );

    res.json({
      success: true,
      count: history.length,
      entityType,
      entityId,
      records: history
    });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify blockchain integrity
 * GET /api/blockchain/attendance/verify/chain
 * 
 * Verifies all blocks are linked correctly and detect tampering
 */
router.get('/attendance/verify/chain', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user._id);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await AttendanceBlockchainService.verifyChainIntegrity();
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error verifying blockchain:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify specific block for tampering
 * GET /api/blockchain/attendance/verify/:blockId
 * 
 * Checks if a specific attendance record has been tampered with
 */
router.get('/attendance/verify/:blockId', auth, async (req, res) => {
  try {
    const result = await AttendanceBlockchainService.detectTampering(req.params.blockId);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error verifying block:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get attendance statistics from blockchain
 * GET /api/blockchain/attendance/stats
 * 
 * Returns statistics about attendance records
 */
router.get('/attendance/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId || req.user._id);
    if (user.role !== 'admin' && user.role !== 'staff') {
      return res.status(403).json({ error: 'Admin or Staff access required' });
    }

    const { entityType, startDate, endDate } = req.query;
    const filters = {};
    if (entityType) filters.entityType = entityType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const stats = await AttendanceBlockchainService.getAttendanceStats(filters);
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
