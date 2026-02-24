# Run this in PowerShell as Administrator

Write-Output "=== Removing Phantom Camera Device ==="

# Get the phantom camera
$camera = Get-PnpDevice -Class Camera | Where-Object { $_.Status -eq "Unknown" }

if ($camera) {
    Write-Output "Found phantom device: $($camera.FriendlyName)"
    Write-Output "Status: $($camera.Status)"
    Write-Output "Present: $($camera.Present)"
    Write-Output ""
    
    # Remove the device
    Write-Output "Removing device..."
    pnputil /remove-device "$($camera.InstanceId)"
    
    # Wait
    Start-Sleep -Seconds 3
    
    # Rescan for hardware
    Write-Output "Scanning for hardware changes..."
    pnputil /scan-devices
    
    # Wait for detection
    Start-Sleep -Seconds 5
    
    # Check new status
    Write-Output "`n=== New Camera Status ==="
    Get-PnpDevice -Class Camera | Select-Object Status, Present, FriendlyName
    
    Write-Output "`nIf camera is now showing Status: OK and Present: True, restart browser and test!"
} else {
    Write-Output "No phantom camera found"
}
