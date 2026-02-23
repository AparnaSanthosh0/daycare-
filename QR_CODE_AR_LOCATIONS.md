# 📍 QR Code AR - Implementation Locations

## 🗂️ File Structure

```
TinyTots/
├── client/src/
│   ├── components/
│   │   ├── AR/
│   │   │   ├── QRCodeGenerator.jsx    ✓ QR code generation component
│   │   │   ├── QRScanner.jsx          ✓ QR scanning component
│   │   │   └── ARViewer.jsx           ✓ AR viewer component
│   │   │
│   │   ├── Admin/
│   │   │   └── AdminQRManagement.jsx  ✓ Admin QR management dashboard
│   │   │
│   │   └── Ecommerce/
│   │       └── ProductDetail.jsx      ✓ Integrated with QR buttons
│   │
│   ├── pages/
│   │   └── ARViewerPage.jsx           ✓ AR viewer page route
│   │
│   └── App.js                          ✓ Routes configured
│
└── Documentation/
    ├── QR_CODE_AR_GUIDE.md             ✓ Complete guide
    ├── QR_CODE_AR_QUICK_START.md       ✓ Quick start
    └── QR_CODE_AR_LOCATIONS.md         ✓ This file
```

---

## 🎯 Integration Points

### 1. Product Pages (`ProductDetail.jsx`)

**Location**: `client/src/components/Ecommerce/ProductDetail.jsx`

**Lines**: ~310-340

**Features Added**:
```jsx
// Two new buttons after "Add to Cart"
<Button startIcon={<QrCode2 />} onClick={() => setQrGeneratorOpen(true)}>
  Generate AR QR
</Button>

<Button startIcon={<QrCodeScanner />} onClick={() => setQrScannerOpen(true)}>
  Scan QR
</Button>
```

**Dialogs**:
- `<QRCodeGenerator />` - Opens when "Generate AR QR" is clicked
- `<QRScanner />` - Opens when "Scan QR" is clicked

---

### 2. Admin Dashboard (`App.js`)

**Location**: `client/src/App.js`

**Line**: ~433

**Route Added**:
```jsx
<Route 
  path="/admin/qr-codes" 
  element={user?.role === 'admin' ? <Layout><AdminQRManagement /></Layout> : <Navigate to="/" />} 
/>
```

**Access**: Navigate to `/admin/qr-codes` as admin user

---

### 3. AR Viewer Page (`App.js`)

**Location**: `client/src/App.js`

**Line**: ~191

**Route Added**:
```jsx
<Route 
  path="/ar-viewer" 
  element={<ARViewerPage />} 
/>
```

**Access**: 
- Direct URL: `/ar-viewer?mode=ar&data=<encoded_data>`
- Via QR code scan → Automatically navigates here

---

## 🚀 How Data Flows

### Generate QR Code Flow

```
User clicks "Generate AR QR" on Product Page
             ↓
ProductDetail.jsx opens QRCodeGenerator dialog
             ↓
QRCodeGenerator creates URL with product data
             ↓
QR code image generated (qrcode library)
             ↓
User downloads/prints/shares QR code
```

### Scan QR Code Flow

```
User clicks "Scan QR" or scans physical QR
             ↓
QRScanner opens camera (html5-qrcode)
             ↓
QR detected and decoded
             ↓
URL parsed, AR data extracted
             ↓
Navigate to /ar-viewer?mode=ar&data=...
             ↓
ARViewerPage decodes data
             ↓
ARViewer displays 3D model in AR mode
```

---

## 📦 Components API

### QRCodeGenerator

**Location**: `client/src/components/AR/QRCodeGenerator.jsx`

**Usage**:
```jsx
import QRCodeGenerator from '../AR/QRCodeGenerator';

<QRCodeGenerator
  open={true}
  onClose={() => setOpen(false)}
  productId="123"
  productName="Baby Toy"
  model3DUrl="/models/toy.glb"
  size={300}
/>
```

