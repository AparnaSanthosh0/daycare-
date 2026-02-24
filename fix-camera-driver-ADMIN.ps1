# Camera Driver Reinstall Script
# Run as Administrator

Write-Output "=== Uninstalling HP Camera Driver ==="

# Get the camera device
$camera = Get-PnpDevice -FriendlyName "*HP*Camera*" -ErrorAction SilentlyContinue

if ($camera) {
    Write-Output "Found: $($camera.FriendlyName)"
    Write-Output "Status: $($camera.Status)"
    
    # Uninstall the device and driver
    Write-Output "`nUninstalling device and driver..."
    pnputil /remove-device "$($camera.InstanceId)"
    
    # Wait
    Start-Sleep -Seconds 3
    
    # Rescan for hardware
    Write-Output "`nScanning for hardware changes..."
    pnputil /scan-devices
    
    Start-Sleep -Seconds 5
    
    # Check new status
    Write-Output "`n=== Checking Camera Status ==="
    $newCamera = Get-PnpDevice -FriendlyName "*HP*Camera*" -ErrorAction SilentlyContinue
    
    if ($newCamera) {
        Write-Output "Camera: $($newCamera.FriendlyName)"
        Write-Output "Status: $($newCamera.Status)"
        Write-Output "Present: $($newCamera.Present)"
        
        if ($newCamera.Status -eq "OK") {
            Write-Output "`n✅ SUCCESS! Camera is now working!"
            Write-Output "Test it at: http://localhost:3000/camera-diagnostics"
        } else {
            Write-Output "`n⚠️ Camera reinstalled but status is: $($newCamera.Status)"
            Write-Output "Try Windows Update for drivers"
        }
    } else {
        Write-Output "Camera not detected after rescan"
    }
} else {
    Write-Output "Camera device not found"
}

Write-Output "`n=== Alternative: Windows Update for Camera Driver ==="
Write-Output "Go to: Settings → Windows Update → Check for updates"
Write-Output "Look for 'Driver updates' section"
