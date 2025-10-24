const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const auth = require('../middleware/auth');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const OtpToken = require('../models/OtpToken');
const { sendMail, customerWelcomeEmail } = require('../utils/mailer');
const { sendSms } = require('../utils/sms');
const Product = require('../models/Product');

// Customer registration (no admin approval needed)
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, gender, address } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: 'Customer already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Normalize optional fields
    let normalizedGender;
    if (typeof gender === 'string') {
      const g = gender.trim().toLowerCase();
      if (['male', 'female', 'other'].includes(g)) normalizedGender = g;
      // else leave undefined to avoid enum validation error when left blank
    }

    // Create customer
    const customer = new Customer({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      ...(normalizedGender ? { gender: normalizedGender } : {}),
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
    // Surface validation errors more clearly
    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors || {}).map(e => e.message).join(', ');
      return res.status(400).json({ message: details || 'Validation error' });
    }
    if (error.code === 11000) {
      // Duplicate key (e.g., unique email)
      return res.status(400).json({ message: 'Customer already exists with this email' });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Send OTP to email (and optionally SMS to phone)
router.post('/otp/send', async (req, res) => {
  try {
    const { email, phone } = req.body || {};
    console.log('📧 OTP Send Request:', { email, phone });
    
    if (!email && !phone) return res.status(400).json({ message: 'Email or phone is required' });

    const targetEmail = email ? String(email).toLowerCase() : undefined;
    const targetPhone = phone ? String(phone).replace(/\s+/g, '') : undefined;
    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    console.log('🔑 Generated OTP:', code);
    console.log('⏰ Expires at:', expiresAt);

    let previewUrl;
    let smsPreview = false;
    if (targetEmail) {
      await OtpToken.create({ email: targetEmail, codeHash, expiresAt });
      console.log('💾 OTP token saved to database for email:', targetEmail);
      try {
        const info = await sendMail({
          to: targetEmail,
          subject: 'Your TinyTots verification code',
          text: `Your verification code is ${code}. It expires in 10 minutes.`,
          html: `<p>Your verification code is <b>${code}</b>. It expires in 10 minutes.</p>`
        });
        previewUrl = info?.previewUrl;
      } catch (e) {
        // continue even if email fails
        console.warn('Customer OTP email send failed:', e.message);
      }
    }

    if (targetPhone) {
      await OtpToken.create({ phone: targetPhone, codeHash, expiresAt });
      const to = targetPhone.startsWith('+') ? targetPhone : `+91${targetPhone}`; // adjust country code
      try {
        const smsInfo = await sendSms(to, `TinyTots code: ${code} (valid 10 minutes)`);
        if (smsInfo && smsInfo.preview) smsPreview = true;
      } catch (e) { console.warn('Customer OTP SMS failed:', e.message); }
    }

    const includePreview = ((process.env.NODE_ENV || 'development') !== 'production');
    const response = { message: 'OTP sent' };
    
    if (includePreview) {
      if (previewUrl) response.previewUrl = previewUrl;
      if (smsPreview) response.smsPreview = true;
      // In development, also return the actual OTP for testing
      response.developmentOTP = code;
      console.log('🔑 Development OTP returned in response:', code);
    }
    
    res.json(response);
  } catch (err) {
    console.error('Customer OTP send error:', err);
    res.status(500).json({ message: 'Server error sending OTP' });
  }
});

// Verify OTP and login or auto-register customer, returning JWT
router.post('/otp/verify', async (req, res) => {
  try {
    const { email, code, phone, firstName: givenFirst, lastName: givenLast } = req.body || {};
    console.log('🔍 OTP Verification Request:', { email, phone, codeLength: code?.length });
    
    if ((!email && !phone) || !code) return res.status(400).json({ message: 'Email or phone and code are required' });

    const targetEmail = email ? String(email).toLowerCase() : undefined;
    const targetPhone = phone ? String(phone).replace(/\s+/g, '') : undefined;
    const tokenQuery = targetEmail ? { email: targetEmail } : { phone: targetPhone };
    
    console.log('🔍 Looking for OTP token with query:', tokenQuery);
    
    const token = await OtpToken.findOne({ ...tokenQuery, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 });

    console.log('🔍 Found token:', token ? 'Yes' : 'No');
    if (token) {
      console.log('🔍 Token expires at:', token.expiresAt);
      console.log('🔍 Current time:', new Date());
    }

    const ok = token && await bcrypt.compare(String(code), token.codeHash);
    console.log('🔍 Code comparison result:', ok);
    
    if (!ok) return res.status(400).json({ message: 'Invalid or expired OTP' });

    let customer = await Customer.findOne({ email: targetEmail });
    let created = false;
    console.log('👤 Customer lookup result:', customer ? 'Found existing customer' : 'No existing customer');
    
    if (!customer) {
      console.log('🆕 Creating new customer...');
      // Create a minimal customer profile; they can complete details later
      const fallbackPassword = await bcrypt.hash(jwt.sign({ email: targetEmail }, process.env.JWT_SECRET || 'fallback_secret'), 8);
      customer = new Customer({
        firstName: (givenFirst && String(givenFirst).trim()) || 'Customer',
        lastName: (givenLast && String(givenLast).trim()) || '',
        email: targetEmail,
        phone: targetPhone || phone || '',
        password: fallbackPassword,
      });
      await customer.save();
      console.log('✅ New customer created successfully');
      created = true;
      // Send welcome email (best-effort)
      try {
        const mail = customerWelcomeEmail(customer.toObject());
        await sendMail({ to: customer.email, ...mail });
      } catch (e) {
        console.warn('Welcome email failed:', e.message);
      }
    }

    // Update last login timestamp
    customer.lastLogin = new Date();
    await customer.save();
    console.log('💾 Customer last login updated');

    const jwtToken = jwt.sign(
      { customerId: customer._id, role: 'customer' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );
    
    console.log('🔑 JWT token generated successfully');

    res.json({
      message: 'OTP verified',
      token: jwtToken,
      created,
      customer: {
        id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone
      }
    });
  } catch (err) {
    console.error('Customer OTP verify error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    res.status(500).json({ message: 'Server error verifying OTP' });
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

// Google Sign-In for customers
router.post('/google-login', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Missing idToken' });

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    const firstName = payload?.given_name || 'Customer';
    const lastName = payload?.family_name || '';

    if (!email) return res.status(400).json({ message: 'Invalid Google token' });

    // Find existing customer
    let customer = await Customer.findOne({ email });
    if (!customer) {
      // If new Google user: send OTP to email first, defer account creation until OTP verified
      const code = (Math.floor(100000 + Math.random() * 900000)).toString();
      const codeHash = await bcrypt.hash(code, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await OtpToken.create({ email: String(email).toLowerCase(), codeHash, expiresAt });
      try {
        await sendMail({
          to: email,
          subject: 'Verify your TinyTots account',
          text: `Your verification code is ${code}. It expires in 10 minutes.`,
          html: `<p>Your verification code is <b>${code}</b>. It expires in 10 minutes.</p>`
        });
      } catch (e) {
        console.warn('Google signup OTP email failed:', e.message);
      }
      return res.status(200).json({ requiresOtp: true, email, firstName, lastName, message: 'OTP sent to your email. Please verify to complete signup.' });
    }

    // Update last login
    customer.lastLogin = new Date();
    await customer.save();

    // Issue our JWT
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
    console.error('Customer Google login error:', error);
    res.status(500).json({ message: 'Server error during Google login' });
  }
});

// Get customer profile
router.get('/profile', auth, async (req, res) => {
  try {
    const customerId = req.user.customerId || req.user.userId;
    const customer = await Customer.findById(customerId).select('-password');
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
    
    const customerId = req.user.customerId || req.user.userId;
    const customer = await Customer.findByIdAndUpdate(
      customerId,
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

router.post('/orders/track', async (req, res) => {
  try {
    const { orderNumber, email, phone } = req.body || {};
    const number = String(orderNumber || '').trim();
    const emailInput = email ? String(email).trim().toLowerCase() : '';
    const phoneInputRaw = phone ? String(phone).trim() : '';
    const phoneDigitsInput = phoneInputRaw.replace(/\D/g, '');
    if (!number || (!emailInput && !phoneDigitsInput)) {
      return res.status(400).json({ message: 'Order number with email or phone is required' });
    }

    const order = await Order.findOne({ orderNumber: number })
      .populate('items.product', 'name image');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const customer = await Customer.findById(order.customer).select('firstName lastName email phone');
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customerEmail = customer.email ? customer.email.trim().toLowerCase() : '';
    const customerPhoneRaw = customer.phone ? String(customer.phone).trim() : '';
    const customerPhoneDigits = customerPhoneRaw.replace(/\D/g, '');
    let verified = false;
    if (emailInput && customerEmail && customerEmail === emailInput) {
      verified = true;
    }
    if (!verified && phoneDigitsInput && customerPhoneDigits) {
      if (customerPhoneDigits === phoneDigitsInput) {
        verified = true;
      } else if (customerPhoneDigits.endsWith(phoneDigitsInput) || phoneDigitsInput.endsWith(customerPhoneDigits)) {
        verified = true;
      }
    }

    if (!verified) {
      return res.status(403).json({ message: 'Verification failed' });
    }

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
      label: key === 'pending' ? 'Order Placed' : key === 'confirmed' ? 'Confirmed' : key === 'processing' ? 'Packed' : key === 'shipped' ? 'Shipped' : 'Delivered',
      completed: idx <= stageIndex,
    }));
    if (order.status === 'cancelled') {
      timeline.push({ key: 'cancelled', label: 'Cancelled', completed: true });
    }
    if (order.status === 'refunded') {
      timeline.push({ key: 'refunded', label: 'Refunded', completed: true });
    }

    const items = order.items.map((item) => ({
      id: item.product?._id || item.product,
      name: item.name || item.product?.name || '',
      image: item.image || item.product?.image || '',
      quantity: item.quantity,
      price: item.price,
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
      items,
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      },
      timeline,
    });
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ message: 'Server error tracking order' });
  }
});

// Get customer orders
router.get('/orders', auth, async (req, res) => {
  try {
    const customerId = req.user.customerId || req.user.userId;
    const orders = await Order.find({ customer: customerId })
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
    const customerId = req.user.customerId || req.user.userId;
    const order = new Order({
      customer: customerId,
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
    await Customer.findByIdAndUpdate(customerId, {
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

// Get all customers for vendor (paginated with search)
router.get('/vendor/list', auth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { page = 1, limit = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = search ? {
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const customers = await Customer.find(query)
      .select('firstName lastName email phone totalOrders totalSpent createdAt isActive')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Customer.countDocuments(query);

    res.json({
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get vendor customers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer statistics for vendor dashboard
router.get('/vendor/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const totalCustomers = await Customer.countDocuments();
    const activeCustomers = await Customer.countDocuments({ isActive: true });
    const newCustomersThisMonth = await Customer.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    const topCustomers = await Customer.find()
      .sort({ totalSpent: -1 })
      .limit(10)
      .select('firstName lastName email totalSpent totalOrders');

    const customersByMonth = await Customer.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      totalCustomers,
      activeCustomers,
      newCustomersThisMonth,
      topCustomers,
      customersByMonth
    });
  } catch (error) {
    console.error('Get vendor customer stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
