const express = require('express');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const auth = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// File upload setup for staff certificates
const uploadDir = path.join(__dirname, '..', 'uploads', 'certificates');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file per request
  },
  fileFilter: (req, file, cb) => {
    // More strict file type validation
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      return cb(null, true);
    }
    
    cb(new Error('Only PDF, JPG, and PNG files are allowed. File type: ' + file.mimetype));
  }
});

// Register
router.post('/register', upload.single('certificate'), [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  // Strong password: min 8, at least one uppercase, one lowercase, one number, one special char
  body('password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
    .withMessage('Password must be 8+ chars with upper, lower, number and special character'),
  body('role').optional().isIn(['admin', 'staff', 'parent', 'vendor', 'customer']).withMessage('Invalid role'),
  // Accept empty or missing yearsOfExperience; coerce if provided
  body('yearsOfExperience')
    .optional({ checkFalsy: true, nullable: true })
    .customSanitizer(v => (v === '' || v === undefined || v === null ? undefined : v))
    .isInt({ min: 0 }).withMessage('Years of experience must be a number >= 0'),
  body('qualification').optional().isString().trim().escape(),
  // Optional username support
  body('username').optional().isString().trim(),
  // Phone number: digits only and length 10 when provided
  body('phone').optional().matches(/^\d{10}$/).withMessage('Phone must be exactly 10 digits'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, role, phone, address, yearsOfExperience, qualification, username, notifyByEmail, staffType, licenseNumber, vehicleType, deliveryArea, serviceArea, availability, certification, hasMultipleChildren, numberOfChildren, additionalChildren } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, ...(username ? [{ username }] : [])] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email/username' });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role: role || 'parent',
      phone,
      address,
      username: username || undefined,
      staff: role === 'staff' ? {
        staffType: staffType || 'teacher',
        yearsOfExperience: yearsOfExperience === undefined || yearsOfExperience === '' ? 0 : Number(yearsOfExperience),
        qualification: qualification || '',
        certificateUrl: req.file ? `/uploads/certificates/${req.file.filename}` : null,
        licenseNumber: licenseNumber || undefined,
        vehicleType: vehicleType || undefined,
        deliveryArea: deliveryArea || undefined,
        serviceArea: serviceArea || undefined,
        availability: availability || undefined,
        certification: certification || undefined
      } : undefined
    });

    // Parent and staff require admin approval -> start as inactive
    const roleToEvaluate = user.role || 'parent';
    if (['parent', 'staff'].includes(roleToEvaluate)) {
      user.isActive = false;
    }

    await user.save();

    // For parent registrations, capture admission request details
    if (roleToEvaluate === 'parent') {
      const AdmissionRequest = require('../models/AdmissionRequest');
      // Extract child/admission fields from body (support both old twins format and new multiple children format)
      const { childName, childDob, childGender, medicalInfo, emergencyContactName, emergencyContactPhone, program, hasTwins, twinName, twinDob, twinGender, twinProgram, twinMedicalInfo } = req.body || {};

      // Validate child DOB between 1 and 7 years
      const dob = childDob ? new Date(childDob) : null;
      if (!dob || isNaN(dob.getTime())) {
        return res.status(400).json({ message: 'Invalid child date of birth' });
      }
      const today = new Date();
      const minDob = new Date(today.getFullYear() - 7, today.getMonth(), today.getDate());
      const maxDob = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      if (!(dob >= minDob && dob <= maxDob)) {
        return res.status(400).json({ message: 'Child age must be between 1 and 7 years' });
      }

      // Emergency phone optional but must be 10 digits if provided
      if (emergencyContactPhone && !/^\d{10}$/.test(emergencyContactPhone)) {
        return res.status(400).json({ message: 'Emergency contact phone must be 10 digits' });
      }

      // Create admission request for first child
      await AdmissionRequest.create({
        parentUser: user._id,
        parent: {
          firstName,
          lastName,
          email,
          phone,
          address
        },
        child: {
          name: childName,
          dateOfBirth: dob,
          gender: childGender || 'male',
          program: program || null,
          medicalInfo: medicalInfo || '',
          emergencyContactName: emergencyContactName || '',
          emergencyContactPhone: emergencyContactPhone || ''
        },
        status: 'pending'
      });

      // If multiple children, create admission request for additional children
      if (hasMultipleChildren === true || hasMultipleChildren === 'true') {
        const additionalChildren = req.body.additionalChildren;
        if (!Array.isArray(additionalChildren) || additionalChildren.length === 0) {
          return res.status(400).json({ message: 'Additional children information is required when registering multiple children' });
        }

        for (let i = 0; i < additionalChildren.length; i++) {
          const child = additionalChildren[i];
          if (!child.name || !child.dob) {
            return res.status(400).json({ message: `Child ${i + 2} name and date of birth are required` });
          }
          
          const childDobDate = child.dob ? new Date(child.dob) : null;
          if (!childDobDate || isNaN(childDobDate.getTime())) {
            return res.status(400).json({ message: `Invalid date of birth for child ${i + 2}` });
          }
          if (!(childDobDate >= minDob && childDobDate <= maxDob)) {
            return res.status(400).json({ message: `Child ${i + 2} age must be between 1 and 7 years` });
          }

          await AdmissionRequest.create({
            parentUser: user._id,
            parent: {
              firstName,
              lastName,
              email,
              phone,
              address
            },
            child: {
              name: child.name,
              dateOfBirth: childDobDate,
              gender: child.gender || 'male',
              program: child.program || null,
              medicalInfo: child.medicalInfo || '',
              emergencyContactName: emergencyContactName || '',
              emergencyContactPhone: emergencyContactPhone || ''
            },
            status: 'pending'
          });
        }
      }
      
      // Backward compatibility: Support old hasTwins format
      if (!hasMultipleChildren && (hasTwins === true || hasTwins === 'true')) {
        if (twinName && twinDob) {
          const twinDobDate = twinDob ? new Date(twinDob) : null;
          if (twinDobDate && !isNaN(twinDobDate.getTime()) && (twinDobDate >= minDob && twinDobDate <= maxDob)) {
            await AdmissionRequest.create({
              parentUser: user._id,
              parent: {
                firstName,
                lastName,
                email,
                phone,
                address
              },
              child: {
                name: twinName,
                dateOfBirth: twinDobDate,
                gender: twinGender || 'male',
                program: twinProgram || null,
                medicalInfo: twinMedicalInfo || '',
                emergencyContactName: emergencyContactName || '',
                emergencyContactPhone: emergencyContactPhone || ''
              },
              status: 'pending'
            });
          }
        }
      }
    }

    // For parent/staff registrations, mark as submitted and do not auto-login
    if (['parent', 'staff'].includes(roleToEvaluate)) {
      let message;
      if (roleToEvaluate === 'staff') {
        message = 'Staff registration submitted. Awaiting admin approval.';
      } else if (roleToEvaluate === 'customer') {
        // Customers are auto-activated now; this branch should not trigger
        message = 'Registration successful.';
      } else {
        message = 'Admission request submitted. Awaiting admin approval.';
      }
      // Optionally send confirmation email if client asked (notifyByEmail=true)
      try {
        if (notifyByEmail === 'true' || notifyByEmail === true) {
          const { sendMail, registrationSubmittedEmail } = require('../utils/mailer');
          const mail = registrationSubmittedEmail(user.toObject(), roleToEvaluate);
          await sendMail({ to: email, ...mail });
        }
      } catch (e) {
        console.warn('Registration email skip/error:', e.message);
      }

      return res.status(201).json({
        message,
        pending: true,
      });
    }

    // Otherwise, issue JWT and return user
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Send email verification link (best-effort)
    try {
      const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
      const emailToken = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 24*60*60*1000);
      user.emailVerificationToken = emailToken;
      user.emailVerificationExpires = expiry;
      await user.save();
      const verifyUrl = `${baseUrl}/verify-email?token=${emailToken}&email=${encodeURIComponent(user.email)}`;
      const { sendMail, emailVerificationEmail } = require('../utils/mailer');
      const mail = emailVerificationEmail(user.toObject(), verifyUrl);
      await sendMail({ to: user.email, ...mail });
    } catch (e) {
      console.warn('Email verification send skipped/failed:', e.message);
    }

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login (supports username or email)
router.post('/login', [
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // If DB is down, fail with a clear error (frontend often reports this as "login failed")
    const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
    if (state === 0 || state === 3) {
      return res.status(503).json({
        message: 'Database not connected. Please start MongoDB or fix MONGODB_URI, then retry login.',
        code: 'DB_NOT_CONNECTED',
        details: { readyState: state }
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
      }

    const { username, email: rawEmail, password } = req.body;
    const email = rawEmail ? String(rawEmail).toLowerCase() : undefined;
    if (!username && !email) {
      return res.status(400).json({ message: 'Username or email is required' });
    }

    // Choose identifier: username preferred if provided, else email
    const query = username ? { username } : { email };

    const user = await User.findOne(query).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      // Allow admins to log in even if inactive; optionally allow all via .env
      const allowAll = (process.env.ALLOW_INACTIVE_LOGIN || '').toLowerCase() === 'true';
      // Allow recent password reset users a temporary login window
      const withinResetWindow = user.passwordResetWindowExpires && user.passwordResetWindowExpires > new Date();
      if (user.role !== 'admin' && !allowAll && !withinResetWindow) {
        return res.status(401).json({ message: 'Account is deactivated or pending approval' });
      }
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Clear reset window once they successfully login
    if (user.passwordResetWindowExpires && user.passwordResetWindowExpires > new Date()) {
      try {
        user.passwordResetWindowExpires = null;
        await user.save();
      } catch {}
    }
    res.json({ message: 'Login successful', token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    // Supports both standard users (userId) and customers (customerId)
    if (req.user && req.user.userId) {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json({ user });
    }
    if (req.user && req.user.customerId) {
      const Customer = require('../models/Customer');
      const customer = await Customer.findById(req.user.customerId).select('-password');
      if (!customer) return res.status(404).json({ message: 'User not found' });
      // Return a user-shaped object so frontend AuthContext can consume it seamlessly
      const user = {
        _id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        role: req.user.role || 'customer',
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        lastLogin: customer.lastLogin,
        address: customer.address,
        isActive: customer.isActive !== false,
        profileImage: customer.profileImage || null,
        updatedAt: customer.updatedAt
      };
      return res.json({ user });
    }
    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile (JSON fields)
router.put('/profile', auth, [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim(),
  body('address').optional().isObject(),
  body('notifications').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = req.body || {};
    delete updates.email;
    delete updates.password;
    delete updates.role;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// Change password
router.post('/change-password', auth, [
  body('currentPassword').notEmpty(),
  body('newPassword').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body || {};
    const user = await User.findById(req.user.userId).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
});

// Profile picture upload
const profileUploadDir = path.join(__dirname, '..', 'uploads', 'profile_images');
if (!fs.existsSync(profileUploadDir)) fs.mkdirSync(profileUploadDir, { recursive: true });
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`)
});
const profileUpload = multer({ storage: profileStorage });

router.post('/profile/image', auth, profileUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = `/uploads/profile_images/${req.file.filename}`;
    // Support both regular users and customers
    if (req.user && req.user.userId) {
      const user = await User.findByIdAndUpdate(req.user.userId, { profileImage: url }, { new: true });
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json({ message: 'Profile image updated', url, user });
    }
    if (req.user && req.user.customerId) {
      const Customer = require('../models/Customer');
      const customer = await Customer.findByIdAndUpdate(req.user.customerId, { profileImage: url }, { new: true });
      if (!customer) return res.status(404).json({ message: 'User not found' });
      // Return a user-shaped object to keep client consistent
      const user = {
        _id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        role: req.user.role || 'customer',
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        lastLogin: customer.lastLogin,
        address: customer.address,
        isActive: customer.isActive !== false,
        profileImage: customer.profileImage || url,
        updatedAt: customer.updatedAt
      };
      return res.json({ message: 'Profile image updated', url, user });
    }
    return res.status(400).json({ message: 'Unrecognized auth token' });
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({ message: 'Server error uploading profile image' });
  }
});

// Debug route to test if auth routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working!', timestamp: new Date().toISOString() });
});

// Google Sign-In: exchange Firebase ID token for app JWT
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ message: 'Missing idToken' });

    // Feature flag: allow disabling Google OAuth without code changes
    const googleEnabled = (process.env.ENABLE_GOOGLE_AUTH || 'true').toLowerCase() === 'true';
    if (!googleEnabled) {
      return res.status(503).json({
        message: 'Google authentication is temporarily disabled. Please use email/password login.'
      });
    }

    // For now, let's use a simpler approach without Firebase Admin SDK
    // This will work with the frontend Firebase authentication
    try {
      // Decode the JWT token manually (basic validation)
      const tokenParts = idToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      const { email, name, picture, sub } = payload;
      
      if (!email) return res.status(400).json({ message: 'Email not available from Google' });
      
      // Allow seamless onboarding: auto-create Parent account if not found
      let user = await User.findOne({ email });
      if (!user) {
        const firstName = (name || email).split(' ')[0] || 'Parent';
        const lastName = (name || '').split(' ').slice(1).join(' ') || 'User';
        user = new User({
          firstName,
          lastName,
          email: String(email).toLowerCase(),
          password: Math.random().toString(36).slice(-10) + 'A@1',
          role: 'parent',
          isActive: true,
          profileImage: picture || null
        });
        await user.save();
      }
      
      if (!user.isActive) {
        return res.status(403).json({ message: 'Your account is awaiting admin approval.' });
      }
      
      // Block admins from Google sign-in
      if (user.role === 'admin') {
        return res.status(403).json({ message: 'Admin accounts must use email/password login.' });
      }

      // Mint app JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        message: 'Google sign-in successful',
        token,
        user,
      });
      
    } catch (decodeErr) {
      console.error('Token decode error:', decodeErr);
      return res.status(401).json({ message: 'Invalid Google authentication token' });
    }
    
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ message: 'Server error during Google sign-in' });
  }
});

// Forgot password - request reset link (email link with token)
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const rawEmail = req.body.email;
    const email = String(rawEmail).toLowerCase();
    let user = await User.findOne({ email });

    // If no user, but a vendor exists with this email, auto-create/link a vendor user for reset
    if (!user) {
      const vendor = await Vendor.findOne({ email });
      if (vendor) {
        user = new User({
          firstName: vendor.vendorName,
          lastName: vendor.companyName || 'Vendor',
          email: vendor.email,
          password: Math.random().toString(36).slice(-10) + 'A@1',
          role: 'vendor',
          phone: vendor.phone,
          address: vendor.address || {},
          isActive: true,
        });
        await user.save();
        if (!vendor.user) { vendor.user = user._id; await vendor.save(); }
      } else {
        // Generic success to avoid email enumeration
        return res.json({ message: 'If this email exists, a reset link has been sent.' });
      }
    }

    // Create reset token and expiry
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60*60*1000); // 1 hour
    await user.save();

    const baseUrl = process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      const { sendMail, resetPasswordEmail } = require('../utils/mailer');
      const mail = resetPasswordEmail(user.toObject(), resetUrl);
      await sendMail({ to: email, ...mail });
    } catch (e) {
      console.warn('Reset email skipped/failed:', e.message);
    }

    // Return resetUrl in dev so UI can surface a direct link when using Ethereal
    res.json({ message: 'If this email exists, a reset link has been sent.', resetUrl });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password - complete
router.post('/reset-password', [
  body('email').isEmail(),
  body('token').notEmpty(),
  body('password').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email: rawEmail, token, password } = req.body;
    const email = String(rawEmail).toLowerCase();
    const user = await User.findOne({ email, resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = password; // will be hashed by pre-save hook
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    // Allow login for 24 hours even if account is inactive (post-reset)
    user.passwordResetWindowExpires = new Date(Date.now() + 24*60*60*1000);
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send email verification link (on-demand)
router.post('/send-verification', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 24*60*60*1000);
    await user.save();

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
    try {
      const { sendMail, emailVerificationEmail } = require('../utils/mailer');
      const mail = emailVerificationEmail(user.toObject(), verifyUrl);
      await sendMail({ to: user.email, ...mail });
    } catch (e) {
      console.warn('Verification email skipped/failed:', e.message);
    }

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify email callback (server-side endpoint option)
router.post('/verify-email', [
  body('email').isEmail(),
  body('token').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, token } = req.body;
    const user = await User.findOne({ email, emailVerificationToken: token, emailVerificationExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send phone verification code
router.post('/send-phone-code', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.phone) return res.status(400).json({ message: 'No phone on file' });

    const code = (Math.floor(100000 + Math.random() * 900000)).toString(); // 6-digit
    user.phoneVerificationCode = code;
    user.phoneVerificationExpires = new Date(Date.now() + 10*60*1000); // 10 min
    await user.save();

    // Send via SMS if configured
    try {
      const { sendSms } = require('../utils/sms');
      await sendSms(user.phone, `Your TinyTots verification code is ${code}`);
    } catch (e) {
      console.warn('SMS send failed, code logged to server for dev.');
      console.warn(`Phone verification code for ${user.phone}: ${code}`);
    }
    res.json({ message: 'Verification code sent to your phone' });
  } catch (error) {
    console.error('Send phone code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify phone code
router.post('/verify-phone', auth, [
  body('code').isLength({ min: 4 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { code } = req.body;
    if (!user.phoneVerificationCode || !user.phoneVerificationExpires || user.phoneVerificationExpires <= new Date() || user.phoneVerificationCode !== String(code)) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    user.phoneVerified = true;
    user.phoneVerificationCode = null;
    user.phoneVerificationExpires = null;
    await user.save();

    res.json({ message: 'Phone verified successfully' });
  } catch (error) {
    console.error('Verify phone error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send WhatsApp verification code
router.post('/send-whatsapp-code', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.phone) return res.status(400).json({ message: 'No phone on file' });

    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    user.whatsappVerificationCode = code;
    user.whatsappVerificationExpires = new Date(Date.now() + 10*60*1000);
    await user.save();

    // Send via WhatsApp if configured
    try {
      const { sendWhatsApp } = require('../utils/sms');
      await sendWhatsApp(user.phone.startsWith('+') ? user.phone : `+${user.phone}`, `Your TinyTots verification code is ${code}`);
    } catch (e) {
      console.warn('WhatsApp send failed, code logged to server for dev.');
      console.warn(`WhatsApp verification code for ${user.phone}: ${code}`);
    }
    res.json({ message: 'Verification code sent via WhatsApp' });
  } catch (error) {
    console.error('Send WhatsApp code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify WhatsApp code
router.post('/verify-whatsapp', auth, [
  body('code').isLength({ min: 4 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { code } = req.body;
    if (!user.whatsappVerificationCode || !user.whatsappVerificationExpires || user.whatsappVerificationExpires <= new Date() || user.whatsappVerificationCode !== String(code)) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    user.whatsappVerified = true;
    user.whatsappVerificationCode = null;
    user.whatsappVerificationExpires = null;
    await user.save();

    res.json({ message: 'WhatsApp verified successfully' });
  } catch (error) {
    console.error('Verify WhatsApp error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;