---

### QRScanner

**Location**: `client/src/components/AR/QRScanner.jsx`

**Usage**:
```jsx
import QRScanner from '../AR/QRScanner';

<QRScanner
  open={true}
  onClose={() => setOpen(false)}
  onScanSuccess={(data) => console.log('Scanned:', data)}
  onScanError={(err) => console.error(err)}
/>
```

---

### ARViewer

**Location**: `client/src/components/AR/ARViewer.jsx`

**Usage**:
```jsx
import ARViewer from '../AR/ARViewer';

<ARViewer
  modelUrl="/models/product.glb"
  productName="Product Name"
  productId="123"
  price={299}
  onClose={() => navigate('/')}
  onAddToCart={(product) => addToCart(product)}
/>
```

---

### AdminQRManagement

**Location**: `client/src/components/Admin/AdminQRManagement.jsx`

**Access**: 
- Route: `/admin/qr-codes`
- Role: Admin only
- Features: Bulk QR generation, search, filter

---

## 🎨 Where to Find UI Elements

### Customer-Facing

1. **Product Page** (`/product/:id`)
   - "Generate AR QR" button
   - "Scan QR" button
   - Located below "Add to Cart"

2. **AR Viewer** (`/ar-viewer`)
   - Full-screen AR experience
   - Accessed via QR scan
   - Shows 3D model with controls

### Admin-Facing

1. **Admin Dashboard** (`/admin`)
   - Sidebar menu → "QR Codes" link
   - Redirects to `/admin/qr-codes`

2. **QR Management** (`/admin/qr-codes`)
   - Product list with 3D models
   - Individual QR generation
   - Bulk PDF generation
   - Search and filter

---

## 🔧 Customization Locations

### Styling

**QR Code Colors**: `QRCodeGenerator.jsx` line ~83
```javascript
color: {
  dark: '#000000',    // Change QR foreground
  light: '#FFFFFF',   // Change QR background
}
```

**Scanner UI**: `QRScanner.jsx` line ~250
```jsx
sx={{
  backgroundColor: '#000',  // Scanner background
  color: '#fff',            // Text color
}}
```

**AR Viewer**: `ARViewer.jsx` line ~190
```jsx
<Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
```

---

### Scanner Configuration

**Location**: `QRScanner.jsx` line ~152

```javascript
const config = {
  fps: 10,                              // Scan speed
  qrbox: { width: 250, height: 250 },  // Scan area
  aspectRatio: 1.0,                     // Camera ratio
};
```

---

### AR Settings

**Location**: `ARViewer.jsx` line ~203

```jsx
// Lighting
<ambientLight intensity={0.7} />
<directionalLight position={[10, 10, 5]} intensity={1.2} />

// Camera
camera={{ position: [0, 0, 5], fov: 50 }}

// Controls
<OrbitControls
  autoRotate={false}
  enableZoom={true}
  minDistance={2}
  maxDistance={10}
/>
```

---

## 📱 Mobile-Specific Code

### Camera Access

**Location**: `QRScanner.jsx` line ~56

```javascript
const devices = await Html5Qrcode.getCameras();
```

### Touch Controls

**Location**: `ARViewer.jsx` line ~238

```jsx
<OrbitControls
  touches={{
    ONE: 2,   // TOUCH.ROTATE
    TWO: 1,   // TOUCH.DOLLY_PAN
  }}
/>
```

### Device Detection

Used in: `ARViewer.jsx`, `QRScanner.jsx`

```javascript
import { isMobile } from 'react-device-detect';

{isMobile && (
  // Mobile-specific UI
)}
```

---

## 🧪 Testing Locations

### Manual Testing

1. **Generate QR**:
   - Go to any product page with `model3DUrl`
   - Click "Generate AR QR"
   - Verify QR appears

