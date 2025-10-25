@echo off
REM Production Deployment Script for TinyTots (Windows)
REM This script builds and prepares the application for production deployment

echo 🚀 Starting TinyTots Production Build...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    exit /b 1
)

echo [INFO] Node.js version:
node --version

REM Install dependencies
echo [INFO] Installing dependencies...
call npm install --production=false
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install root dependencies
    exit /b 1
)

REM Install server dependencies
echo [INFO] Installing server dependencies...
cd server
call npm install --production=false
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install server dependencies
    exit /b 1
)
cd ..

REM Install client dependencies
echo [INFO] Installing client dependencies...
cd client
call npm install --production=false
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install client dependencies
    exit /b 1
)
cd ..

REM Run tests
echo [INFO] Running tests...
cd server
call npm run test:ci
if %errorlevel% neq 0 (
    echo [ERROR] Server tests failed
    exit /b 1
)
cd ..

cd client
call npm run test:ci
if %errorlevel% neq 0 (
    echo [ERROR] Client tests failed
    exit /b 1
)
cd ..

REM Build client for production
echo [INFO] Building client for production...
cd client
set NODE_ENV=production
set GENERATE_SOURCEMAP=false
call npm run build:prod
if %errorlevel% neq 0 (
    echo [ERROR] Client build failed
    exit /b 1
)
cd ..

REM Create production directories
echo [INFO] Creating production directories...
if not exist "logs" mkdir logs
if not exist "server\uploads" mkdir server\uploads
if not exist "server\uploads\certificates" mkdir server\uploads\certificates
if not exist "server\uploads\child_photos" mkdir server\uploads\child_photos
if not exist "server\uploads\children" mkdir server\uploads\children
if not exist "server\uploads\products" mkdir server\uploads\products
if not exist "server\uploads\profile_images" mkdir server\uploads\profile_images
if not exist "server\uploads\vendor_licenses" mkdir server\uploads\vendor_licenses

echo [INFO] ✅ Production build completed successfully!
echo [INFO] Ready for deployment to Vercel (frontend) and Railway/Render (backend)

pause
