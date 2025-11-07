@echo off
echo Iniciando Vape Vending Machine con webhook habilitado...
echo.

REM Buscar la aplicación instalada
set "APP_PATH=%PROGRAMFILES%\Vape Vending Machine\Vape Vending Machine.exe"
if not exist "%APP_PATH%" (
    set "APP_PATH=%PROGRAMFILES(X86)%\Vape Vending Machine\Vape Vending Machine.exe"
)

if not exist "%APP_PATH%" (
    echo Error: No se encontró la aplicación instalada.
    echo Buscando en ubicaciones alternativas...
    
    REM Buscar en el escritorio
    set "APP_PATH=%USERPROFILE%\Desktop\Vape Vending Machine.exe"
    if not exist "%APP_PATH%" (
        echo Error: No se pudo encontrar la aplicación.
        echo Asegúrate de que esté instalada correctamente.
        pause
        exit /b 1
    )
)

echo Iniciando aplicación desde: %APP_PATH%
echo Con webhook habilitado en puerto 8081
echo.

REM Iniciar la aplicación con webhook habilitado
start "" "%APP_PATH%" --enable-webhook

echo.
echo Aplicación iniciada con webhook habilitado.
echo El webhook estará disponible en: http://localhost:8081
echo Ngrok URL: https://ant-allowing-mildly.ngrok-free.app/webhook/order-created
echo.
pause 