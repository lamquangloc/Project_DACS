# PowerShell script to change Ngrok Authtoken

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Change Ngrok Authtoken" -ForegroundColor Cyan
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
    Write-Host "3. Add C:\ngrok to PATH" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Current Ngrok Configuration:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
try {
    ngrok config check 2>&1 | Out-Host
} catch {
    Write-Host "No configuration found or error reading config." -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Options:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Add new authtoken (recommended)" -ForegroundColor White
Write-Host "2. Reset config (remove old authtoken)" -ForegroundColor White
Write-Host "3. Check current config" -ForegroundColor White
Write-Host "4. Exit" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Add New Authtoken" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To get your authtoken:" -ForegroundColor Yellow
        Write-Host "1. Go to https://dashboard.ngrok.com/" -ForegroundColor Yellow
        Write-Host "2. Sign in to your account" -ForegroundColor Yellow
        Write-Host "3. Go to 'Your Authtoken' section" -ForegroundColor Yellow
        Write-Host "4. Copy your authtoken" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Example authtoken format:" -ForegroundColor Cyan
        Write-Host "2abc123def456ghi789jkl012mno345pqr678stu901vwx234yz_5AbC6DeF7GhI8JkL9MnO0PqR1StU2VwX3YzA4BcD5EfG6HiJ7KlM8NoP9QrS0TuV1WxY2Z" -ForegroundColor Gray
        Write-Host ""
        
        $authtoken = Read-Host "Paste your authtoken here"
        
        if ([string]::IsNullOrWhiteSpace($authtoken)) {
            Write-Host ""
            Write-Host "ERROR: Authtoken cannot be empty!" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
        
        Write-Host ""
        Write-Host "Adding authtoken..." -ForegroundColor Yellow
        
        try {
            $result = ngrok config add-authtoken $authtoken 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✅ Authtoken added successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Verifying configuration..." -ForegroundColor Yellow
                ngrok config check 2>&1 | Out-Host
            } else {
                Write-Host ""
                Write-Host "❌ Error adding authtoken:" -ForegroundColor Red
                $result | Out-Host
            }
        } catch {
            Write-Host ""
            Write-Host "❌ Error: $_" -ForegroundColor Red
        }
    }
    "2" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Reset Ngrok Config" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️ WARNING: This will remove your current authtoken!" -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "Are you sure? (yes/no)"
        
        if ($confirm -eq "yes" -or $confirm -eq "y") {
            Write-Host ""
            Write-Host "Resetting config..." -ForegroundColor Yellow
            
            try {
                # Try to reset using ngrok command
                ngrok config reset 2>&1 | Out-Null
                
                # Also try to remove config file manually
                $configPath = "$env:LOCALAPPDATA\ngrok\ngrok.yml"
                if (Test-Path $configPath) {
                    Remove-Item $configPath -Force
                    Write-Host "✅ Config file removed: $configPath" -ForegroundColor Green
                }
                
                Write-Host ""
                Write-Host "✅ Config reset successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "You can now add a new authtoken using option 1." -ForegroundColor Cyan
            } catch {
                Write-Host ""
                Write-Host "❌ Error: $_" -ForegroundColor Red
            }
        } else {
            Write-Host ""
            Write-Host "Cancelled." -ForegroundColor Yellow
        }
    }
    "3" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Current Ngrok Configuration" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        try {
            ngrok config check 2>&1 | Out-Host
        } catch {
            Write-Host "No configuration found or error reading config." -ForegroundColor Yellow
        }
    }
    "4" {
        Write-Host ""
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host ""
        Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Yellow
Read-Host

