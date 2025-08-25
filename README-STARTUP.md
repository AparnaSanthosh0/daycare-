# 🚀 TinyTots - Quick Start Guide

## ✅ **FIXED: Port Issue Resolved**

The port conflict has been resolved. The backend now runs on **port 5001** instead of 5000.

## 🎯 **How to Run TinyTots**

### **Option 1: Quick Start (Recommended)**
```cmd
# Double-click this file or run in command prompt:
start-fixed.bat
```

### **Option 2: Manual Start**
```cmd
# Terminal 1 - Backend (Port 5001)
cd C:\Users\HP\TinyTots\server
npm run dev

# Terminal 2 - Frontend (Port 3000)  
cd C:\Users\HP\TinyTots\client
npm start
```

### **Option 3: PowerShell**
```powershell
# Start both servers
cd C:\Users\HP\TinyTots
.\start-dev.ps1
```

## 🌐 **Access Your Application**

- **🏠 Landing Page:** http://localhost:3000
- **🔧 Backend API:** http://localhost:5001
- **❤️ Health Check:** http://localhost:5001/api/health

## 🔍 **Troubleshooting**

### **If you still get port errors:**
```cmd
# Kill all Node processes
taskkill /IM node.exe /F
taskkill /IM nodemon.exe /F

# Wait 5 seconds, then restart
```

### **If MongoDB connection fails:**
The server will still start and show:
```
⚠️ Starting server without database connection...
🚀 Server running on port 5001 (without database)
```

**To fix MongoDB:**
1. **Install MongoDB Community Server:** https://www.mongodb.com/try/download/community
2. **Or use MongoDB Atlas (cloud):** https://www.mongodb.com/atlas
3. **Update `server/.env`** with your MongoDB connection string

### **If frontend won't load:**
1. Make sure both servers are running
2. Check that backend shows: `✅ Connected to MongoDB`
3. Visit http://localhost:5001/api/health to test backend
4. Clear browser cache and refresh

## 🎨 **What You'll See**

1. **Beautiful Landing Page** with animations and features
2. **Login/Register** forms for authentication  
3. **Dashboard** with statistics and navigation
4. **All Features** - Children, Parents, Staff, Attendance, etc.

## 📱 **First Time Setup**

1. **Start the servers** using any method above
2. **Visit** http://localhost:3000
3. **Click "Get Started"** to register
4. **Create your account** (first user becomes admin)
5. **Explore** all the features!

## ✨ **Features Working**

- ✅ Beautiful responsive landing page
- ✅ User authentication (register/login)
- ✅ Dashboard with statistics
- ✅ All navigation pages created
- ✅ MongoDB integration
- ✅ API endpoints ready
- ✅ Material-UI design system

## 🆘 **Need Help?**

If you encounter any issues:
1. Check that both terminal windows show servers running
2. Verify the health endpoint: http://localhost:5001/api/health
3. Look for error messages in the terminal windows
4. Try restarting both servers

**The application is now ready to use! 🎉**