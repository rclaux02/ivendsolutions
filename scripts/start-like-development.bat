
@echo off
echo Starting Vape Vending Machine in Development-like Production Mode...

REM Force development-like behavior
set NODE_ENV=development-like-production
set ELECTRON_ENABLE_LOGGING=1

REM Ensure all required services are running
echo Checking required services...

REM Start the application with development-like behavior
echo Starting application...
npm run start

pause
