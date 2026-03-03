# HP Camera Fix Script
# This script resets the HP camera to fix the 0xA00F4271 error
# Run in PowerShell as Administrator for best results

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  HP Wide Vision Camera - Quick Fix" -ForegroundColor Cyan  
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get the HP camera
$camera = Get-PnpDevice -Class Camera -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -like "*HP*" -or $_.FriendlyName -like "*Wide Vision*" }

if (-not $camera) {
    $camera = Get-PnpDevice -Class Camera -ErrorAction SilentlyContinue | Select-Object -First 1
}

if ($camera) {
    Write-Host "Found camera: $($camera.FriendlyName)" -ForegroundColor Green
    Write-Host "Current status: $($camera.Status)" -ForegroundColor Gray
    Write-Host ""
    
    # Step 1: Disable the camera
    Write-Host "[1/3] Disabling camera..." -ForegroundColor Yellow
    try {
        Disable-PnpDevice -InstanceId $camera.InstanceId -Confirm:$false -ErrorAction Stop
        Write-Host "  Camera disabled successfully" -ForegroundColor Green
    } catch {
        Write-Host "  Need admin rights to disable. Trying alternative..." -ForegroundColor Yellow
        # Try using pnputil
        & pnputil /disable-device $camera.InstanceId 2>$null
    }
    
    # Wait for the device to fully stop
    Write-Host ""
    Write-Host "[2/3] Waiting 3 seconds for USB to reset..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    Write-Host "  Done" -ForegroundColor Green
    
    # Step 2: Re-enable the camera
    Write-Host ""
    Write-Host "[3/3] Re-enabling camera..." -ForegroundColor Yellow
    try {
        Enable-PnpDevice -InstanceId $camera.InstanceId -Confirm:$false -ErrorAction Stop
        Write-Host "  Camera enabled successfully" -ForegroundColor Green
    } catch {
        Write-Host "  Need admin rights to enable. Trying alternative..." -ForegroundColor Yellow
        & pnputil /enable-device $camera.InstanceId 2>$null
    }
    
    # Wait for it to initialize
    Start-Sleep -Seconds 2
    
    # Check final status
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    $newStatus = Get-PnpDevice -InstanceId $camera.InstanceId -ErrorAction SilentlyContinue
    if ($newStatus -and $newStatus.Status -eq "OK") {
        Write-Host "  SUCCESS! Camera is ready!" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Now try:" -ForegroundColor White
        Write-Host "  1. Open Windows Camera app" -ForegroundColor White
        Write-Host "  2. Or go to: http://localhost:3000/face-ar" -ForegroundColor White
    } else {
        Write-Host "  Camera may need a driver reinstall" -ForegroundColor Yellow
        Write-Host "============================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Try these additional steps:" -ForegroundColor Yellow
        Write-Host "  1. Open Device Manager (Win+X, then M)" -ForegroundColor White
        Write-Host "  2. Find 'HP Wide Vision HD Camera'" -ForegroundColor White
        Write-Host "  3. Right-click > Uninstall device" -ForegroundColor White
        Write-Host "  4. Check 'Delete driver software'" -ForegroundColor White
        Write-Host "  5. Restart your laptop" -ForegroundColor White
    }
} else {
    Write-Host "ERROR: No camera device found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Your camera might be:" -ForegroundColor Yellow
    Write-Host "  - Disabled in BIOS" -ForegroundColor White
    Write-Host "  - Physically disconnected" -ForegroundColor White
    Write-Host "  - Missing drivers" -ForegroundColor White
    Write-Host ""
    Write-Host "Try: Settings > Privacy > Camera > Make sure it's ON" -ForegroundColor White
}

Write-Host ""
Read-Host "Press Enter to exit"




