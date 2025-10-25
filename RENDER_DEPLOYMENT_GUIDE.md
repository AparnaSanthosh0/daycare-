# 🚀 Render Deployment Guide for TinyTots

## 🚨 Current Issue Fixed

**Error**: `Cannot find module '/opt/render/project/src/server/server/index.js'`

**Root Cause**: Render was looking for the server file in the wrong path due to incorrect package.json configuration.

**Solution**: Updated package.json with proper start script and created render.yaml configuration.

## 📋 Deployment Steps

### **1. Render Configuration**

#### **Option A: Using render.yaml (Recommended)**
1. Push the `render.yaml` file to your repository
2. Connect your GitHub repo to Render
3. Render will automatically detect the configuration

#### **Option B: Manual Configuration**
1. **Build Command**: `npm install && cd server && npm install`
2. **Start Command**: `cd server && npm start`
3. **Root Directory**: Leave empty (uses project root)

### **2. Environment Variables**

Set these in Render dashboard:

```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tinytots
JWT_SECRET=your-super-secure-jwt-secret-here
CORS_ORIGIN=https://your-frontend-url.vercel.app
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MIN=15
```

### **3. Database Setup**

#### **Option A: Render Database**
1. Create a new PostgreSQL database in Render
2. Use the connection string as `MONGODB_URI`

#### **Option B: MongoDB Atlas (Recommended)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/tinytots`
4. Add to environment variables

### **4. File Structure Requirements**

Ensure your project structure is:
```
TinyTots/
├── server/
│   ├── index.js          # Main server file
│   ├── package.json      # Server dependencies
│   └── ...
├── client/
│   ├── src/
│   ├── package.json      # Client dependencies
│   └── ...
├── package.json          # Root package.json
├── render.yaml          # Render configuration
└── ...
```

### **5. Common Issues and Solutions**

#### **Issue**: "Cannot find module" errors
**Solution**: Ensure all dependencies are installed in both root and server directories

#### **Issue**: Port binding errors
**Solution**: Use `process.env.PORT` in your server code (already fixed)

#### **Issue**: CORS errors
**Solution**: Set `CORS_ORIGIN` environment variable to your frontend URL

#### **Issue**: Database connection fails
**Solution**: Check MongoDB Atlas IP whitelist includes Render's IP ranges

### **6. Testing Deployment**

After deployment, test these endpoints:

1. **Health Check**: `https://your-app.onrender.com/api/health`
2. **Database Status**: Check if MongoDB connection is successful
3. **CORS**: Test from your frontend domain

### **7. Monitoring**

- **Logs**: Check Render dashboard for application logs
- **Metrics**: Monitor CPU, memory, and response times
- **Uptime**: Set up uptime monitoring

## 🔧 Troubleshooting

### **Build Failures**
```bash
# Check if all dependencies are installed
npm install
cd server && npm install
cd ../client && npm install
```

### **Runtime Errors**
```bash
# Check server logs in Render dashboard
# Common issues:
# - Missing environment variables
# - Database connection issues
# - Port binding problems
```

### **Database Issues**
```bash
# Test MongoDB connection
# Check Atlas IP whitelist
# Verify connection string format
```

## 📊 Performance Optimization

1. **Enable Gzip**: Already configured in server
2. **Database Indexing**: Add indexes for frequently queried fields
3. **Caching**: Implement Redis for session storage
4. **CDN**: Use CloudFront for static assets

## 🚀 Next Steps

1. **Deploy Backend**: Use this guide to deploy to Render
2. **Update Frontend**: Set `REACT_APP_API_URL` to your Render URL
3. **Test Integration**: Verify frontend can communicate with backend
4. **Monitor**: Set up logging and monitoring
5. **Scale**: Upgrade plan as needed

## 📞 Support

If you encounter issues:
1. Check Render logs in dashboard
2. Verify environment variables
3. Test database connection
4. Check CORS configuration
