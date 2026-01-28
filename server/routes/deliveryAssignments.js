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

module.exports = router;
