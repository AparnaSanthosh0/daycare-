# 🚨 Render Deployment Fix Guide

## Current Issue
```
Error: Cannot find module '/opt/render/project/src/server/server/index.js'
```

## Root Cause Analysis
Render is looking for the server file in the wrong path because:
1. The project structure has a nested `server` directory
2. Render's default behavior tries to run `node server/index.js` from root
3. But it's looking for the file in the wrong nested path

## ✅ Solution Applied

### 1. Created Root Entry Point (`index.js`)
- New file that acts as a bridge to the actual server
- Changes directory to `server` folder and runs the server
- Handles process management and graceful shutdown

### 2. Updated Package.json
```json
{
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "build": "npm install && cd server && npm install"
  }
}
```

### 3. Updated Render Configuration
```yaml
buildCommand: npm run build
startCommand: npm start
```

## 🚀 Deployment Steps

### **Option 1: Using render.yaml (Recommended)**
1. Push the updated code to GitHub
2. Connect your repo to Render
3. Render will automatically use the `render.yaml` configuration
4. Set environment variables in Render dashboard

### **Option 2: Manual Configuration**
If not using render.yaml, set these in Render dashboard:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Root Directory**: (leave empty)

## 📋 Environment Variables Required

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

## 🔧 How the Fix Works

### Before (Broken)
```
Render tries: node server/index.js
Looks for: /opt/render/project/src/server/server/index.js ❌
Result: MODULE_NOT_FOUND error
```

### After (Fixed)
```
Render runs: npm start
Executes: node index.js
index.js changes to server directory
Runs: cd server && npm start
Result: Server starts successfully ✅
```

## 🧪 Testing the Fix

After deployment, test these endpoints:
1. **Health Check**: `https://your-app.onrender.com/api/health`
2. **Database Status**: Check if MongoDB connection works
3. **CORS**: Test from your frontend domain

## 📊 Expected Logs

You should see:
```
🚀 Starting TinyTots server...
📁 Current directory: /opt/render/project/src
📁 Server directory: /opt/render/project/src/server
✅ Connected to MongoDB
🚀 Server running on port 10000
```

## 🚨 Troubleshooting

### If still getting path errors:
1. Check that `index.js` exists in the root directory
2. Verify `package.json` has `"main": "index.js"`
3. Ensure `server/package.json` exists and has proper start script

### If server starts but crashes:
1. Check environment variables are set correctly
2. Verify MongoDB connection string
3. Check server logs in Render dashboard

### If CORS errors:
1. Set `CORS_ORIGIN` to your frontend URL
2. Check that frontend is using the correct backend URL

## 🎯 Next Steps

1. **Deploy with the fix** - Push the updated code
2. **Monitor logs** - Check Render dashboard for successful startup
3. **Test endpoints** - Verify API is working
4. **Update frontend** - Set `REACT_APP_API_URL` to your Render URL
5. **Test integration** - Verify frontend can communicate with backend

## 📞 Support

If you still encounter issues:
1. Check the Render logs in the dashboard
2. Verify all environment variables are set
3. Test the health endpoint manually
4. Check MongoDB Atlas connection settings

The path issue should now be completely resolved! 🎉
