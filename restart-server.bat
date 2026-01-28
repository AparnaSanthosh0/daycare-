@echo off
echo ========================================
echo   Restarting TinyTots Backend Server
echo ========================================
echo.
echo Stopping any running Node processes on port 5000...
netstat -ano | findstr :5000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Killing process %%a
    taskkill /F /PID %%a 2>nul
)
echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul
echo.
echo Starting server...
cd server
echo.
echo Server starting... Check the console for route registration messages.
echo Look for: "POST /admin/create-delivery-assignments" in the route list
echo.
start cmd /k "npm start"
echo.
echo ========================================
echo   Server restart initiated!
echo ========================================
echo.
echo The server window should open. Wait for it to fully start,
echo then try the "Create Assignments" button again.
echo.
pause
