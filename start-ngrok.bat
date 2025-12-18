@echo off
echo ========================================
echo Starting Ngrok for Backend (Port 5000)
echo ========================================
echo.
echo Backend must be running on port 5000!
echo.
echo ========================================
echo Choose Ngrok Mode:
echo ========================================
echo 1. Normal (URL changes each time)
echo 2. Static Domain (URL stays the same)
echo ========================================
echo.
set /p MODE="Enter choice (1 or 2): "

REM ========================================
REM ⚠️ NẾU CHỌN MODE 2, CẬP NHẬT DOMAIN Ở ĐÂY:
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
    echo 3. Add C:\ngrok to PATH or run: C:\ngrok\ngrok.exe http 5000
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

REM Start ngrok based on mode
if "%MODE%"=="2" (
    REM Check if domain is set
    if "%NGROK_DOMAIN%"=="hai-vigilant-nonfloatingly.ngrok-free.dev" (
        echo.
        echo ERROR: Please update NGROK_DOMAIN in this script!
        echo.
        echo Edit this file and change:
        echo set NGROK_DOMAIN=hai-vigilant-nonfloatingly.ngrok-free.dev
        echo to:    
        echo set NGROK_DOMAIN=hai-vigilant-nonfloatingly.ngrok-free.dev
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Starting Ngrok with Static Domain: %NGROK_DOMAIN%
    echo.
    echo Your backend URL will be: https://%NGROK_DOMAIN%
    echo.
    echo Update this URL in all n8n HTTP Request nodes!
    echo.
    ngrok http 5000 --domain=%NGROK_DOMAIN%
) else (
    echo.
    echo Starting Ngrok (Normal Mode)...
    echo.
    echo NOTE: URL will change each time you restart ngrok!
    echo For stable URL, use Mode 2 (Static Domain) instead.
    echo.
    echo Check http://localhost:4040 for the Ngrok URL
    echo.
    ngrok http 5000
)

pause




