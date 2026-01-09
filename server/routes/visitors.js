const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Visitor = require('../models/Visitor');
const Child = require('../models/Child');

// Get all visitors (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { status, date, staffId } = req.query;
    const query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by date (today by default)
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.checkInTime = { $gte: startOfDay, $lte: endOfDay };
    }

    // Filter by staff
    if (staffId) {
      query.staffName = staffId;
    }

    const visitors = await Visitor.find(query)
      .populate('staffName', 'firstName lastName')
      .populate('relatedChild', 'firstName lastName')
      .sort({ checkInTime: -1 })
      .limit(100);

    res.json({ visitors });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's visitors
router.get('/today', auth, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const visitors = await Visitor.find({
      checkInTime: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate('staffName', 'firstName lastName')
      .populate('relatedChild', 'firstName lastName')
      .sort({ checkInTime: -1 });

    const checkedIn = visitors.filter(v => v.status === 'checked-in').length;
    const checkedOut = visitors.filter(v => v.status === 'checked-out').length;

    res.json({ 
      visitors,
      stats: {
        total: visitors.length,
        checkedIn,
        checkedOut
      }
    });
  } catch (error) {
    console.error('Get today visitors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check in a visitor
router.post('/check-in', auth, async (req, res) => {
  try {
    const {
      visitorName,
      purpose,
      purposeDetails,
      contactNumber,
      idProofType,
      idProofNumber,
      relatedChild,
      authorizedPickup,
      temperature,
      notes
    } = req.body;

    if (!visitorName || !purpose) {
      return res.status(400).json({ message: 'Visitor name and purpose are required' });
    }

    const visitor = new Visitor({
      visitorName,
      purpose,
      purposeDetails,
      contactNumber,
      idProofType,
      idProofNumber,
      staffName: req.user.userId,
      relatedChild: relatedChild || null,
      authorizedPickup: authorizedPickup || false,
      temperature,
      notes,
      checkInTime: new Date(),
      status: 'checked-in'
    });

    await visitor.save();
    await visitor.populate('staffName', 'firstName lastName');
    await visitor.populate('relatedChild', 'firstName lastName');

    res.status(201).json({ 
      message: 'Visitor checked in successfully',
      visitor 
    });
  } catch (error) {
    console.error('Check in visitor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check out a visitor
router.put('/:id/check-out', auth, async (req, res) => {
  try {
    const { notes } = req.body;

    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    if (visitor.status === 'checked-out') {
      return res.status(400).json({ message: 'Visitor already checked out' });
    }

    visitor.checkOutTime = new Date();
    visitor.status = 'checked-out';
    if (notes) {
      visitor.notes = visitor.notes ? `${visitor.notes}\n${notes}` : notes;
    }

    await visitor.save();
    await visitor.populate('staffName', 'firstName lastName');
    await visitor.populate('relatedChild', 'firstName lastName');

    res.json({ 
      message: 'Visitor checked out successfully',
      visitor 
    });
  } catch (error) {
    console.error('Check out visitor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify authorized pickup
router.post('/verify-pickup', auth, async (req, res) => {
  try {
    const { childId, pickupPersonName, idProofType, idProofNumber } = req.body;

    if (!childId || !pickupPersonName) {
      return res.status(400).json({ message: 'Child and pickup person name are required' });
    }

    // Get child with emergency contacts
    const child = await Child.findById(childId);
    
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    // Check if pickup person is authorized
    const isParent = child.parents?.some(parent => 
      `${parent.firstName} ${parent.lastName}`.toLowerCase().includes(pickupPersonName.toLowerCase())
    );

    const isEmergencyContact = child.emergencyContact?.name?.toLowerCase().includes(pickupPersonName.toLowerCase());

    const isAuthorized = isParent || isEmergencyContact;

    // Create visitor record for pickup
    const visitor = new Visitor({
      visitorName: pickupPersonName,
      purpose: 'Authorized Pickup',
      purposeDetails: `Picking up ${child.firstName} ${child.lastName}`,
      idProofType,
      idProofNumber,
      staffName: req.user.userId,
      relatedChild: childId,
      authorizedPickup: true,
      pickupVerified: isAuthorized,
      verificationNotes: isAuthorized 
        ? 'Verified - Authorized person' 
        : 'WARNING: NOT in authorized pickup list',
      checkInTime: new Date(),
      status: 'checked-in'
    });

    await visitor.save();
    await visitor.populate('staffName', 'firstName lastName');
    await visitor.populate('relatedChild', 'firstName lastName');

    res.json({ 
      message: isAuthorized ? 'Pickup verified successfully' : 'WARNING: Unauthorized person',
      visitor,
      authorized: isAuthorized,
      childInfo: {
        name: `${child.firstName} ${child.lastName}`,
        program: child.program,
        authorizedPickups: [
          ...child.parents?.map(p => `${p.firstName} ${p.lastName}`) || [],
          child.emergencyContact?.name || ''
        ].filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Verify pickup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get visitor statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    const visitors = await Visitor.find({
      checkInTime: { $gte: start, $lte: end }
    });

    const stats = {
      total: visitors.length,
      byPurpose: {},
      byStatus: {
        checkedIn: visitors.filter(v => v.status === 'checked-in').length,
        checkedOut: visitors.filter(v => v.status === 'checked-out').length
      },
      authorizedPickups: visitors.filter(v => v.authorizedPickup).length,
      averageVisitDuration: 0
    };

    // Count by purpose
    visitors.forEach(v => {
      stats.byPurpose[v.purpose] = (stats.byPurpose[v.purpose] || 0) + 1;
    });

    // Calculate average visit duration
    const completedVisits = visitors.filter(v => v.checkOutTime);
    if (completedVisits.length > 0) {
      const totalDuration = completedVisits.reduce((sum, v) => {
        return sum + (v.checkOutTime - v.checkInTime);
      }, 0);
      stats.averageVisitDuration = Math.round(totalDuration / completedVisits.length / 1000 / 60); // in minutes
    }

    res.json({ stats });
  } catch (error) {
    console.error('Get visitor stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update visitor details
router.put('/:id', auth, async (req, res) => {
  try {
    const allowedUpdates = ['notes', 'purposeDetails', 'contactNumber', 'temperature'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const visitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    )
      .populate('staffName', 'firstName lastName')
      .populate('relatedChild', 'firstName lastName');

    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    res.json({ 
      message: 'Visitor updated successfully',
      visitor 
    });
  } catch (error) {
    console.error('Update visitor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete visitor record (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const visitor = await Visitor.findByIdAndDelete(req.params.id);
    
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    res.json({ message: 'Visitor record deleted successfully' });
  } catch (error) {
    console.error('Delete visitor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
