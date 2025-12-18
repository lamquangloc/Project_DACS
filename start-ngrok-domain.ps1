# PowerShell script to start Ngrok with Static Domain

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Ngrok with Static Domain" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# ⚠️ CẬP NHẬT DOMAIN CỦA BẠN Ở ĐÂY:
# ========================================
$NGROK_DOMAIN = "your-backend.ngrok-free.dev"
# ========================================

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
    Write-Host "3. Add C:\ngrok to PATH" -ForegroundColor Yellow
    Write-Host "4. Or update this script to use: C:\ngrok\ngrok.exe" -ForegroundColor Yellow
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

# Check if domain is set
if ($NGROK_DOMAIN -eq "your-backend.ngrok-free.dev") {
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

Write-Host "Starting Ngrok with domain: $NGROK_DOMAIN" -ForegroundColor Green
Write-Host ""
Write-Host "Your backend URL will be: https://$NGROK_DOMAIN" -ForegroundColor Cyan
Write-Host ""
Write-Host "Update this URL in all n8n HTTP Request nodes:" -ForegroundColor Yellow
Write-Host "  - carts Add: https://$NGROK_DOMAIN/api/cart/add" -ForegroundColor White
Write-Host "  - carts Remove: https://$NGROK_DOMAIN/api/cart/item/:productId" -ForegroundColor White
Write-Host "  - carts Clear: https://$NGROK_DOMAIN/api/cart" -ForegroundColor White
Write-Host "  - carts Find: https://$NGROK_DOMAIN/api/cart" -ForegroundColor White
Write-Host "  - carts Save: https://$NGROK_DOMAIN/api/cart/save" -ForegroundColor White
Write-Host "  - create_order: https://$NGROK_DOMAIN/api/orders/chatbot" -ForegroundColor White
Write-Host ""
Write-Host "Ngrok will open in a new window." -ForegroundColor Cyan
Write-Host "Keep that window open while using n8n!" -ForegroundColor Cyan
Write-Host ""

# Start ngrok in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 5000 --domain=$NGROK_DOMAIN"

Write-Host "Ngrok started in a new window." -ForegroundColor Green
Write-Host "Check that window for the Ngrok URL: https://$NGROK_DOMAIN" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this window (Ngrok will continue running)..." -ForegroundColor Yellow
Read-Host

