const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Review = require('../models/Review');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const { calculateOrderCommission } = require('../utils/commissionCalculator');
const PlatformSettings = require('../models/PlatformSettings');
const { sendOrderConfirmationEmail, sendOrderStatusEmail } = require('../utils/emailService');

// Create order (customer)
router.post('/', auth, async (req, res) => {
  try {
    const { items, shippingAddress, billingAddress, paymentMethod, paymentId, paymentStatus } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    // Validate products and get vendors
    const vendors = new Set();
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product).populate('vendor');
      if (!product) {
        return res.status(400).json({ message: `Product ${item.product} not found` });
      }

      // Check stock quantity
      const availableStock = product.stockQty ?? 0;
      if (availableStock <= 0 || !product.inStock) {
        return res.status(400).json({ message: `Product ${product.name} is out of stock` });
      }

      // Check if requested quantity exceeds available stock
      if (item.quantity > availableStock) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Only ${availableStock} available, but ${item.quantity} requested.` 
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        name: product.name,
        image: product.image,
        vendor: product.vendor?._id
      });

      if (product.vendor) {
        vendors.add(product.vendor._id.toString());
      }
    }

    const shipping = subtotal > 500 ? 0 : 50; // Free shipping over ₹500
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + shipping + tax;

    // Determine payment status based on payment method
    let finalPaymentStatus = 'pending';
    if (paymentMethod === 'cash_on_delivery') {
      finalPaymentStatus = 'pending'; // Payment on delivery
    } else if (paymentId && paymentStatus === 'paid') {
      finalPaymentStatus = 'paid'; // Online payment successful
    }

    // Create order
    let customerId = req.user.customerId || req.user.userId;
    
    // If this is a staff/parent user (not a customer), create a customer record for them
    if (req.user.userId && !req.user.customerId) {
      try {
        const existingCustomer = await Customer.findOne({ email: req.user.email });
        if (existingCustomer) {
          customerId = existingCustomer._id;
        } else {
          // Create a customer record for staff/parent user
          const customer = new Customer({
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            phone: req.user.phone || '',
            password: req.user.password, // Use existing password
            address: req.user.address || {}
          });
          await customer.save();
          customerId = customer._id;
          console.log(`Created customer record for staff/parent user: ${req.user.email}`);
        }
      } catch (error) {
        console.error('Error creating customer record for staff/parent:', error);
        // Continue with userId if customer creation fails
      }
    }
    
    const order = new Order({
      customer: customerId,
      items: orderItems,
      shippingAddress,
      billingAddress,
      subtotal,
      shipping,
      tax,
      total,
      paymentMethod,
      paymentId,
      paymentStatus: finalPaymentStatus,
      assignedVendors: Array.from(vendors),
      status: finalPaymentStatus === 'paid' ? 'confirmed' : 'pending'
    });

    await order.save();

    // Decrement stock for each product in the order
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product) {
        const newStockQty = Math.max(0, (product.stockQty ?? 0) - item.quantity);
        product.stockQty = newStockQty;
        product.inStock = newStockQty > 0;
        
        // Add stock update to history
        product.vendorStockUpdates.push({
          updatedAt: new Date(),
          previousStock: product.stockQty + item.quantity,
          newStock: newStockQty,
          updatedBy: product.vendor || null,
          reason: `Order ${order.orderNumber || order._id} - Sold ${item.quantity} units`
        });
        
        await product.save();
      }
    }

    // Update customer stats
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { totalOrders: 1, totalSpent: total }
    });

    // Auto-generate invoice for paid orders
    if (finalPaymentStatus === 'paid') {
      try {
        const Invoice = require('../models/Invoice');
        const invoice = new Invoice({
          order: order._id,
          customer: customerId,
          items: orderItems.map(item => ({
            product: item.product,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
            vendor: item.vendor
          })),
          subtotal: order.subtotal,
          shipping: order.shipping,
          tax: order.tax,
          total: order.total,
          billingAddress: order.billingAddress,
          shippingAddress: order.shippingAddress,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          status: 'paid',
          paidAt: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          notes: 'Thank you for your purchase!',
          terms: 'Payment due within 30 days of invoice date.'
        });
        await invoice.save();
        console.log(`✅ Invoice generated for order ${order._id}`);
      } catch (invoiceError) {
        console.error('Error generating invoice:', invoiceError);
        // Don't fail the order if invoice generation fails
      }
    }

    // If payment is successful, notify admin and vendors immediately
    if (finalPaymentStatus === 'paid') {
      try {
        const admin = await User.findOne({ role: 'admin' });
        if (admin) {
          // TODO: Send email notification to admin
          console.log(`Paid order ${order.orderNumber} placed - notify admin ${admin.email}`);
        }

        // Notify vendors about paid order
        const uniqueVendors = [...new Set(order.items.map(item => item.vendor._id.toString()))];
        for (const vendorId of uniqueVendors) {
          const vendor = await Vendor.findById(vendorId);
          if (vendor) {
            // TODO: Send email notification to vendor
            console.log(`Paid order ${order.orderNumber} assigned to vendor ${vendor.email}`);
          }
        }
      } catch (e) {
        console.warn('Order notification failed:', e.message);
      }
    } else {
      // For COD orders, notify admin about new order
      try {
        const admin = await User.findOne({ role: 'admin' });
        if (admin) {
          // TODO: Send email notification to admin
          console.log(`COD order ${order.orderNumber} placed - notify admin ${admin.email}`);
        }
      } catch (e) {
        console.warn('Admin order notification failed:', e.message);
      }
    }

    // Send order confirmation email to customer
    try {
      const customer = await Customer.findById(customerId);
      if (customer) {
        // Populate order with full product and vendor details for email
        const populatedOrder = await Order.findById(order._id)
          .populate('items.product')
          .populate('items.vendor', 'businessName');
        
        await sendOrderConfirmationEmail(populatedOrder, customer);
      }
    } catch (emailErr) {
      console.error('Email notification error:', emailErr);
      // Don't fail order if email fails
    }

    res.status(201).json({
      message: finalPaymentStatus === 'paid'
        ? 'Order placed and payment processed successfully!'
        : 'Order placed successfully! Payment will be collected on delivery.',
      orderNumber: order.orderNumber,
      order
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error creating order' });
  }
});

// Get customer's own orders (for parents/customers)
router.get('/my-orders', auth, async (req, res) => {
  try {
    // Get customer ID - could be from customerId or userId (for parents)
    let customerId = req.user.customerId || req.user.userId;
    
    // If parent/user, check if they have a customer record
    if (req.user.userId && !req.user.customerId) {
      const existingCustomer = await Customer.findOne({ email: req.user.email });
      if (existingCustomer) {
        customerId = existingCustomer._id;
      }
    }

    if (!customerId) {
      return res.status(404).json({ message: 'No orders found' });
    }

    const orders = await Order.find({ customer: customerId })
      .populate('items.product', 'name image price')
      .populate('items.vendor', 'vendorName email')
      .populate('deliveryAssignments')
      .sort({ createdAt: -1 });

    res.json({
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Get single order details (for tracking)
router.get('/track/:orderNumber', auth, async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name image price')
      .populate('items.vendor', 'vendorName email')
      .populate({
        path: 'deliveryAssignments',
        populate: {
          path: 'deliveryAgent',
          select: 'firstName lastName phone'
        }
      });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user has permission to view this order
    const customerId = req.user.customerId || req.user.userId;
    const isOwner = order.customer._id.toString() === customerId.toString();
    const isAdmin = req.user.role === 'admin';
    const isVendor = req.user.role === 'vendor' && order.items.some(item => 
      item.vendor?._id?.toString() === (req.user.vendorId || req.user.userId).toString()
    );

    if (!isOwner && !isAdmin && !isVendor) {
      return res.status(403).json({ message: 'Unauthorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ message: 'Failed to fetch order details' });
  }
});

// Get customer orders
router.get('/customer', auth, async (req, res) => {
  try {
    let customerId = req.user.customerId || req.user.userId;
    
    // If this is a staff/parent user, find their customer record
    if (req.user.userId && !req.user.customerId) {
      const customer = await Customer.findOne({ email: req.user.email });
      if (customer) {
        customerId = customer._id;
      }
    }
    
    const { page = 1, limit = 10, status } = req.query;

    let query = { customer: customerId };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('items.product', 'name image category')
      .populate('items.vendor', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single order details (customer)
router.get('/customer/:orderId', auth, async (req, res) => {
  try {
    let customerId = req.user.customerId || req.user.userId;
    
    // If this is a staff/parent user, find their customer record
    if (req.user.userId && !req.user.customerId) {
      const customer = await Customer.findOne({ email: req.user.email });
      if (customer) {
        customerId = customer._id;
      }
    }
    
    const order = await Order.findOne({
      _id: req.params.orderId,
      customer: customerId
    })
    .populate('items.product', 'name image category')
    .populate('items.vendor', 'name email')
    .populate('vendorConfirmations.vendor', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all orders
router.get('/admin', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { page = 1, limit = 20, status, search } = req.query;

    let query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      // Search by order number or customer email
      const customers = await Customer.find({
        email: { $regex: search, $options: 'i' }
      }).select('_id');
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customer: { $in: customers.map(c => c._id) } }
      ];
    }

    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name image')
      .populate('items.vendor', 'businessName email')
      .populate('vendorConfirmations.vendor', 'businessName email')
      .populate('deliveryAssignments')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Confirm order and assign to vendors
router.put('/admin/:orderId/confirm', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { estimatedDelivery, notes } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        status: 'confirmed',
        adminConfirmed: true,
        adminConfirmedAt: new Date(),
        adminConfirmedBy: req.user.userId,
        estimatedDelivery,
        notes,
        customerNotified: true
      },
      { new: true }
    ).populate('customer', 'firstName lastName email')
     .populate('items.vendor', 'businessName email')
     .populate('vendorConfirmations.vendor', 'businessName email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Initialize vendor confirmations if not already done
    if (!order.vendorConfirmations || order.vendorConfirmations.length === 0) {
      const uniqueVendors = [...new Set(order.items.map(item => item.vendor._id.toString()))];
      const vendorConfirmations = uniqueVendors.map(vendorId => ({
        vendor: vendorId,
        status: 'pending'
      }));

      await Order.findByIdAndUpdate(req.params.orderId, {
        vendorConfirmations,
        status: 'confirmed'
      });
    }

    // Notify vendors about order assignment
    try {
      const uniqueVendors = [...new Set(order.items.map(item => item.vendor._id.toString()))];
      for (const vendorId of uniqueVendors) {
        const vendor = await Vendor.findById(vendorId);
        if (vendor) {
          // TODO: Send email notification to vendor
          console.log(`Order ${order.orderNumber} assigned to vendor ${vendor.email}`);
        }
      }
    } catch (e) {
      console.warn('Vendor notification failed:', e.message);
    }

    // Notify customer
    try {
      // TODO: Send email notification to customer
      console.log(`Order ${order.orderNumber} confirmed - notify customer ${order.customer.email}`);
    } catch (e) {
      console.warn('Customer notification failed:', e.message);
    }

    res.json(order);
  } catch (error) {
    console.error('Confirm order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Vendor: Get assigned orders
router.get('/vendor', auth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const vendorId = req.user.vendorId || req.user.userId;
    const { page = 1, limit = 20, status } = req.query;

    let query = {
      'vendorConfirmations.vendor': vendorId,
      adminConfirmed: true
    };

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name image')
      .populate('vendorConfirmations.vendor', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get vendor orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Vendor: Confirm order fulfillment
router.put('/vendor/:orderId/confirm', auth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, notes, trackingNumber } = req.body;
    const vendorId = req.user.vendorId || req.user.userId;

    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.orderId,
        'vendorConfirmations.vendor': vendorId
      },
      {
        $set: {
          'vendorConfirmations.$.status': status,
          'vendorConfirmations.$.confirmedAt': new Date(),
          'vendorConfirmations.$.notes': notes,
          ...(trackingNumber && { trackingNumber })
        }
      },
      { new: true }
    ).populate('customer', 'firstName lastName email phone')
     .populate('items.vendor', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // STEP 1: Calculate commission if not already done
    if (!order.commissionCalculated && status === 'confirmed') {
      try {
        const commissionResult = await calculateOrderCommission(order);
        console.log(`✅ Commission calculated for order ${order.orderNumber}: ₹${commissionResult.platformRevenue.toFixed(2)}`);
      } catch (commErr) {
        console.error('Commission calculation error:', commErr);
        // Continue even if commission fails
      }
    }

    // STEP 2: Create delivery assignment for this vendor
    if (status === 'confirmed') {
      try {
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
          throw new Error('Vendor not found');
        }

        // Get vendor's items from order
        const vendorItems = order.items.filter(item => 
          item.vendor?._id?.toString() === vendorId.toString()
        );

        if (vendorItems.length > 0) {
          // Calculate delivery fee for this vendor's portion
          const itemsValue = vendorItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const vendorDeliveryFee = (itemsValue / order.total) * order.shipping;

          // Get platform settings for commission split
          const settings = await PlatformSettings.getSettings();
          const deliverySplit = settings.commissions.delivery;
          const agentShare = vendorDeliveryFee * (deliverySplit.agentShare / 100);
          const platformShare = vendorDeliveryFee * (deliverySplit.platformShare / 100);

          // Create delivery assignment
          const assignment = await DeliveryAssignment.create({
            order: order._id,
            orderNumber: order.orderNumber,
            vendor: vendor._id,
            vendorName: vendor.vendorName,
            customer: order.customer._id,
            customerName: `${order.customer.firstName} ${order.customer.lastName}`,
            pickupLocation: {
              address: vendor.warehouseLocation?.address || vendor.address,
              coordinates: vendor.warehouseLocation?.coordinates || { lat: 0, lng: 0 },
              zone: vendor.warehouseLocation?.zone || 'Unknown',
              contactPerson: vendor.warehouseLocation?.contactPerson || vendor.vendorName
            },
            deliveryLocation: {
              address: order.shippingAddress.fullAddress,
              coordinates: {
                lat: order.shippingAddress.latitude || 0,
                lng: order.shippingAddress.longitude || 0
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
            assignmentType: 'pending' // Will be set when assigned
          });

          // Add to order's delivery assignments
          order.deliveryAssignments.push(assignment._id);
          await order.save();

          console.log(`✅ Delivery assignment created: ${assignment._id}`);
          console.log(`📦 Vendor: ${vendor.vendorName}, Delivery Fee: ₹${vendorDeliveryFee.toFixed(2)}`);

          // STEP 3: Check if we should auto-assign or wait for manual
          
          if (settings.autoAssignment.enabled) {
            // 🤖 AUTO-ASSIGNMENT MODE: Trigger immediately
            console.log(`🤖 Auto-assignment enabled - assigning agent for ${assignment._id}`);
            try {
              const { autoAssignDeliveryAgent } = require('../utils/autoAssignment');
              const assignedAssignment = await autoAssignDeliveryAgent(assignment);
              
              if (assignedAssignment && assignedAssignment.deliveryAgent) {
                console.log(`✅ Auto-assigned to agent: ${assignedAssignment.agentName}`);
                // TODO: Send notification to agent
              } else {
                console.log(`⚠️ No available agents - assignment remains pending`);
                // TODO: Send notification to admin
              }
            } catch (autoErr) {
              console.error('Auto-assignment error:', autoErr);
              // Assignment stays pending for manual assignment
            }
          } else {
            // 📋 MANUAL MODE: Admin/Vendor will assign later
            console.log(`📋 Manual assignment mode - assignment pending admin action`);
            // TODO: Send notification to admin for manual assignment
          }
        }
      } catch (deliveryErr) {
        console.error('Delivery assignment error:', deliveryErr);
        // Continue even if delivery assignment fails
      }
    }

    // Check if all vendors have confirmed
    const allConfirmed = order.vendorConfirmations.every(conf => conf.status === 'confirmed');
    if (allConfirmed) {
      await Order.findByIdAndUpdate(req.params.orderId, {
        status: 'processing'
      });
      console.log(`🎉 All vendors confirmed order ${order.orderNumber} - Status: processing`);
      
      // Send email notification to customer about processing
      try {
        const customer = await Customer.findById(order.customer);
        if (customer) {
          const updatedOrder = await Order.findById(req.params.orderId)
            .populate('items.product')
            .populate('items.vendor', 'businessName')
            .populate('deliveryAssignments');
          await sendOrderStatusEmail(updatedOrder, customer, 'processing');
        }
      } catch (emailErr) {
        console.error('Email notification error:', emailErr);
      }
    }

    // Notify admin about vendor confirmation
    try {
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        // TODO: Send email notification to admin
        console.log(`Vendor ${vendorId} ${status} order ${order.orderNumber}`);
      }
    } catch (e) {
      console.warn('Admin vendor confirmation notification failed:', e.message);
    }

    res.json(order);
  } catch (error) {
    console.error('Vendor confirm order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========================================================================
// NOTE: Admin should NOT directly mark orders as shipped/delivered.
// Proper flow: Admin confirms → Vendor confirms → Delivery agent ships/delivers
// The routes below are DISABLED to enforce proper workflow.
// Delivery status updates are handled through /api/delivery-assignments routes
// ========================================================================

// Get order by order number (for tracking)
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name image category')
      .populate('items.vendor', 'name email')
      .populate('vendorConfirmations.vendor', 'name email')
      .populate('adminConfirmedBy', 'firstName lastName');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Create timeline
    const flow = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const stageIndexMap = {
      pending: 0,
      confirmed: 1,
      processing: 2,
      shipped: 3,
      delivered: 4,
      cancelled: 2,
      refunded: 4,
    };
    const stageIndex = stageIndexMap[order.status] ?? 0;
    const timeline = flow.map((key, idx) => ({
      key,
      label: key === 'pending' ? 'Order Placed' :
             key === 'confirmed' ? 'Confirmed by Admin' :
             key === 'processing' ? 'Being Prepared' :
             key === 'shipped' ? 'Shipped' :
             'Delivered',
      completed: idx <= stageIndex,
      date: order.status === key ? order.updatedAt : null
    }));

    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      placedAt: order.createdAt,
      updatedAt: order.updatedAt,
      trackingNumber: order.trackingNumber || '',
      totals: {
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        total: order.total,
      },
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      items: order.items.map(item => ({
        id: item.product?._id || item.product,
        name: item.name || item.product?.name || '',
        image: item.image || item.product?.image || '',
        quantity: item.quantity,
        price: item.price,
        vendor: item.vendor?.name || 'Unknown Vendor'
      })),
      customer: order.customer,
      timeline,
      adminConfirmed: order.adminConfirmed,
      adminConfirmedAt: order.adminConfirmedAt,
      estimatedDelivery: order.estimatedDelivery
    });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ message: 'Server error tracking order' });
  }
});

// Admin: Get order statistics
router.get('/admin/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });

    const revenueThisMonth = await Order.aggregate([
      {
        $match: {
          status: { $in: ['delivered', 'shipped'] },
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      revenueThisMonth: revenueThisMonth[0]?.total || 0,
      ordersByStatus
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
