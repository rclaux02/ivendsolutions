@echo off
echo Starting Vemedia application with production database...
echo.
echo This will use the production database (entity.pe) for license validation
echo.
set NODE_ENV=production
npm run start:quiet 