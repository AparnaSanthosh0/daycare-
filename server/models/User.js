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
    enum: ['admin', 'staff', 'parent', 'vendor', 'customer', 'doctor'],
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
    staffType: { 
      type: String, 
      enum: ['teacher', 'driver', 'delivery', 'nanny'], 
      default: 'teacher' 
    },
    yearsOfExperience: { type: Number, min: 0 },
    qualification: { type: String, trim: true },
    certificateUrl: { type: String, default: null },
    assignedClass: { type: String, trim: true },
    // Driver-specific fields
    licenseNumber: { type: String, trim: true },
    vehicleType: { type: String, trim: true },
    vehicleNumber: { type: String, trim: true },
    vehicleLicense: { type: String, trim: true },
    vehicleInsurance: { type: String, trim: true },
    // Delivery-specific fields (enhanced)
    deliveryArea: [String], // Array of zones they serve
    preferredZones: [String],
    availability: { 
      type: String, 
      enum: ['available', 'busy', 'offline', 'on_delivery'],
      default: 'offline'
    },
    currentDeliveries: { type: Number, default: 0 },
    maxConcurrentDeliveries: { type: Number, default: 3 },
    // Location tracking
    currentLocation: {
      coordinates: {
        lat: Number,
        lng: Number
      },
      updatedAt: Date
    },
    baseLocation: {
      coordinates: {
        lat: Number,
        lng: Number
      },
      address: String
    },
    // Working hours
    workingHours: {
      monday: { start: String, end: String, available: Boolean },
      tuesday: { start: String, end: String, available: Boolean },
      wednesday: { start: String, end: String, available: Boolean },
      thursday: { start: String, end: String, available: Boolean },
      friday: { start: String, end: String, available: Boolean },
      saturday: { start: String, end: String, available: Boolean },
      sunday: { start: String, end: String, available: Boolean }
    },
    // Wallet
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentWallet' },
    walletBalance: { type: Number, default: 0 },
    // Performance metrics
    totalDeliveries: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    deliverySuccessRate: { type: Number, default: 100, min: 0, max: 100 },
    onTimeDeliveryRate: { type: Number, default: 100, min: 0, max: 100 },
    averageDeliveryTime: { type: Number, default: 30 }, // minutes
    // Bank details for payout
    bankAccount: {
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      bankName: String,
      verified: { type: Boolean, default: false }
    },
    // Documents
    documents: {
      drivingLicense: String,
      aadharCard: String,
      panCard: String,
      policeClearance: String
    },
    // Nanny-specific fields
    serviceArea: { type: String, trim: true },
    certification: { type: String, trim: true }
  },
  // Doctor-specific profile data (only used when role = 'doctor')
  doctor: {
    licenseNumber: { type: String, trim: true },
    specialization: { type: String, trim: true },
    qualification: { type: String, trim: true },
    yearsOfExperience: { type: Number, min: 0 },
    assignedChildren: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Child' }],
    // Legal & Licensing Requirements
    licensePicture: { type: String, trim: true }, // Path to uploaded license picture
    medicalLicenseNumber: { type: String, trim: true },
    licenseIssuingAuthority: { type: String, trim: true },
    licenseExpiryDate: { type: Date },
    professionalRegistrationNumber: { type: String, trim: true },
    insuranceProvider: { type: String, trim: true },
    insurancePolicyNumber: { type: String, trim: true },
    insuranceExpiryDate: { type: Date },
    backgroundCheckDate: { type: Date },
    backgroundCheckStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    certifications: [{ 
      name: { type: String, trim: true },
      issuingOrganization: { type: String, trim: true },
      issueDate: { type: Date },
      expiryDate: { type: Date }
    }]
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