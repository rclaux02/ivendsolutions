# Script para iniciar Vape Vending Machine con webhook habilitado
Write-Host "🚀 Iniciando Vape Vending Machine con webhook habilitado..." -ForegroundColor Green
Write-Host ""

# Buscar la aplicación instalada en diferentes ubicaciones
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
    Write-Host "Buscando en todas las ubicaciones posibles..." -ForegroundColor Yellow
    
    # Buscar recursivamente en Program Files
    $searchPaths = @(
        "${env:ProgramFiles}",
        "${env:ProgramFiles(x86)}",
        "${env:USERPROFILE}\Desktop"
    )
    
    foreach ($searchPath in $searchPaths) {
        if (Test-Path $searchPath) {
            $found = Get-ChildItem -Path $searchPath -Recurse -Name "Vape Vending Machine.exe" -ErrorAction SilentlyContinue
            if ($found) {
                $appPath = Join-Path $searchPath $found[0]
                break
            }
        }
    }
}

if (-not $appPath) {
    Write-Host "❌ Error: No se pudo encontrar la aplicación." -ForegroundColor Red
    Write-Host "Asegúrate de que esté instalada correctamente." -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "✅ Aplicación encontrada en: $appPath" -ForegroundColor Green
Write-Host ""

# Verificar si el puerto 8081 está disponible
$portInUse = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Advertencia: El puerto 8081 ya está en uso." -ForegroundColor Yellow
    Write-Host "Esto puede causar conflictos con el webhook." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "🚀 Iniciando aplicación con webhook habilitado..." -ForegroundColor Green
Write-Host "📡 Puerto del webhook: 8081" -ForegroundColor Cyan
Write-Host "🌐 URL local: http://localhost:8081" -ForegroundColor Cyan
Write-Host "🔗 URL pública: https://ant-allowing-mildly.ngrok-free.app/webhook/order-created" -ForegroundColor Cyan
Write-Host ""

try {
    # Iniciar la aplicación con webhook habilitado
    Start-Process -FilePath $appPath -ArgumentList "--enable-webhook" -PassThru
    
    Write-Host "✅ Aplicación iniciada correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Información del webhook:" -ForegroundColor White
    Write-Host "   • Puerto local: 8081" -ForegroundColor Gray
    Write-Host "   • URL local: http://localhost:8081" -ForegroundColor Gray
    Write-Host "   • URL pública: https://ant-allowing-mildly.ngrok-free.app/webhook/order-created" -ForegroundColor Gray
    Write-Host "   • Ngrok se iniciará automáticamente" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Para verificar que el webhook funciona:" -ForegroundColor Yellow
    Write-Host "   curl -X POST http://localhost:8081/webhook/order-created" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "❌ Error al iniciar la aplicación: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 