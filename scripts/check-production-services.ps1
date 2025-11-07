# Check Production Services Script
Write-Host "🔍 Checking production services..." -ForegroundColor Cyan

# Test 1: Check Izipay API
Write-Host "`n📊 Test 1: Checking Izipay API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:9090/API_PPAD/ping" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Izipay API is running" -ForegroundColor Green
    Write-Host "Response: $response" -ForegroundColor Gray
} catch {
    Write-Host "❌ Izipay API is not responding" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Solution: Start the Izipay API service on localhost:9090" -ForegroundColor Cyan
}

# Test 2: Check Regula FaceSDK
Write-Host "`n📊 Test 2: Checking Regula FaceSDK..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:41101/api/ping" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Regula FaceSDK is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Regula FaceSDK is not responding" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Solution: Start the Regula FaceSDK service on port 41101" -ForegroundColor Cyan
}

# Test 3: Check database connection
Write-Host "`n📊 Test 3: Testing database connection..." -ForegroundColor Yellow
try {
    # Run the database test script
    node scripts/test-production-db.js
} catch {
    Write-Host "❌ Database test failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Check COM ports
Write-Host "`n📊 Test 4: Checking COM ports..." -ForegroundColor Yellow
try {
    $ports = Get-WmiObject -Query "SELECT * FROM Win32_PnPEntity WHERE ConfigManagerErrorCode = 0 AND Name LIKE '%(COM%'"
    if ($ports) {
        Write-Host "✅ COM ports found:" -ForegroundColor Green
        foreach ($port in $ports) {
            Write-Host "  - $($port.Name)" -ForegroundColor Gray
        }
        
        # Check specifically for COM9
        $com9 = $ports | Where-Object { $_.Name -like "*COM9*" }
        if ($com9) {
            Write-Host "✅ COM9 is available (configured port)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  COM9 is not available (configured port)" -ForegroundColor Yellow
            Write-Host "💡 Solution: Check USB device connection or update port configuration" -ForegroundColor Cyan
        }
    } else {
        Write-Host "❌ No COM ports found" -ForegroundColor Red
        Write-Host "💡 Solution: Check USB connections and device drivers" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error checking COM ports" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Check if app is running as administrator
Write-Host "`n📊 Test 5: Checking admin privileges..." -ForegroundColor Yellow
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "✅ Running with administrator privileges" -ForegroundColor Green
} else {
    Write-Host "⚠️  Not running with administrator privileges" -ForegroundColor Yellow
    Write-Host "💡 Some services may require admin rights" -ForegroundColor Cyan
}

# Summary
Write-Host "`n📝 Summary:" -ForegroundColor Cyan
Write-Host "1. Ensure Izipay API service is running on localhost:9090" -ForegroundColor White
Write-Host "2. Ensure Regula FaceSDK service is running on localhost:41101" -ForegroundColor White
Write-Host "3. Check database connectivity" -ForegroundColor White
Write-Host "4. Verify COM port connections (especially COM9)" -ForegroundColor White
Write-Host "5. Consider running as administrator if needed" -ForegroundColor White

Write-Host "`nIf POS payment fails in production:" -ForegroundColor Yellow
Write-Host "- Check if Izipay API service is installed and running" -ForegroundColor White
Write-Host "- Verify COM9 port is available for POS device" -ForegroundColor White
Write-Host "- Test payment in development first (npm run start)" -ForegroundColor White 