2. **Scan QR**:
   - Click "Scan QR" button
   - Allow camera access
   - Point at QR code
   - Verify AR launches

3. **AR Experience**:
   - Verify 3D model loads
   - Test rotate (drag)
   - Test zoom (pinch)
   - Test add to cart

### Admin Testing

1. Go to `/admin/qr-codes`
2. Verify products list
3. Click individual QR generation
4. Test bulk PDF generation
5. Test search/filter

---

## 🗺️ Navigation Map

```
Home (/)
  ↓
Product Page (/product/123)
  ├→ Click "Generate AR QR" → QR Dialog
  ├→ Click "Scan QR" → Scanner Dialog → AR Viewer (/ar-viewer)
  └→ Click product with 3D badge → Product Detail

Admin Dashboard (/admin)
  ↓
Admin Menu → QR Codes
  ↓
QR Management (/admin/qr-codes)
  ├→ Individual QR generation
  └→ Bulk PDF generation
```

---

## 📝 Key Files Reference

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `QRCodeGenerator.jsx` | Generate QR codes | ~340 | ✅ Complete |
| `QRScanner.jsx` | Scan QR codes | ~380 | ✅ Complete |
| `ARViewer.jsx` | Display AR | ~420 | ✅ Complete |
| `ARViewerPage.jsx` | AR route page | ~110 | ✅ Complete |
| `AdminQRManagement.jsx` | Admin dashboard | ~380 | ✅ Complete |
| `ProductDetail.jsx` | Product integration | +30 lines | ✅ Integrated |
| `App.js` | Routes | +2 routes | ✅ Configured |

---

## 🔍 Quick Search

Need to find something? Use these search terms in your IDE:

- **QR Generation**: Search for `QRCodeGenerator`
- **QR Scanning**: Search for `QRScanner` or `Html5Qrcode`
- **AR Viewing**: Search for `ARViewer` or `@react-three`
- **Admin Panel**: Search for `AdminQRManagement`
- **Routes**: Search for `/ar-viewer` or `/admin/qr-codes`
- **Product Integration**: Search for `qrGeneratorOpen` or `qrScannerOpen`

---

## 🎯 Common Tasks

### Add QR button to another page

1. Import components:
```jsx
import QRCodeGenerator from '../AR/QRCodeGenerator';
import QRScanner from '../AR/QRScanner';
```

2. Add state:
```jsx
const [qrOpen, setQrOpen] = useState(false);
```

3. Add button:
```jsx
<Button onClick={() => setQrOpen(true)}>Generate QR</Button>
```

4. Add dialog:
```jsx
<QRCodeGenerator
  open={qrOpen}
  onClose={() => setQrOpen(false)}
  productId={product.id}
  productName={product.name}
  model3DUrl={product.model3DUrl}
/>
```

---

### Change QR code size

**File**: `QRCodeGenerator.jsx`
**Line**: ~39
```jsx
size = 300,  // Change this value
```

---

### Add analytics tracking

**QR Generation** - `QRCodeGenerator.jsx` line ~92:
```javascript
setQrGenerated(true);
// Add here:
analytics.track('QR_GENERATED', { productId });
```

**QR Scan** - `QRScanner.jsx` line ~130:
```javascript
setScanResult(arData);
// Add here:
analytics.track('QR_SCANNED', { productId: arData.productId });
```

**AR View** - `ARViewerPage.jsx` line ~45:
```javascript
setArData(data);
// Add here:
analytics.track('AR_VIEWED', { productId: data.productId });
```

---

## 📞 Support

**Issues?** Check these locations first:

1. **Camera not working**: `QRScanner.jsx` line ~56 (permissions)
2. **QR not generating**: `QRCodeGenerator.jsx` line ~65 (URL generation)
3. **AR not loading**: `ARViewer.jsx` line ~77 (model validation)
4. **Routes not working**: `App.js` line ~191 and ~433

---

**Last Updated**: Implementation Complete ✅
