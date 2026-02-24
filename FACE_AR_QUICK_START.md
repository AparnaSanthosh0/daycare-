# Face AR - Quick Start ⚡

Get started with Face AR features in under 5 minutes!

## 🎯 For Users

### Try Face Accessories (2 mins)

1. **Go to Face AR**
   - Visit: `http://localhost:3000/face-ar`
   - Or click "Try Face AR" banner on shop page

2. **Start Accessories AR**
   - Click "Start AR Experience" on left card
   - Allow camera when prompted

3. **Try Accessories**
   - Select from: Party Hat, Sunglasses, Mask, Headband
   - See real-time preview on your face
   - Capture photo with camera button

### Try Virtual Makeup (3 mins)

1. **Start Makeup Studio**
   - Click "Start AR Experience" on right card
   - Allow camera access

2. **Choose Style**
   - Select tab: Face Paint, Tattoos, or Party
   - Pick a style (e.g., Butterfly, Tiger, Stars)

3. **Customize**
   - Choose color (Pink, Purple, Blue, etc.)
   - Adjust intensity slider (10-100%)
   - Capture when perfect!

## 👨‍💻 For Developers

### Run the Project

```bash
# Terminal 1: Start server
cd server
npm start

# Terminal 2: Start client
cd client
npm start
```

Visit: http://localhost:3000/face-ar

### Key Files

```
client/src/
├── components/AR/
│   ├── FaceAccessoriesAR.jsx    # Accessories try-on
│   └── VirtualMakeupAR.jsx      # Makeup studio
└── pages/
    └── FaceARPage.jsx           # Main AR page
```

### Quick Customization

**Add New Accessory:**

```javascript
// In FaceAccessoriesAR.jsx, find `accessories` array
{
  id: 'new-hat',
  name: 'New Hat',
  type: 'hat',
  image: '/path/to/image.png',
  position: { x: 0.5, y: 0.15 },
  scale: 0.35,
}
```

**Add New Makeup Style:**

```javascript
// In VirtualMakeupAR.jsx, add to `facePaint` array
{
  id: 'custom',
  name: 'Custom Style',
  type: 'facePaint',
  description: 'Your custom style',
  pattern: 'customPattern',
}

// Then add drawing function
const drawCustomPattern = (ctx, bounds) => {
  ctx.fillStyle = selectedColor;
  // Your drawing code
};
```

## 🎨 Sample Products to Test

Add these products to your database for AR testing:

```javascript
{
  name: "Birthday Party Hat",
  category: "Accessories",
  price: 15.99,
  // AR will auto-detect and show "Try Face AR" button
}

{
  name: "Kids Face Paint Set",
  category: "Party Supplies",
  price: 24.99,
  arType: "makeup",
  // Will trigger Makeup AR
}
```

## 📱 Testing Checklist

- [ ] Desktop camera works
- [ ] Mobile front camera works
- [ ] Mobile back camera works
- [ ] Face detection accurate
- [ ] Accessories align properly
- [ ] Colors display correctly
- [ ] Photo capture works
- [ ] Add to cart functions
- [ ] Navigate between accessories/makeup

## 🐛 Quick Fixes

**Camera not working?**
- Ensure HTTPS or localhost
- Check browser permissions
- Try different browser

**Performance slow?**
- Close other tabs
- Use Chrome/Edge
- Lower intensity slider

**Face not detected?**
- Position face in center
- Ensure good lighting
- System has fallback positioning

## 🚀 Go Live

When ready for production:

1. Test on multiple devices
2. Ensure HTTPS enabled (required for camera)
3. Add analytics tracking
4. Monitor conversion rates
5. Collect user feedback

## 📚 Full Documentation

See [FACE_AR_GUIDE.md](./FACE_AR_GUIDE.md) for complete documentation.

---

**Need Help?** Check the troubleshooting section in the full guide or contact support.

**Ready to enhance?** Explore customization options in the developer section!

🎉 **You're all set! Start trying on accessories and makeup!**
