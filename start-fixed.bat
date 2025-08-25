@echo off
cls
echo ========================================
echo    TinyTots Daycare Management System
echo ========================================
echo.

echo Cleaning up any existing processes...
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM nodemon.exe /F >nul 2>&1

echo Waiting for ports to be released...
timeout /t 3 /nobreak >nul

echo.
echo Starting TinyTots servers...
echo.

echo [1/2] Starting Backend Server (Port 5001)...
start "TinyTots Backend" cmd /k "cd /d %~dp0server && echo Starting backend server on port 5001... && npm run dev"

echo Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

echo [2/2] Starting Frontend Server (Port 3000)...
start "TinyTots Frontend" cmd /k "cd /d %~dp0client && echo Starting frontend server... && npm start"

echo.
echo ========================================
echo   Servers are starting up...
echo ========================================
echo.
echo Backend:  http://localhost:5001
echo Frontend: http://localhost:3000
echo Health:   http://localhost:5001/api/health
echo.
echo The application will automatically open in your browser.
echo If not, manually navigate to: http://localhost:3000
echo.
echo Note: Wait for both servers to fully start before using the app.
echo.
pause