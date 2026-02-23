# Browser Permissions Guide for Blockchain Attendance 🔐

## Required Permissions

The Blockchain Attendance system requires two browser permissions:
1. **📍 Location (GPS)** - To verify the physical location of check-in/check-out
2. **📷 Camera** - To capture photo verification

---

## How to Enable Location Permissions

### Google Chrome / Microsoft Edge / Brave

#### Method 1: Address Bar (Quickest)
1. Look at the **address bar** (where the URL is)
2. Click the **lock icon** (🔒) or **info icon** (ⓘ) on the LEFT side of the address bar
3. Find **"Location"** in the dropdown menu
4. Change it from **"Block"** to **"Allow"**
5. **Refresh the page** (F5 or click refresh button)

#### Method 2: Site Settings
1. Click the **lock icon** (🔒) in the address bar
2. Click **"Site settings"** or **"Permissions"**
3. Find **"Location"** in the list
4. Select **"Allow"**
5. Close settings and **refresh the page**

#### Method 3: Browser Settings (If above methods don't work)
1. Open Chrome menu (three dots ⋮ in top-right)
2. Go to **Settings** → **Privacy and security** → **Site Settings**
3. Click **"Location"**
4. Find your site in **"Block"** list
5. Click it and change to **"Allow"**
6. Go back to your site and **refresh**

---

### Firefox

#### Method 1: Address Bar
1. Click the **lock icon** (🔒) or **crossed-out location icon** in the address bar
2. Find **"Use the Location"** or **"Access Your Location"**
3. Click the **X** or **"Clear Permission"** button
4. **Refresh the page** - Firefox will ask for permission again
5. This time click **"Allow"**

#### Method 2: Page Info
1. Click the **lock icon** → **"More Information"** or **"Connection secure"**
2. Go to **"Permissions"** tab
3. Find **"Access Your Location"**
4. Uncheck **"Use Default"**
5. Select **"Allow"**
6. Close and **refresh the page**

---

### Safari (Mac)

#### System-Level Permissions
1. Open **System Preferences** (⚙️)
2. Click **"Security & Privacy"**
3. Click **"Privacy"** tab
4. Select **"Location Services"** from left sidebar
5. Make sure **"Enable Location Services"** is checked
6. Find **Safari** in the list and check it
7. Go back to Safari and **refresh the page**

#### Safari Website Settings
1. In Safari menu bar: **Safari** → **Settings for This Website**
2. Find **"Location"** dropdown
3. Change to **"Allow"**
4. **Refresh the page**

---

## How to Enable Camera Permissions

The blockchain system also needs camera access for photo verification.

### Google Chrome / Edge / Brave
1. Click the **camera icon** (📷) or **lock icon** (🔒) in the address bar
2. Change **"Camera"** from "Block" to **"Allow"**
3. **Refresh the page**

### Firefox
1. Click the **camera icon** (📷) in the address bar
2. Change dropdown from "Blocked" to **"Allowed"**
3. **Refresh the page**

### Safari
1. **Safari** → **Settings for This Website**
2. Change **"Camera"** to **"Allow"**
3. **Refresh the page**

---

## Troubleshooting

### ❌ Still Getting "User denied Geolocation" Error?

**Try these steps in order:**

1. **Hard Refresh the Page**
   - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

2. **Clear Site Permissions and Try Again**
   - Chrome: Click lock icon → Site settings → Clear permissions
   - Firefox: Click lock icon → More Information → Permissions → Reset
   - Safari: Safari → Settings for This Website → Reset

3. **Check Browser Settings Directly**
   - Go to browser settings as described above
   - Make sure your site is NOT in the "Block" list
   - Add your site to the "Allow" list if needed

4. **Close and Reopen Browser**
   - Sometimes permissions need a browser restart
   - Close ALL browser windows
   - Reopen and try again

5. **Check if Location Services are Enabled**
   - **Windows 10/11**: Settings → Privacy → Location → Turn ON
   - **Mac**: System Preferences → Security & Privacy → Location Services → Turn ON
   - **Linux**: Usually enabled by default, check system settings

6. **Try a Different Browser**
   - If Chrome doesn't work, try Firefox or Edge
   - Sometimes one browser handles permissions better

---

## Why Do We Need These Permissions?

### 📍 Location (GPS) Permission
- **Legal Protection**: Proves WHERE check-in/check-out occurred
- **Fraud Prevention**: Prevents fake attendance from wrong locations
- **Audit Trail**: Immutable proof for legal disputes
- **Accuracy**: GPS coordinates with accuracy radius (±10-50 meters)

### 📷 Camera Permission
- **Identity Verification**: Confirms the correct child is present
- **Photo Hash**: Creates cryptographic hash (not storing actual photo)
- **Blockchain Proof**: Photo hash recorded in blockchain
- **Non-repudiation**: Cannot deny attendance later

---

## Security & Privacy

### What We Store:
✅ GPS coordinates (latitude, longitude, accuracy)
✅ Address (reverse geocoded from coordinates)
✅ Photo cryptographic hash (SHA-256)
✅ Timestamp (exact date/time)
✅ Blockchain record (immutable, cannot be altered)

### What We DON'T Store:
❌ Your browsing history
❌ Other websites you visit
❌ Your home address
❌ Photos in raw format (only hash)
❌ Personal device information

---

## Common Permission Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "User denied Geolocation" | You clicked "Block" when prompted | Follow guide above to enable location |
| "Location unavailable" | GPS signal weak or disabled | Check device location settings |
| "Request timed out" | Location taking too long | Move closer to window, try again |
| "Camera access denied" | Camera permission blocked | Enable camera in browser settings |
| "Insecure context" | Not using HTTPS | Contact admin - site needs SSL certificate |

---

## Still Having Issues?

### Quick Checklist:
- [ ] Location services enabled in browser settings
- [ ] Your site is in "Allow" list for location
- [ ] Camera permission is set to "Allow"
- [ ] You refreshed the page after changing permissions
- [ ] You're using HTTPS (secure connection)
- [ ] Browser is up to date

### Contact Support:
If you've tried everything and still can't enable permissions:
1. Take a screenshot of the error
2. Note your browser name and version
3. Contact your system administrator or tech support
4. Provide: Browser name, version, operating system, exact error message

---

## Browser Compatibility

| Browser | Location Support | Camera Support | Recommended |
|---------|-----------------|----------------|-------------|
| Chrome 90+ | ✅ Full | ✅ Full | ✅ Yes |
| Edge 90+ | ✅ Full | ✅ Full | ✅ Yes |
| Firefox 88+ | ✅ Full | ✅ Full | ✅ Yes |
| Safari 14+ | ✅ Full | ✅ Full | ✅ Yes |
| Opera 76+ | ✅ Full | ✅ Full | ✅ Yes |
| Brave | ✅ Full | ✅ Full | ✅ Yes |

**Note**: HTTPS (secure connection) is REQUIRED for location and camera access in modern browsers.

---

**Last Updated**: February 5, 2026
**Version**: 1.0
