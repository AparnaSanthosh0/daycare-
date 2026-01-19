const express = require('express');
const router = express.Router();
const DeliveryAssignment = require('../models/DeliveryAssignment');
const Order = require('../models/Order');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { autoAssignDeliveryAgent, getSuggestedAgents, handleAgentRejection } = require('../utils/autoAssignment');
const { processDeliveryPayment } = require('../utils/paymentDistribution');
const auth = require('../middleware/auth');

/**
 * Create delivery assignments when vendors confirm order
 * POST /api/delivery-assignments/create
 * Body: { orderId, vendorId }
 */
router.post('/create', auth, async (req, res) => {
  try {
    const { orderId, vendorId } = req.body;

    const order = await Order.findById(orderId).populate('customer');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Get vendor's items from order
    const vendorItems = order.items.filter(item => 
      item.vendorId?.toString() === vendorId.toString()
    );

    if (vendorItems.length === 0) {
      return res.status(400).json({ message: 'No items from this vendor in order' });
    }

    // Calculate delivery fee for this vendor's portion
    const itemsValue = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vendorDeliveryFee = (itemsValue / order.totalPrice) * order.deliveryCharges;

    // Calculate agent and platform shares (80/20 split)
    const agentShare = vendorDeliveryFee * 0.80;
    const platformShare = vendorDeliveryFee * 0.20;

    // Create delivery assignment
    const assignment = await DeliveryAssignment.create({
      order: order._id,
      orderNumber: order.orderNumber,
      vendor: vendor._id,
      vendorName: vendor.vendorName,
      customer: order.customer._id,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      pickupLocation: {
        address: vendor.warehouseLocation.address,
        coordinates: vendor.warehouseLocation.coordinates,
        zone: vendor.warehouseLocation.zone,
        contactPerson: vendor.warehouseLocation.contactPerson
      },
      deliveryLocation: {
        address: order.shippingAddress.fullAddress,
        coordinates: {
          lat: order.shippingAddress.latitude,
          lng: order.shippingAddress.longitude
        },
        zipCode: order.shippingAddress.zipCode,
        contactPerson: order.shippingAddress.recipientName || `${order.customer.firstName} ${order.customer.lastName}`,
        phone: order.shippingAddress.phone || order.customer.phone
      },
      items: vendorItems,
      deliveryFee: vendorDeliveryFee,
      agentShare: agentShare,
      platformShare: platformShare,
      status: 'pending',
      assignmentType: 'pending' // Will be set to 'auto' or 'manual' when assigned
    });

    // Add to order's delivery assignments
    order.deliveryAssignments.push(assignment._id);
    await order.save();

    res.status(201).json({
      message: 'Delivery assignment created',
      assignment
    });

  } catch (error) {
    console.error('Create delivery assignment error:', error);
    res.status(500).json({ message: 'Failed to create delivery assignment', error: error.message });
  }
});

/**
 * Get suggested agents for manual assignment (HYBRID MODE)
 * GET /api/delivery-assignments/:id/suggested-agents
 */
router.get('/:id/suggested-agents', auth, async (req, res) => {
  try {
    const assignment = await DeliveryAssignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const suggestions = await getSuggestedAgents(assignment);

    res.json({
      assignment: {
        _id: assignment._id,
        orderNumber: assignment.orderNumber,
        vendorName: assignment.vendorName,
        deliveryLocation: assignment.deliveryLocation,
        deliveryFee: assignment.deliveryFee
      },
      suggestions
    });

  } catch (error) {
    console.error('Get suggested agents error:', error);
    res.status(500).json({ message: 'Failed to get suggestions', error: error.message });
  }
});

/**
 * Manually assign agent (HYBRID MODE - Admin/Vendor Manual Assignment)
 * POST /api/delivery-assignments/:id/assign-manual
 * Body: { agentId }
 */
