# PowerShell script to start Ngrok for Backend (Port 5000)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Ngrok for Backend (Port 5000)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# ⚠️ NẾU CHỌN MODE 2, CẬP NHẬT DOMAIN Ở ĐÂY:
# ========================================
$NGROK_DOMAIN = "your-backend.ngrok-free.dev"
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Choose Ngrok Mode:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Normal (URL changes each time)" -ForegroundColor White
Write-Host "2. Static Domain (URL stays the same)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$mode = Read-Host "Enter choice (1 or 2)"

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

# Check if authtoken is configured
Write-Host ""
Write-Host "Checking Ngrok configuration..." -ForegroundColor Cyan
try {
    $configCheck = ngrok config check 2>&1
    if ($configCheck -match "authtoken" -or $configCheck -match "Authtoken") {
        Write-Host "✅ Ngrok authtoken is configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️ WARNING: Ngrok authtoken might not be configured!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To configure authtoken:" -ForegroundColor Yellow
        Write-Host "1. Run: .\doi-ngrok-authtoken.ps1" -ForegroundColor Yellow
        Write-Host "2. Or run: ngrok config add-authtoken YOUR_AUTHTOKEN" -ForegroundColor Yellow
        Write-Host "3. Get authtoken from: https://dashboard.ngrok.com/" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Press Enter to continue anyway, or Ctrl+C to cancel"
    }
} catch {
    Write-Host "⚠️ Could not check ngrok config. Continuing anyway..." -ForegroundColor Yellow
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

# Start ngrok based on mode
if ($mode -eq "2") {
    # Check if domain is set
    if ($NGROK_DOMAIN -eq "your-backend.ngrok-free.dev") {
        Write-Host ""
        Write-Host "ERROR: Please update NGROK_DOMAIN in this script!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Edit this file and change:" -ForegroundColor Yellow
        Write-Host '  $NGROK_DOMAIN = "your-backend.ngrok-free.dev"' -ForegroundColor Yellow
        Write-Host "to:" -ForegroundColor Yellow
        Write-Host '  $NGROK_DOMAIN = "your-actual-domain.ngrok-free.dev"' -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host ""
    Write-Host "Starting Ngrok with Static Domain: $NGROK_DOMAIN" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your backend URL will be: https://$NGROK_DOMAIN" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Update this URL in all n8n HTTP Request nodes!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ngrok will open in a new window." -ForegroundColor Cyan
    Write-Host "Keep that window open while using n8n!" -ForegroundColor Cyan
    Write-Host ""
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 5000 --domain=$NGROK_DOMAIN"
    Write-Host "Ngrok started in a new window with domain: $NGROK_DOMAIN" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Starting Ngrok (Normal Mode)..." -ForegroundColor Green
    Write-Host ""
    Write-Host "NOTE: URL will change each time you restart ngrok!" -ForegroundColor Yellow
    Write-Host "For stable URL, use Mode 2 (Static Domain) instead." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ngrok will open in a new window." -ForegroundColor Cyan
    Write-Host "Keep that window open while using n8n!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Check http://localhost:4040 for the Ngrok URL" -ForegroundColor Cyan
    Write-Host ""
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 5000"
    Write-Host "Ngrok started in a new window." -ForegroundColor Green
    Write-Host "Check that window for the Ngrok URL (e.g., https://abc123.ngrok.io)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to exit this window (Ngrok will continue running)..." -ForegroundColor Yellow
Read-Host




