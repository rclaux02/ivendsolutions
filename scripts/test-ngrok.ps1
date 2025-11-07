# Script para probar la configuración de ngrok
Write-Host "🧪 Probando configuración de ngrok..." -ForegroundColor Cyan
Write-Host ""

# Verificar si ngrok está instalado
Write-Host "1. Verificando instalación de ngrok..." -ForegroundColor Yellow
try {
    $ngrokVersion = ngrok version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Ngrok está instalado: $ngrokVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ Ngrok no está instalado o no está en PATH" -ForegroundColor Red
        Write-Host "💡 Instala ngrok con: npm install -g ngrok" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error verificando ngrok: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Verificar configuración de ngrok
Write-Host "2. Verificando configuración de ngrok..." -ForegroundColor Yellow
try {
    $ngrokConfig = ngrok config check 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Configuración de ngrok válida" -ForegroundColor Green
        Write-Host "📋 Detalles: $ngrokConfig" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Problemas con la configuración de ngrok" -ForegroundColor Yellow
        Write-Host "📋 Detalles: $ngrokConfig" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error verificando configuración: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Probar inicio de ngrok sin dominio
Write-Host "3. Probando inicio de ngrok sin dominio personalizado..." -ForegroundColor Yellow
try {
    Write-Host "🚀 Iniciando ngrok con pooling..." -ForegroundColor Cyan
    $ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList "http", "8081", "--pooling-enabled=true" -PassThru -WindowStyle Hidden
    
    # Esperar un momento para que ngrok se inicie
    Start-Sleep -Seconds 3
    
    # Verificar si el proceso está ejecutándose
    if ($ngrokProcess -and !$ngrokProcess.HasExited) {
        Write-Host "✅ Ngrok iniciado correctamente sin dominio" -ForegroundColor Green
        Write-Host "🔄 Pooling habilitado - URL será consistente" -ForegroundColor Cyan
        
        # Obtener la URL del tunnel
        try {
            $tunnelInfo = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get
            if ($tunnelInfo.tunnels) {
                $publicUrl = $tunnelInfo.tunnels[0].public_url
                Write-Host "🌐 URL pública: $publicUrl" -ForegroundColor Green
                Write-Host "🔗 URL del webhook: $publicUrl/webhook/order-created" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠️ No se pudo obtener la URL del tunnel" -ForegroundColor Yellow
        }
        
        # Detener ngrok
        Write-Host "🛑 Deteniendo ngrok..." -ForegroundColor Yellow
        Stop-Process -Id $ngrokProcess.Id -Force
        Write-Host "✅ Ngrok detenido" -ForegroundColor Green
    } else {
        Write-Host "❌ Ngrok no se pudo iniciar" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error probando ngrok: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Probar inicio de ngrok con dominio personalizado
Write-Host "4. Probando inicio de ngrok con dominio personalizado..." -ForegroundColor Yellow
try {
    Write-Host "🚀 Iniciando ngrok con dominio: ant-allowing-mildly.ngrok-free.app" -ForegroundColor Cyan
    $ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList "http", "8081", "--domain=ant-allowing-mildly.ngrok-free.app", "--pooling-enabled=true" -PassThru -WindowStyle Hidden
    
    # Esperar un momento para que ngrok se inicie
    Start-Sleep -Seconds 5
    
    # Verificar si el proceso está ejecutándose
    if ($ngrokProcess -and !$ngrokProcess.HasExited) {
        Write-Host "✅ Ngrok iniciado correctamente con dominio personalizado" -ForegroundColor Green
        Write-Host "🌐 URL del webhook: https://ant-allowing-mildly.ngrok-free.app/webhook/order-created" -ForegroundColor Green
        
        # Detener ngrok
        Write-Host "🛑 Deteniendo ngrok..." -ForegroundColor Yellow
        Stop-Process -Id $ngrokProcess.Id -Force
        Write-Host "✅ Ngrok detenido" -ForegroundColor Green
    } else {
        Write-Host "❌ Ngrok no se pudo iniciar con dominio personalizado" -ForegroundColor Red
        Write-Host "💡 Esto puede indicar problemas con el dominio o el token" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error probando ngrok con dominio: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Resumen de la prueba:" -ForegroundColor Cyan
Write-Host "• Si ngrok funciona sin dominio: ✅ Configuración básica OK" -ForegroundColor Green
Write-Host "• Si ngrok funciona con dominio: ✅ Configuración completa OK" -ForegroundColor Green
Write-Host "• Si falla con dominio: ⚠️ Usar configuración sin dominio" -ForegroundColor Yellow
Write-Host "• Si falla completamente: ❌ Revisar instalación y token" -ForegroundColor Red

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 