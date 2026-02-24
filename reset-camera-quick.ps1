# Quick Camera Reset Script for HP Laptops
# Run this in PowerShell (no admin needed for most operations)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Quick Camera Reset for HP Laptops" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill common apps that use the camera
Write-Host "[1/4] Closing apps that commonly use the camera..." -ForegroundColor Yellow

$appsToKill = @(
    "Zoom", "zoom",
    "Teams", "ms-teams",
    "Skype",
    "Discord",
    "obs64", "obs32",
    "WebcamMax",
    "ManyCam",
    "CameraApp"
)

foreach ($app in $appsToKill) {
    $process = Get-Process -Name $app -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "  Stopping: $app" -ForegroundColor Red
        Stop-Process -Name $app -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "  Done!" -ForegroundColor Green

# Step 2: Stop Windows Camera Frame Server
Write-Host "`n[2/4] Restarting Windows Camera Service..." -ForegroundColor Yellow
try {
    # This service manages camera access on Windows
    $service = Get-Service -Name "FrameServer" -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Stop-Service -Name "FrameServer" -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Start-Service -Name "FrameServer" -ErrorAction SilentlyContinue
            Write-Host "  Camera service restarted!" -ForegroundColor Green
        } else {
            Start-Service -Name "FrameServer" -ErrorAction SilentlyContinue
            Write-Host "  Camera service started!" -ForegroundColor Green
        }
    } else {
        Write-Host "  Service not found (this is okay)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Could not restart service (may need admin)" -ForegroundColor Gray
}

# Step 3: Clear browser camera locks by killing browser processes
Write-Host "`n[3/4] Do you want to close Chrome to release camera? (y/n)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "  Closing Chrome..." -ForegroundColor Red
    Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  Chrome closed. Please reopen it manually." -ForegroundColor Green
}

# Step 4: Wait and test
Write-Host "`n[4/4] Waiting for camera to be fully released..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host "  Done!" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Camera Reset Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now try these steps:" -ForegroundColor White
Write-Host "  1. Open Chrome" -ForegroundColor White
Write-Host "  2. Go to: http://localhost:3000/face-ar" -ForegroundColor White
Write-Host "  3. Click 'Force Reset Camera' button" -ForegroundColor White
Write-Host ""
Write-Host "If still not working, try:" -ForegroundColor Yellow
Write-Host "  - Press Win+I > Privacy > Camera > Toggle OFF then ON" -ForegroundColor White
Write-Host "  - Or restart your laptop" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"


