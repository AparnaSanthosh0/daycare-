const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Customer registration (no admin approval needed)
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, dateOfBirth, gender, address } = req.body;

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: 'Customer already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create customer
    const customer = new Customer({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      dateOfBirth,
      gender,
      address
    });

    await customer.save();

    // Generate JWT
    const token = jwt.sign(
      { customerId: customer._id, role: 'customer' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Customer registered successfully',
      token,
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone
      }
    });
  } catch (error) {
    console.error('Customer registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Customer login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find customer
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    customer.lastLogin = new Date();
    await customer.save();

    // Generate JWT
    const token = jwt.sign(
      { customerId: customer._id, role: 'customer' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get customer profile
router.get('/profile', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.user.customerId).select('-password');
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update customer profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password updates through this route
    
    const customer = await Customer.findByIdAndUpdate(
      req.user.customerId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Update customer profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer orders
router.get('/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.customerId })
      .populate('items.product', 'name image')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create order
router.post('/orders', auth, async (req, res) => {
  try {
    const { items, shippingAddress, billingAddress, paymentMethod } = req.body;

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.product} not found` });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        name: product.name,
        image: product.image
      });
    }

    const shipping = subtotal > 50 ? 0 : 10; // Free shipping over $50
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + shipping + tax;

    // Create order
    const order = new Order({
      customer: req.user.customerId,
      items: orderItems,
      shippingAddress,
      billingAddress,
      subtotal,
      shipping,
      tax,
      total,
      paymentMethod
    });

    await order.save();

    // Update customer stats
    await Customer.findByIdAndUpdate(req.user.customerId, {
      $inc: { totalOrders: 1, totalSpent: total }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all customers (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const customers = await Customer.find().select('-password').sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer details (admin/vendor)
router.get('/:id', auth, async (req, res) => {
  try {
    if (!['admin', 'vendor'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const customer = await Customer.findById(req.params.id).select('-password');
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Get customer orders
    const orders = await Order.find({ customer: req.params.id })
      .populate('items.product', 'name image')
      .sort({ createdAt: -1 });

    res.json({ customer, orders });
  } catch (error) {
    console.error('Get customer details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
