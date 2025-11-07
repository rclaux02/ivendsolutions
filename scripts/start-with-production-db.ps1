Write-Host "Starting Vemedia application with production database..." -ForegroundColor Green
Write-Host ""
Write-Host "This will use the production database (entity.pe) for license validation" -ForegroundColor Yellow
Write-Host ""

$env:NODE_ENV = "production"
npm run start:quiet 