router.post('/:id/assign-manual', auth, async (req, res) => {
  try {
    const { agentId } = req.body;
    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status !== 'pending') {
      return res.status(400).json({ message: 'Assignment already assigned or completed' });
    }

    const agent = await User.findOne({ _id: agentId, 'staff.role': 'delivery_agent' });
    if (!agent) {
      return res.status(404).json({ message: 'Delivery agent not found' });
    }

    // Check availability
    if (!agent.staff.availability || agent.staff.availability !== 'available') {
      return res.status(400).json({ message: 'Agent is not available' });
    }

    // Assign agent
    assignment.deliveryAgent = agent._id;
    assignment.agentName = `${agent.firstName} ${agent.lastName}`;
    assignment.agentPhone = agent.phone;
    assignment.assignmentType = 'manual';
    assignment.status = 'assigned';
    assignment.assignedAt = new Date();
    await assignment.save();

    // Update agent
    await User.findByIdAndUpdate(agent._id, {
      $inc: { 'staff.currentDeliveries': 1 }
    });

    // TODO: Send notification to agent

    res.json({
      message: 'Agent assigned successfully',
      assignment
    });

  } catch (error) {
    console.error('Manual assignment error:', error);
    res.status(500).json({ message: 'Failed to assign agent', error: error.message });
  }
});

/**
 * Auto-assign agent (HYBRID MODE - Automated)
 * POST /api/delivery-assignments/:id/auto-assign
 */
router.post('/:id/auto-assign', auth, async (req, res) => {
  try {
    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const updatedAssignment = await autoAssignDeliveryAgent(assignment);

    res.json({
      message: 'Auto-assignment completed',
      assignment: updatedAssignment
    });

  } catch (error) {
    console.error('Auto-assignment error:', error);
    res.status(500).json({ message: 'Failed to auto-assign', error: error.message });
  }
});

/**
 * Get available assignments for agents
 * GET /api/delivery-assignments/available
 */
router.get('/available', auth, async (req, res) => {
  try {
    const agent = await User.findById(req.user.id);

    if (!agent || !agent.staff || agent.staff.role !== 'delivery_agent') {
      return res.status(403).json({ message: 'Access denied. Delivery agents only.' });
    }

    // Get assignments in agent's zones
    const assignments = await DeliveryAssignment.find({
      status: 'pending',
      deliveryAgent: null
    }).populate('order customer vendor').sort({ createdAt: -1 });

    // Filter by agent's delivery zones
    const availableAssignments = assignments.filter(assignment => {
      if (!agent.staff.deliveryArea || agent.staff.deliveryArea.length === 0) {
        return true; // No zone restriction
      }
      return agent.staff.deliveryArea.some(zone => 
        assignment.deliveryLocation.zone === zone
      );
    });

    res.json({
      count: availableAssignments.length,
      assignments: availableAssignments
    });

  } catch (error) {
    console.error('Get available assignments error:', error);
    res.status(500).json({ message: 'Failed to get assignments', error: error.message });
  }
});

/**
 * Get agent's current assignments
 * GET /api/delivery-assignments/my-assignments
 */
router.get('/my-assignments', auth, async (req, res) => {
  try {
    const { status } = req.query;

    const query = { deliveryAgent: req.user.id };
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['assigned', 'picked_up', 'in_transit'] };
    }

    const assignments = await DeliveryAssignment.find(query)
      .populate('order customer vendor')
      .sort({ assignedAt: -1 });

    res.json({
      count: assignments.length,
      assignments
    });

  } catch (error) {
    console.error('Get my assignments error:', error);
    res.status(500).json({ message: 'Failed to get assignments', error: error.message });
  }
});

/**
 * Accept assignment
 * PUT /api/delivery-assignments/:id/accept
 */
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.deliveryAgent?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This assignment is not assigned to you' });
    }

    if (assignment.status !== 'assigned') {
      return res.status(400).json({ message: 'Assignment cannot be accepted' });
    }

    assignment.status = 'accepted';
    assignment.acceptedAt = new Date();
    await assignment.save();

    // TODO: Send notification to vendor and customer

    res.json({
      message: 'Assignment accepted',
      assignment
    });

  } catch (error) {
    console.error('Accept assignment error:', error);
    res.status(500).json({ message: 'Failed to accept assignment', error: error.message });
  }
});

/**
 * Reject assignment
 * PUT /api/delivery-assignments/:id/reject
 */
router.put('/:id/reject', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.deliveryAgent?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This assignment is not assigned to you' });
    }

    // Handle rejection - reassign to another agent
    await handleAgentRejection(assignment, reason);

    res.json({
      message: 'Assignment rejected and reassigned'
    });

  } catch (error) {
    console.error('Reject assignment error:', error);
    res.status(500).json({ message: 'Failed to reject assignment', error: error.message });
  }
});

