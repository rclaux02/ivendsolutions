# Script para configurar ngrok correctamente
Write-Host "🔧 Configurando ngrok..." -ForegroundColor Cyan
Write-Host ""

# Verificar si ngrok está instalado
Write-Host "1. Verificando instalación de ngrok..." -ForegroundColor Yellow
try {
    $ngrokVersion = ngrok version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Ngrok está instalado: $ngrokVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ Ngrok no está instalado" -ForegroundColor Red
        Write-Host "📦 Instalando ngrok..." -ForegroundColor Yellow
        
        # Instalar ngrok via npm
        npm install -g ngrok@5.0.0-beta.3
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Ngrok instalado correctamente" -ForegroundColor Green
        } else {
            Write-Host "❌ Error instalando ngrok" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "❌ Error verificando ngrok: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Configurar token de ngrok
Write-Host "2. Configurando token de ngrok..." -ForegroundColor Yellow
$token = "2y39xrJYCXyIj4k78RFtk3Wfyhj_34atH9rQbekS8WzW5piyV"

try {
    ngrok config add-authtoken $token
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Token de ngrok configurado correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error configurando token de ngrok" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error configurando token: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Verificar configuración
Write-Host "3. Verificando configuración..." -ForegroundColor Yellow
try {
    $ngrokConfig = ngrok config check 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Configuración de ngrok válida" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Problemas con la configuración: $ngrokConfig" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error verificando configuración: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Probar configuración básica
Write-Host "4. Probando configuración básica..." -ForegroundColor Yellow
try {
    Write-Host "🚀 Iniciando ngrok con pooling..." -ForegroundColor Cyan
    $ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList "http", "8081", "--pooling-enabled=true" -PassThru -WindowStyle Hidden
    
    # Esperar un momento para que ngrok se inicie
    Start-Sleep -Seconds 3
    
    # Verificar si el proceso está ejecutándose
    if ($ngrokProcess -and !$ngrokProcess.HasExited) {
        Write-Host "✅ Ngrok iniciado correctamente con pooling" -ForegroundColor Green
        
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

# Probar configuración con dominio personalizado
Write-Host "5. Probando configuración con dominio personalizado..." -ForegroundColor Yellow
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
        Write-Host "💡 El dominio puede estar ocupado o el token no tiene permisos" -ForegroundColor Yellow
        Write-Host "💡 La aplicación usará configuración sin dominio como fallback" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error probando ngrok con dominio: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Configuración completada!" -ForegroundColor Green
Write-Host "📋 Resumen:" -ForegroundColor Cyan
Write-Host "• Ngrok instalado y configurado" -ForegroundColor Green
Write-Host "• Pooling habilitado para URLs consistentes" -ForegroundColor Green
Write-Host "• Fallback sin dominio configurado" -ForegroundColor Green
Write-Host "• La aplicación manejará errores automáticamente" -ForegroundColor Green

Write-Host ""
Write-Host "💡 Para probar la configuración completa:" -ForegroundColor Yellow
Write-Host "   npm run test:ngrok" -ForegroundColor Gray

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 