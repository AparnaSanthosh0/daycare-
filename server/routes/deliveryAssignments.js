const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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

    const agent = await User.findOne({ _id: agentId, role: 'staff', 'staff.staffType': 'delivery' });
    if (!agent) {
      return res.status(404).json({ message: 'Delivery agent not found' });
    }

    // Check availability
    if (!agent.availability || agent.availability !== 'available') {
      return res.status(400).json({ message: 'Agent is not available' });
    }

    // Assign agent
    assignment.deliveryAgent = agent._id;
    assignment.assignmentType = 'manual';
    assignment.status = 'assigned';
    assignment.assignedAt = new Date();
    await assignment.save();
    
    console.log(`✅ Manually assigned to agent: ${agent.firstName} ${agent.lastName} (${agent._id})`);
    console.log(`   Assignment ID: ${assignment._id}, Status: ${assignment.status}`);

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
    const agent = await User.findById(req.user.userId);

    if (!agent || agent.role !== 'staff' || agent.staff?.staffType !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery agents only.' });
    }

    // Get assignments that are:
    // 1. Pending (not yet assigned) - available for any agent
    // 2. Assigned to this agent (auto-assigned) - ready for this agent to accept
    // 3. Accepted by this agent but not yet picked up
    
    // Convert agentId to ObjectId for proper comparison
    const agentId = mongoose.Types.ObjectId.isValid(req.user.userId) 
      ? new mongoose.Types.ObjectId(req.user.userId)
      : req.user.userId;
    
    console.log(`🔍 Looking for assignments for agent: ${req.user.userId} (ObjectId: ${agentId})`);
    
    // IMPORTANT: Only show assignments where vendor has confirmed
    // This ensures delivery agents only see orders that are ready for pickup
    
    // First, get all pending assignments (unassigned) - we'll filter by vendor confirmation after
    const pendingAssignments = await DeliveryAssignment.find({
      status: 'pending',
      $or: [
        { deliveryAgent: null },
        { deliveryAgent: { $exists: false } }
      ]
    })
    .populate({
      path: 'order',
      select: 'orderNumber status vendorConfirmations adminConfirmed',
      populate: {
        path: 'vendorConfirmations.vendor',
        select: '_id'
      }
    })
    .populate('customer', 'firstName lastName email phone')
    .populate('vendor', 'vendorName email phone warehouseLocation')
    .populate('items.product', 'name image price')
    .sort({ createdAt: -1 });
    
    console.log(`📋 Found ${pendingAssignments.length} total pending assignments before filtering`);
    
    // DEBUG: Check if any assignments exist at all
    if (pendingAssignments.length === 0) {
      const allAssignmentsCount = await DeliveryAssignment.countDocuments({});
      console.log(`⚠️ No pending assignments found. Total assignments in DB: ${allAssignmentsCount}`);
      if (allAssignmentsCount > 0) {
        const sampleAssignments = await DeliveryAssignment.find({}).limit(3).select('_id status orderNumber vendor createdAt').lean();
        console.log(`   Sample assignments:`, sampleAssignments);
      }
    }
    
    // Filter: Only include assignments where the vendor has confirmed
    const vendorConfirmedPending = pendingAssignments.filter(assignment => {
      // Debug: Log assignment details
      const assignmentVendorId = assignment.vendor?._id?.toString() || assignment.vendor?.toString();
      console.log(`   🔍 Checking assignment ${assignment._id}:`);
      console.log(`      - Order: ${assignment.order?._id || 'null'}`);
      console.log(`      - Order Number: ${assignment.order?.orderNumber || 'N/A'}`);
      console.log(`      - Vendor ID: ${assignmentVendorId || 'null'}`);
      console.log(`      - Admin Confirmed: ${assignment.order?.adminConfirmed || false}`);
      console.log(`      - Vendor Confirmations: ${assignment.order?.vendorConfirmations?.length || 0}`);
      
      if (!assignment.order) {
        console.log(`   ⚠️ Assignment ${assignment._id}: No order populated`);
        return false;
      }
      
      if (!assignment.order.vendorConfirmations || assignment.order.vendorConfirmations.length === 0) {
        console.log(`   ⚠️ Assignment ${assignment._id}: No vendorConfirmations array`);
        return false;
      }
      
      // Get assignment vendor ID (handle both ObjectId and populated object)
      if (!assignmentVendorId) {
        console.log(`   ⚠️ Assignment ${assignment._id}: No vendor ID`);
        return false;
      }
      
      // Log all vendor confirmations for debugging
      console.log(`      - Vendor Confirmations in order:`, assignment.order.vendorConfirmations.map(vc => ({
        vendor: vc.vendor?._id?.toString() || vc.vendor?.toString() || 'null',
        status: vc.status
      })));
      
      // Check if this assignment's vendor has confirmed
      const vendorConfirmation = assignment.order.vendorConfirmations.find(vc => {
        if (!vc.vendor) return false;
        // Handle both ObjectId and populated vendor
        const vcVendorId = vc.vendor._id?.toString() || vc.vendor.toString();
        const matches = vcVendorId === assignmentVendorId;
        if (matches) {
          console.log(`      ✅ Found matching vendor confirmation: status=${vc.status}`);
        }
        return matches;
      });
      
      if (!vendorConfirmation) {
        console.log(`   ⚠️ Assignment ${assignment._id}: No vendor confirmation found for vendor ${assignmentVendorId}`);
        console.log(`      Available vendor IDs in confirmations: ${assignment.order.vendorConfirmations.map(vc => vc.vendor?._id?.toString() || vc.vendor?.toString() || 'null').join(', ')}`);
        return false;
      }
      
      const isConfirmed = vendorConfirmation.status === 'confirmed' || 
                          vendorConfirmation.status === 'ready_for_pickup';
      
      if (!isConfirmed) {
        console.log(`   ⚠️ Assignment ${assignment._id}: Vendor status is '${vendorConfirmation.status}', not confirmed`);
      } else {
        console.log(`   ✅ Assignment ${assignment._id}: Vendor confirmed - INCLUDING in results`);
      }
      
      return isConfirmed;
    });
    
    console.log(`📋 Found ${pendingAssignments.length} pending assignments, ${vendorConfirmedPending.length} with vendor confirmed`);
    
    // Then, get assignments assigned to this specific agent (also check vendor confirmation)
    const assignedToMe = await DeliveryAssignment.find({
      status: { $in: ['assigned', 'accepted'] },
      deliveryAgent: agentId
    })
    .populate({
      path: 'order',
      select: 'orderNumber status vendorConfirmations',
      populate: {
        path: 'vendorConfirmations.vendor',
        select: '_id'
      }
    })
    .populate('customer', 'firstName lastName email phone')
    .populate('vendor', 'vendorName email phone warehouseLocation')
    .populate('deliveryAgent', 'firstName lastName email phone')
    .populate('items.product', 'name image price')
    .sort({ createdAt: -1 });
    
    // Filter assigned assignments by vendor confirmation
    const vendorConfirmedAssigned = assignedToMe.filter(assignment => {
      if (!assignment.order || !assignment.order.vendorConfirmations) {
        console.log(`   ⚠️ Assignment ${assignment._id}: No order or vendorConfirmations (assigned)`);
        return false;
      }
      
      // Get assignment vendor ID
      const assignmentVendorId = assignment.vendor?._id?.toString() || assignment.vendor?.toString();
      if (!assignmentVendorId) {
        console.log(`   ⚠️ Assignment ${assignment._id}: No vendor ID (assigned)`);
        return false;
      }
      
      const vendorConfirmation = assignment.order.vendorConfirmations.find(vc => {
        if (!vc.vendor) return false;
        const vcVendorId = vc.vendor._id?.toString() || vc.vendor.toString();
        return vcVendorId === assignmentVendorId;
      });
      
      if (!vendorConfirmation) {
        console.log(`   ⚠️ Assignment ${assignment._id}: No vendor confirmation found for vendor ${assignmentVendorId} (assigned)`);
        return false;
      }
      
      const isConfirmed = vendorConfirmation.status === 'confirmed' || 
                          vendorConfirmation.status === 'ready_for_pickup';
      
      if (!isConfirmed) {
        console.log(`   ⚠️ Assignment ${assignment._id}: Vendor status is '${vendorConfirmation.status}', not confirmed (assigned)`);
      }
      
      return isConfirmed;
    });
    
    console.log(`✅ Found ${assignedToMe.length} assignments assigned to this agent, ${vendorConfirmedAssigned.length} with vendor confirmed`);
    
    // Combine both sets (remove duplicates by _id)
    const assignmentMap = new Map();
    [...vendorConfirmedPending, ...vendorConfirmedAssigned].forEach(a => {
      assignmentMap.set(a._id.toString(), a);
    });
    const assignments = Array.from(assignmentMap.values());
    
    console.log(`🔍 Total unique assignments found (vendor confirmed): ${assignments.length}`);
    assignments.forEach(a => {
      const agentInfo = a.deliveryAgent ? 
        `${a.deliveryAgent.firstName} ${a.deliveryAgent.lastName} (${a.deliveryAgent._id})` : 
        'null';
      // Get vendor confirmation status for this assignment
      const vendorConf = a.order?.vendorConfirmations?.find(
        vc => vc.vendor && (
          vc.vendor._id?.toString() === a.vendor?._id?.toString() ||
          vc.vendor.toString() === a.vendor?._id?.toString() ||
          vc.vendor.toString() === a.vendor?.toString()
        )
      );
      const vendorStatus = vendorConf?.status || 'unknown';
      console.log(`   - Assignment ${a._id}: status=${a.status}, agent=${agentInfo}, order=${a.order?.orderNumber || 'N/A'}, vendor_status=${vendorStatus}`);
    });

    // Filter by agent's delivery zones (if zones are configured)
    const availableAssignments = assignments.filter(assignment => {
      // If agent has no zone restrictions, show all
      const agentZones = agent.staff?.deliveryArea || agent.deliveryArea || [];
      if (agentZones.length === 0) {
        return true; // No zone restriction - show all assignments
      }

      // Check assignment's delivery zone
      const deliveryZone = assignment.deliveryLocation?.zone;

      // If the assignment has no zone or it's marked as "Unknown",
      // do NOT hide it — show to all delivery agents so nothing disappears.
      if (!deliveryZone || deliveryZone === 'Unknown') {
        return true;
      }

      // Otherwise, require that the delivery zone matches one of the agent's zones
      return agentZones.includes(deliveryZone);
    });

    console.log(`📊 Returning ${availableAssignments.length} assignments to agent dashboard`);
    console.log(`   Agent zones: ${agent.staff?.deliveryArea || agent.deliveryArea || 'none'}`);
    
    // Also log ALL assignments in database for debugging
    const totalAssignments = await DeliveryAssignment.countDocuments({});
    const allAssignments = await DeliveryAssignment.find({})
      .select('_id status deliveryAgent orderNumber vendor createdAt')
      .populate('deliveryAgent', 'firstName lastName')
      .populate({
        path: 'order',
        select: 'orderNumber vendorConfirmations',
        populate: {
          path: 'vendorConfirmations.vendor',
          select: '_id'
        }
      })
      .limit(10)
      .lean();
    console.log(`🔍 DEBUG: Total assignments in DB: ${totalAssignments}`);
    console.log(`🔍 DEBUG: Sample assignments:`, allAssignments.map(a => {
      const vendorConf = a.order?.vendorConfirmations?.find(
        vc => vc.vendor && (
          vc.vendor._id?.toString() === a.vendor?.toString() ||
          vc.vendor.toString() === a.vendor?.toString()
        )
      );
      return {
        id: a._id,
        status: a.status,
        agent: a.deliveryAgent ? `${a.deliveryAgent.firstName} ${a.deliveryAgent.lastName} (${a.deliveryAgent._id})` : 'null',
        agentId: a.deliveryAgent?._id || null,
        orderNumber: a.orderNumber,
        vendorConfirmed: vendorConf ? (vendorConf.status === 'confirmed' || vendorConf.status === 'ready_for_pickup') : false,
        vendorStatus: vendorConf?.status || 'not_found'
      };
    }));
    
    // Final check: If no assignments found, provide helpful debug info
    if (availableAssignments.length === 0) {
      console.log(`\n⚠️⚠️⚠️ NO ASSIGNMENTS RETURNED TO AGENT ⚠️⚠️⚠️`);
      console.log(`   Total assignments in DB: ${totalAssignments}`);
      console.log(`   Pending assignments found: ${pendingAssignments.length}`);
      console.log(`   Vendor confirmed pending: ${vendorConfirmedPending.length}`);
      console.log(`   Assigned to agent: ${assignedToMe.length}`);
      console.log(`   Vendor confirmed assigned: ${vendorConfirmedAssigned.length}`);
      console.log(`   After zone filtering: ${availableAssignments.length}`);
      console.log(`\n💡 TROUBLESHOOTING:`);
      console.log(`   1. Check if admin confirmed the order`);
      console.log(`   2. Check if vendor confirmed the order`);
      console.log(`   3. Check server logs above for why assignments were filtered out`);
      console.log(`   4. Verify vendor confirmation status matches assignment vendor ID\n`);
    }
    
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

    const query = { deliveryAgent: req.user.userId };
    if (status) {
      // If a specific status is requested (e.g., delivered), use it as-is
      query.status = status;
    } else {
      // Default: treat these as "active" deliveries for the agent
      query.status = { $in: ['assigned', 'accepted', 'picked_up', 'in_transit'] };
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
 * Handles both:
 * - Unassigned assignments (status: 'pending', deliveryAgent: null) - manual assignment
 * - Auto-assigned assignments (status: 'assigned', deliveryAgent: userId) - auto-assignment
 */
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const isMine = assignment.deliveryAgent?.toString() === req.user.userId;

    // Idempotency: if already accepted by me, just return success
    if (assignment.status === 'accepted' && isMine) {
      return res.json({
        message: 'Assignment already accepted',
        assignment
      });
    }

    // Check if assignment is available for this agent
    // - Unassigned assignment (pending + no agent)
    // - Auto-assigned to me (assigned + agent = me)
    // - Defensive: if data is inconsistent (pending + agent = me), allow accept
    const isUnassigned = assignment.status === 'pending' && !assignment.deliveryAgent;
    const isAssignedToMe = assignment.status === 'assigned' && isMine;
    const isPendingButMine = assignment.status === 'pending' && isMine;

    if (!isUnassigned && !isAssignedToMe && !isPendingButMine) {
      return res.status(403).json({ 
        message: 'This assignment is not available for you. It may be assigned to another agent or already accepted.' 
      });
    }

    // If unassigned, assign to this agent
    if (isUnassigned) {
      assignment.deliveryAgent = req.user.userId;
      assignment.status = 'assigned';
      assignment.assignedAt = new Date();
      assignment.assignmentType = 'manual';
      
      // Update agent's current deliveries count
      await User.findByIdAndUpdate(req.user.userId, {
        $inc: { 'staff.currentDeliveries': 1 }
      });
    }

    // Accept the assignment
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

    if (assignment.deliveryAgent?.toString() !== req.user.userId) {
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

    if (assignment.deliveryAgent?.toString() !== req.user.userId) {
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

    // Update order status to 'shipped' when agent picks up
    // Check if all assignments for this order are picked up
    const order = await Order.findById(assignment.order).populate('deliveryAssignments');
    if (order) {
      const allAssignments = await DeliveryAssignment.find({ order: order._id });
      const allPickedUp = allAssignments.every(a => 
        a.status === 'picked_up' || a.status === 'in_transit' || a.status === 'delivered'
      );
      
      if (allPickedUp && order.status !== 'shipped' && order.status !== 'delivered') {
        order.status = 'shipped';
        order.deliveryStatus = 'in_progress';
        await order.save();
        console.log(`✅ Order ${order.orderNumber} status updated to 'shipped' - agent picked up`);
      }
    }

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

    if (assignment.deliveryAgent?.toString() !== req.user.userId) {
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

    if (assignment.deliveryAgent?.toString() !== req.user.userId) {
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

    // Process payment to agent (80% of delivery fee paid instantly)
    // This also handles: vendor payout scheduling (Friday) and platform commission recording
    await processDeliveryPayment(assignment);

    // Update agent rating
    const agent = await User.findById(assignment.deliveryAgent);
    if (agent && customerRating) {
      const totalDeliveries = agent.totalDeliveries || 1;
      const currentRating = agent.rating || 4.5;
      const newRating = ((currentRating * (totalDeliveries - 1)) + customerRating) / totalDeliveries;
      
      await User.findByIdAndUpdate(agent._id, {
        rating: newRating
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
    const isAgent = assignment.deliveryAgent?._id.toString() === user.userId;
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

/**
 * Upload proof of delivery
 * POST /api/delivery-assignments/:id/proof
 */
router.post('/:id/proof', auth, async (req, res) => {
  try {
    const { photo, signature, otp } = req.body;
    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.deliveryAgent?.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const proofOfDelivery = {
      method: photo ? 'photo' : signature ? 'signature' : otp ? 'otp' : 'none',
      timestamp: new Date()
    };

    if (photo) proofOfDelivery.photo = photo;
    if (signature) proofOfDelivery.customerSignature = signature;
    if (otp) proofOfDelivery.otp = otp;

    assignment.proofOfDelivery = proofOfDelivery;
    await assignment.save();

    res.json({
      message: 'Proof of delivery uploaded successfully',
      proof: proofOfDelivery
    });

  } catch (error) {
    console.error('Proof upload error:', error);
    res.status(500).json({ message: 'Failed to upload proof', error: error.message });
  }
});

/**
 * Get delivery performance metrics
 * GET /api/delivery-assignments/metrics
 */
router.get('/metrics', auth, async (req, res) => {
  try {
    const agent = await User.findById(req.user.userId);
    
    if (!agent || agent.role !== 'staff' || agent.staff?.staffType !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery agents only.' });
    }

    const allAssignments = await DeliveryAssignment.find({ deliveryAgent: req.user.userId });
    const completedAssignments = allAssignments.filter(a => a.status === 'delivered');
    
    const totalDeliveries = completedAssignments.length;
    const successRate = allAssignments.length > 0 ? (totalDeliveries / allAssignments.length) * 100 : 0;
    
    const avgDeliveryTime = completedAssignments.length > 0
      ? completedAssignments.reduce((sum, a) => sum + (a.actualDuration || 0), 0) / completedAssignments.length
      : 0;
    
    const customerRating = completedAssignments.length > 0
      ? completedAssignments.reduce((sum, a) => sum + (a.customerRating || 0), 0) / completedAssignments.length
      : 0;
    
    const today = new Date().toDateString();
    const todayDeliveries = completedAssignments.filter(a => 
      new Date(a.deliveredAt).toDateString() === today
    ).length;
    
    const onTimeDeliveries = completedAssignments.filter(a => 
      a.actualDuration <= (a.estimatedDuration || 30)
    ).length;
    
    const lateDeliveries = totalDeliveries - onTimeDeliveries;
    const failedDeliveries = allAssignments.filter(a => a.status === 'failed').length;

    res.json({
      successRate: Math.round(successRate * 10) / 10,
      avgDeliveryTime: Math.round(avgDeliveryTime),
      customerRating: Math.round(customerRating * 10) / 10,
      totalDeliveries,
      todayDeliveries,
      onTimeDeliveries,
      lateDeliveries,
      failedDeliveries
    });

  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ message: 'Failed to get metrics', error: error.message });
  }
});

/**
 * Get earnings breakdown
 * GET /api/delivery-assignments/earnings
 */
router.get('/earnings', auth, async (req, res) => {
  try {
    const agent = await User.findById(req.user.userId);
    
    if (!agent || agent.role !== 'staff' || agent.staff?.staffType !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery agents only.' });
    }

    const completedAssignments = await DeliveryAssignment.find({ 
      deliveryAgent: req.user.userId, 
      status: 'delivered' 
    });
    
    const now = new Date();
    const today = new Date().toDateString();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const todayEarnings = completedAssignments
      .filter(a => new Date(a.deliveredAt).toDateString() === today)
      .reduce((sum, a) => sum + (a.agentShare || 0), 0);
    
    const weeklyEarnings = completedAssignments
      .filter(a => new Date(a.deliveredAt) >= weekStart)
      .reduce((sum, a) => sum + (a.agentShare || 0), 0);
    
    const monthlyEarnings = completedAssignments
      .filter(a => new Date(a.deliveredAt) >= monthStart)
      .reduce((sum, a) => sum + (a.agentShare || 0), 0);
    
    const totalEarnings = completedAssignments
      .reduce((sum, a) => sum + (a.agentShare || 0), 0);
    
    const daysWorked = new Set(completedAssignments.map(a => 
      new Date(a.deliveredAt).toDateString()
    )).size || 1;
    
    const weeksWorked = new Set(completedAssignments.map(a => {
      const date = new Date(a.deliveredAt);
      const year = date.getFullYear();
      const week = Math.floor((date - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
      return `${year}-${week}`;
    })).size || 1;
    
    const monthsWorked = new Set(completedAssignments.map(a => {
      const date = new Date(a.deliveredAt);
      return `${date.getFullYear()}-${date.getMonth()}`;
    })).size || 1;

    res.json({
      today: todayEarnings,
      week: weeklyEarnings,
      month: monthlyEarnings,
      total: totalEarnings,
      dailyAverage: totalEarnings / daysWorked,
      weeklyAverage: totalEarnings / weeksWorked,
      monthlyAverage: totalEarnings / monthsWorked
    });

  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ message: 'Failed to get earnings', error: error.message });
  }
});

/**
 * Optimize delivery route
 * POST /api/delivery-assignments/:id/optimize-route
 */
router.post('/:id/optimize-route', auth, async (req, res) => {
  try {
    const { currentLocation } = req.body;
    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.deliveryAgent?.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Mock route optimization - replace with actual Google Maps Route API
    const pickupCoords = assignment.pickupLocation?.coordinates;
    const deliveryCoords = assignment.deliveryLocation?.coordinates;
    
    if (!pickupCoords || !deliveryCoords || !currentLocation) {
      return res.status(400).json({ message: 'Missing location coordinates' });
    }

    // Calculate distances (simplified)
    const distanceToPickup = calculateDistance(currentLocation, pickupCoords);
    const distanceToDelivery = calculateDistance(pickupCoords, deliveryCoords);
    const totalDistance = distanceToPickup + distanceToDelivery;
    
    // Estimate time (assuming 30 km/h average speed in city)
    const estimatedTime = Math.round((totalDistance / 30) * 60);
    
    // Mock traffic conditions
    const trafficLevel = Math.random() > 0.7 ? 'Heavy' : Math.random() > 0.4 ? 'Medium' : 'Light';
    const trafficDelay = trafficLevel === 'Heavy' ? 10 : trafficLevel === 'Medium' ? 5 : 0;
    
    const optimizedRoute = {
      distance: Math.round(totalDistance * 10) / 10,
      duration: estimatedTime + trafficDelay,
      trafficLevel,
      savings: `${Math.round(trafficDelay)} mins`,
      coordinates: [currentLocation, pickupCoords, deliveryCoords],
      waypoints: [
        {
          location: 'Pickup - ' + assignment.vendorName,
          coordinates: pickupCoords,
          estimatedArrival: Math.round((distanceToPickup / 30) * 60)
        },
        {
          location: 'Delivery - ' + assignment.customerName,
          coordinates: deliveryCoords,
          estimatedArrival: estimatedTime + trafficDelay
        }
      ]
    };

    res.json({
      message: 'Route optimized successfully',
      route: optimizedRoute
    });

  } catch (error) {
    console.error('Route optimization error:', error);
    res.status(500).json({ message: 'Failed to optimize route', error: error.message });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Get AI delivery failure risk analysis
 * GET /api/delivery-assignments/risk-analysis
 */
router.get('/risk-analysis', async (req, res) => {
  try {
    console.log('🔍 Risk analysis endpoint called (no auth for testing)');
    
    // For testing, skip user validation and return mock data
    const riskAnalysis = {
      overallRisk: 'Low',
      riskScore: 15,
      factors: [
        { factor: 'Weather Conditions', risk: 'Low', impact: 5 },
        { factor: 'Traffic Density', risk: 'Medium', impact: 8 },
        { factor: 'Customer Location', risk: 'Low', impact: 3 },
        { factor: 'Time of Day', risk: 'Low', impact: 4 },
        { factor: 'Order Complexity', risk: 'Low', impact: 2 }
      ],
      recommendations: [
        'Optimal route detected',
        'Weather conditions favorable',
        'Customer location accessible'
      ],
      confidence: 92
    };

    res.json(riskAnalysis);
    console.log('✅ Risk analysis sent successfully');

  } catch (error) {
    console.error('❌ Risk analysis error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to get risk analysis', error: error.message });
  }
});

/**
 * Get AI anomaly detection
 * GET /api/delivery-assignments/anomaly-detection
 */
router.get('/anomaly-detection', async (req, res) => {
  try {
    console.log('🔍 Anomaly detection endpoint called (no auth for testing)');
    
    // For testing, skip user validation and return mock data
    const anomalies = [
      {
        id: 1,
        type: 'Route Deviation',
        severity: 'Medium',
        description: 'Suggested route is 15% longer than usual',
        recommendation: 'Consider alternative route via Main Street',
        timestamp: new Date(Date.now() - 300000)
      },
      {
        id: 2,
        type: 'Unusual Delay Pattern',
        severity: 'Low',
        description: 'Current delivery time is 10 mins above average',
        recommendation: 'Monitor traffic conditions',
        timestamp: new Date(Date.now() - 600000)
      }
    ];

    res.json(anomalies);
    console.log('✅ Anomaly detection sent successfully');

  } catch (error) {
    console.error('❌ Anomaly detection error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to get anomaly detection', error: error.message });
  }
});

/**
 * Get AI earnings forecast
 * GET /api/delivery-assignments/earnings-forecast
 */
router.get('/earnings-forecast', async (req, res) => {
  try {
    console.log('🔍 Earnings forecast endpoint called (no auth for testing)');
    
    // For testing, skip user validation and return mock data
    const forecast = {
      today: {
        predicted: 950,
        confidence: 88,
        range: { min: 850, max: 1050 }
      },
      week: {
        predicted: 6500,
        confidence: 85,
        range: { min: 5800, max: 7200 }
      },
      month: {
        predicted: 28000,
        confidence: 82,
        range: { min: 25000, max: 31000 }
      },
      factors: [
        { factor: 'Historical Performance', weight: 35, trend: 'Increasing' },
        { factor: 'Seasonal Demand', weight: 25, trend: 'Stable' },
        { factor: 'Weather Conditions', weight: 20, trend: 'Decreasing' },
        { factor: 'Market Conditions', weight: 20, trend: 'Increasing' }
      ],
      insights: [
        'Weekend demand expected to increase by 15%',
        'Rainy season may affect delivery times',
        'New daycare centers in area boosting orders'
      ]
    };

    res.json(forecast);
    console.log('✅ Earnings forecast sent successfully');

  } catch (error) {
    console.error('❌ Earnings forecast error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to get earnings forecast', error: error.message });
  }
});

/**
 * Advanced AI Route Optimization with Multiple Delivery Support
 * POST /api/delivery-assignments/:id/advanced-route-optimization
 */
router.post('/:id/advanced-route-optimization', auth, async (req, res) => {
  try {
    const { currentLocation, allActiveOrders } = req.body;
    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.deliveryAgent?.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get all pending/accepted deliveries for this agent
    const agentAssignments = await DeliveryAssignment.find({
      deliveryAgent: req.user.userId,
      status: { $in: ['accepted', 'picked_up', 'in_transit'] }
    }).populate('order customer vendor');

    // Build delivery locations array
    const deliveryLocations = [];
    const storeLocation = assignment.pickupLocation?.coordinates || 
                          { lat: 9.7479, lng: 76.5276 }; // TinyTots Store

    // Add current delivery
    deliveryLocations.push({
      id: assignment._id,
      name: assignment.customerName,
      address: assignment.deliveryLocation?.address,
      coordinates: assignment.deliveryLocation?.coordinates,
      priority: assignment.order?.priority || 'normal',
      orderNumber: assignment.orderNumber,
      estimatedValue: assignment.deliveryFee || 0
    });

    // Add other active deliveries
    agentAssignments.forEach(a => {
      if (a._id.toString() !== assignment._id.toString()) {
        deliveryLocations.push({
          id: a._id,
          name: a.customerName,
          address: a.deliveryLocation?.address,
          coordinates: a.deliveryLocation?.coordinates,
          priority: a.order?.priority || 'normal',
          orderNumber: a.orderNumber,
          estimatedValue: a.deliveryFee || 0
        });
      }
    });

    // Generate all possible delivery sequences
    const possibleRoutes = generateDeliverySeences(storeLocation, deliveryLocations);
    
    // Calculate route scores and select best
    const scoredRoutes = possibleRoutes.map(route => ({
      ...route,
      score: calculateRouteScore(route, currentLocation)
    }));

    // Sort by score (lower is better)
    scoredRoutes.sort((a, b) => a.score - b.score);

    // Select primary and alternative routes
    const primaryRoute = scoredRoutes[0];
    const alternativeRoutes = scoredRoutes.slice(1, 4); // Top 3 alternatives

    // Generate AI insights
    const aiInsights = generateAIInsights(primaryRoute, alternativeRoutes, deliveryLocations);

    const advancedOptimization = {
      primaryRoute: {
        sequence: primaryRoute.sequence,
        totalDistance: primaryRoute.totalDistance,
        totalDuration: primaryRoute.totalDuration,
        trafficLevel: primaryRoute.trafficLevel,
        confidence: calculateConfidence(primaryRoute),
        waypoints: generateWaypoints(primaryRoute, currentLocation),
        optimizationScore: Math.round((1 - (primaryRoute.score / 100)) * 100)
      },
      alternativeRoutes: alternativeRoutes.map(route => ({
        name: generateRouteName(route),
        sequence: route.sequence,
        totalDistance: route.totalDistance,
        totalDuration: route.totalDuration,
        advantage: calculateAdvantage(primaryRoute, route),
        trafficLevel: route.trafficLevel,
        optimizationScore: Math.round((1 - (route.score / 100)) * 100)
      })),
      aiInsights,
      priorityAdjustments: checkPriorityAdjustments(primaryRoute),
      realTimeFactors: {
        trafficImpact: calculateTrafficImpact(primaryRoute),
        weatherImpact: calculateWeatherImpact(),
        timeOfDayImpact: calculateTimeOfDayImpact()
      },
      recommendations: generateRecommendations(primaryRoute, deliveryLocations)
    };

    res.json({
      message: 'Advanced AI route optimization completed',
      route: advancedOptimization,
      totalRoutesGenerated: possibleRoutes.length
    });

  } catch (error) {
    console.error('Advanced route optimization error:', error);
    res.status(500).json({ message: 'Failed to optimize route', error: error.message });
  }
});

/**
 * Generate all possible delivery sequences
 */
function generateDeliverySeences(storeLocation, deliveryLocations) {
  const sequences = [];
  
  // If only one delivery, create simple route
  if (deliveryLocations.length === 1) {
    const route = {
      sequence: [deliveryLocations[0]],
      totalDistance: calculateDistance(storeLocation, deliveryLocations[0].coordinates),
      totalDuration: estimateDuration(storeLocation, deliveryLocations[0].coordinates),
      trafficLevel: assessTrafficLevel(storeLocation, deliveryLocations[0].coordinates)
    };
    return [route];
  }

  // Generate permutations for multiple deliveries
  const permutations = getPermutations(deliveryLocations);
  
  permutations.forEach(permutation => {
    let totalDistance = 0;
    let totalDuration = 0;
    let currentLocation = storeLocation;
    
    // Calculate route from store -> first delivery -> second delivery -> ...
    permutation.forEach((location, index) => {
      const distance = calculateDistance(currentLocation, location.coordinates);
      const duration = estimateDuration(currentLocation, location.coordinates);
      
      totalDistance += distance;
      totalDuration += duration;
      currentLocation = location.coordinates;
    });
    
    // Add return to store distance
    totalDistance += calculateDistance(currentLocation, storeLocation);
    totalDuration += estimateDuration(currentLocation, storeLocation);
    
    sequences.push({
      sequence: permutation,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalDuration: Math.round(totalDuration),
      trafficLevel: assessOverallTraffic(permutation, storeLocation)
    });
  });
  
  return sequences;
}

/**
 * Calculate route score based on multiple factors
 */
function calculateRouteScore(route, currentLocation) {
  const distanceWeight = 0.4;
  const timeWeight = 0.3;
  const trafficWeight = 0.2;
  const priorityWeight = 0.1;
  
  // Normalize values (0-100 scale)
  const distanceScore = Math.min(route.totalDistance * 5, 100); // 1km = 5 points
  const timeScore = Math.min(route.totalDuration * 1.5, 100); // 1min = 1.5 points
  const trafficScore = route.trafficLevel === 'Heavy' ? 80 : 
                     route.trafficLevel === 'Medium' ? 50 : 20;
  
  // Priority penalty (higher priority = lower score)
  const priorityScore = route.sequence.reduce((sum, loc) => {
    const index = route.sequence.indexOf(loc);
    const priorityBonus = loc.priority === 'high' ? (index * 10) :
                         loc.priority === 'medium' ? (index * 5) : 0;
    return sum - priorityBonus;
  }, 50); // Base 50, subtract for priority
  
  const totalScore = (distanceScore * distanceWeight) +
                     (timeScore * timeWeight) +
                     (trafficScore * trafficWeight) +
                     (priorityScore * priorityWeight);
  
  return Math.max(0, Math.round(totalScore));
}

/**
 * Generate permutations of delivery locations
 */
function getPermutations(arr) {
  if (arr.length <= 1) return [arr];
  
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = getPermutations(remaining);
    
    perms.forEach(perm => {
      result.push([current, ...perm]);
    });
  }
  
  return result;
}

/**
 * Estimate travel duration based on distance and traffic
 */
function estimateDuration(from, to) {
  const distance = calculateDistance(from, to);
  const baseSpeed = 25; // km/h average city speed
  const trafficFactor = Math.random() > 0.7 ? 1.5 : Math.random() > 0.4 ? 1.2 : 1.0;
  
  return Math.round((distance / baseSpeed) * 60 * trafficFactor); // minutes
}

/**
 * Assess traffic level for a route
 */
function assessTrafficLevel(from, to) {
  const hour = new Date().getHours();
  const isRushHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
  
  if (isRushHour) {
    return Math.random() > 0.3 ? 'Heavy' : 'Medium';
  } else {
    return Math.random() > 0.7 ? 'Medium' : 'Light';
  }
}

/**
 * Assess overall traffic for multi-stop routes
 */
function assessOverallTraffic(sequence, storeLocation) {
  const trafficLevels = [];
  let currentLocation = storeLocation;
  
  sequence.forEach(location => {
    trafficLevels.push(assessTrafficLevel(currentLocation, location.coordinates));
    currentLocation = location.coordinates;
  });
  
  const heavyCount = trafficLevels.filter(t => t === 'Heavy').length;
  const mediumCount = trafficLevels.filter(t => t === 'Medium').length;
  
  if (heavyCount > sequence.length / 2) return 'Heavy';
  if (mediumCount > sequence.length / 2) return 'Medium';
  return 'Light';
}

/**
 * Generate waypoints for the primary route
 */
function generateWaypoints(route, currentLocation) {
  const waypoints = [];
  let accumulatedTime = 0;
  let previousLocation = currentLocation;
  
  // Add current location
  waypoints.push({
    name: 'Current Location',
    coords: currentLocation,
    eta: 0,
    type: 'current'
  });
  
  // Add pickup location (store)
  const storeLocation = { lat: 9.7479, lng: 76.5276 };
  const timeToStore = estimateDuration(currentLocation, storeLocation);
  accumulatedTime += timeToStore;
  
  waypoints.push({
    name: 'Pickup - TinyTots Store',
    coords: storeLocation,
    eta: accumulatedTime,
    type: 'pickup'
  });
  
  previousLocation = storeLocation;
  
  // Add delivery locations
  route.sequence.forEach((location, index) => {
    const travelTime = estimateDuration(previousLocation, location.coordinates);
    accumulatedTime += travelTime;
    
    waypoints.push({
      name: `Delivery ${index + 1} - ${location.name}`,
      coords: location.coordinates,
      eta: accumulatedTime,
      type: 'delivery',
      priority: location.priority,
      orderNumber: location.orderNumber
    });
    
    previousLocation = location.coordinates;
  });
  
  return waypoints;
}

/**
 * Calculate confidence score for route
 */
function calculateConfidence(route) {
  let confidence = 95;
  
  // Reduce confidence based on traffic
  if (route.trafficLevel === 'Heavy') confidence -= 10;
  else if (route.trafficLevel === 'Medium') confidence -= 5;
  
  // Reduce confidence for longer routes
  if (route.totalDistance > 20) confidence -= 10;
  else if (route.totalDistance > 10) confidence -= 5;
  
  return Math.max(70, confidence);
}

/**
 * Generate AI insights for route recommendations
 */
function generateAIInsights(primaryRoute, alternativeRoutes, deliveryLocations) {
  const insights = [];
  
  // Traffic insights
  if (primaryRoute.trafficLevel === 'Heavy') {
    insights.push('Heavy traffic detected on primary route - consider alternative routes');
  }
  
  // Priority delivery insights
  const highPriorityDeliveries = deliveryLocations.filter(d => d.priority === 'high');
  if (highPriorityDeliveries.length > 0) {
    insights.push(`${highPriorityDeliveries.length} high-priority delivery(ies) - optimized for early delivery`);
  }
  
  // Distance efficiency insights
  if (primaryRoute.totalDistance > 15) {
    insights.push('Long delivery route detected - consider breaking into multiple trips');
  }
  
  // Time-based insights
  const hour = new Date().getHours();
  if (hour >= 12 && hour <= 14) {
    insights.push('Lunch hour traffic - alternative routes may be faster');
  }
  
  // Alternative route insights
  if (alternativeRoutes.length > 0 && alternativeRoutes[0].totalDuration < primaryRoute.totalDuration) {
    insights.push(`Alternative route available: ${primaryRoute.totalDuration - alternativeRoutes[0].totalDuration} minutes faster`);
  }
  
  return insights;
}

/**
 * Generate route names for alternatives
 */
function generateRouteName(route) {
  const firstLocation = route.sequence[0];
  const lastLocation = route.sequence[route.sequence.length - 1];
  
  if (route.sequence.length === 1) {
    return `Direct to ${firstLocation.name}`;
  }
  
  return `${firstLocation.name} → ${lastLocation.name} Route`;
}

/**
 * Calculate advantage of alternative route
 */
function calculateAdvantage(primaryRoute, alternativeRoute) {
  const timeDiff = alternativeRoute.totalDuration - primaryRoute.totalDuration;
  const distanceDiff = alternativeRoute.totalDistance - primaryRoute.totalDistance;
  
  if (timeDiff < 0) {
    return `${Math.abs(timeDiff)} minutes faster`;
  } else if (distanceDiff < 0) {
    return `${Math.abs(distanceDiff)} km shorter`;
  } else {
    return 'Less traffic';
  }
}

/**
 * Check for priority adjustments
 */
function checkPriorityAdjustments(route) {
  const adjustments = [];
  
  route.sequence.forEach((location, index) => {
    if (location.priority === 'high' && index > 0) {
      adjustments.push({
        type: 'priority_reorder',
        delivery: location.name,
        currentPosition: index + 1,
        suggestedPosition: 1,
        reason: 'High priority delivery should be first'
      });
    }
  });
  
  return adjustments;
}

/**
 * Calculate traffic impact
 */
function calculateTrafficImpact(route) {
  const baseTime = route.totalDuration;
  const trafficMultiplier = route.trafficLevel === 'Heavy' ? 1.5 :
                           route.trafficLevel === 'Medium' ? 1.2 : 1.0;
  
  return {
    baseDuration: baseTime,
    adjustedDuration: Math.round(baseTime * trafficMultiplier),
    delayMinutes: Math.round(baseTime * (trafficMultiplier - 1)),
    impactLevel: route.trafficLevel
  };
}

/**
 * Calculate weather impact
 */
function calculateWeatherImpact() {
  // Mock weather data - replace with actual weather API
  const weatherConditions = ['Clear', 'Cloudy', 'Light Rain', 'Heavy Rain'];
  const currentWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
  
  const impact = {
    condition: currentWeather,
    delayMultiplier: currentWeather === 'Heavy Rain' ? 1.3 :
                     currentWeather === 'Light Rain' ? 1.1 : 1.0,
    recommendation: currentWeather === 'Heavy Rain' ? 'Allow extra time for deliveries' :
                    currentWeather === 'Light Rain' ? 'Drive carefully' :
                    'Normal driving conditions'
  };
  
  return impact;
}

/**
 * Calculate time of day impact
 */
function calculateTimeOfDayImpact() {
  const hour = new Date().getHours();
  
  if (hour >= 8 && hour <= 10) {
    return {
      period: 'Morning Rush',
      impactMultiplier: 1.4,
      recommendation: 'Expect heavy traffic - consider alternative routes'
    };
  } else if (hour >= 17 && hour <= 19) {
    return {
      period: 'Evening Rush',
      impactMultiplier: 1.5,
      recommendation: 'Peak traffic hours - routes may be slower'
    };
  } else if (hour >= 12 && hour <= 14) {
    return {
      period: 'Lunch Hour',
      impactMultiplier: 1.2,
      recommendation: 'Moderate traffic expected'
    };
  } else {
    return {
      period: 'Off-Peak',
      impactMultiplier: 1.0,
      recommendation: 'Optimal delivery conditions'
    };
  }
}

/**
 * Generate route recommendations
 */
function generateRecommendations(primaryRoute, deliveryLocations) {
  const recommendations = [];
  
  // Route optimization recommendations
  recommendations.push('Start with pickup at TinyTots Store before deliveries');
  
  // Priority-based recommendations
  const highPriorityCount = deliveryLocations.filter(d => d.priority === 'high').length;
  if (highPriorityCount > 0) {
    recommendations.push(`Prioritize ${highPriorityCount} high-priority delivery(ies) first`);
  }
  
  // Traffic-based recommendations
  if (primaryRoute.trafficLevel === 'Heavy') {
    recommendations.push('Consider using alternative routes to avoid heavy traffic');
  }
  
  // Time-based recommendations
  const hour = new Date().getHours();
  if (hour >= 17) {
    recommendations.push('Evening deliveries - ensure proper lighting and safety');
  }
  
  // Distance-based recommendations
  if (primaryRoute.totalDistance > 15) {
    recommendations.push('Long route detected - consider taking a break after halfway point');
  }
  
  // Customer service recommendations
  recommendations.push('Send ETA updates to customers before arrival');
  recommendations.push('Call customers 5 minutes before arrival for smooth delivery');
  
  return recommendations;
}

/**
 * Real-time route monitoring and recalculation
 * POST /api/delivery-assignments/:id/monitor-route
 */
router.post('/:id/monitor-route', auth, async (req, res) => {
  try {
    const { currentLocation, trafficConditions, weatherConditions } = req.body;
    const assignment = await DeliveryAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.deliveryAgent?.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get current route data
    const currentRoute = assignment.currentRoute || await getLastOptimizedRoute(assignment._id);
    
    if (!currentRoute) {
      return res.status(400).json({ message: 'No active route found' });
    }

    // Monitor route conditions
    const routeMonitoring = {
      currentLocation,
      timestamp: new Date(),
      conditions: {
        traffic: trafficConditions || await getCurrentTrafficData(currentLocation),
        weather: weatherConditions || await getCurrentWeatherData(currentLocation),
        timeOfDay: getTimeOfDayContext()
      },
      routeDeviation: calculateRouteDeviation(currentLocation, currentRoute),
      delayAnalysis: analyzeCurrentDelays(assignment, currentRoute)
    };

    // Check if recalculation is needed
    const shouldRecalculate = shouldTriggerRecalculation(routeMonitoring, currentRoute);
    
    let newRoute = null;
    let recalculationReason = null;
    
    if (shouldRecalculate.recalculate) {
      // Trigger route recalculation
      const recalculationResult = await recalculateRoute(
        assignment, 
        currentLocation, 
        routeMonitoring.conditions,
        shouldRecalculate.reason
      );
      
      newRoute = recalculationResult.newRoute;
      recalculationReason = recalculationResult.reason;
      
      // Update assignment with new route
      assignment.currentRoute = newRoute;
      assignment.routeHistory = assignment.routeHistory || [];
      assignment.routeHistory.push({
        timestamp: new Date(),
        route: currentRoute,
        recalculationReason: recalculationReason
      });
      await assignment.save();
    }

    // Update delivery progress
    const deliveryProgress = updateDeliveryProgress(assignment, currentLocation, currentRoute);

    res.json({
      message: shouldRecalculate.recalculate ? 'Route recalculated' : 'Route monitoring updated',
      monitoring: routeMonitoring,
      deliveryProgress,
      newRoute,
      recalculationReason,
      nextStop: deliveryProgress.nextStop,
      eta: deliveryProgress.eta
    });

  } catch (error) {
    console.error('Route monitoring error:', error);
    res.status(500).json({ message: 'Failed to monitor route', error: error.message });
  }
});

/**
 * Get last optimized route for assignment
 */
async function getLastOptimizedRoute(assignmentId) {
  try {
    // In a real implementation, this would fetch from a route cache or database
    // For now, return a mock route
    return {
      waypoints: [
        { name: 'Current Location', coords: { lat: 9.7479, lng: 76.5276 }, eta: 0 },
        { name: 'Pickup - TinyTots Store', coords: { lat: 9.7480, lng: 76.5277 }, eta: 10 },
        { name: 'Delivery - Customer', coords: { lat: 9.7490, lng: 76.5280 }, eta: 25 }
      ],
      totalDistance: 4.2,
      totalDuration: 25,
      trafficLevel: 'Medium'
    };
  } catch (error) {
    console.error('Error getting last route:', error);
    return null;
  }
}

/**
 * Get current traffic data
 */
async function getCurrentTrafficData(location) {
  try {
    // Mock traffic data - replace with real traffic API
    const hour = new Date().getHours();
    const isRushHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
    
    return {
      level: isRushHour ? 'Heavy' : 'Medium',
      speed: isRushHour ? 15 : 25, // km/h
      incidents: Math.random() > 0.8 ? ['Minor accident on Main St'] : [],
      congestion: isRushHour ? 0.7 : 0.3 // 0-1 scale
    };
  } catch (error) {
    console.error('Error getting traffic data:', error);
    return { level: 'Medium', speed: 25, incidents: [], congestion: 0.3 };
  }
}

/**
 * Get current weather data
 */
async function getCurrentWeatherData(location) {
  try {
    // Mock weather data - replace with real weather API
    const conditions = ['Clear', 'Cloudy', 'Light Rain', 'Heavy Rain'];
    const currentCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      condition: currentCondition,
      temperature: 25 + Math.random() * 10, // 25-35°C
      visibility: currentCondition === 'Heavy Rain' ? 0.5 : 1.0,
      windSpeed: 5 + Math.random() * 15, // 5-20 km/h
      impact: currentCondition === 'Heavy Rain' ? 'High' : 
              currentCondition === 'Light Rain' ? 'Medium' : 'Low'
    };
  } catch (error) {
    console.error('Error getting weather data:', error);
    return { condition: 'Clear', temperature: 28, visibility: 1.0, windSpeed: 10, impact: 'Low' };
  }
}

/**
 * Get time of day context
 */
function getTimeOfDayContext() {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) {
    return { period: 'Morning', rushHour: hour >= 8 && hour <= 10 };
  } else if (hour >= 12 && hour < 17) {
    return { period: 'Afternoon', rushHour: false };
  } else if (hour >= 17 && hour < 21) {
    return { period: 'Evening', rushHour: hour >= 17 && hour <= 19 };
  } else {
    return { period: 'Night', rushHour: false };
  }
}

/**
 * Calculate route deviation
 */
function calculateRouteDeviation(currentLocation, currentRoute) {
  try {
    // Find the closest waypoint
    let closestWaypoint = null;
    let minDistance = Infinity;
    
    currentRoute.waypoints.forEach((waypoint, index) => {
      const distance = calculateDistance(currentLocation, waypoint.coords);
      if (distance < minDistance) {
        minDistance = distance;
        closestWaypoint = { ...waypoint, index };
      }
    });
    
    // Calculate deviation from expected route
    const expectedDistance = closestWaypoint ? 
      calculateDistance(currentRoute.waypoints[0].coords, closestWaypoint.coords) : 0;
    const actualDistance = closestWaypoint ? 
      calculateDistance(currentLocation, closestWaypoint.coords) : 0;
    
    const deviation = Math.abs(actualDistance - expectedDistance);
    
    return {
      isOffRoute: deviation > 0.5, // 500m threshold
      deviationDistance: Math.round(deviation * 1000), // meters
      closestWaypoint: closestWaypoint?.name || 'Unknown',
      recommendedAction: deviation > 1 ? 'Significant deviation - consider rerouting' : 'On track'
    };
  } catch (error) {
    console.error('Error calculating route deviation:', error);
    return { isOffRoute: false, deviationDistance: 0, closestWaypoint: 'Unknown', recommendedAction: 'Monitor' };
  }
}

/**
 * Analyze current delays
 */
function analyzeCurrentDelays(assignment, currentRoute) {
  try {
    const now = new Date();
    const expectedTime = assignment.expectedDeliveryTime || 
                       new Date(assignment.acceptedAt?.getTime() + currentRoute.totalDuration * 60000);
    
    const delayMinutes = Math.round((now - expectedTime) / 60000);
    
    return {
      isDelayed: delayMinutes > 5,
      delayMinutes: Math.max(0, delayMinutes),
      onTime: delayMinutes <= 5,
      early: delayMinutes < -5,
      impactLevel: delayMinutes > 15 ? 'High' : delayMinutes > 10 ? 'Medium' : 'Low'
    };
  } catch (error) {
    console.error('Error analyzing delays:', error);
    return { isDelayed: false, delayMinutes: 0, onTime: true, early: false, impactLevel: 'Low' };
  }
}

/**
 * Determine if recalculation should be triggered
 */
function shouldTriggerRecalculation(monitoring, currentRoute) {
  const reasons = [];
  
  // Check for heavy traffic
  if (monitoring.conditions.traffic.level === 'Heavy' && currentRoute.trafficLevel !== 'Heavy') {
    reasons.push('Heavy traffic detected on current route');
  }
  
  // Check for weather impact
  if (monitoring.conditions.weather.impact === 'High') {
    reasons.push('Severe weather conditions affecting route');
  }
  
  // Check for route deviation
  if (monitoring.routeDeviation.isOffRoute && monitoring.routeDeviation.deviationDistance > 1000) {
    reasons.push('Significant route deviation detected');
  }
  
  // Check for delays
  if (monitoring.delayAnalysis.isDelayed && monitoring.delayAnalysis.delayMinutes > 10) {
    reasons.push('Significant delay detected');
  }
  
  // Check for traffic incidents
  if (monitoring.conditions.traffic.incidents.length > 0) {
    reasons.push('Traffic incidents reported on route');
  }
  
  return {
    recalculate: reasons.length > 0,
    reason: reasons.join('; '),
    priority: reasons.length > 2 ? 'High' : reasons.length > 0 ? 'Medium' : 'Low'
  };
}

/**
 * Recalculate route based on current conditions
 */
async function recalculateRoute(assignment, currentLocation, conditions, reason) {
  try {
    console.log(`🔄 Recalculating route for assignment ${assignment._id} due to: ${reason}`);
    
    // Get all active deliveries for this agent
    const agentAssignments = await DeliveryAssignment.find({
      deliveryAgent: assignment.deliveryAgent,
      status: { $in: ['accepted', 'picked_up', 'in_transit'] }
    }).populate('order customer vendor');
    
    // Build delivery locations with current conditions
    const deliveryLocations = agentAssignments.map(a => ({
      id: a._id,
      name: a.customerName,
      address: a.deliveryLocation?.address,
      coordinates: a.deliveryLocation?.coordinates,
      priority: a.order?.priority || 'normal',
      orderNumber: a.orderNumber,
      estimatedValue: a.deliveryFee || 0
    }));
    
    // Generate new routes considering current conditions
    const storeLocation = assignment.pickupLocation?.coordinates || 
                          { lat: 9.7479, lng: 76.5276 };
    
    const possibleRoutes = generateDeliverySeences(storeLocation, deliveryLocations);
    
    // Score routes with current conditions
    const scoredRoutes = possibleRoutes.map(route => ({
      ...route,
      score: calculateDynamicRouteScore(route, currentLocation, conditions)
    }));
    
    scoredRoutes.sort((a, b) => a.score - b.score);
    const bestRoute = scoredRoutes[0];
    
    const newRoute = {
      ...bestRoute,
      waypoints: generateWaypoints(bestRoute, currentLocation),
      recalculationTimestamp: new Date(),
      recalculationReason: reason,
      conditions: conditions,
      confidence: calculateConfidence(bestRoute),
      optimizationScore: Math.round((1 - (bestRoute.score / 100)) * 100)
    };
    
    return {
      newRoute,
      reason,
      improvement: calculateRouteImprovement(assignment.currentRoute, newRoute)
    };
  } catch (error) {
    console.error('Error recalculating route:', error);
    return {
      newRoute: assignment.currentRoute,
      reason: 'Recalculation failed - using existing route',
      improvement: null
    };
  }
}

/**
 * Calculate dynamic route score with current conditions
 */
function calculateDynamicRouteScore(route, currentLocation, conditions) {
  const baseScore = calculateRouteScore(route, currentLocation);
  
  // Adjust score based on current conditions
  let adjustment = 0;
  
  // Traffic adjustment
  if (conditions.traffic.level === 'Heavy') {
    adjustment += 20;
  } else if (conditions.traffic.level === 'Medium') {
    adjustment += 10;
  }
  
  // Weather adjustment
  if (conditions.weather.impact === 'High') {
    adjustment += 15;
  } else if (conditions.weather.impact === 'Medium') {
    adjustment += 7;
  }
  
  // Time of day adjustment
  if (conditions.timeOfDay.rushHour) {
    adjustment += 12;
  }
  
  return Math.min(100, baseScore + adjustment);
}

/**
 * Calculate route improvement
 */
function calculateRouteImprovement(oldRoute, newRoute) {
  if (!oldRoute) return null;
  
  const timeImprovement = oldRoute.totalDuration - newRoute.totalDuration;
  const distanceImprovement = oldRoute.totalDistance - newRoute.totalDistance;
  
  return {
    timeSaved: Math.max(0, timeImprovement),
    distanceReduced: Math.max(0, distanceImprovement),
    efficiencyGain: timeImprovement > 0 || distanceImprovement > 0
  };
}

/**
 * Update delivery progress
 */
function updateDeliveryProgress(assignment, currentLocation, currentRoute) {
  try {
    // Find current position in route
    let currentWaypointIndex = 0;
    let nextWaypoint = null;
    let remainingDistance = 0;
    let remainingTime = 0;
    
    for (let i = 0; i < currentRoute.waypoints.length; i++) {
      const waypoint = currentRoute.waypoints[i];
      const distance = calculateDistance(currentLocation, waypoint.coords);
      
      if (distance < 0.3) { // Within 300m of waypoint
        currentWaypointIndex = i;
      } else if (!nextWaypoint && distance > 0.3) {
        nextWaypoint = waypoint;
        
        // Calculate remaining distance and time
        for (let j = i; j < currentRoute.waypoints.length - 1; j++) {
          const segmentDistance = calculateDistance(
            currentRoute.waypoints[j].coords,
            currentRoute.waypoints[j + 1].coords
          );
          remainingDistance += segmentDistance;
          remainingTime += estimateDuration(
            currentRoute.waypoints[j].coords,
            currentRoute.waypoints[j + 1].coords
          );
        }
        break;
      }
    }
    
    return {
      currentWaypoint: currentRoute.waypoints[currentWaypointIndex],
      nextStop: nextWaypoint,
      progressPercentage: Math.round((currentWaypointIndex / (currentRoute.waypoints.length - 1)) * 100),
      remainingDistance: Math.round(remainingDistance * 10) / 10,
      eta: remainingTime,
      completedWaypoints: currentRoute.waypoints.slice(0, currentWaypointIndex + 1),
      upcomingWaypoints: currentRoute.waypoints.slice(currentWaypointIndex + 1)
    };
  } catch (error) {
    console.error('Error updating delivery progress:', error);
    return {
      currentWaypoint: null,
      nextStop: null,
      progressPercentage: 0,
      remainingDistance: 0,
      eta: 0,
      completedWaypoints: [],
      upcomingWaypoints: currentRoute.waypoints || []
    };
  }
}

/**
 * Send customer notifications for delivery updates
 * POST /api/delivery-assignments/:id/customer-notification
 */
router.post('/:id/customer-notification', auth, async (req, res) => {
  try {
    const { status, location, estimatedTime } = req.body;
    const assignment = await DeliveryAssignment.findById(req.params.id).populate('order');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Get customer email from order
    const customerEmail = assignment.order?.customer?.email || assignment.deliveryLocation?.email;
    const customerName = assignment.order?.customer?.name || assignment.deliveryLocation?.contactPerson;
    
    if (!customerEmail) {
      return res.status(400).json({ message: 'Customer email not found' });
    }

    // Prepare notification data
    const notificationData = {
      orderNumber: assignment.orderNumber || assignment.order?.orderNumber || assignment._id?.slice(-6),
      customerName,
      customerEmail,
      status,
      estimatedDeliveryTime: estimatedTime,
      currentLocation: location,
      deliveryAgent: assignment.deliveryAgent,
      vendorName: assignment.vendorName,
      items: assignment.items || assignment.order?.items
    };

    // Send email notification
    await sendCustomerDeliveryNotification(notificationData);

    res.json({
      message: 'Customer notification sent successfully',
      customerEmail,
      status
    });

  } catch (error) {
    console.error('Customer notification error:', error);
    res.status(500).json({ message: 'Failed to send customer notification', error: error.message });
  }
});

/**
 * Send email notification to customer
 */
async function sendCustomerDeliveryNotification(data) {
  try {
    // This would integrate with your email service (Nodemailer, SendGrid, etc.)
    console.log('📧 Sending customer notification:', {
      to: data.customerEmail,
      subject: `Delivery Update for Order #${data.orderNumber}`,
      status: data.status,
      customerName: data.customerName
    });

    // Mock email sending - replace with actual email service
    const emailContent = generateEmailTemplate(data);
    
    // TODO: Replace with actual email sending logic
    // Example with nodemailer:
    /*
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: data.customerEmail,
      subject: `Delivery Update for Order #${data.orderNumber}`,
      html: emailContent
    });
    */

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate email template for customer notifications
 */
function generateEmailTemplate(data) {
  const statusMessages = {
    'accepted': '🚚 Your order has been accepted by our delivery agent',
    'picked_up': '📦 Your order has been picked up from the store',
    'in_transit': '🛵 Your order is on the way to your location',
    'delivered': '✅ Your order has been successfully delivered'
  };

  const statusTitle = statusMessages[data.status] || '📦 Delivery Update';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>TinyTots Delivery Update</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #13b655; }
        .status { background-color: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
        .order-info { margin-bottom: 20px; }
        .tracking { background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">👶 TinyTots Daycare</div>
          <h2>Delivery Update</h2>
        </div>
        
        <div class="status">
          <h3>${statusTitle}</h3>
          <p>Order #${data.orderNumber}</p>
        </div>
        
        <div class="order-info">
          <h4>Order Details:</h4>
          <p><strong>Customer:</strong> ${data.customerName}</p>
          <p><strong>Status:</strong> ${data.status.replace('_', ' ').toUpperCase()}</p>
          ${data.estimatedDeliveryTime ? `<p><strong>Estimated Delivery:</strong> ${data.estimatedDeliveryTime} minutes</p>` : ''}
          ${data.vendorName ? `<p><strong>Store:</strong> ${data.vendorName}</p>` : ''}
        </div>
        
        ${data.currentLocation ? `
        <div class="tracking">
          <h4>📍 Live Tracking:</h4>
          <p>Your delivery agent is currently at:</p>
          <p><strong>Location:</strong> ${data.currentLocation.lat.toFixed(4)}, ${data.currentLocation.lng.toFixed(4)}</p>
          <p><small>Note: You can track your delivery in real-time on our website</small></p>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Thank you for choosing TinyTots Daycare! 🎉</p>
          <p><small>If you have any questions, please contact our support team.</small></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;
