@echo off
cls
echo ========================================
echo    TinyTots Daycare Management System
echo ========================================
echo.

echo Checking if ports are available...
netstat -ano | findstr :3000 >nul
if %errorlevel%==0 (
    echo Port 3000 is in use. Attempting to free it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F >nul 2>&1
)

netstat -ano | findstr :5000 >nul
if %errorlevel%==0 (
    echo Port 5000 is in use. Attempting to free it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do taskkill /PID %%a /F >nul 2>&1
)

echo.
echo Starting TinyTots servers...
echo.

echo [1/2] Starting Backend Server (Port 5000)...
start "TinyTots Backend" cmd /k "cd /d %~dp0server && echo Starting backend server... && npm run dev"

timeout /t 5 /nobreak >nul

echo [2/2] Starting Frontend Server (Port 3000)...
start "TinyTots Frontend" cmd /k "cd /d %~dp0client && echo Starting frontend server... && npm start"

echo.
echo ========================================
echo   Servers are starting up...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo Health:   http://localhost:5000/api/health
echo.
echo Note: If MongoDB is not installed, the backend
echo will still run but database features won't work.
echo.
echo Press any key to continue...
pause >nul