# Production Configuration Guide

## Environment Variables

Create a `.env.production` file in your project root with the following variables:

```bash
# Production Environment Variables
NODE_ENV=production
GENERATE_SOURCEMAP=false

# Server Configuration
PORT=5000
HOST=0.0.0.0

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/tinytots_prod
DB_NAME=tinytots_production

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12

# CORS Configuration
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Email Configuration (Production)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SMS Configuration (Production)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Payment Gateway (Production)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Firebase Configuration (Production)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=true
```

## Production Deployment Commands

### Frontend (Vercel)
```bash
npm run build:client
```

### Backend (Railway/Render/Heroku)
```bash
npm run start:prod
```

### Full Stack
```bash
npm run start:prod
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Use environment variables for secrets
- [ ] Regular security updates

## Performance Optimizations

- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure caching headers
- [ ] Optimize database queries
- [ ] Enable connection pooling
- [ ] Set up monitoring

## Monitoring Setup

- [ ] Health check endpoints
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Log aggregation
- [ ] Uptime monitoring
