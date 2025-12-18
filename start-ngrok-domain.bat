@echo off
echo ========================================
echo Starting Ngrok with Static Domain
echo ========================================
echo.
echo Backend must be running on port 5000!
echo.
echo IMPORTANT: You need to have a static domain from ngrok dashboard!
echo 1. Go to https://dashboard.ngrok.com/
echo 2. Create a free static domain
echo 3. Update the domain name in this script
echo.
echo Press Ctrl+C to stop Ngrok
echo ========================================
echo.

REM ========================================
REM ⚠️ CẬP NHẬT DOMAIN CỦA BẠN Ở ĐÂY:
REM ========================================
set NGROK_DOMAIN=hai-vigilant-nonfloatingly.ngrok-free.dev
REM ========================================

REM Check if ngrok is installed
where ngrok >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Ngrok is not installed or not in PATH!
    echo.
    echo Please install Ngrok:
    echo 1. Download from https://ngrok.com/download
    echo 2. Extract to C:\ngrok
    echo 3. Add C:\ngrok to PATH
    echo 4. Or update this script to use: C:\ngrok\ngrok.exe
    echo.
    pause
    exit /b 1
)

REM Check if backend is running on port 5000
netstat -ano | findstr :5000 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Port 5000 is not in use!
    echo Backend might not be running.
    echo.
    echo Please start backend first:
    echo cd Backend
    echo npm run dev
    echo.
    echo Press any key to continue anyway...
    pause >nul
)

REM Check if domain is set
if "%NGROK_DOMAIN%"=="hai-vigilant-nonfloatingly.ngrok-free.dev" (
    echo ERROR: Please update NGROK_DOMAIN in this script!
    echo.
    echo Edit this file and change:
    echo set NGROK_DOMAIN=your-backend.ngrok-free.dev
    echo to:
    echo set NGROK_DOMAIN=your-actual-domain.ngrok-free.dev
    echo.
    pause
    exit /b 1
)

REM Start ngrok with static domain
echo Starting Ngrok with domain: %NGROK_DOMAIN%
echo.
echo Your backend URL will be: https://%NGROK_DOMAIN%
echo.
echo Update this URL in all n8n HTTP Request nodes:
echo - carts Add: https://%NGROK_DOMAIN%/api/cart/add
echo - carts Remove: https://%NGROK_DOMAIN%/api/cart/item/:productId
echo - carts Clear: https://%NGROK_DOMAIN%/api/cart
echo - carts Find: https://%NGROK_DOMAIN%/api/cart
echo - carts Save: https://%NGROK_DOMAIN%/api/cart/save
echo - create_order: https://%NGROK_DOMAIN%/api/orders/chatbot
echo.
ngrok http 5000 --domain=%NGROK_DOMAIN%

pause

