# Clean USB Devices - Run as Administrator
Write-Output "=== Cleaning Broken USB Devices ===" 

# Get all Unknown USB devices
$brokenUSB = Get-PnpDevice -Class USB | Where-Object { $_.Status -eq "Unknown" }
Write-Output "Found $($brokenUSB.Count) broken USB devices"

foreach ($device in $brokenUSB) {
    Write-Output "Removing: $($device.FriendlyName)"
    pnputil /remove-device "$($device.InstanceId)" 2>$null
}

Write-Output "`nCleaning complete. Rescanning for hardware..."
pnputil /scan-devices

Start-Sleep -Seconds 5

Write-Output "`n=== Checking Camera Status ==="
$camera = Get-PnpDevice | Where-Object { $_.FriendlyName -like "*HP*Camera*" }
if ($camera) {
    $camera | Format-Table Status, FriendlyName
    Write-Output "`nNow test in Windows Camera app!"
} else {
    Write-Output "Camera not found after cleanup"
}
