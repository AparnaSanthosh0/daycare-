@echo off
echo ========================================
echo   Starting TinyTots Backend Server
echo ========================================
echo.
cd /d "%~dp0server"
echo Killing any existing Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting server on port 5000...
npm start
