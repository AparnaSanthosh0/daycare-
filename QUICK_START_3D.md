# Quick Start: Adding Your First 3D Model

This guide will help you add your first 3D product model to TinyTots in 5 minutes.

## Step 1: Download a Free 3D Model (2 minutes)

### Option A: Sketchfab (Recommended)
1. Go to https://sketchfab.com/search?q=toy&type=models&features=downloadable&sort_by=-likeCount
2. Find a toy model you like (filter by "Free" in left sidebar)
3. Click on the model
4. Click "Download 3D Model" button
5. Select **"glTF Binary (.glb)"** format
6. Download the file

### Option B: Direct Download Links
Use these pre-selected free models:

**Teddy Bear**:
- https://sketchfab.com/3d-models/teddy-bear-8fc4b7e4b1c64a0abebf1a0b72f5c0fe
- Format: GLB
- Size: ~2MB

**Building Blocks**:
- https://sketchfab.com/3d-models/wooden-toy-blocks-05dcb3e8e38f4c4c8b6c0c3f3c7b2e7f
- Format: GLB
- Size: ~3MB

**Toy Car**:
- https://sketchfab.com/3d-models/toy-car-f6d8e5b1c3d44f3b8e6d5c2b1e7f8c9d
- Format: GLB
- Size: ~1.5MB

## Step 2: Add Model to Project (1 minute)

1. **Create the models directory** (if not exists):
   ```
   client/public/models/toys/
   ```

2. **Copy your GLB file** there:
   ```
   client/public/models/toys/teddy-bear.glb
   ```

3. **Verify the file path**:
   - Full path should be: `c:\Users\HP\TinyTots\client\public\models\toys\teddy-bear.glb`
   - URL will be: `/models/toys/teddy-bear.glb`

## Step 3: Update Product Database (1 minute)

### Option A: Using MongoDB Compass (GUI)

1. Open MongoDB Compass
2. Connect to your database
3. Navigate to `tinytots` database → `products` collection
4. Find a toy product (e.g., "Teddy Bear", "Building Blocks")
5. Click "Edit Document"
6. Add the field:
   ```json
   "model3DUrl": "/models/toys/teddy-bear.glb"
   ```
7. Click "Update"

### Option B: Using MongoDB Shell

```bash
mongosh
use tinytots
db.products.updateOne(
  { name: /teddy bear/i },
  { $set: { model3DUrl: "/models/toys/teddy-bear.glb" } }
)
```

### Option C: Using the Update Script

```bash
# Edit server/add-3d-models.js
# Add your product to the array:
{
  name: 'Teddy Bear',
  model3DUrl: '/models/toys/teddy-bear.glb'
}

# Run the script:
node server/add-3d-models.js update
```

## Step 4: View Your 3D Model (1 minute)

1. **Start the application** (if not running):
   ```bash
   npm start
   ```

2. **Navigate to shop**:
   - Go to http://localhost:3000/shop

3. **Find your product**:
   - Search for the product you updated (e.g., "Teddy Bear")
   - Click on the product card

4. **Toggle to 3D View**:
   - On the product detail page, you'll see a toggle button at the top
   - Click "3D View" button
   - Your 3D model should appear!

5. **Test the controls**:
   - **Drag** to rotate
   - **Scroll** to zoom
   - **Right-click + drag** to pan
   - Click **Fullscreen** button for immersive view
   - Click **Reset** button to return to original position

## Troubleshooting

### "Toggle button doesn't appear"
- **Check**: Did you add `model3DUrl` field to the product in database?
- **Solution**: Run this query to verify:
  ```javascript
  db.products.findOne({ name: /teddy bear/i }, { name: 1, model3DUrl: 1 })
  ```

### "Model doesn't load / blank viewer"
- **Check 1**: Is the GLB file in the correct location?
  - Path: `client/public/models/toys/teddy-bear.glb`
- **Check 2**: Is the URL correct in database?
  - Should be: `/models/toys/teddy-bear.glb` (starts with `/`)
- **Check 3**: Open browser console (F12) for error messages

### "Model appears but looks weird"
- **Too large/small**: Adjust scale in `ProductDetail.jsx`:
  ```jsx
  <Product3DViewer scale={0.5} /> // Half size
  ```
- **Wrong orientation**: The model may need to be rotated in Blender before export

### "Performance is slow"
- **File too large**: Compress the GLB file using [glTF Transform](https://gltf-transform.dev/)
- **Too many polygons**: Use a lower-poly version of the model

## Quick Test Commands

### Check if dependencies are installed:
```bash
cd client
npm list three @react-three/fiber @react-three/drei
```

### Check if Product3DViewer component exists:
```bash
ls client/src/components/Product3DViewer.jsx
```

### Check if model file exists:
```bash
ls client/public/models/toys/teddy-bear.glb
```

### View demo page:
```
http://localhost:3000/demo-3d
```
(Create a route for Product3DViewerDemo component first)

## Need More Models?

### Free Resources:
1. **Sketchfab** - https://sketchfab.com
   - Search: "toy", "educational", "baby"
   - Filter: "Free" + "Downloadable"
   
2. **Poly Haven** - https://polyhaven.com/models
   - High-quality, CC0 licensed models
   
3. **TurboSquid Free** - https://www.turbosquid.com/Search/3D-Models/free
   - Various free models

### File Size Recommendations:
- **Ideal**: 1-3 MB per model
- **Acceptable**: Up to 5 MB
- **Too Large**: Over 10 MB (compress first)

### Model Quality Guidelines:
- **Polygons**: 10,000 - 50,000 triangles
- **Textures**: 1024x1024 or 2048x2048 max
- **Format**: GLB (compressed) preferred over GLTF

## Success! 🎉

If you can see and interact with your 3D model, you're all set! 

**Next Steps**:
- Add more 3D models to other products
- Test on mobile devices
- Show to parents and get feedback
- Consider creating custom 3D models for your unique products

## Need Help?

- Check [3D_VIEWER_GUIDE.md](3D_VIEWER_GUIDE.md) for comprehensive documentation
- Review browser console for error messages
- Test with a different model to rule out file issues
- Verify all dependencies are installed

---

**Estimated Time**: 5 minutes  
**Difficulty**: ⭐☆☆☆☆ (Very Easy)  
**Result**: Interactive 3D product viewer in your e-commerce store!
