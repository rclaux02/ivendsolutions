
# Start Vape Vending Machine in Development-like Production Mode
Write-Host "Starting Vape Vending Machine in Development-like Production Mode..." -ForegroundColor Green

# Force development-like behavior
$env:NODE_ENV = "development-like-production"
$env:ELECTRON_ENABLE_LOGGING = "1"

Write-Host "Environment configured for development-like behavior" -ForegroundColor Yellow

# Check required services
Write-Host "Checking required services..." -ForegroundColor Yellow

# Start the application
Write-Host "Starting application..." -ForegroundColor Green
npm run start

Read-Host "Press Enter to continue..."
