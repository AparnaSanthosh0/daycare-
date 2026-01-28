const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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
    
    // Initialize vendorConfirmations array for each unique vendor
    // This allows vendors to see orders in their dashboard immediately after admin confirms
    // Ensure vendor IDs are ObjectIds for proper MongoDB querying
    const vendorConfirmations = Array.from(vendors).map(vendorId => {
      const vendorObjectId = mongoose.Types.ObjectId.isValid(vendorId) 
        ? new mongoose.Types.ObjectId(vendorId) 
        : vendorId;
      return {
        vendor: vendorObjectId,
        status: 'pending'
      };
    });

    console.log(`📦 Creating order with ${vendorConfirmations.length} vendor confirmations`);
    console.log(`   Vendor IDs: ${vendorConfirmations.map(c => c.vendor.toString()).join(', ')}`);

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
      assignedVendors: Array.from(vendors).map(v => mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : v),
      vendorConfirmations: vendorConfirmations, // Initialize vendor confirmations
      status: 'pending' // Always start as pending, admin must confirm
    });

    await order.save();
    console.log(`✅ Order ${order.orderNumber} created with vendorConfirmations:`, 
      order.vendorConfirmations?.map(vc => ({ vendor: vc.vendor.toString(), status: vc.status })));

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
        const uniqueVendors = [...new Set(order.items.map(item => {
          // item.vendor might be ObjectId or populated object
          return item.vendor?._id ? item.vendor._id.toString() : item.vendor?.toString();
        }).filter(Boolean))];
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

// Admin: Create delivery assignments for existing confirmed orders
// IMPORTANT: These routes must come BEFORE /admin/:orderId/confirm to avoid route conflicts

// Test route (GET) to verify routing works - NO AUTH for testing
router.get('/admin/create-delivery-assignments-test', (req, res) => {
  console.log('✅ TEST ROUTE HIT: /admin/create-delivery-assignments-test');
  res.json({ 
    message: 'Route is accessible! Server is working.', 
    timestamp: new Date().toISOString(),
    routeVersion: '2.0',
    availableRoutes: [
      'POST /api/orders/admin/create-delivery-assignments',
      'POST /api/orders/admin/repair-orders',
      'PUT /api/orders/admin/:orderId/confirm'
    ]
  });
});

