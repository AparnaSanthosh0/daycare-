const router = require('express').Router();
const BlockchainRecord = require('../models/BlockchainRecord');
const Child = require('../models/Child');
const User = require('../models/User');
const VaccineReminder = require('../models/VaccineReminder');
const auth = require('../middleware/auth');

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

module.exports = router;
