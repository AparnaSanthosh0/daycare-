const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Child = require('../models/Child');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    let user;
    if (decoded.userId) {
      // Regular user
      user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Token is no longer valid' });
      }
    } else if (decoded.customerId) {
      // Customer
      user = await Customer.findById(decoded.customerId);
      if (!user || user.isActive === false) {
        return res.status(401).json({ message: 'Token is no longer valid' });
      }
    } else {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Ensure staff object is properly included
    const staffData = user.staff || (user.role === 'staff' ? {} : undefined);
    
    req.user = {
      ...decoded,
      userId: decoded.userId || decoded._id || decoded.id,
      role: decoded.role,
      email: user.email,
      _id: user._id ? user._id.toString() : decoded.userId,
      // Expose commonly used profile fields so downstream routes don't need to re-query
      firstName: user.firstName,
      lastName: user.lastName,
      staff: staffData,
      address: user.address,
      phone: user.phone
    };
    
    // Debug logging for nanny users
    if (user.role === 'staff' && staffData?.staffType === 'nanny') {
      console.log('✅ Nanny user authenticated:', {
        userId: req.user.userId,
        role: req.user.role,
        staffType: req.user.staff?.staffType
      });
    }
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }

    next();
  };
};

// Middleware to check if parent has child profiles
const requireChildProfile = async (req, res, next) => {
  try {
    if (req.user.role !== 'parent') {
      return next(); // Skip check for non-parents
    }

    const children = await Child.find({ 
      parents: req.user.userId,
      isActive: true 
    });

    if (children.length === 0) {
      return res.status(403).json({ 
        message: 'No child profiles found. Please contact administration to create your child profile before accessing the dashboard.',
        code: 'NO_CHILD_PROFILE'
      });
    }

    next();
  } catch (error) {
    console.error('Require child profile middleware error:', error);
    res.status(500).json({ message: 'Server error checking child profiles' });
  }
};

module.exports = auth;
module.exports.authorize = authorize;
module.exports.requireChildProfile = requireChildProfile;