// Main route for creating delivery assignments
router.post('/admin/create-delivery-assignments', auth, async (req, res) => {
  console.log('✅ POST /admin/create-delivery-assignments hit');
  console.log('   Request body:', req.body);
  console.log('   User:', req.user ? { role: req.user.role, userId: req.user.userId } : 'No user');
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('🚚 Creating delivery assignments for existing confirmed orders...');

    // Find all orders that are admin confirmed and have vendor confirmations
    const confirmedOrders = await Order.find({ 
      adminConfirmed: true,
      'vendorConfirmations.status': { $in: ['confirmed', 'ready_for_pickup'] }
    })
      .populate('customer', 'firstName lastName email phone')
      .populate('items.vendor', '_id vendorName email phone address warehouseLocation')
      .populate('vendorConfirmations.vendor', '_id vendorName');

    let created = 0;
    let skipped = 0;
    let errors = [];

    const { autoAssignDeliveryAgent } = require('../utils/autoAssignment');
    const settings = await PlatformSettings.getSettings();

    for (const order of confirmedOrders) {
      try {
        // Get all unique vendors from order items
        const vendorMap = new Map();
        order.items.forEach(item => {
          const vendorId = item.vendor?._id ? item.vendor._id.toString() : item.vendor?.toString();
          if (vendorId && !vendorMap.has(vendorId)) {
            vendorMap.set(vendorId, {
              vendorId: vendorId,
              items: []
            });
          }
          if (vendorId) {
            vendorMap.get(vendorId).items.push(item);
          }
        });

        if (vendorMap.size === 0) {
          console.log(`⚠️ Order ${order.orderNumber} has no vendors - skipping`);
          skipped++;
          continue;
        }

        // Check which vendors have confirmed
        const confirmedVendors = new Set();
        order.vendorConfirmations.forEach(vc => {
          if (vc.status === 'confirmed' || vc.status === 'ready_for_pickup') {
            const vendorId = vc.vendor?._id ? vc.vendor._id.toString() : vc.vendor?.toString();
            if (vendorId) {
              confirmedVendors.add(vendorId);
            }
          }
        });

        console.log(`📦 Processing order ${order.orderNumber}: ${vendorMap.size} vendors, ${confirmedVendors.size} confirmed`);

        // Create delivery assignment for each confirmed vendor
        for (const [vendorId, vendorData] of vendorMap) {
          // Only create assignment if vendor has confirmed
          if (!confirmedVendors.has(vendorId)) {
            console.log(`   ⏭️ Vendor ${vendorId} not confirmed - skipping assignment`);
            continue;
          }

          // Check if assignment already exists
          const existingAssignment = await DeliveryAssignment.findOne({
            order: order._id,
            vendor: vendorId
          });

          if (existingAssignment) {
            console.log(`   ⏭️ Assignment already exists for vendor ${vendorId}`);
            skipped++;
            continue;
          }

          const vendor = await Vendor.findById(vendorId);
          if (!vendor) {
            console.warn(`   ⚠️ Vendor ${vendorId} not found - skipping`);
            continue;
          }

          // Calculate delivery fee for this vendor's portion (defensive for legacy orders)
          const itemsValue = vendorData.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
          const orderTotal = Number(order.total) || 0;
          const orderShipping = Number(order.shipping) || 0;
          const vendorDeliveryFee = orderTotal > 0 ? (itemsValue / orderTotal) * orderShipping : 0;

          // Get platform settings for commission split
          // PlatformSettings schema uses `commission` (singular), not `commissions`
          const deliverySplit = settings?.commission?.delivery || { agentShare: 80, platformShare: 20 };
          const agentShare = vendorDeliveryFee * (deliverySplit.agentShare / 100);
          const platformShare = vendorDeliveryFee * (deliverySplit.platformShare / 100);

          // Create delivery assignment
          const assignment = await DeliveryAssignment.create({
            order: order._id,
            orderNumber: order.orderNumber,
            vendor: vendor._id,
            vendorName: vendor.vendorName || vendor.businessName || 'Vendor',
            customer: order.customer._id,
            customerName: `${order.customer.firstName} ${order.customer.lastName}`,
            pickupLocation: {
              vendorName: vendor.vendorName || vendor.businessName || 'Vendor',
              address: vendor.warehouseLocation?.address || vendor.address || '',
              city: vendor.warehouseLocation?.city || vendor.city || '',
              zipCode: vendor.warehouseLocation?.zipCode || vendor.zipCode || '',
              coordinates: vendor.warehouseLocation?.coordinates || { lat: 0, lng: 0 },
              zone: vendor.warehouseLocation?.zone || 'Unknown',
              contactPerson: vendor.warehouseLocation?.contactPerson || vendor.vendorName || vendor.businessName || 'Vendor',
              contactPhone: vendor.warehouseLocation?.contactPhone || vendor.phone || vendor.email || ''
            },
            deliveryLocation: (() => {
              const sa = order.shippingAddress || {};
              const fallbackAddress = `${sa.street || ''}, ${sa.city || ''}, ${sa.state || ''} ${sa.zipCode || ''}`.trim();
              return {
                address: sa.fullAddress || fallbackAddress || 'N/A',
                city: sa.city || '',
                zipCode: sa.zipCode || '',
                coordinates: {
                  lat: sa.latitude || 0,
                  lng: sa.longitude || 0
                },
                zone: sa.zone || 'Unknown',
                customerName: sa.recipientName || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Customer',
                customerPhone: sa.phone || order.customer?.phone || ''
              };
            })(),
            items: vendorData.items,
            deliveryFee: vendorDeliveryFee,
            agentShare: agentShare,
            platformShare: platformShare,
            status: 'pending',
            assignmentType: 'manual'
          });

          // Add to order's delivery assignments
          await Order.findByIdAndUpdate(order._id, {
            $addToSet: { deliveryAssignments: assignment._id }
          });

          console.log(`   ✅ Created assignment ${assignment._id} for vendor ${vendor.vendorName || vendor.businessName}`);

          // Auto-assign agent if enabled
          if (settings.autoAssignment.enabled) {
            try {
              const assignedAgent = await autoAssignDeliveryAgent(assignment);
              if (assignedAgent) {
                console.log(`   ✅ Auto-assigned to agent: ${assignedAgent.firstName} ${assignedAgent.lastName}`);
              }
            } catch (autoErr) {
              console.error(`   ⚠️ Auto-assignment error:`, autoErr.message);
            }
          }

          created++;
        }
      } catch (err) {
        errors.push({ orderNumber: order.orderNumber, error: err.message });
        console.error(`❌ Error processing order ${order.orderNumber}:`, err.message);
      }
    }

    res.json({
      message: `Delivery assignments created: ${created} assignments, ${skipped} skipped`,
      created,
      skipped,
      total: confirmedOrders.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Create delivery assignments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Repair orders - Fix vendorConfirmations for existing confirmed orders
// IMPORTANT: This route must come BEFORE /admin/:orderId/confirm to avoid route conflicts
router.post('/admin/repair-orders', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('🔧 Starting order repair - fixing vendorConfirmations for confirmed orders...');

    // Find all orders that are admin confirmed but might have missing/incorrect vendorConfirmations
    const confirmedOrders = await Order.find({ adminConfirmed: true })
      .populate('items.vendor', '_id')
      .populate('items.product', 'vendor');

    let repaired = 0;
    let errors = [];

    for (const order of confirmedOrders) {
      try {
        // Get unique vendor IDs from order items
        const uniqueVendorIds = new Set();
        
        order.items.forEach(item => {
          const vendorId = item.vendor?._id ? item.vendor._id.toString() : 
                          item.vendor?.toString() || 
                          item.product?.vendor?.toString();
          if (vendorId) {
            uniqueVendorIds.add(vendorId);
          }
        });

        // Also check assignedVendors
        if (order.assignedVendors && order.assignedVendors.length > 0) {
          order.assignedVendors.forEach(vendorId => {
            uniqueVendorIds.add(vendorId.toString());
          });
        }

        if (uniqueVendorIds.size === 0) {
          console.log(`⚠️ Order ${order.orderNumber} has no vendors - skipping`);
          continue;
        }

        // Create vendorConfirmations with proper ObjectIds
        const vendorConfirmations = Array.from(uniqueVendorIds).map(vendorId => ({
          vendor: mongoose.Types.ObjectId.isValid(vendorId) 
            ? new mongoose.Types.ObjectId(vendorId) 
            : vendorId,
          status: 'pending'
        }));

        // Update the order
        await Order.findByIdAndUpdate(order._id, {
          $set: {
            vendorConfirmations
          }
        });

        repaired++;
        console.log(`✅ Repaired order ${order.orderNumber} - ${vendorConfirmations.length} vendor confirmations`);
      } catch (err) {
        errors.push({ orderNumber: order.orderNumber, error: err.message });
        console.error(`❌ Error repairing order ${order.orderNumber}:`, err.message);
      }
    }

    res.json({
      message: `Repair complete: ${repaired} orders fixed`,
      repaired,
      total: confirmedOrders.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Repair orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

    // ALWAYS ensure vendor confirmations are properly set up when admin confirms
    // Get unique vendor IDs from order items (this is the source of truth)
    const uniqueVendorIds = new Set();
    
    // Get vendors from items
    order.items.forEach(item => {
      // item.vendor might be ObjectId or populated object
      const vendorId = item.vendor?._id ? item.vendor._id.toString() : item.vendor?.toString();
      if (vendorId) {
        uniqueVendorIds.add(vendorId);
      }
    });

    // Also check assignedVendors as fallback
    if (order.assignedVendors && order.assignedVendors.length > 0) {
      order.assignedVendors.forEach(vendorId => {
        uniqueVendorIds.add(vendorId.toString());
      });
    }

    console.log(`🔍 Admin confirming order ${order.orderNumber}`);
    console.log(`   Found ${uniqueVendorIds.size} unique vendors: ${Array.from(uniqueVendorIds).join(', ')}`);

    // Create fresh vendorConfirmations array with proper ObjectIds
    const vendorConfirmations = Array.from(uniqueVendorIds).map(vendorId => {
      // Ensure vendor ID is an ObjectId
      const vendorObjectId = mongoose.Types.ObjectId.isValid(vendorId) 
        ? new mongoose.Types.ObjectId(vendorId) 
        : vendorId;
      return {
        vendor: vendorObjectId,
        status: 'pending'
      };
    });

    // ALWAYS update vendorConfirmations when admin confirms (even if they exist)
    // This ensures they're properly formatted and match the current vendors
    if (vendorConfirmations.length > 0) {
      await Order.findByIdAndUpdate(req.params.orderId, {
        $set: {
          vendorConfirmations,
          status: 'confirmed',
          adminConfirmed: true // Ensure this is set
        }
      });
      console.log(`✅ Updated ${vendorConfirmations.length} vendor confirmations for order ${order.orderNumber}`);
      console.log(`   Vendor IDs: ${vendorConfirmations.map(c => c.vendor.toString()).join(', ')}`);
    } else {
      console.warn(`⚠️ No vendors found for order ${order.orderNumber} - cannot create vendorConfirmations`);
    }

    // Reload order to get updated vendorConfirmations and return to client
    const updatedOrder = await Order.findById(req.params.orderId)
      .populate('customer', 'firstName lastName email')
      .populate('items.vendor', 'businessName email')
      .populate('items.product', 'name image')
      .populate('vendorConfirmations.vendor', 'businessName email')
      .populate('adminConfirmedBy', 'firstName lastName');

    // Notify vendors about order assignment
    try {
      if (updatedOrder.vendorConfirmations && updatedOrder.vendorConfirmations.length > 0) {
        for (const confirmation of updatedOrder.vendorConfirmations) {
          const vendorId = confirmation.vendor?._id || confirmation.vendor;
          const vendor = await Vendor.findById(vendorId);
          if (vendor) {
            // TODO: Send email notification to vendor
            console.log(`📧 Order ${updatedOrder.orderNumber} assigned to vendor ${vendor.email || vendor.vendorName}`);
          }
        }
      }
    } catch (e) {
      console.warn('Vendor notification failed:', e.message);
    }

    // STEP: Calculate commission when admin confirms
    if (!updatedOrder.commissionCalculated) {
      try {
        const commissionResult = await calculateOrderCommission(updatedOrder);
        console.log(`✅ Commission calculated for order ${updatedOrder.orderNumber}: ₹${commissionResult.platformRevenue.toFixed(2)}`);
        // Reload order to get updated commission data
        const orderWithCommission = await Order.findById(req.params.orderId);
        Object.assign(updatedOrder, orderWithCommission);
      } catch (commErr) {
        console.error('Commission calculation error:', commErr);
        // Continue even if commission fails
      }
    }

    // STEP: Create delivery assignments for all vendors and auto-assign agents
    try {
      const { autoAssignDeliveryAgent } = require('../utils/autoAssignment');
      const settings = await PlatformSettings.getSettings();
      
      // Get all unique vendors from order items
      const vendorMap = new Map();
      updatedOrder.items.forEach(item => {
        const vendorId = item.vendor?._id ? item.vendor._id.toString() : item.vendor?.toString();
        if (vendorId && !vendorMap.has(vendorId)) {
          vendorMap.set(vendorId, {
            vendorId: vendorId,
            items: []
          });
        }
        if (vendorId) {
          vendorMap.get(vendorId).items.push(item);
        }
      });

      console.log(`📦 Creating delivery assignments for ${vendorMap.size} vendors`);

      // Create delivery assignment for each vendor
      for (const [vendorId, vendorData] of vendorMap) {
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
          console.warn(`⚠️ Vendor ${vendorId} not found - skipping delivery assignment`);
          continue;
        }

        // Calculate delivery fee for this vendor's portion
        const itemsValue = vendorData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const vendorDeliveryFee = (itemsValue / updatedOrder.total) * updatedOrder.shipping;

        // Get platform settings for commission split
        // PlatformSettings schema uses `commission` (singular), not `commissions`
        const deliverySplit = settings?.commission?.delivery || { agentShare: 80, platformShare: 20 };
        const agentShare = vendorDeliveryFee * (deliverySplit.agentShare / 100);
        const platformShare = vendorDeliveryFee * (deliverySplit.platformShare / 100);

        // Check if assignment already exists for this vendor
        const existingAssignment = await DeliveryAssignment.findOne({
          order: updatedOrder._id,
          vendor: vendorId
        });

        if (existingAssignment) {
          console.log(`⏭️ Delivery assignment already exists for vendor ${vendor.vendorName}`);
          continue;
        }

        // Create delivery assignment
        const assignment = await DeliveryAssignment.create({
          order: updatedOrder._id,
          orderNumber: updatedOrder.orderNumber,
          vendor: vendor._id,
          vendorName: vendor.vendorName || vendor.businessName || 'Vendor',
          customer: updatedOrder.customer._id,
          customerName: `${updatedOrder.customer.firstName} ${updatedOrder.customer.lastName}`,
          pickupLocation: {
            vendorName: vendor.vendorName || vendor.businessName || 'Vendor',
            address: vendor.warehouseLocation?.address || vendor.address || '',
            city: vendor.warehouseLocation?.city || vendor.city || '',
            zipCode: vendor.warehouseLocation?.zipCode || vendor.zipCode || '',
            coordinates: vendor.warehouseLocation?.coordinates || { lat: 0, lng: 0 },
            zone: vendor.warehouseLocation?.zone || 'Unknown',
            contactPerson: vendor.warehouseLocation?.contactPerson || vendor.vendorName || vendor.businessName || 'Vendor',
            contactPhone: vendor.warehouseLocation?.contactPhone || vendor.phone || vendor.email || ''
          },
          deliveryLocation: {
            address: updatedOrder.shippingAddress.fullAddress || 
                    `${updatedOrder.shippingAddress.street || ''}, ${updatedOrder.shippingAddress.city || ''}, ${updatedOrder.shippingAddress.state || ''} ${updatedOrder.shippingAddress.zipCode || ''}`,
            city: updatedOrder.shippingAddress.city || '',
            zipCode: updatedOrder.shippingAddress.zipCode || '',
            coordinates: {
              lat: updatedOrder.shippingAddress.latitude || 0,
              lng: updatedOrder.shippingAddress.longitude || 0
            },
            zone: updatedOrder.shippingAddress.zone || 'Unknown',
            customerName: updatedOrder.shippingAddress.recipientName || `${updatedOrder.customer.firstName} ${updatedOrder.customer.lastName}`,
            customerPhone: updatedOrder.shippingAddress.phone || updatedOrder.customer.phone || ''
          },
          items: vendorData.items,
          deliveryFee: vendorDeliveryFee,
          agentShare: agentShare,
          platformShare: platformShare,
          status: 'pending',
          assignmentType: 'manual' // Will be set to 'auto' if auto-assigned
        });

        // Add to order's delivery assignments
        await Order.findByIdAndUpdate(updatedOrder._id, {
          $addToSet: { deliveryAssignments: assignment._id }
        });

        console.log(`✅ Delivery assignment created for vendor ${vendor.vendorName}: ${assignment._id}`);
        console.log(`   Assignment status: ${assignment.status}, Order: ${assignment.orderNumber}`);

        // Auto-assign agent if enabled
        if (settings.autoAssignment.enabled) {
          console.log(`🤖 Auto-assigning agent for assignment ${assignment._id}`);
          try {
            const assignedAgent = await autoAssignDeliveryAgent(assignment);
            if (assignedAgent) {
              // Reload assignment to get updated status
              const updatedAssignment = await DeliveryAssignment.findById(assignment._id)
                .populate('deliveryAgent', 'firstName lastName email phone');
              console.log(`✅ Auto-assigned to agent: ${assignedAgent.firstName} ${assignedAgent.lastName} (${assignedAgent._id})`);
              console.log(`   Assignment status: ${updatedAssignment.status}, Agent ID: ${updatedAssignment.deliveryAgent?._id || updatedAssignment.deliveryAgent}`);
              console.log(`   Assignment will be visible in agent dashboard`);
            } else {
              console.log(`⚠️ No available agents - assignment remains pending for manual assignment`);
              console.log(`   Assignment status: ${assignment.status}, will be visible to all agents`);
            }
          } catch (autoErr) {
            console.error('Auto-assignment error:', autoErr);
            console.error('   Assignment will remain pending for manual assignment');
            // Assignment stays pending for manual assignment
          }
        } else {
          console.log(`📋 Manual assignment mode - assignment pending admin action`);
          console.log(`   Assignment status: ${assignment.status}, will be visible to all agents`);
        }
      }
    } catch (deliveryErr) {
      console.error('Delivery assignment creation error:', deliveryErr);
      // Continue even if delivery assignment fails
    }

    // Notify customer
    try {
      // TODO: Send email notification to customer
      console.log(`Order ${updatedOrder.orderNumber} confirmed - notify customer ${updatedOrder.customer.email}`);
    } catch (e) {
      console.warn('Customer notification failed:', e.message);
    }

    // Reload order one more time to get all updates
    const finalOrder = await Order.findById(req.params.orderId)
      .populate('customer', 'firstName lastName email')
      .populate('items.vendor', 'businessName email')
      .populate('items.product', 'name image')
      .populate('vendorConfirmations.vendor', 'businessName email')
      .populate('adminConfirmedBy', 'firstName lastName')
      .populate('deliveryAssignments');

    res.json(finalOrder);
  } catch (error) {
    console.error('Confirm order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Debug endpoint: Get vendor debug info (for troubleshooting)
router.get('/vendor/debug', auth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const vendor = await Vendor.findOne({ user: req.user.userId });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const vendorId = vendor._id;

    // Get sample orders to inspect
    const sampleOrders = await Order.find({ adminConfirmed: true })
      .limit(5)
      .select('orderNumber adminConfirmed vendorConfirmations assignedVendors items.vendor')
      .lean();

    // Get orders with this vendor
    const ordersWithThisVendor = await Order.find({
      $or: [
        { 'vendorConfirmations.vendor': vendorId },
        { assignedVendors: vendorId }
      ],
      adminConfirmed: true
    })
      .select('orderNumber adminConfirmed vendorConfirmations assignedVendors')
      .lean();

    res.json({
      vendor: {
        id: vendorId,
        name: vendor.vendorName,
        email: vendor.email
      },
      stats: {
        totalAdminConfirmed: await Order.countDocuments({ adminConfirmed: true }),
        ordersWithVendorInConfirmations: await Order.countDocuments({
          'vendorConfirmations.vendor': vendorId,
          adminConfirmed: true
        }),
        ordersWithVendorInAssigned: await Order.countDocuments({
          assignedVendors: vendorId,
          adminConfirmed: true
        })
      },
      sampleOrders: sampleOrders.map(o => ({
        orderNumber: o.orderNumber,
        adminConfirmed: o.adminConfirmed,
        vendorConfirmations: o.vendorConfirmations?.map(vc => ({
          vendor: vc.vendor?.toString(),
          status: vc.status
        })),
        assignedVendors: o.assignedVendors?.map(v => v.toString()),
        itemVendors: o.items?.map(i => i.vendor?.toString())
      })),
      ordersWithThisVendor: ordersWithThisVendor.map(o => ({
        orderNumber: o.orderNumber,
        adminConfirmed: o.adminConfirmed,
        vendorConfirmations: o.vendorConfirmations?.map(vc => ({
          vendor: vc.vendor?.toString(),
          status: vc.status
        })),
        assignedVendors: o.assignedVendors?.map(v => v.toString())
      }))
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Vendor: Get assigned orders
router.get('/vendor', auth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log(`\n🔍 VENDOR ORDERS REQUEST - User ID: ${req.user.userId}, Role: ${req.user.role}`);

    // Look up vendor by user ID (vendors are linked to users via Vendor.user field)
    const vendor = await Vendor.findOne({ user: req.user.userId });
    if (!vendor) {
      console.log(`❌ Vendor not found for user ${req.user.userId}`);
      // Try alternative: check if user has vendorId field
      if (req.user.vendorId) {
        const vendorById = await Vendor.findById(req.user.vendorId);
        if (vendorById) {
          console.log(`✅ Found vendor by vendorId: ${vendorById.vendorName}`);
          // Continue with vendorById
        }
      }
      return res.status(404).json({ message: 'Vendor profile not found. Please contact admin to link your vendor account.' });
    }

    const vendorId = vendor._id;
    console.log(`✅ Vendor found: ${vendor.vendorName} (ID: ${vendorId})`);
    
    // Debug: Check all orders with adminConfirmed
    const allConfirmedOrders = await Order.countDocuments({ adminConfirmed: true });
    console.log(`📊 Total orders with adminConfirmed=true: ${allConfirmedOrders}`);
    
    // Debug: Check orders with this vendor in assignedVendors
    const ordersWithVendor = await Order.countDocuments({ 
      assignedVendors: vendorId,
      adminConfirmed: true 
    });
    console.log(`📊 Orders with this vendor in assignedVendors: ${ordersWithVendor}`);
    
    // Debug: Check orders with this vendor in vendorConfirmations (using different query methods)
    const ordersWithVendorConf1 = await Order.countDocuments({ 
      'vendorConfirmations.vendor': vendorId,
      adminConfirmed: true 
    });
    console.log(`📊 Orders with vendorConfirmation (dot notation): ${ordersWithVendorConf1}`);
    
    const ordersWithVendorConf2 = await Order.countDocuments({ 
      vendorConfirmations: {
        $elemMatch: { vendor: vendorId }
      },
      adminConfirmed: true 
    });
    console.log(`📊 Orders with vendorConfirmation ($elemMatch): ${ordersWithVendorConf2}`);
    
    const { page = 1, limit = 20, status } = req.query;

    // Try multiple query strategies
    let query = {
      adminConfirmed: true,
      vendorConfirmations: {
        $elemMatch: {
          vendor: vendorId
        }
      }
    };

    if (status) {
      query.status = status;
    }

    console.log(`📋 Query:`, JSON.stringify(query, null, 2));

    let orders = await Order.find(query)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name image')
      .populate('items.vendor', 'businessName email')
      .populate('vendorConfirmations.vendor', 'businessName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // If no orders found with $elemMatch, try alternative query
    if (orders.length === 0) {
      console.log(`⚠️ No orders found with $elemMatch, trying alternative query...`);
      const altQuery = {
        adminConfirmed: true,
        'vendorConfirmations.vendor': vendorId
      };
      if (status) altQuery.status = status;
      
      orders = await Order.find(altQuery)
        .populate('customer', 'firstName lastName email phone')
        .populate('items.product', 'name image')
        .populate('items.vendor', 'businessName email')
        .populate('vendorConfirmations.vendor', 'businessName email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      console.log(`📊 Alternative query found ${orders.length} orders`);
    }

    // If still no orders, try checking assignedVendors
    if (orders.length === 0 && ordersWithVendor > 0) {
      console.log(`⚠️ No orders in vendorConfirmations, checking assignedVendors...`);
      const fallbackQuery = {
        adminConfirmed: true,
        assignedVendors: vendorId
      };
      if (status) fallbackQuery.status = status;
      
      orders = await Order.find(fallbackQuery)
        .populate('customer', 'firstName lastName email phone')
        .populate('items.product', 'name image')
        .populate('items.vendor', 'businessName email')
        .populate('vendorConfirmations.vendor', 'businessName email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      console.log(`📊 Fallback query (assignedVendors) found ${orders.length} orders`);
      
      // If we found orders via assignedVendors but no vendorConfirmations, create them
      if (orders.length > 0) {
        for (const order of orders) {
          if (!order.vendorConfirmations || order.vendorConfirmations.length === 0) {
            console.log(`🔧 Creating missing vendorConfirmations for order ${order.orderNumber}`);
            await Order.findByIdAndUpdate(order._id, {
              $push: {
                vendorConfirmations: {
                  vendor: vendorId,
                  status: 'pending'
                }
              }
            });
          }
        }
        // Reload orders after updating
        orders = await Order.find(fallbackQuery)
          .populate('customer', 'firstName lastName email phone')
          .populate('items.product', 'name image')
          .populate('items.vendor', 'businessName email')
          .populate('vendorConfirmations.vendor', 'businessName email')
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);
      }
    }

    const total = await Order.countDocuments(query);
    
    console.log(`✅ Returning ${orders.length} orders for vendor ${vendor.vendorName} (total matching query: ${total})\n`);

    // Include vendor ID in response for frontend matching
    res.json({
      orders,
      vendorId: vendorId.toString(), // Include vendor ID so frontend can match correctly
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Get vendor orders error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Vendor: Confirm order fulfillment
router.put('/vendor/:orderId/confirm', auth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Look up vendor by user ID
    const vendor = await Vendor.findOne({ user: req.user.userId });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    const { status, notes, trackingNumber } = req.body;
    const vendorId = vendor._id;

    // Prepare update object
    const updateFields = {
      'vendorConfirmations.$.status': status,
      'vendorConfirmations.$.notes': notes
    };

    // Set timestamps based on status
    if (status === 'confirmed') {
      updateFields['vendorConfirmations.$.confirmedAt'] = new Date();
    } else if (status === 'ready_for_pickup') {
      updateFields['vendorConfirmations.$.readyForPickupAt'] = new Date();
    }

    if (trackingNumber) {
      updateFields.trackingNumber = trackingNumber;
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: req.params.orderId,
        vendorConfirmations: {
          $elemMatch: {
            vendor: vendorId
          }
        }
      },
      {
        $set: updateFields
      },
      { new: true }
    ).populate('customer', 'firstName lastName email phone')
     .populate('items.vendor', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // NOTE: Commission calculation and delivery assignment creation are now done at admin confirmation
    // Vendor confirmation only updates the vendor's confirmation status

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

// Debug: Log all registered admin routes (remove in production)
console.log('📋 Orders router loaded. Checking admin routes...');
setTimeout(() => {
  const adminRoutes = [];
  router.stack.forEach((r) => {
    if (r.route && r.route.path && r.route.path.includes('/admin')) {
      const method = Object.keys(r.route.methods)[0]?.toUpperCase() || 'UNKNOWN';
      adminRoutes.push(`${method} ${r.route.path}`);
    }
  });
  if (adminRoutes.length > 0) {
    console.log('✅ Registered admin routes in orders.js:');
    adminRoutes.forEach(route => console.log(`   ${route}`));
  } else {
    console.log('⚠️ No admin routes found in router.stack');
  }
  
  // Check specifically for our route
  const targetRoute = router.stack.find(r => 
    r.route && 
    r.route.path === '/admin/create-delivery-assignments' &&
    r.route.methods.post
  );
  if (targetRoute) {
    console.log('✅ POST /admin/create-delivery-assignments route is REGISTERED');
  } else {
    console.log('❌ POST /admin/create-delivery-assignments route NOT FOUND in router.stack');
  }
}, 100);

module.exports = router;
