# Script para ejecutar la aplicación instalada y debuggear el webhook
Write-Host "🔍 Debug: Ejecutando aplicación instalada con logging..." -ForegroundColor Green
Write-Host ""

# Buscar la aplicación instalada
$possiblePaths = @(
    "${env:ProgramFiles}\Vape Vending Machine\Vape Vending Machine.exe",
    "${env:ProgramFiles(x86)}\Vape Vending Machine\Vape Vending Machine.exe",
    "${env:USERPROFILE}\Desktop\Vape Vending Machine.exe",
    "${env:USERPROFILE}\AppData\Local\Programs\Vape Vending Machine\Vape Vending Machine.exe"
)

$appPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $appPath = $path
        break
    }
}

if (-not $appPath) {
    Write-Host "❌ Error: No se encontró la aplicación instalada." -ForegroundColor Red
    Write-Host "Asegúrate de que esté instalada correctamente." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Aplicación encontrada: $appPath" -ForegroundColor Green
Write-Host ""

# Verificar si hay procesos de la aplicación ejecutándose
Write-Host "🔍 Verificando procesos existentes..." -ForegroundColor Cyan
$existingProcesses = Get-Process -Name "Vape Vending Machine" -ErrorAction SilentlyContinue
if ($existingProcesses) {
    Write-Host "⚠️  Hay procesos de la aplicación ejecutándose:" -ForegroundColor Yellow
    foreach ($proc in $existingProcesses) {
        Write-Host "   PID: $($proc.Id) - Iniciado: $($proc.StartTime)" -ForegroundColor Gray
    }
    Write-Host ""
    $kill = Read-Host "¿Deseas terminar estos procesos? (s/n)"
    if ($kill -eq 's' -or $kill -eq 'S') {
        $existingProcesses | Stop-Process -Force
        Write-Host "✅ Procesos terminados" -ForegroundColor Green
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
Write-Host "🚀 Iniciando aplicación con logging..." -ForegroundColor Cyan
Write-Host "Los logs aparecerán en esta ventana." -ForegroundColor Gray
Write-Host "Presiona Ctrl+C para detener la aplicación." -ForegroundColor Gray
Write-Host ""

# Crear un archivo de log temporal
$logFile = "debug-webhook-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
Write-Host "📝 Logs se guardarán en: $logFile" -ForegroundColor Cyan
Write-Host ""

try {
    # Ejecutar la aplicación y capturar la salida
    $process = Start-Process -FilePath $appPath -ArgumentList "--enable-webhook" -PassThru -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.error"
    
    Write-Host "✅ Aplicación iniciada con PID: $($process.Id)" -ForegroundColor Green
    Write-Host ""
    
    # Monitorear el puerto 8081
    $portCheckCount = 0
    while ($portCheckCount -lt 30) { # Verificar por 30 segundos
        $portInUse = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
        
        if ($portInUse) {
            Write-Host "✅ Puerto 8081 está en uso!" -ForegroundColor Green
            Write-Host "   Proceso: $($portInUse.ProcessName) (PID: $($portInUse.OwningProcess))" -ForegroundColor Gray
            break
        } else {
            Write-Host "⏳ Esperando que el puerto 8081 se active... ($($portCheckCount + 1)/30)" -ForegroundColor Yellow
        }
        
        Start-Sleep -Seconds 1
        $portCheckCount++
    }
    
    if ($portCheckCount -eq 30) {
        Write-Host "❌ Puerto 8081 no se activó después de 30 segundos" -ForegroundColor Red
    }
    
    # Probar el webhook después de 5 segundos
    Start-Sleep -Seconds 5
    Write-Host ""
    Write-Host "🧪 Probando webhook..." -ForegroundColor Cyan
    
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
    
    # Mostrar los últimos logs
    Write-Host ""
    Write-Host "📋 Últimos logs de la aplicación:" -ForegroundColor Cyan
    if (Test-Path $logFile) {
        Get-Content $logFile -Tail 20 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    }
    
    if (Test-Path "$logFile.error") {
        Write-Host ""
        Write-Host "❌ Errores:" -ForegroundColor Red
        Get-Content "$logFile.error" -Tail 10 | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    }
    
    Write-Host ""
    Write-Host "💡 Para ver todos los logs:" -ForegroundColor Yellow
    Write-Host "   Get-Content $logFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🌐 Para probar ngrok externamente:" -ForegroundColor Yellow
    Write-Host "   curl -X POST https://ant-allowing-mildly.ngrok-free.app/webhook/order-created" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Presiona cualquier tecla para terminar la aplicación..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    # Terminar la aplicación
    if (-not $process.HasExited) {
        $process.Kill()
        Write-Host "✅ Aplicación terminada" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Error ejecutando la aplicación: $($_.Exception.Message)" -ForegroundColor Red
}

# Limpiar archivos de log si están vacíos
if ((Test-Path $logFile) -and ((Get-Item $logFile).Length -eq 0)) {
    Remove-Item $logFile -Force
}
if ((Test-Path "$logFile.error") -and ((Get-Item "$logFile.error").Length -eq 0)) {
    Remove-Item "$logFile.error" -Force
} 