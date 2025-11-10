@echo off
echo ========================================
echo Starting Ngrok for Backend (Port 5000)
echo ========================================
echo.
echo Backend must be running on port 5000!
echo.
echo Press Ctrl+C to stop Ngrok
echo ========================================
echo.

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

REM Start ngrok
echo Starting Ngrok...
echo.
ngrok http 5000

pause




