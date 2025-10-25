const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Trust proxy so req.protocol uses X-Forwarded-Proto when behind proxies (e.g., HTTPS at CDN)
app.set('trust proxy', 1);

// Security middleware (allow cross-origin resource loading for images/assets)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false  // Disable COOP to allow popups
}));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://daycare-plmf.vercel.app',
    'https://daycare-plmf-git-main-aparnas-projects-4913ab30.vercel.app',
    'https://daycare-plmf-c8xo0dsxz-aparnas-projects-4913ab30.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting (configurable, disabled in development by default)
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 100);
const RATE_LIMIT_WINDOW_MIN = Number(process.env.RATE_LIMIT_WINDOW_MIN || 15);
const RATE_LIMIT_ENABLED = (process.env.RATE_LIMIT_ENABLED || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'production';

if (RATE_LIMIT_ENABLED) {
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MIN * 60 * 1000,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);
} else {
  console.warn('Rate limiting disabled (NODE_ENV !== production or RATE_LIMIT_ENABLED not true).');
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes (protect with DB readiness so requests fail fast if DB is down)
const requireDb = (req, res, next) => {
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const state = mongoose.connection.readyState;
  if (state !== 1) {
    return res.status(503).json({ message: 'Database not connected' });
  }
  next();
};

app.use('/api/auth', requireDb, require('./routes/auth'));
app.use('/api/admin', requireDb, require('./routes/admin'));
app.use('/api/children', requireDb, require('./routes/children'));
app.use('/api/parents', requireDb, require('./routes/parents'));
app.use('/api/staff', requireDb, require('./routes/staff'));
app.use('/api/staff-ops', requireDb, require('./routes/staffOps'));
app.use('/api/attendance', requireDb, require('./routes/attendance'));
app.use('/api/billing', requireDb, require('./routes/billing'));
app.use('/api/activities', requireDb, require('./routes/activities'));
app.use('/api/reports', requireDb, require('./routes/reports'));
// Inventory (Admin-only)
app.use('/api/meal-plans', requireDb, require('./routes/mealPlans'));
app.use('/api/inventory', requireDb, require('./routes/inventory'));
// Vendor (singleton)
app.use('/api/vendor', requireDb, require('./routes/vendors'));
// Products (public list, vendor/admin manage)
app.use('/api/products', requireDb, require('./routes/products'));
app.use('/api/customers', requireDb, require('./routes/customers'));
// Purchase Orders (Admin-only)
app.use('/api/purchase-orders', requireDb, require('./routes/purchaseOrders'));
// Payments (Razorpay integration)
app.use('/api/payments', requireDb, require('./routes/payments'));
// Orders (customer → admin → vendor flow)
app.use('/api/orders', requireDb, require('./routes/orders'));
// Invoices (auto-generated for paid orders)
app.use('/api/invoices', requireDb, require('./routes/invoices'));
// Reviews (customer feedback to vendors and admin)
app.use('/api/reviews', requireDb, require('./routes/reviews'));
// Recommendations (ML-based child grouping)
app.use('/api/recommendations', requireDb, require('./routes/recommendations'));

// Feedback Classification (Bayesian ML)
app.use('/api/feedback-classification', requireDb, require('./routes/feedbackClassification'));

// Meal Recommendations (Decision Tree ML)
app.use('/api/meal-recommendations', requireDb, require('./routes/mealRecommendations'));

// Serve uploaded files (certificates, child photos, profile images, etc.)
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ 
    status: 'OK', 
    message: 'TinyTots Server is running!',
    database: dbStatus,
    services: {
      email: process.env.EMAIL_HOST ? 'configured' : 'not configured',
      sms: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not configured'
    },
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Serve static files in production (REMOVED - handled by Vercel)
// Static file serving is handled by Vercel for frontend deployment
// Backend only serves API routes and uploaded files

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// For non-API routes, return a message (frontend is handled by Vercel)
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found. Frontend is served by Vercel.',
    frontend_url: process.env.FRONTEND_URL || 'https://daycare-plmf.vercel.app'
  });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tinytots';

// Ensure PORT is a number
const serverPort = parseInt(PORT, 10) || 5000;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(serverPort, () => {
      console.log(`🚀 Server running on port ${serverPort}`);
      console.log(`📱 Frontend should connect to: http://localhost:${serverPort}`);
      console.log(`🔍 Health check: http://localhost:${serverPort}/api/health`);
      console.log(`📊 API Base URL: http://localhost:${serverPort}/api`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n🔧 MongoDB Setup Options:');
    console.log('1. Install MongoDB Community Server: https://www.mongodb.com/try/download/community');
    console.log('2. Use MongoDB Atlas (cloud): https://www.mongodb.com/atlas');
    console.log('3. Update MONGODB_URI in .env file');
    console.log('\n🔧 Quick Atlas Setup:');
    console.log('1. Create account at https://www.mongodb.com/atlas');
    console.log('2. Create free cluster');
    console.log('3. Get connection string (mongodb+srv://...)');
    console.log('4. Update MONGODB_URI in .env file');
    console.log('\n⚠️  Starting server without database connection...');

    // Start server anyway for development
    app.listen(serverPort, () => {
      console.log(`🚀 Server running on port ${serverPort} (without database)`);
      console.log(`📱 Frontend should connect to: http://localhost:${serverPort}`);
      console.log(`🔍 Health check: http://localhost:${serverPort}/api/health`);
    });
  });