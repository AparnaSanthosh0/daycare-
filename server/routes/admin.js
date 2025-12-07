const express = require('express');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Child = require('../models/Child');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { sendMail, parentApprovedEmail, parentRejectedEmail, staffApprovedEmail, staffRejectedEmail, childCreatedEmail, vendorApprovedEmail, vendorRejectedEmail, doctorAccountCreatedEmail } = require('../utils/mailer');

const router = express.Router();

// Multer configuration for doctor license pictures
const licenseUploadsDir = path.join(__dirname, '..', 'uploads', 'doctor_licenses');
if (!fs.existsSync(licenseUploadsDir)) {
  fs.mkdirSync(licenseUploadsDir, { recursive: true });
}

const licenseStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, licenseUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `license-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const licenseUpload = multer({
  storage: licenseStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      return cb(null, true);
    }
    cb(new Error('Only JPG, JPEG, and PNG image files are allowed for license pictures'));
  }
});

// Admin middleware - only admin can access these routes
const adminOnly = [auth, authorize('admin')];

// List users (paginated, filters) and toggle status — used by Admin UI
router.get('/users', adminOnly, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const role = req.query.role && req.query.role !== 'all' ? req.query.role : undefined;
    const status = req.query.status && req.query.status !== 'all' ? req.query.status : undefined;

    const filter = {};
    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ message: 'Server error listing users' });
  }
});

router.put('/users/:id/toggle-status', adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const wasActive = user.isActive;
    user.isActive = !user.isActive;
    await user.save();
    
    // Send approval email if user was just activated and is a parent
    if (!wasActive && user.isActive && user.role === 'parent') {
      try {
        const emailData = parentApprovedEmail(user);
        await sendMail({
          to: user.email,
          ...emailData
        });
        console.log(`Approval email sent to parent: ${user.email}`);
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({ 
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, 
      user: user.toJSON() 
    });
  } catch (err) {
    console.error('Toggle status error:', err);
    res.status(500).json({ message: 'Server error updating status' });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', adminOnly, async (req, res) => {
  try {
    const [
      totalChildren,
      totalParents,
      totalStaff,
      totalVendors,
      pendingStaff,
      pendingParents,
      pendingVendors
    ] = await Promise.all([
      Child.countDocuments(),
      User.countDocuments({ role: 'parent' }),
      User.countDocuments({ role: 'staff' }),
      Vendor.countDocuments(),
      User.countDocuments({ role: 'staff', isActive: false }),
      User.countDocuments({ role: 'parent', isActive: false }),
      Vendor.countDocuments({ status: 'pending' })
    ]);

    res.json({
      totalChildren,
      totalParents,
      totalStaff,
      totalVendors,
      pendingApprovals: {
        staff: pendingStaff,
        parents: pendingParents,
        vendors: pendingVendors,
        total: pendingStaff + pendingParents + pendingVendors
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard stats' });
  }
});

// Get all pending staff accounts
router.get('/staff/pending', adminOnly, async (req, res) => {
  try {
    const pendingStaff = await User.find({ 
      role: 'staff', 
      isActive: false 
    }).select('-password');

    res.json(pendingStaff);
  } catch (error) {
    console.error('Get pending staff error:', error);
    res.status(500).json({ message: 'Server error fetching pending staff' });
  }
});

// Get all staff accounts
router.get('/staff', adminOnly, async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).select('-password');
    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ message: 'Server error fetching staff' });
  }
});

// Approve/reject staff account
router.put('/staff/:id/status', adminOnly, [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('reason').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, reason } = req.body;
    const staffId = req.params.id;

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    if (status === 'approved') {
      staff.isActive = true;
    } else {
      // For rejected accounts, we might want to delete them or keep them inactive
      staff.isActive = false;
    }

    await staff.save();

    // Notify staff about approval/rejection (best-effort)
    try {
      const mail = status === 'approved' ? staffApprovedEmail(staff) : staffRejectedEmail(staff, reason);
      await sendMail({ to: staff.email, ...mail });
    } catch (e) {
      console.warn('Staff status email failed:', e.message);
    }

    res.json({
      message: `Staff account ${status} successfully`,
      staff: staff.toJSON()
    });
  } catch (error) {
    console.error('Staff status update error:', error);
    res.status(500).json({ message: 'Server error updating staff status' });
  }
});

// Get all pending parent accounts
router.get('/parents/pending', adminOnly, async (req, res) => {
  try {
    const pendingParents = await User.find({ 
      role: 'parent', 
      isActive: false 
    }).select('-password');

    res.json(pendingParents);
  } catch (error) {
    console.error('Get pending parents error:', error);
    res.status(500).json({ message: 'Server error fetching pending parents' });
  }
});

// Get all parent accounts
router.get('/parents', adminOnly, async (req, res) => {
  try {
    const parents = await User.find({ role: 'parent' }).select('-password');
    res.json(parents);
  } catch (error) {
    console.error('Get parents error:', error);
    res.status(500).json({ message: 'Server error fetching parents' });
  }
});

// Get all customer accounts
router.get('/customers', adminOnly, async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password');
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server error fetching customers' });
  }
});

// Get single customer profile
router.get('/customers/:id', adminOnly, async (req, res) => {
  try {
    const c = await User.findById(req.params.id).select('-password');
    if (!c || c.role !== 'customer') return res.status(404).json({ message: 'Customer not found' });
    res.json(c);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ message: 'Server error fetching customer' });
  }
});

// Get single parent profile
router.get('/parents/:id', adminOnly, async (req, res) => {
  try {
    const p = await User.findById(req.params.id).select('-password');
    if (!p || p.role !== 'parent') return res.status(404).json({ message: 'Parent not found' });
    res.json(p);
  } catch (error) {
    console.error('Get parent error:', error);
    res.status(500).json({ message: 'Server error fetching parent' });
  }
});

// Update parent contact info and emergency contact
router.put('/parents/:id/contact', adminOnly, async (req, res) => {
  try {
    const { phone, address, emergencyContact } = req.body || {};
    const update = {};
    if (typeof phone === 'string') update.phone = phone;
    if (address && typeof address === 'object') update.address = address;
    if (emergencyContact && typeof emergencyContact === 'object') update.emergencyContact = emergencyContact;

    const p = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!p || p.role !== 'parent') return res.status(404).json({ message: 'Parent not found' });
    res.json({ message: 'Contact info updated', parent: p });
  } catch (error) {
    console.error('Update parent contact error:', error);
    res.status(500).json({ message: 'Server error updating contact' });
  }
});

// Update parent payment info (non-sensitive)
router.put('/parents/:id/payment', adminOnly, async (req, res) => {
  try {
    const { method, last4, billingEmail } = req.body || {};
    const update = { payment: {} };
    if (method) update.payment.method = method;
    if (last4) update.payment.last4 = last4;
    if (billingEmail) update.payment.billingEmail = billingEmail;

    const p = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!p || p.role !== 'parent') return res.status(404).json({ message: 'Parent not found' });
    res.json({ message: 'Payment info updated', parent: p });
  } catch (error) {
    console.error('Update parent payment error:', error);
    res.status(500).json({ message: 'Server error updating payment' });
  }
});

// Append communication record
router.post('/parents/:id/communications', adminOnly, async (req, res) => {
  try {
    const { channel = 'other', subject = '', notes = '' } = req.body || {};
    const p = await User.findById(req.params.id);
    if (!p || p.role !== 'parent') return res.status(404).json({ message: 'Parent not found' });
    p.communications = Array.isArray(p.communications) ? p.communications : [];
    p.communications.push({ channel, subject, notes, by: req.user.userId, date: new Date() });
    await p.save();
    res.status(201).json({ message: 'Communication logged', communications: p.communications });
  } catch (error) {
    console.error('Append communication error:', error);
    res.status(500).json({ message: 'Server error logging communication' });
  }
});

// Approve/reject parent account
router.put('/parents/:id/status', adminOnly, [
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('reason').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, reason } = req.body;
    const parentId = req.params.id;

    const parent = await User.findById(parentId);
    if (!parent || parent.role !== 'parent') {
      return res.status(404).json({ message: 'Parent not found' });
    }

    if (status === 'approved') {
      parent.isActive = true;
    } else {
      parent.isActive = false;
    }

    await parent.save();

    // Notify parent about approval/rejection (best-effort)
    try {
      const mail = status === 'approved' ? parentApprovedEmail(parent) : parentRejectedEmail(parent, reason);
      await sendMail({ to: parent.email, ...mail });
    } catch (e) {
      console.warn('Parent status email failed:', e.message);
    }

    res.json({
      message: `Parent account ${status} successfully`,
      parent: parent.toJSON()
    });
  } catch (error) {
    console.error('Parent status update error:', error);
    res.status(500).json({ message: 'Server error updating parent status' });
  }
});

// Create parent account (admin creates for parents after verification)
router.post('/parents', adminOnly, [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phone').optional().trim(),
  body('address').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);

    const parent = new User({
      firstName,
      lastName,
      email,
      password: tempPassword,
      role: 'parent',
      phone,
      address,
      isActive: true // Admin-created accounts are active by default
    });

    await parent.save();

    res.status(201).json({
      message: 'Parent account created successfully',
      parent: parent.toJSON(),
      tempPassword // In production, this should be sent via email
    });
  } catch (error) {
    console.error('Create parent error:', error);
    res.status(500).json({ message: 'Server error creating parent account' });
  }
});

// Get all vendor accounts
router.get('/vendors', adminOnly, async (req, res) => {
  try {
    const vendors = await Vendor.find().populate('approvedBy', 'firstName lastName email');
    res.json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: 'Server error fetching vendors' });
  }
});

// Get pending vendor accounts
router.get('/vendors/pending', adminOnly, async (req, res) => {
  try {
    const pendingVendors = await Vendor.find({ status: 'pending' });
    res.json(pendingVendors);
  } catch (error) {
    console.error('Get pending vendors error:', error);
    res.status(500).json({ message: 'Server error fetching pending vendors' });
  }
});

// Get pending discount suggestions
router.get('/discounts/pending', adminOnly, async (req, res) => {
  try {
    const pendingDiscounts = await Product.find({ discountStatus: 'suggested' })
      .populate('suggestedBy', 'vendorName companyName email')
      .populate('vendor', 'vendorName companyName');
    res.json(pendingDiscounts);
  } catch (error) {
    console.error('Get pending discounts error:', error);
    res.status(500).json({ message: 'Server error fetching pending discounts' });
  }
});

// Email utility - unified mailer and templates

// Approve vendor account (multi-vendor support enabled)
router.put('/vendors/:id/approve', adminOnly, async (req, res) => {
  try {
    const vendorId = req.params.id;

    // Find the vendor being approved
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Ensure license uploaded before approval
    if (!vendor.licenseUrl) {
      return res.status(400).json({ message: 'Cannot approve vendor without a license document.' });
    }

    // Approve this vendor
    vendor.status = 'approved';
    vendor.approvedAt = new Date();
    vendor.approvedBy = req.user.userId;

    // Multi-vendor support - allow multiple vendors to be approved

    // Create or link a User account for the vendor to log in
    let loginInfo = null;
    if (!vendor.user) {
      const existingUser = await User.findOne({ email: vendor.email });
      if (existingUser) {
        vendor.user = existingUser._id;
      } else {
        const tempPassword = Math.random().toString(36).slice(-8) + 'A@1';
        const newUser = new User({
          firstName: vendor.vendorName,
          lastName: vendor.companyName || 'Vendor',
          email: vendor.email,
          password: tempPassword,
          role: 'vendor',
          phone: vendor.phone,
          address: vendor.address || {},
          isActive: true
        });
        await newUser.save();
        vendor.user = newUser._id;
        loginInfo = { email: vendor.email, password: tempPassword };
        // Dev aid: log temp credentials (remove in production)
        console.log(`Vendor login created -> email: ${vendor.email}, tempPassword: ${tempPassword}`);
      }
    }

    await vendor.save();

    // Send approval email to the vendor with login info if created now
    try {
      const mail = vendorApprovedEmail(vendor, loginInfo);
      await sendMail({ to: vendor.email, ...mail });
    } catch (e) {
      console.error('Failed to send approval email:', e.message);
    }

    // Send approval SMS (best-effort)
    try {
      const { sendSms } = require('../utils/sms');
      const to = String(vendor.phone).startsWith('+') ? vendor.phone : `+91${vendor.phone}`;
      await sendSms(to, `TinyTots: Your vendor registration for ${vendor.companyName} has been APPROVED.`);
    } catch (e) {
      console.warn('Failed to send approval SMS:', e.message);
    }

    const updatedVendor = await Vendor.findById(vendorId)
      .populate('approvedBy', 'firstName lastName email')
      .populate('user', 'email role isActive');

    res.json({ message: 'Vendor approved successfully', vendor: updatedVendor });
  } catch (error) {
    console.error('Vendor approve error:', error);
    res.status(500).json({ message: 'Server error approving vendor' });
  }
});

// Reject vendor account
router.put('/vendors/:id/reject', adminOnly, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    vendor.status = 'rejected';
    vendor.approvedAt = null;
    vendor.approvedBy = null;
    await vendor.save();

    // Notify this vendor of rejection (best-effort)
    try {
      const mail = vendorRejectedEmail(vendor, req.body?.reason || 'Not selected.');
      await sendMail({ to: vendor.email, ...mail });
    } catch (e) {
      console.warn('Failed to send vendor rejection email:', e.message);
    }

    const updatedVendor = await Vendor.findById(vendorId).populate('approvedBy', 'firstName lastName email');
    res.json({ message: 'Vendor rejected successfully', vendor: updatedVendor });
  } catch (error) {
    console.error('Vendor reject error:', error);
    res.status(500).json({ message: 'Server error rejecting vendor' });
  }
});

// Update vendor information (admin only)
router.put('/vendors/:id', adminOnly, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { vendorName, companyName, email, phone, businessLicenseNumber, address, notes } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Check if email is being changed and if it's already in use
    if (email && email.toLowerCase() !== vendor.email) {
      const existingVendor = await Vendor.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: vendorId } 
      });
      if (existingVendor) {
        return res.status(400).json({ message: 'Email already in use by another vendor' });
      }
    }

    // Update vendor fields
    if (vendorName) vendor.vendorName = vendorName;
    if (companyName) vendor.companyName = companyName;
    if (email) vendor.email = email.toLowerCase();
    if (phone) vendor.phone = phone;
    if (businessLicenseNumber) vendor.businessLicenseNumber = businessLicenseNumber;
    if (address) vendor.address = { ...vendor.address, ...address };
    if (notes !== undefined) vendor.notes = notes;

    await vendor.save();

    // If vendor has a linked user account, update that too
    if (vendor.user && email) {
      const User = require('../models/User');
      await User.findByIdAndUpdate(vendor.user, { 
        email: email.toLowerCase(),
        firstName: vendorName || vendor.vendorName,
        lastName: companyName || vendor.companyName,
        phone: phone || vendor.phone
      });
    }

    const updatedVendor = await Vendor.findById(vendorId)
      .populate('approvedBy', 'firstName lastName email')
      .populate('user', 'email role isActive');

    res.json({ message: 'Vendor updated successfully', vendor: updatedVendor });
  } catch (error) {
    console.error('Vendor update error:', error);
    res.status(500).json({ message: 'Server error updating vendor' });
  }
});

// Remove vendor (admin can remove any vendor)
router.delete('/vendors/:id', adminOnly, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // If vendor has a linked user account, delete that too
    if (vendor.user) {
      const User = require('../models/User');
      await User.findByIdAndDelete(vendor.user);
    }

    await Vendor.findByIdAndDelete(vendorId);
    res.json({ message: 'Vendor and associated user account removed successfully' });
  } catch (error) {
    console.error('Vendor remove error:', error);
    res.status(500).json({ message: 'Server error removing vendor' });
  }
});

// Get single vendor details (admin only)
router.get('/vendors/:id', adminOnly, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const vendor = await Vendor.findById(vendorId)
      .populate('approvedBy', 'firstName lastName email')
      .populate('user', 'email role isActive');
    
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    
    res.json(vendor);
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ message: 'Server error fetching vendor' });
  }
});

// Reset vendor password (admin only)
router.post('/vendors/:id/reset-password', adminOnly, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const vendor = await Vendor.findById(vendorId).populate('user');
    
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (!vendor.user) return res.status(400).json({ message: 'Vendor has no linked user account' });

    const User = require('../models/User');
    const tempPassword = Math.random().toString(36).slice(-10) + 'A@1';
    
    const user = await User.findById(vendor.user._id);
    user.password = tempPassword;
    await user.save();

    // Send email with new password
    try {
      const { sendMail, vendorApprovedEmail } = require('../utils/mailer');
      const loginInfo = { email: vendor.email, password: tempPassword };
      const mail = vendorApprovedEmail(vendor.toObject(), loginInfo);
      await sendMail({ to: vendor.email, ...mail });
    } catch (e) {
      console.warn('Failed to send password reset email:', e.message);
    }

    // Log for development (remove in production)
    console.log(`Vendor password reset -> ${vendor.email} / ${tempPassword}`);

    res.json({ 
      message: 'Password reset successfully. New credentials sent via email.',
      tempPassword: tempPassword // Remove this in production
    });
  } catch (error) {
    console.error('Vendor password reset error:', error);
    res.status(500).json({ message: 'Server error resetting vendor password' });
  }
});

// Get all users (for user management)
router.get('/users', adminOnly, async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (role && role !== 'all') {
      query.role = role;
    }
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// Toggle user active status
router.put('/users/:id/toggle-status', adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't allow admin to deactivate themselves
    if (user._id.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Server error toggling user status' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Don't allow admin to delete themselves
    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If deleting a parent, also delete their children
    if (user.role === 'parent') {
      await Child.deleteMany({ parents: userId });
    }

    // If deleting a vendor, also delete the vendor record
    if (user.role === 'vendor') {
      await Vendor.findOneAndDelete({ user: userId });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({
      message: `User ${user.firstName} ${user.lastName} deleted successfully`
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// Admissions: pending list
const AdmissionRequest = require('../models/AdmissionRequest');

// Get pending admission requests
router.get('/admissions/pending', adminOnly, async (req, res) => {
  try {
    const pending = await AdmissionRequest.find({ status: 'pending' })
      .populate('parentUser', 'firstName lastName email isActive')
      .sort({ createdAt: -1 });
    res.json(pending);
  } catch (error) {
    console.error('Get pending admissions error:', error);
    res.status(500).json({ message: 'Server error fetching pending admissions' });
  }
});

// Approve admission request -> create child profile and activate parent
router.put('/admissions/:id/approve', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const ar = await AdmissionRequest.findById(id);
    if (!ar) return res.status(404).json({ message: 'Admission request not found' });
    if (ar.status !== 'pending') return res.status(400).json({ message: 'Admission request already handled' });

    // Validate DOB (6 months to 8 years) - match parent submission validation
    const dob = new Date(ar.child.dateOfBirth);
    const today = new Date();
    const minDob = new Date(today.getFullYear() - 8, today.getMonth(), today.getDate());
    const maxDob = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
    if (!(dob >= minDob && dob <= maxDob)) {
      return res.status(400).json({ message: 'Child age must be between 6 months and 8 years old' });
    }

    // Ensure parent exists and activate parent
    const parent = await User.findById(ar.parentUser);
    if (!parent) return res.status(404).json({ message: 'Parent user not found' });
    parent.isActive = true;
    await parent.save();

    // Create child profile
    const [firstName = '', ...restName] = (ar.child.name || '').trim().split(' ');
    const lastName = restName.join(' ') || '-';

    // Set tuition rate based on program
    const programRates = {
      'infant': 600,
      'toddler': 550,
      'preschool': 500,
      'prekindergarten': 450
    };
    const defaultTuitionRate = programRates[ar.child.program] || 500;

    const child = await Child.create({
      firstName,
      lastName,
      dateOfBirth: ar.child.dateOfBirth,
      gender: ar.child.gender || 'male',
      parents: [parent._id],
      program: ar.child.program || 'preschool',
      tuitionRate: defaultTuitionRate,
      allergies: [],
      medicalConditions: ar.child.medicalInfo ? [{ condition: ar.child.medicalInfo }] : [],
      emergencyContacts: ar.child.emergencyContactName ? [{
        name: ar.child.emergencyContactName,
        phone: ar.child.emergencyContactPhone || '',
        relationship: 'Emergency'
      }] : []
    });

    // Mark admission handled
    ar.status = 'approved';
    ar.handledAt = new Date();
    ar.handledBy = req.user.userId;
    await ar.save();

    // Send approval email to parent
    try {
      const emailData = parentApprovedEmail(parent);
      await sendMail({
        to: parent.email,
        ...emailData
      });
      console.log(`Approval email sent to parent: ${parent.email}`);
    } catch (emailError) {
      console.error('Error sending approval email:', emailError);
    }

    // Send child creation email
    try {
      const childEmailData = childCreatedEmail(parent, child);
      await sendMail({
        to: parent.email,
        ...childEmailData
      });
      console.log(`Child creation email sent to parent: ${parent.email}`);
    } catch (emailError) {
      console.error('Error sending child creation email:', emailError);
    }

    res.json({
      message: 'Admission approved, child profile created and parent activated',
      child,
      parent: parent.toJSON(),
      admission: ar
    });
  } catch (error) {
    console.error('Approve admission error:', error);
    res.status(500).json({ message: 'Server error approving admission' });
  }
});

// Reject admission request
router.put('/admissions/:id/reject', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const ar = await AdmissionRequest.findById(id);
    if (!ar) return res.status(404).json({ message: 'Admission request not found' });
    if (ar.status !== 'pending') return res.status(400).json({ message: 'Admission request already handled' });

    ar.status = 'rejected';
    ar.handledAt = new Date();
    ar.handledBy = req.user.userId;
    await ar.save();

    // Notify parent of admission rejection (best-effort)
    try {
      const parent = await User.findById(ar.parentUser);
      if (parent) {
        const mail = parentRejectedEmail(parent, req.body?.reason);
        await sendMail({ to: parent.email, ...mail });
      }
    } catch (e) {
      console.warn('Admission rejection email failed:', e.message);
    }

    res.json({ message: 'Admission rejected', admission: ar });
  } catch (error) {
    console.error('Reject admission error:', error);
    res.status(500).json({ message: 'Server error rejecting admission' });
  }
});

// Create child profile for approved parent (admin only)
router.post('/children', adminOnly, [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').optional().trim(),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['male', 'female']).withMessage('Gender must be male or female'),
  body('parentId').notEmpty().withMessage('Parent ID is required'),
  body('program').isIn(['infant', 'toddler', 'preschool', 'prekindergarten']).withMessage('Valid program is required')
], async (req, res) => {
  try {
    console.log('Admin creating child with body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, dateOfBirth, gender, parentId, program, tuitionRate, medicalInfo, emergencyContactName, emergencyContactPhone, allergies, medicalConditions, emergencyContacts, authorizedPickup, notes } = req.body;

    // Validate parent exists
    console.log('Looking for parent with ID:', parentId);
    const parent = await User.findById(parentId);
    console.log('Found parent:', parent ? { id: parent._id, role: parent.role, isActive: parent.isActive } : 'Not found');
    
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    if (parent.role !== 'parent') {
      return res.status(400).json({ message: 'User is not a parent' });
    }
    
    // Auto-activate parent if they're creating a child profile
    // This implicitly approves the parent through admin action
    if (!parent.isActive) {
      console.log('Parent not active. Activating parent account...');
      parent.isActive = true;
      await parent.save();
      console.log('Parent activated successfully');
    }

    // Validate child age (6 months to 8 years) - more flexible for daycare
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const minDob = new Date(today.getFullYear() - 8, today.getMonth(), today.getDate());
    const maxDob = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()); // 6 months old minimum
    if (!(dob >= minDob && dob <= maxDob)) {
      return res.status(400).json({ message: 'Child age must be between 6 months and 8 years old' });
    }

    // Set tuition rate based on program if not provided
    const programRates = {
      'infant': 600,
      'toddler': 550,
      'preschool': 500,
      'prekindergarten': 450
    };
    const finalTuitionRate = tuitionRate ? parseFloat(tuitionRate) : programRates[program] || 500;

    // Create child profile
    // Handle optional lastName - default to empty string if not provided
    const childLastName = lastName ? lastName.trim() : '';
    
    console.log('Creating child with data:', {
      firstName,
      lastName: childLastName,
      dateOfBirth,
      gender,
      parents: [parent._id],
      program,
      allergies: Array.isArray(allergies) ? allergies : [],
      medicalConditions: Array.isArray(medicalConditions) ? medicalConditions : [],
      emergencyContacts: Array.isArray(emergencyContacts) ? emergencyContacts : [],
      authorizedPickup: Array.isArray(authorizedPickup) ? authorizedPickup : [],
      notes: notes || '',
      isActive: true
    });
    
    // Prepare medical conditions and emergency contacts from form data
    const processedMedicalConditions = medicalConditions && Array.isArray(medicalConditions) 
      ? medicalConditions 
      : medicalInfo 
        ? [{ condition: medicalInfo }] 
        : [];

    const processedEmergencyContacts = emergencyContacts && Array.isArray(emergencyContacts)
      ? emergencyContacts
      : (emergencyContactName || emergencyContactPhone)
        ? [{
            name: emergencyContactName || 'Emergency Contact',
            phone: emergencyContactPhone || '',
            relationship: 'Emergency'
          }]
        : [];

    // Process allergies - handle both string and array formats
    const processedAllergies = Array.isArray(allergies) 
      ? allergies 
      : typeof allergies === 'string' && allergies.trim()
        ? allergies.split(',').map(a => a.trim()).filter(a => a)
        : [];

    const child = await Child.create({
      firstName,
      lastName: childLastName,
      dateOfBirth,
      gender,
      parents: [parent._id],
      program,
      tuitionRate: finalTuitionRate,
      allergies: processedAllergies,
      medicalConditions: processedMedicalConditions,
      emergencyContacts: processedEmergencyContacts,
      authorizedPickup: Array.isArray(authorizedPickup) ? authorizedPickup : [],
      notes: notes || '',
      isActive: true
    });
    
    console.log('Child created successfully:', child._id);

    // Send child creation email to parent
    try {
      const childEmailData = childCreatedEmail(parent, child);
      await sendMail({
        to: parent.email,
        ...childEmailData
      });
      console.log(`Child creation email sent to parent: ${parent.email}`);
    } catch (emailError) {
      console.error('Error sending child creation email:', emailError);
    }

    res.status(201).json({
      message: 'Child profile created successfully',
      child,
      parent: parent.toJSON()
    });

  } catch (error) {
    console.error('Create child error:', error);
    res.status(500).json({ message: 'Server error creating child profile' });
  }
});

// ==================== DOCTOR MANAGEMENT ====================

// Get all doctors
router.get('/doctors', adminOnly, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' })
      .select('-password')
      .populate('doctor.assignedChildren', 'firstName lastName dateOfBirth program');
    res.json(doctors);
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Server error fetching doctors' });
  }
});

// Create doctor account (admin only)
router.post('/doctors', adminOnly, licenseUpload.single('licensePicture'), [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('username').optional().trim(),
  body('phone').optional().trim(),
  body('licenseNumber').trim().notEmpty().withMessage('License number is required'),
  body('specialization').optional().trim(),
  body('qualification').optional().trim(),
  body('yearsOfExperience').optional().isInt({ min: 0 }).withMessage('Years of experience must be a non-negative integer'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  // Legal & Licensing fields
  body('medicalLicenseNumber').optional().trim(),
  body('licenseIssuingAuthority').optional().trim(),
  body('licenseExpiryDate').optional().isISO8601().withMessage('License expiry date must be a valid date'),
  body('professionalRegistrationNumber').optional().trim(),
  body('insuranceProvider').optional().trim(),
  body('insurancePolicyNumber').optional().trim(),
  body('insuranceExpiryDate').optional().isISO8601().withMessage('Insurance expiry date must be a valid date'),
  body('backgroundCheckDate').optional().isISO8601().withMessage('Background check date must be a valid date'),
  body('backgroundCheckStatus').optional().isIn(['pending', 'approved', 'rejected']),
  body('certifications').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      username,
      phone, 
      licenseNumber, 
      specialization, 
      qualification, 
      yearsOfExperience, 
      password,
      medicalLicenseNumber,
      licenseIssuingAuthority,
      licenseExpiryDate,
      professionalRegistrationNumber,
      insuranceProvider,
      insurancePolicyNumber,
      insuranceExpiryDate,
      backgroundCheckDate,
      backgroundCheckStatus,
      certifications
    } = req.body;

    // Check if user already exists by email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Generate username if not provided
    let doctorUsername = username;
    if (!doctorUsername) {
      // Generate unique username
      const baseUsername = `dr.${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      let counter = 0;
      let uniqueUsername = baseUsername;
      
      // Check if username exists and generate unique one
      while (await User.findOne({ username: uniqueUsername })) {
        counter++;
        uniqueUsername = `${baseUsername}.${counter}`;
      }
      doctorUsername = uniqueUsername;
    } else {
      // Check if provided username already exists
      const existingUserByUsername = await User.findOne({ username: doctorUsername });
      if (existingUserByUsername) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }
    
    // Generate password if not provided
    const doctorPassword = password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '!@#';

    // Handle license picture upload
    let licensePicturePath = '';
    if (req.file) {
      licensePicturePath = `/uploads/doctor_licenses/${req.file.filename}`;
    }

    const doctor = new User({
      firstName,
      lastName,
      email,
      username: doctorUsername,
      password: doctorPassword,
      role: 'doctor',
      phone,
      isActive: true,
      doctor: {
        licenseNumber,
        specialization: specialization || '',
        qualification: qualification || '',
        yearsOfExperience: yearsOfExperience || 0,
        assignedChildren: [],
        licensePicture: licensePicturePath,
        medicalLicenseNumber: medicalLicenseNumber || '',
        licenseIssuingAuthority: licenseIssuingAuthority || '',
        licenseExpiryDate: licenseExpiryDate ? new Date(licenseExpiryDate) : undefined,
        professionalRegistrationNumber: professionalRegistrationNumber || '',
        insuranceProvider: insuranceProvider || '',
        insurancePolicyNumber: insurancePolicyNumber || '',
        insuranceExpiryDate: insuranceExpiryDate ? new Date(insuranceExpiryDate) : undefined,
        backgroundCheckDate: backgroundCheckDate ? new Date(backgroundCheckDate) : undefined,
        backgroundCheckStatus: backgroundCheckStatus || 'pending',
        certifications: Array.isArray(certifications) ? certifications.map(cert => ({
          name: cert.name || '',
          issuingOrganization: cert.issuingOrganization || '',
          issueDate: cert.issueDate ? new Date(cert.issueDate) : undefined,
          expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : undefined
        })) : []
      }
    });

    await doctor.save();

    // Send email with credentials to doctor
    try {
      const emailData = doctorAccountCreatedEmail(doctor, doctorUsername, doctorPassword);
      await sendMail({
        to: doctor.email,
        ...emailData
      });
      console.log(`Doctor account creation email sent to: ${doctor.email}`);
    } catch (emailError) {
      console.error('Error sending doctor account creation email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    res.status(201).json({
      message: 'Doctor account created successfully. Credentials have been sent to the doctor\'s email.',
      doctor: doctor.toJSON(),
      username: doctorUsername,
      tempPassword: password ? undefined : doctorPassword // Only return if auto-generated
    });
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({ message: 'Server error creating doctor account' });
  }
});

