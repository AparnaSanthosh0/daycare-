@echo off
echo ========================================
echo   Starting BOTH TinyTots Servers
echo ========================================
echo.
echo Step 1: Starting Backend Server...
start "TinyTots Backend" cmd /k "cd /d %~dp0 && start-backend.bat"
timeout /t 5 /nobreak >nul
echo.
echo Step 2: Starting Frontend React App...
start "TinyTots Frontend" cmd /k "cd /d %~dp0 && start-frontend.bat"
echo.
echo ========================================
echo   Both servers are starting!
echo   Backend: http://localhost:5000
echo   Frontend: http://localhost:3000
echo ========================================
echo.
echo Wait 30-60 seconds, then open browser to:
echo http://localhost:3000
echo.
pause
