const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const TransportRequest = require('../models/TransportRequest');
const TransportAssignment = require('../models/TransportAssignment');

/**
 * @route   POST /api/transport/request
 * @desc    Submit transport enrollment request (Parent)
 * @access  Private (Parent)
 */
router.post('/request', auth, async (req, res) => {
  try {
    const { childId, childName, pickupAddress, pickupTime, dropoffTime, contactNumber, specialInstructions } = req.body;

    if (!childId || !pickupAddress || !pickupTime || !dropoffTime || !contactNumber) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if request already exists for this child
    const existingRequest = await TransportRequest.findOne({
      childId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: 'An active transport request already exists for this child',
        existingRequest 
      });
    }

    // Create new request
    const transportRequest = new TransportRequest({
      childId,
      parentId: req.user.userId || req.user._id,
      childName,
      parentName: req.user.firstName + ' ' + req.user.lastName,
      pickupAddress,
      pickupTime,
      dropoffTime,
      contactNumber,
      specialInstructions: specialInstructions || ''
    });

    await transportRequest.save();

    res.json({
      success: true,
      message: 'Transport request submitted successfully. Admin will review shortly.',
      request: transportRequest
    });
  } catch (error) {
    console.error('Transport request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/transport/my-requests
 * @desc    Get parent's transport requests
 * @access  Private (Parent)
 */
router.get('/my-requests', auth, async (req, res) => {
  try {
    const requests = await TransportRequest.find({ parentId: req.user.userId || req.user._id })
      .sort({ requestDate: -1 })
      .populate('assignedDriver', 'firstName lastName phone');

    res.json({ requests });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/transport/my-assignment/:childId
 * @desc    Get child's transport assignment
 * @access  Private (Parent)
 */
router.get('/my-assignment/:childId', auth, async (req, res) => {
  try {
    const assignment = await TransportAssignment.findOne({
      childId: req.params.childId,
      status: 'active'
    }).populate('driverId', 'firstName lastName phone');

    if (!assignment) {
      return res.status(404).json({ message: 'No active transport assignment found' });
    }

    res.json({ assignment });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/transport/requests/all
 * @desc    Get all transport requests (Admin)
 * @access  Private (Admin/Staff)
 */
router.get('/requests/all', auth, async (req, res) => {
  try {
    // Check if user is admin or staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status } = req.query;
    const filter = status ? { status } : {};

    const requests = await TransportRequest.find(filter)
      .sort({ requestDate: -1 })
      .populate('parentId', 'firstName lastName email phone')
      .populate('assignedDriver', 'firstName lastName phone');

    res.json({ requests });
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/transport/request/:id/approve
 * @desc    Approve transport request and create assignment (Admin)
 * @access  Private (Admin)
 */
router.put('/request/:id/approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { routeName, driverId, driverName, driverPhone, vehicleNumber, monthlyFee, startDate } = req.body;

    if (!routeName || !driverId || !driverName || !driverPhone || !vehicleNumber) {
      return res.status(400).json({ message: 'All assignment details are required' });
    }

    const request = await TransportRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Transport request not found' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({ message: 'Request already approved' });
    }

    // Update request status
    request.status = 'approved';
    request.reviewedBy = req.user.userId || req.user._id;
    request.reviewDate = new Date();
    request.assignedRoute = routeName;
    request.assignedDriver = driverId;
    request.monthlyFee = monthlyFee || 50;
    request.startDate = startDate || new Date();
    await request.save();

    // Create transport assignment
    const assignment = new TransportAssignment({
      childId: request.childId,
      parentId: request.parentId,
      requestId: request._id,
      childName: request.childName,
      routeName,
      driverId,
      driverName,
      driverPhone,
      vehicleNumber,
      pickupAddress: request.pickupAddress,
      pickupTime: request.pickupTime,
      dropoffTime: request.dropoffTime,
      monthlyFee: monthlyFee || 50,
      startDate: startDate || new Date(),
      status: 'active'
    });

    await assignment.save();

    res.json({
      success: true,
      message: 'Transport request approved and assignment created',
      request,
      assignment
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/transport/request/:id/reject
 * @desc    Reject transport request (Admin)
 * @access  Private (Admin)
 */
router.put('/request/:id/reject', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const request = await TransportRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Transport request not found' });
    }

    request.status = 'rejected';
    request.reviewedBy = req.user.userId || req.user._id;
    request.reviewDate = new Date();
    request.rejectionReason = rejectionReason;
    await request.save();

    res.json({
      success: true,
      message: 'Transport request rejected',
      request
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/transport/assignments/all
 * @desc    Get all active transport assignments (Admin)
 * @access  Private (Admin/Staff)
 */
router.get('/assignments/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const assignments = await TransportAssignment.find({ status: 'active' })
      .sort({ routeName: 1, pickupTime: 1 })
      .populate('parentId', 'firstName lastName email phone')
      .populate('driverId', 'firstName lastName phone');

    res.json({ assignments });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/transport/request/:id
 * @desc    Cancel/delete transport request (Parent)
 * @access  Private (Parent)
 */
router.delete('/request/:id', auth, async (req, res) => {
  try {
    const request = await TransportRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Transport request not found' });
    }

    // Check if user owns this request
    if (request.parentId.toString() !== (req.user.userId || req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Can only delete pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Can only cancel pending requests' });
    }

    await request.deleteOne();

    res.json({
      success: true,
      message: 'Transport request cancelled'
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
