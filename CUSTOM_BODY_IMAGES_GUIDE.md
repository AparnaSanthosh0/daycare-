# Custom Body Images Guide

## Overview
The Virtual Body Learning component now supports custom cartoon character images. The characters have been positioned lower on the screen as requested.

## Current Positions
- **Child Body**: y=0.3 (moved down from 1.0)
- **Adult Body**: y=0.5 (moved down from 1.2)  
- **Baby Body**: y=0.2 (moved down from 0.8)

## How to Use Your Custom Images

### Option 1: Using Image Files from Your Project

1. **Save your images** in `client/public/images/body-learning/`:
   - `child-character.png` - Boy with blue overalls
   - `baby-character.png` - Sitting baby
   - `adult-character.png` - Woman in red cardigan

2. **Update the image loading** in `client/src/components/Games/VirtualBodyLearning.jsx`:

   In the **ChildBody** component (around line 242):
   ```javascript
   img.src = '/images/body-learning/child-character.png';
   ```

   In the **AdultBody** component (create similar block):
   ```javascript
   img.src = '/images/body-learning/adult-character.png';
   ```

   In the **BabyBody** component (create similar block):
   ```javascript
   img.src = '/images/body-learning/baby-character.png';
   ```

### Option 2: Using External URLs

If your images are hosted online, use the direct URLs:
```javascript
img.src = 'https://example.com/your-child-image.png';
```

### Complete Example for Using Custom Images

Replace the ChildBody component's image loading:

```javascript
React.useEffect(() => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  // Replace this with your actual image path
  img.src = '/images/body-learning/child-character.png';
  
  img.onload = () => {
    if (textureRef.current) {
      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      textureRef.current.map = texture;
      textureRef.current.needsUpdate = true;
    }
  };
  
  // Fallback canvas drawing will be used if image fails to load
  img.onerror = () => {
    // Canvas drawing code as fallback...
  };
}, []);
```

## Image Requirements

- **Format**: PNG with transparent background (recommended) or JPG
- **Size**: 512x512 (baby), 512x640 (child), 512x768 (adult)
- **Aspect Ratio**: Match the canvas dimensions for best results
- **Quality**: High resolution for best appearance in 3D space

## Testing Your Custom Images

1. Save your 3 character images to the public folder
2. Update the image paths in the component
3. Refresh the application
4. Navigate to Virtual Body Learning
5. Switch between body types to verify all images load correctly

## Troubleshooting

- **Image not loading**: Check browser console for errors, verify file path
- **Image too small/large**: Adjust the `planeGeometry args` in the mesh return statement
- **Need different positioning**: Modify the `position={[0, y, 0]}` values in the mesh
- **Image appears distorted**: Ensure aspect ratio matches the plane geometry dimensions

## Current Fallback

If custom images fail to load, the component will display canvas-drawn cartoon characters as fallback:
- Child: Blue overalls with brown hair
- Adult: Red cardigan with gray skirt
- Baby: White shirt with gray pants (sitting pose)
