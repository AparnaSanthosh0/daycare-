const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'parent', 'vendor', 'customer'],
    default: 'parent'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  isActive: {
    type: Boolean,
    default: false // default to false; admin must approve
  },
  profileImage: {
    type: String,
    default: null
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  // Notification preferences
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false }
  },
  // Optional communication history for admins to track outreach
  communications: [{
    date: { type: Date, default: Date.now },
    channel: { type: String, enum: ['email', 'phone', 'in-person', 'feedback', 'in-app', 'other'], default: 'other' },
    subject: { type: String, trim: true },
    notes: { type: String, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null } // For storing additional data like recommendations
  }],
  // Optional payment info reference (non-sensitive)
  payment: {
    method: { type: String, enum: ['card', 'bank', 'cash', 'other'], default: 'other' },
    last4: { type: String, trim: true },
    billingEmail: { type: String, trim: true }
  },
  // Staff-specific profile data (only used when role = 'staff')
  staff: {
    yearsOfExperience: { type: Number, min: 0 },
    qualification: { type: String, trim: true },
    certificateUrl: { type: String, default: null }
  },
  // Verification & security
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  whatsappVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  phoneVerificationCode: { type: String, default: null },
  phoneVerificationExpires: { type: Date, default: null },
  whatsappVerificationCode: { type: String, default: null },
  whatsappVerificationExpires: { type: Date, default: null }
  ,
  // Allow temporary login after password reset even if inactive
  passwordResetWindowExpires: { type: Date, default: null }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);