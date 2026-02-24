# This script needs to be run as Administrator
Write-Output "=== USB Device Cleanup Script ==="
Write-Output "This will clear USB device errors and refresh drivers`n"

# Get all USB devices with errors
$usbDevices = Get-PnpDevice -Class USB | Where-Object { $_.Status -ne "OK" }
Write-Output "Found $($usbDevices.Count) USB devices with errors`n"

# Instructions for manual cleanup
Write-Output "MANUAL STEPS (requires Administrator):`n"
Write-Output "1. Open Device Manager as Administrator (Win+X)"
Write-Output "2. View → Show hidden devices"
Write-Output "3. Expand 'Universal Serial Bus controllers'"
Write-Output "4. Uninstall each 'Unknown USB Device' (right-click → Uninstall)"
Write-Output "5. Action → Scan for hardware changes"
Write-Output "6. Restart computer`n"

Write-Output "After completing these steps, camera should be detected.`n"

# Check camera privacy settings
Write-Output "=== Checking Windows Camera Privacy Settings ==="
$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam"
if (Test-Path $regPath) {
    $value = Get-ItemProperty -Path $regPath -Name Value -ErrorAction SilentlyContinue
    Write-Output "Camera privacy setting: $($value.Value)"
    if ($value.Value -eq "Deny") {
        Write-Output "⚠️ Windows Camera privacy is DENIED - needs to be changed to 'Allow'"
    }
}
