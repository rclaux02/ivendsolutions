# Script para probar el webhook de la aplicación
Write-Host "🧪 Probando webhook de Vape Vending Machine..." -ForegroundColor Green
Write-Host ""

# Verificar si el puerto 8081 está en uso
Write-Host "📡 Verificando puerto 8081..." -ForegroundColor Cyan
$portInUse = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue

if ($portInUse) {
    Write-Host "✅ Puerto 8081 está en uso - Webhook activo" -ForegroundColor Green
    Write-Host "   Proceso: $($portInUse.ProcessName) (PID: $($portInUse.OwningProcess))" -ForegroundColor Gray
} else {
    Write-Host "❌ Puerto 8081 no está en uso - Webhook inactivo" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Soluciones:" -ForegroundColor Yellow
    Write-Host "   1. Ejecutar la aplicación con webhook:" -ForegroundColor Gray
    Write-Host "      .\scripts\start-with-webhook.ps1" -ForegroundColor Gray
    Write-Host "   2. O ejecutar manualmente:" -ForegroundColor Gray
    Write-Host "      C:\Program Files\Vape Vending Machine\Vape Vending Machine.exe --enable-webhook" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "🌐 Probando endpoint del webhook..." -ForegroundColor Cyan

# Probar el endpoint del webhook
try {
    $body = "{`"test`": `"data`"}"
    $response = Invoke-RestMethod -Uri "http://localhost:8081/webhook/order-created" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10
    
    Write-Host "✅ Webhook responde correctamente" -ForegroundColor Green
    Write-Host "   Respuesta: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error al probar webhook: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "   Código de estado: $statusCode" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🔍 Información adicional:" -ForegroundColor Cyan
Write-Host "   • URL local: http://localhost:8081" -ForegroundColor Gray
Write-Host "   • URL pública: https://ant-allowing-mildly.ngrok-free.app/webhook/order-created" -ForegroundColor Gray
Write-Host "   • Puerto: 8081" -ForegroundColor Gray

Write-Host ""
Write-Host "📋 Para verificar ngrok:" -ForegroundColor Yellow
Write-Host "   curl -X POST https://ant-allowing-mildly.ngrok-free.app/webhook/order-created" -ForegroundColor Gray

Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 