// Update doctor information
router.put('/doctors/:id', adminOnly, licenseUpload.single('licensePicture'), [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('licenseNumber').optional().trim().notEmpty(),
  body('specialization').optional().trim(),
  body('qualification').optional().trim(),
  body('yearsOfExperience').optional().isInt({ min: 0 }),
  body('medicalLicenseNumber').optional().trim(),
  body('licenseIssuingAuthority').optional().trim(),
  body('licenseExpiryDate').optional().isISO8601(),
  body('professionalRegistrationNumber').optional().trim(),
  body('insuranceProvider').optional().trim(),
  body('insurancePolicyNumber').optional().trim(),
  body('insuranceExpiryDate').optional().isISO8601(),
  body('backgroundCheckDate').optional().isISO8601(),
  body('backgroundCheckStatus').optional().isIn(['pending', 'approved', 'rejected']),
  body('certifications').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const { 
      firstName, 
      lastName, 
      phone, 
      licenseNumber, 
      specialization, 
      qualification, 
      yearsOfExperience,
      medicalLicenseNumber,
      licenseIssuingAuthority,
      licenseExpiryDate,
      professionalRegistrationNumber,
      insuranceProvider,
      insurancePolicyNumber,
      insuranceExpiryDate,
      backgroundCheckDate,
      backgroundCheckStatus,
      certifications
    } = req.body;

    if (firstName) doctor.firstName = firstName;
    if (lastName) doctor.lastName = lastName;
    if (phone !== undefined) doctor.phone = phone;
    if (licenseNumber) doctor.doctor.licenseNumber = licenseNumber;
    if (specialization !== undefined) doctor.doctor.specialization = specialization;
    if (qualification !== undefined) doctor.doctor.qualification = qualification;
    if (yearsOfExperience !== undefined) doctor.doctor.yearsOfExperience = yearsOfExperience;
    
    // Legal & Licensing fields
    if (medicalLicenseNumber !== undefined) doctor.doctor.medicalLicenseNumber = medicalLicenseNumber;
    if (licenseIssuingAuthority !== undefined) doctor.doctor.licenseIssuingAuthority = licenseIssuingAuthority;
    if (licenseExpiryDate !== undefined) doctor.doctor.licenseExpiryDate = licenseExpiryDate ? new Date(licenseExpiryDate) : undefined;
    if (professionalRegistrationNumber !== undefined) doctor.doctor.professionalRegistrationNumber = professionalRegistrationNumber;
    if (insuranceProvider !== undefined) doctor.doctor.insuranceProvider = insuranceProvider;
    if (insurancePolicyNumber !== undefined) doctor.doctor.insurancePolicyNumber = insurancePolicyNumber;
    if (insuranceExpiryDate !== undefined) doctor.doctor.insuranceExpiryDate = insuranceExpiryDate ? new Date(insuranceExpiryDate) : undefined;
    if (backgroundCheckDate !== undefined) doctor.doctor.backgroundCheckDate = backgroundCheckDate ? new Date(backgroundCheckDate) : undefined;
    if (backgroundCheckStatus !== undefined) doctor.doctor.backgroundCheckStatus = backgroundCheckStatus;
    
    // Handle license picture update
    if (req.file) {
      // Delete old license picture if exists
      if (doctor.doctor.licensePicture) {
        const oldFilePath = path.join(__dirname, '..', doctor.doctor.licensePicture);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      doctor.doctor.licensePicture = `/uploads/doctor_licenses/${req.file.filename}`;
    }
    
    if (certifications !== undefined) {
      doctor.doctor.certifications = Array.isArray(certifications) ? certifications.map(cert => ({
        name: cert.name || '',
        issuingOrganization: cert.issuingOrganization || '',
        issueDate: cert.issueDate ? new Date(cert.issueDate) : undefined,
        expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : undefined
      })) : [];
    }

    await doctor.save();

    res.json({
      message: 'Doctor updated successfully',
      doctor: doctor.toJSON()
    });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ message: 'Server error updating doctor' });
  }
});

