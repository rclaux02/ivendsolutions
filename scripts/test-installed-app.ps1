# Script simple para probar la aplicación instalada
Write-Host "Probando aplicación instalada..." -ForegroundColor Green
Write-Host ""

# Buscar la aplicación instalada
$appPath = "${env:ProgramFiles}\Vape Vending Machine\Vape Vending Machine.exe"

if (-not (Test-Path $appPath)) {
    Write-Host "Error: No se encontro la aplicacion instalada en: $appPath" -ForegroundColor Red
    Write-Host "Asegurate de que este instalada correctamente." -ForegroundColor Yellow
    exit 1
}

Write-Host "Aplicacion encontrada: $appPath" -ForegroundColor Green
Write-Host ""

# Verificar si hay procesos existentes
$existingProcesses = Get-Process -Name "Vape Vending Machine" -ErrorAction SilentlyContinue
if ($existingProcesses) {
    Write-Host "Hay procesos de la aplicacion ejecutandose. Terminandolos..." -ForegroundColor Yellow
    $existingProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

Write-Host "Iniciando aplicacion con webhook..." -ForegroundColor Cyan
Write-Host ""

# Crear archivo de log
$logFile = "test-app-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Ejecutar la aplicación
$process = Start-Process -FilePath $appPath -ArgumentList "--enable-webhook" -PassThru -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.error"

Write-Host "Aplicacion iniciada con PID: $($process.Id)" -ForegroundColor Green
Write-Host ""

# Esperar y verificar puerto
Write-Host "Esperando que el webhook se inicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$portInUse = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Puerto 8081 esta en uso!" -ForegroundColor Green
    Write-Host "   Proceso: $($portInUse.ProcessName) (PID: $($portInUse.OwningProcess))" -ForegroundColor Gray
} else {
    Write-Host "Puerto 8081 no esta en uso" -ForegroundColor Red
}

# Probar webhook
Write-Host ""
Write-Host "Probando webhook..." -ForegroundColor Cyan

try {
    $body = "{`"test`": `"data`"}"
    $response = Invoke-RestMethod -Uri "http://localhost:8081/webhook/order-created" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10
    
    Write-Host "Webhook responde correctamente" -ForegroundColor Green
    Write-Host "   Respuesta: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
    
} catch {
    Write-Host "Error al probar webhook: $($_.Exception.Message)" -ForegroundColor Red
}

# Mostrar logs
Write-Host ""
Write-Host "Ultimos logs:" -ForegroundColor Cyan
if (Test-Path $logFile) {
    Get-Content $logFile -Tail 10 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
}

Write-Host ""
Write-Host "Presiona cualquier tecla para terminar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Terminar aplicación
if (-not $process.HasExited) {
    $process.Kill()
    Write-Host "Aplicacion terminada" -ForegroundColor Green
} 