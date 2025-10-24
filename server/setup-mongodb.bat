@echo off
echo 🚀 TinyTots MongoDB Setup Script
echo ==================================
echo.

REM Check if .env exists
if exist ".env" (
    echo ✅ .env file already exists
) else (
    echo 📝 Creating .env file from template...
    copy ".env.example" ".env" >nul
    echo ✅ .env file created successfully
)
echo.

echo 🔧 MongoDB Setup Options:
echo =========================
echo 1. Install MongoDB Community Server locally
echo 2. Use MongoDB Atlas (Cloud - Recommended)
echo 3. Use Docker MongoDB
echo.

set /p choice="Choose an option (1-3): "

if "%choice%"=="1" (
    echo 📥 Installing MongoDB Community Server...
    echo Visit: https://www.mongodb.com/try/download/community
    echo Download and install MongoDB Community Server for Windows
    echo.
    echo After installation:
    echo 1. Start MongoDB service
    echo 2. Default connection: mongodb://localhost:27017/tinytots
    echo.
    echo To start MongoDB service:
    echo net start MongoDB
    echo.
    echo To check if running:
    echo netstat -an ^| findstr :27017
) else if "%choice%"=="2" (
    echo ☁️  Setting up MongoDB Atlas (Cloud)
    echo 1. Go to https://www.mongodb.com/atlas
    echo 2. Create a free account
    echo 3. Create a new cluster
    echo 4. Get your connection string
    echo 5. Update MONGODB_URI in .env file
    echo.
    echo Example Atlas URI:
    echo mongodb+srv://username:password@cluster.mongodb.net/tinytots?retryWrites=true^&w=majority
    echo.
    echo After getting your connection string, update the .env file:
    echo MONGODB_URI=your_mongodb_atlas_connection_string_here
) else if "%choice%"=="3" (
    echo 🐳 Setting up MongoDB with Docker
    echo 1. Install Docker Desktop: https://www.docker.com/products/docker-desktop
    echo 2. Run: docker run --name mongodb -p 27017:27017 -d mongo:latest
    echo 3. Connection: mongodb://localhost:27017/tinytots
    echo.
    echo To run Docker MongoDB:
    echo docker run --name mongodb -p 27017:27017 -d mongo:latest
    echo.
    echo To check if running:
    echo docker ps
) else (
    echo ❌ Invalid option. Please run the script again.
    pause
    exit /b 1
)

echo.
echo 🔧 After setting up MongoDB:
echo 1. Update the MONGODB_URI in .env file if needed
echo 2. Run: npm run dev
echo 3. Check: http://localhost:5000/api/health
echo.
echo 📝 Current .env configuration:
findstr "MONGODB_URI" .env
echo.
echo Press any key to continue...
pause >nul
