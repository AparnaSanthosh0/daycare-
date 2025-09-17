const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const Vendor = require('../models/Vendor');
const OtpToken = require('../models/OtpToken');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { sendMail, vendorApprovedEmail, vendorRejectedEmail } = require('../utils/mailer');
const { sendSms } = require('../utils/sms');

const router = express.Router();

// Upload folder for vendor licenses
const uploadDir = path.join(__dirname, '..', 'uploads', 'vendor_licenses');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF, JPG, and PNG files are allowed'));
  },
});

// GET current approved vendor
router.get('/', async (req, res) => {
  const vendor = await Vendor.findOne({ status: 'approved' });
  res.json({ vendor });
});

// Send OTP to email (and SMS if phone provided)
router.post('/otp/send', async (req, res) => {
  try {
    const { email, phone } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Block if email already used by vendor
    const exists = await Vendor.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already used by a vendor' });

    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await OtpToken.create({ email: String(email).toLowerCase(), codeHash, expiresAt });

    await sendMail({
      to: email,
      subject: 'Your TinyTots verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <b>${code}</b>. It expires in 10 minutes.</p>`
    });

    if (phone) {
      const to = String(phone).startsWith('+') ? phone : `+91${phone}`; // adjust country code
      try { await sendSms(to, `TinyTots code: ${code} (valid 10 minutes)`); } catch (e) { console.warn('OTP SMS failed:', e.message); }
    }

    res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('OTP send error:', err);
    res.status(500).json({ message: 'Server error sending OTP' });
  }
});

// Verify OTP
router.post('/otp/verify', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ message: 'Email and code are required' });

    const token = await OtpToken.findOne({ email: String(email).toLowerCase(), expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 });

    const ok = token && await bcrypt.compare(String(code), token.codeHash);
    if (!ok) return res.status(400).json({ message: 'Invalid or expired OTP' });

    res.json({ message: 'OTP verified' });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ message: 'Server error verifying OTP' });
  }
});

