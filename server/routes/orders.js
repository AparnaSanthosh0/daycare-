const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Review = require('../models/Review');

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

      if (!product.inStock) {
        return res.status(400).json({ message: `Product ${product.name} is out of stock` });
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

    // Update customer stats
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { totalOrders: 1, totalSpent: total }
    });

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
     .populate('items.vendor', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Initialize vendor confirmations
    const vendorConfirmations = order.items.map(item => ({
      vendor: item.vendor,
      status: 'pending'
    }));

    await Order.findByIdAndUpdate(req.params.orderId, {
      vendorConfirmations,
      status: 'confirmed'
    });

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
    ).populate('customer', 'firstName lastName email')
     .populate('items.vendor', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if all vendors have confirmed
    const allConfirmed = order.vendorConfirmations.every(conf => conf.status === 'confirmed');
    if (allConfirmed) {
      await Order.findByIdAndUpdate(req.params.orderId, {
        status: 'processing'
      });
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

// Admin: Mark order as shipped
router.put('/admin/:orderId/ship', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { trackingNumber } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        status: 'shipped',
        trackingNumber,
        customerNotified: true
      },
      { new: true }
    ).populate('customer', 'firstName lastName email')
     .populate('items.vendor', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Mark order as reviewable after delivery
    if (order.status === 'shipped') {
      await Order.findByIdAndUpdate(req.params.orderId, {
        reviewable: true,
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
      });
    }

    // Notify customer about shipping
    try {
      // TODO: Send email notification to customer
      console.log(`Order ${order.orderNumber} shipped - notify customer ${order.customer.email}`);
    } catch (e) {
      console.warn('Customer shipping notification failed:', e.message);
    }

    res.json(order);
  } catch (error) {
    console.error('Mark order shipped error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Mark order as delivered
router.put('/admin/:orderId/deliver', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      {
        status: 'delivered',
        reviewable: true,
        reviewedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Allow reviews for 7 days
      },
      { new: true }
    ).populate('customer', 'firstName lastName email')
     .populate('items.vendor', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Notify customer about delivery
    try {
      // TODO: Send email notification to customer
      console.log(`Order ${order.orderNumber} delivered - notify customer ${order.customer.email}`);
    } catch (e) {
      console.warn('Customer delivery notification failed:', e.message);
    }

    res.json(order);
  } catch (error) {
    console.error('Mark order delivered error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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
