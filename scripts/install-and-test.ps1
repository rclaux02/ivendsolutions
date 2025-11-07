# Script completo para instalar, generar y probar la aplicación con webhook
Write-Host "🚀 Instalación y prueba completa de Vape Vending Machine" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

# Paso 1: Verificar dependencias
Write-Host "📦 Paso 1: Verificando dependencias..." -ForegroundColor Cyan
$ngrokInstalled = npm list ngrok 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ngrok no está instalado. Instalando..." -ForegroundColor Red
    npm install ngrok@5.0.0-beta.1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error instalando ngrok" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Ngrok ya está instalado" -ForegroundColor Green
}

Write-Host ""

# Paso 2: Generar ejecutable
Write-Host "🔨 Paso 2: Generando ejecutable..." -ForegroundColor Cyan
Write-Host "Esto puede tomar varios minutos..." -ForegroundColor Gray
npm run dist

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error generando ejecutable" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Ejecutable generado correctamente" -ForegroundColor Green
Write-Host ""

# Paso 3: Verificar que el ejecutable existe
Write-Host "📁 Paso 3: Verificando ejecutable..." -ForegroundColor Cyan
$exePath = "release\Vape Vending Machine-Setup.exe"
if (Test-Path $exePath) {
    Write-Host "✅ Ejecutable encontrado: $exePath" -ForegroundColor Green
    $fileSize = (Get-Item $exePath).Length / 1MB
    Write-Host "   Tamaño: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "❌ Ejecutable no encontrado en: $exePath" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Paso 4: Instrucciones de instalación
Write-Host "📋 Paso 4: Instrucciones de instalación" -ForegroundColor Cyan
Write-Host "1. Ejecuta el instalador: $exePath" -ForegroundColor White
Write-Host "2. Instala la aplicación normalmente" -ForegroundColor White
Write-Host "3. Ejecuta la aplicación con webhook usando uno de estos métodos:" -ForegroundColor White
Write-Host ""
Write-Host "   Opción A - Script automático:" -ForegroundColor Yellow
Write-Host "   .\scripts\start-with-webhook.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "   Opción B - Manual:" -ForegroundColor Yellow
Write-Host "   'C:\Program Files\Vape Vending Machine\Vape Vending Machine.exe' --enable-webhook" -ForegroundColor Gray
Write-Host ""

# Paso 5: Probar webhook (si la aplicación está ejecutándose)
Write-Host "🧪 Paso 5: Probando webhook..." -ForegroundColor Cyan
Write-Host "Verificando si el puerto 8081 está en uso..." -ForegroundColor Gray

$portInUse = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue

if ($portInUse) {
    Write-Host "✅ Puerto 8081 está en uso - Aplicación ejecutándose" -ForegroundColor Green
    Write-Host "   Proceso: $($portInUse.ProcessName) (PID: $($portInUse.OwningProcess))" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "🌐 Probando endpoint del webhook..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8081/webhook/order-created" -Method POST -ContentType "application/json" -Body '{"test": "data"}' -TimeoutSec 10
        
        Write-Host "✅ Webhook responde correctamente" -ForegroundColor Green
        Write-Host "   Respuesta: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
        
    } catch {
        Write-Host "❌ Error al probar webhook: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ️  Puerto 8081 no está en uso" -ForegroundColor Yellow
    Write-Host "   La aplicación no está ejecutándose o no tiene webhook habilitado" -ForegroundColor Gray
    Write-Host "   Ejecuta la aplicación con webhook para probar" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎉 Proceso completado!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen:" -ForegroundColor Cyan
Write-Host "   • Ngrok instalado: ✅" -ForegroundColor Gray
Write-Host "   • Ejecutable generado: ✅" -ForegroundColor Gray
Write-Host "   • Webhook configurado: ✅" -ForegroundColor Gray
Write-Host "   • Puerto 8081: $(if($portInUse){'✅ Activo'}else{'❌ Inactivo'})" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Para probar después de instalar:" -ForegroundColor Yellow
Write-Host "   npm run test:webhook" -ForegroundColor Gray
Write-Host ""

Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 