// Assign children to doctor
router.put('/doctors/:id/assign-children', adminOnly, [
  body('childIds').isArray().withMessage('childIds must be an array'),
  body('childIds.*').isMongoId().withMessage('Each child ID must be valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const { childIds } = req.body;

    // Verify all children exist
    const children = await Child.find({ _id: { $in: childIds } });
    if (children.length !== childIds.length) {
      return res.status(400).json({ message: 'One or more children not found' });
    }

    doctor.doctor.assignedChildren = childIds;
    await doctor.save();

    await doctor.populate('doctor.assignedChildren', 'firstName lastName dateOfBirth program');

    res.json({
      message: 'Children assigned to doctor successfully',
      doctor: doctor.toJSON()
    });
  } catch (error) {
    console.error('Assign children to doctor error:', error);
    res.status(500).json({ message: 'Server error assigning children' });
  }
});

// Remove child from doctor
router.put('/doctors/:id/remove-child/:childId', adminOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.doctor.assignedChildren = doctor.doctor.assignedChildren.filter(
      childId => childId.toString() !== req.params.childId
    );
    await doctor.save();

    await doctor.populate('doctor.assignedChildren', 'firstName lastName dateOfBirth program');

    res.json({
      message: 'Child removed from doctor successfully',
      doctor: doctor.toJSON()
    });
  } catch (error) {
    console.error('Remove child from doctor error:', error);
    res.status(500).json({ message: 'Server error removing child' });
  }
});

// Delete doctor account
router.delete('/doctors/:id', adminOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'Doctor account deleted successfully' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ message: 'Server error deleting doctor' });
  }
});

// Toggle doctor active status
router.put('/doctors/:id/toggle-status', adminOnly, async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.isActive = !doctor.isActive;
    await doctor.save();

    res.json({
      message: `Doctor ${doctor.isActive ? 'activated' : 'deactivated'} successfully`,
      doctor: doctor.toJSON()
    });
  } catch (error) {
    console.error('Toggle doctor status error:', error);
    res.status(500).json({ message: 'Server error updating doctor status' });
  }
});

module.exports = router;