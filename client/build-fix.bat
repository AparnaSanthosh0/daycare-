@echo off
cd "c:\Users\HP\TinyTots\client"
set GENERATE_SOURCEMAP=false
npm run build:prod
if %ERRORLEVEL% NEQ 0 (
  echo Build failed with error %ERRORLEVEL%
  exit /b 1
) else (
  echo Build successful
  exit /b 0
)
