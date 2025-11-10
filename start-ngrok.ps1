# PowerShell script to start Ngrok for Backend (Port 5000)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Ngrok for Backend (Port 5000)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok is installed
try {
    $ngrokVersion = ngrok version 2>&1
    Write-Host "Ngrok found: $ngrokVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Ngrok is not installed or not in PATH!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Ngrok:" -ForegroundColor Yellow
    Write-Host "1. Download from https://ngrok.com/download" -ForegroundColor Yellow
    Write-Host "2. Extract to C:\ngrok" -ForegroundColor Yellow
    Write-Host "3. Add C:\ngrok to PATH or run: C:\ngrok\ngrok.exe http 5000" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if backend is running on port 5000
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if (-not $port5000) {
    Write-Host "WARNING: Port 5000 is not in use!" -ForegroundColor Yellow
    Write-Host "Backend might not be running." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please start backend first:" -ForegroundColor Yellow
    Write-Host "cd Backend" -ForegroundColor Yellow
    Write-Host "npm run dev" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Press Enter to continue anyway, or Ctrl+C to cancel"
}

Write-Host "Starting Ngrok..." -ForegroundColor Green
Write-Host ""
Write-Host "Ngrok will open in a new window." -ForegroundColor Cyan
Write-Host "Keep that window open while using n8n!" -ForegroundColor Cyan
Write-Host ""

# Start ngrok in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 5000"

Write-Host "Ngrok started in a new window." -ForegroundColor Green
Write-Host "Check that window for the Ngrok URL (e.g., https://abc123.ngrok.io)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this window (Ngrok will continue running)..." -ForegroundColor Yellow
Read-Host