/**
 * Mark order picked up from vendor
 * PUT /api/delivery-assignments/:id/pickup
 */
router.put('/:id/pickup', auth, async (req, res) => {
  try {
    const { location } = req.body; // GPS coordinates

    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.deliveryAgent?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (assignment.status !== 'accepted') {
      return res.status(400).json({ message: 'Assignment must be accepted first' });
    }

    assignment.status = 'picked_up';
    assignment.pickedUpAt = new Date();
    if (location) {
      assignment.gpsTracking.pickupLocation = location;
    }
    await assignment.save();

    // TODO: Notify customer - order is on the way

    res.json({
      message: 'Order picked up',
      assignment
    });

  } catch (error) {
    console.error('Pickup error:', error);
    res.status(500).json({ message: 'Failed to mark pickup', error: error.message });
  }
});

/**
 * Update delivery location (real-time tracking)
 * PUT /api/delivery-assignments/:id/location
 */
router.put('/:id/location', auth, async (req, res) => {
  try {
    const { location } = req.body; // { lat, lng }

    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.deliveryAgent?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    assignment.gpsTracking.currentLocation = location;
    assignment.gpsTracking.lastUpdated = new Date();
    assignment.status = 'in_transit';
    await assignment.save();

    res.json({
      message: 'Location updated',
      location: assignment.gpsTracking.currentLocation
    });

  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ message: 'Failed to update location', error: error.message });
  }
});

/**
 * Mark order delivered
 * PUT /api/delivery-assignments/:id/deliver
 */
router.put('/:id/deliver', auth, async (req, res) => {
  try {
    const { location, customerRating, notes, proofOfDelivery } = req.body;

    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.deliveryAgent?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (assignment.status !== 'picked_up' && assignment.status !== 'in_transit') {
      return res.status(400).json({ message: 'Order must be picked up first' });
    }

    // Calculate actual duration
    const actualDuration = assignment.pickedUpAt 
      ? (new Date() - assignment.pickedUpAt) / 60000 // minutes
      : null;

    assignment.status = 'delivered';
    assignment.deliveredAt = new Date();
    assignment.actualDuration = actualDuration;
    assignment.deliveryNotes = notes;
    assignment.proofOfDelivery = proofOfDelivery;
    if (location) {
      assignment.gpsTracking.deliveryLocation = location;
    }
    if (customerRating) {
      assignment.customerRating = customerRating;
    }
    await assignment.save();

    // Process payment to agent
    await processDeliveryPayment(assignment);

    // Update agent rating
    const agent = await User.findById(assignment.deliveryAgent);
    if (agent && customerRating) {
      const totalDeliveries = agent.staff.totalDeliveries || 1;
      const currentRating = agent.staff.rating || 4.5;
      const newRating = ((currentRating * (totalDeliveries - 1)) + customerRating) / totalDeliveries;
      
      await User.findByIdAndUpdate(agent._id, {
        'staff.rating': newRating
      });
    }

    res.json({
      message: 'Delivery completed successfully',
      assignment,
      earnings: assignment.agentEarnings
    });

  } catch (error) {
    console.error('Delivery completion error:', error);
    res.status(500).json({ message: 'Failed to complete delivery', error: error.message });
  }
});

/**
 * Get assignment details
 * GET /api/delivery-assignments/:id
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const assignment = await DeliveryAssignment.findById(req.params.id)
      .populate('order customer vendor deliveryAgent');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check permission
    const user = req.user;
    const isAgent = assignment.deliveryAgent?._id.toString() === user.id;
    const isVendor = assignment.vendor._id.toString() === user.vendorId;
    const isAdmin = user.role === 'admin';

    if (!isAgent && !isVendor && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(assignment);

  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ message: 'Failed to get assignment', error: error.message });
  }
});

/**
 * Get all delivery assignments (Admin)
 * GET /api/delivery-assignments
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, vendor, agent, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (vendor) query.vendor = vendor;
    if (agent) query.deliveryAgent = agent;

    const skip = (page - 1) * limit;

    const assignments = await DeliveryAssignment.find(query)
      .populate('order customer vendor deliveryAgent')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DeliveryAssignment.countDocuments(query);

    res.json({
      assignments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: 'Failed to get assignments', error: error.message });
  }
});

module.exports = router;