// POST create vendor registration (allows many pending, only one can be approved)
router.post(
  '/',
  upload.single('license'),
  [
    body('vendorName').trim().notEmpty().withMessage('Vendor name is required'),
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('email').isEmail().withMessage('Valid business email is required'),
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be exactly 10 digits'),
    body('businessLicenseNumber').trim().notEmpty().withMessage('Business license number is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Close vendor registrations if one is already approved
      const approved = await Vendor.findOne({ status: 'approved' });
      if (approved) {
        return res.status(400).json({ message: 'Vendor registration is temporarily closed. An approved vendor already exists.' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'License document is required (PDF/JPG/PNG).' });
      }

      // Normalize address from either nested object or bracketed field names
      const address = typeof req.body.address === 'object' && req.body.address !== null
        ? req.body.address
        : {
            street: req.body['address[street]'] || '',
            city: req.body['address[city]'] || '',
            state: req.body['address[state]'] || '',
            zipCode: req.body['address[zipCode]'] || ''
          };

      const payload = {
        vendorName: req.body.vendorName,
        companyName: req.body.companyName,
        email: String(req.body.email).toLowerCase(),
        phone: req.body.phone,
        businessLicenseNumber: req.body.businessLicenseNumber,
        address,
        notes: req.body.notes || '',
        status: 'pending',
        licenseUrl: `/uploads/vendor_licenses/${req.file.filename}`
      };

      // Optional: enforce OTP before creating vendor
      if ((process.env.ENABLE_VENDOR_EMAIL_OTP || '').toLowerCase() === 'true') {
        const { otp } = req.body || {};
        if (!otp) return res.status(400).json({ message: 'OTP is required' });
        const token = await OtpToken.findOne({ email: payload.email, expiresAt: { $gt: new Date() } })
          .sort({ createdAt: -1 });
        const ok = token && await bcrypt.compare(String(otp), token.codeHash);
        if (!ok) return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      const vendor = await Vendor.create(payload);

      // Send acknowledgement email/SMS (best-effort, dev fallbacks will log to console)
      try {
        await sendMail({
          to: vendor.email,
          subject: 'TinyTots Vendor Registration Received',
          text: `Hi ${vendor.vendorName}, your vendor registration for ${vendor.companyName} was received and is pending admin approval.`,
          html: `<p>Hi ${vendor.vendorName},</p><p>Your vendor registration for <b>${vendor.companyName}</b> was received and is pending admin approval.</p>`
        });
      } catch (e) { console.warn('Failed to send vendor registration ack email:', e.message); }
      try {
        const to = String(vendor.phone).startsWith('+') ? vendor.phone : `+91${vendor.phone}`;
        await sendSms(to, `TinyTots: We received your vendor registration for ${vendor.companyName}. Pending admin approval.`);
      } catch (e) { console.warn('Failed to send vendor registration ack SMS:', e.message); }

      return res.status(201).json({
        message: 'Vendor registration submitted. Awaiting admin approval.',
        vendor,
      });
    } catch (err) {
      // Provide clearer diagnostics to the client
      console.error('Vendor registration error:', err);

      // Duplicate key (if any unique indexes are present in DB)
      if (err && (err.code === 11000 || err.code === '11000')) {
        return res.status(400).json({ message: 'A vendor with the same email or license number already exists.' });
      }

      // Mongoose validation error
      if (err && err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }

      // Multer/file errors
      if (err && (err.name === 'MulterError' || /file.*(type|size)/i.test(err.message || ''))) {
        return res.status(400).json({ message: err.message || 'File upload error' });
      }

      // Fallback generic
      return res.status(500).json({ message: err?.message || 'Server error submitting vendor registration' });
    }
  }
);

// PUT approve vendor (admin only) - ensures only one approved vendor at a time
router.put('/:id/approve', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if another vendor is already approved
    const alreadyApproved = await Vendor.findOne({ status: 'approved' });
    if (alreadyApproved && alreadyApproved._id.toString() !== id) {
      return res.status(400).json({ message: 'Another vendor is already approved. Reject it first to approve a new one.' });
    }

    const vendor = await Vendor.findById(id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Ensure license uploaded before approval
    if (!vendor.licenseUrl) {
      return res.status(400).json({ message: 'Cannot approve vendor without a license/certificate document.' });
    }

    vendor.status = 'approved';
    vendor.approvedAt = new Date();
    vendor.approvedBy = req.user.userId;
    await vendor.save();

    // Send approval email (non-blocking)
    try {
      const mail = vendorApprovedEmail(vendor);
      await sendMail({ to: vendor.email, ...mail });
    } catch (e) {
      console.warn('Failed to send approval email:', e.message);
    }

    // Send approval SMS (best-effort)
    try {
      const to = String(vendor.phone).startsWith('+') ? vendor.phone : `+91${vendor.phone}`; // adjust country code
      await sendSms(to, `TinyTots: Your vendor registration for ${vendor.companyName} has been APPROVED.`);
    } catch (e) {
      console.warn('Failed to send approval SMS:', e.message);
    }

    res.json({ message: 'Vendor approved', vendor });
  } catch (err) {
    console.error('Vendor approve error:', err);
    res.status(500).json({ message: 'Server error approving vendor' });
  }
});

// PUT reject vendor (admin only)
router.put('/:id/reject', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const vendor = await Vendor.findById(id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    vendor.status = 'rejected';
    vendor.approvedAt = null;
    vendor.approvedBy = null;
    await vendor.save();

    // Send rejection email (non-blocking)
    try {
      const mail = vendorRejectedEmail(vendor, reason);
      await sendMail({ to: vendor.email, ...mail });
    } catch (e) {
      console.warn('Failed to send rejection email:', e.message);
    }

    // Send rejection SMS (best-effort)
    try {
      const to = String(vendor.phone).startsWith('+') ? vendor.phone : `+91${vendor.phone}`; // adjust country code
      await sendSms(to, `TinyTots: Your vendor registration for ${vendor.companyName} was NOT approved at this time.`);
    } catch (e) {
      console.warn('Failed to send rejection SMS:', e.message);
    }

    res.json({ message: 'Vendor rejected', vendor });
  } catch (err) {
    console.error('Vendor reject error:', err);
    res.status(500).json({ message: 'Server error rejecting vendor' });
  }
});

module.exports = router;