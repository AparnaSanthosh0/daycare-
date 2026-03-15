import React, { useState, useRef, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls as DreiOrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  Box, Typography, Paper, Grid, Chip, Button, Slider,
  Tooltip, Stack, Divider,
} from '@mui/material';
import {
  Palette, Download, ShoppingCart, AutoFixHigh,
  Checkroom, ColorLens, ViewInAr,
} from '@mui/icons-material';

// Real outfit photos
const OUTFIT_TYPES = [
  { id: 'girls-dress', label: 'Girls Dress', emoji: '👗', photo: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&q=80&auto=format&fit=crop' },
  { id: 'boys-shirt',  label: 'Boys Shirt',  emoji: '👕', photo: 'https://images.unsplash.com/photo-1503944168849-8bf86875bbd8?w=600&q=80&auto=format&fit=crop' },
  { id: 'romper',      label: 'Romper',      emoji: '🧸', photo: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=80&auto=format&fit=crop' },
  { id: 'lehenga',     label: 'Lehenga',     emoji: '🌸', photo: 'https://images.unsplash.com/photo-1624226260875-1a4b0dff9a98?w=600&q=80&auto=format&fit=crop' },
  { id: 'kurta',       label: 'Kurta Set',   emoji: '✨', photo: 'https://images.unsplash.com/photo-1593032457869-0038260b2f6b?w=600&q=80&auto=format&fit=crop' },
];

const COLORS = [
  { name: 'Rose Pink',   hex: '#e91e8c' },
  { name: 'Sky Blue',    hex: '#1e88e5' },
  { name: 'Mint Green',  hex: '#43a047' },
  { name: 'Sunshine',    hex: '#fdd835' },
  { name: 'Lavender',    hex: '#9c27b0' },
  { name: 'Coral',       hex: '#ff5722' },
  { name: 'Pearl White', hex: '#eeeeee' },
  { name: 'Navy Blue',   hex: '#1a237e' },
  { name: 'Blush',       hex: '#f8bbd0' },
  { name: 'Olive',       hex: '#827717' },
  { name: 'Cherry Red',  hex: '#c62828' },
  { name: 'Teal',        hex: '#00695c' },
];

const PATTERNS = [
  { id: 'solid',   name: 'Solid',      icon: '◼' },
  { id: 'stripes', name: 'Stripes',    icon: '▤' },
  { id: 'polka',   name: 'Polka Dots', icon: '⁙' },
  { id: 'floral',  name: 'Floral',     icon: '🌸' },
  { id: 'plaid',   name: 'Plaid',      icon: '▦' },
];

const EMB_COLORS = [
  { name: 'Gold',     hex: '#ffd700' },
  { name: 'Silver',   hex: '#b0bec5' },
  { name: 'Hot Pink', hex: '#e91e8c' },
  { name: 'Green',    hex: '#4caf50' },
  { name: 'Blue',     hex: '#1e88e5' },
  { name: 'Orange',   hex: '#ff5722' },
];

const DEFAULT_CUSTOMIZATION_MODELS = [
  { label: 'Outfit', url: '/models/customization/outfit.glb' },
  { label: 'Customization', url: '/models/customization/customization-model.glb' },
  { label: 'Model', url: '/models/customization/model.glb' },
];

const buildPatternTexture = (pattern, opacity = 0.5) => {
  if (!pattern || pattern === 'solid') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const alpha = Math.max(0.08, Math.min(0.9, opacity));

  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 8;

  if (pattern === 'stripes') {
    for (let x = -128; x < 384; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 128, 256);
      ctx.stroke();
    }
  } else if (pattern === 'polka') {
    for (let y = 32; y <= 224; y += 64) {
      for (let x = 32; x <= 224; x += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === 'plaid') {
    for (let i = 0; i <= 256; i += 48) {
      ctx.fillRect(i, 0, 14, 256);
      ctx.fillRect(0, i, 256, 14);
    }
  } else if (pattern === 'floral') {
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = 42; y <= 220; y += 72) {
      for (let x = 42; x <= 220; x += 72) {
        ctx.fillText('✿', x, y);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  return tex;
};

function PatternOverlay({ pattern, opacity }) {
  if (pattern === 'solid') return null;
  const o = Math.max(0.05, opacity / 200).toFixed(2);
  let patternDef = null;
  if (pattern === 'stripes') {
    patternDef = (
      <pattern id="po" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect x="0" y="0" width="12" height="24" fill="white" opacity={o} />
      </pattern>
    );
  } else if (pattern === 'polka') {
    patternDef = (
      <pattern id="po" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
        <circle cx="16" cy="16" r="8" fill="white" opacity={o} />
      </pattern>
    );
  } else if (pattern === 'floral') {
    patternDef = (
      <pattern id="po" x="0" y="0" width="52" height="52" patternUnits="userSpaceOnUse">
        <text x="26" y="38" fontSize="30" textAnchor="middle" opacity={o}>🌸</text>
      </pattern>
    );
  } else if (pattern === 'plaid') {
    const op = (o * 0.75).toFixed(2);
    patternDef = (
      <pattern id="po" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="12" height="24" fill="white" opacity={op} />
        <rect x="0" y="0" width="24" height="12" fill="white" opacity={op} />
      </pattern>
    );
  }
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
      <defs>{patternDef}</defs>
      <rect width="400" height="600" fill="url(#po)" />
    </svg>
  );
}

function EmbroideryOverlay({ color }) {
  const pts = [80, 130, 180, 200, 220, 270, 320];
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
      <path d="M80,78 Q200,118 320,78" fill="none" stroke={color} strokeWidth="3.5" strokeDasharray="7 5" strokeLinecap="round" opacity="0.92" />
      {pts.map((x, i) => <circle key={`n${i}`} cx={x} cy={78 + Math.sin((x - 200) / 40) * 12} r="3" fill={color} opacity="0.88" />)}
      <path d="M36,520 Q200,558 364,520" fill="none" stroke={color} strokeWidth="3.5" strokeDasharray="7 5" strokeLinecap="round" opacity="0.92" />
      {pts.map((x, i) => <circle key={`h${i}`} cx={x} cy={520 + Math.sin((x - 200) / 50) * 14} r="3" fill={color} opacity="0.88" />)}
      <path d="M38,118 Q18,300 38,520" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="5 6" strokeLinecap="round" opacity="0.7" />
      <path d="M362,118 Q382,300 362,520" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="5 6" strokeLinecap="round" opacity="0.7" />
      <path d="M58,298 Q200,318 342,298" fill="none" stroke={color} strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" opacity="0.6" />
      {[[80,78],[320,78],[38,520],[362,520]].map(([cx,cy],i) => (
        <g key={`r${i}`}>
          <circle cx={cx} cy={cy} r="7" fill={color} opacity="0.92" />
          <circle cx={cx} cy={cy} r="3.5" fill="white" opacity="0.88" />
        </g>
      ))}
    </svg>
  );
}

// ─── 3D GLB Preview components ───────────────────────────────────────────────────────
class GLBErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidUpdate(prevProps) {
    if (prevProps.modelUrl !== this.props.modelUrl && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', p: 2, textAlign: 'center',
        }}>
          <Typography fontSize={32}>📁</Typography>
          <Typography variant="caption" fontWeight={700} color="#ff6f00">GLB Not Found</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Drop your file at:<br />
            <code>{(this.props.modelUrl || '/models/customization/outfit.glb').replace(/^\//, 'public/')}</code>
          </Typography>
        </Box>
      );
    }
    return this.props.children;
  }
}

const GLBLoadingMesh = () => {
  const ref = useRef();
  useFrame((s) => { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 1.5; });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.6, 1.0, 0.2]} />
      <meshStandardMaterial color="#ff6f00" wireframe />
    </mesh>
  );
};

const GLBOutfitModel = ({ colorHex, modelUrl, selectedPattern, colorOpacity }) => {
  const { scene } = useGLTF(modelUrl);
  const cloned = React.useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) c.scale.setScalar(2.2 / maxDim);
    const center = new THREE.Box3().setFromObject(c).getCenter(new THREE.Vector3());
    c.position.sub(center);
    return c;
  }, [scene]);

  const patternTexture = React.useMemo(
    () => buildPatternTexture(selectedPattern, colorOpacity / 100),
    [selectedPattern, colorOpacity]
  );

  React.useEffect(() => {
    const color = new THREE.Color(colorHex);

    cloned.traverse((child) => {
      if (child.isMesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        const nextMats = mats.map((m) => {
          if (!m) return m;
          const nm = m.clone();
          nm.color = nm.color?.clone ? nm.color.clone() : new THREE.Color(0xffffff);
          nm.color.set(color);

          if (patternTexture && 'emissiveMap' in nm) {
            nm.emissiveMap = patternTexture;
            nm.emissive = new THREE.Color(0xffffff);
            nm.emissiveIntensity = 0.35;
          } else if ('emissiveMap' in nm) {
            nm.emissiveMap = null;
            nm.emissiveIntensity = 0;
          }

          nm.needsUpdate = true;
          return nm;
        });

        child.material = Array.isArray(child.material) ? nextMats : nextMats[0];
      }
    });

    return () => {
      if (patternTexture) patternTexture.dispose();
    };
  }, [colorHex, cloned, patternTexture]);

  return <primitive object={cloned} />;
};
// ─────────────────────────────────────────────────────────────────────────────
const DressCustomizer = ({ productImage, productName, model3DUrl, model3DUrls, onAddToCart }) => {
  const [outfitType,      setOutfitType]      = useState(OUTFIT_TYPES[0]);
  const [selectedColor,   setSelectedColor]   = useState(COLORS[0]);
  const [colorOpacity,    setColorOpacity]    = useState(50);
  const [selectedPattern, setSelectedPattern] = useState('solid');
  const [showEmbroidery,  setShowEmbroidery]  = useState(false);
  const [embColor,        setEmbColor]        = useState(EMB_COLORS[0].hex);
  const [view3D,          setView3D]          = useState(false);
  const [selectedModelUrl, setSelectedModelUrl] = useState('/models/customization/outfit.glb');
  const autoView3DRef = useRef(false);
  const previewRef = useRef(null);

  const available3DModels = React.useMemo(() => {
    const externalUrls = [
      ...(Array.isArray(model3DUrls) ? model3DUrls : []),
      ...(model3DUrl ? [model3DUrl] : []),
    ].filter(Boolean);

    const toItem = (url, fallbackLabel = '3D Model') => {
      const filename = url.split('/').pop() || fallbackLabel;
      const pretty = filename.replace(/\.(glb|gltf)$/i, '').replace(/[-_]/g, ' ');
      const label = pretty
        ? pretty.replace(/\b\w/g, (m) => m.toUpperCase())
        : fallbackLabel;
      return { url, label };
    };

    const merged = [
      ...externalUrls.map((url) => toItem(url)),
      ...DEFAULT_CUSTOMIZATION_MODELS,
    ];

    const unique = [];
    const seen = new Set();
    merged.forEach((m) => {
      if (!seen.has(m.url)) {
        seen.add(m.url);
        unique.push(m);
      }
    });
    return unique;
  }, [model3DUrl, model3DUrls]);

  React.useEffect(() => {
    if (available3DModels.length > 0) {
      setSelectedModelUrl((prev) => {
        const stillExists = available3DModels.some((m) => m.url === prev);
        return stillExists ? prev : available3DModels[0].url;
      });
    }
  }, [available3DModels]);

  React.useEffect(() => {
    if (selectedModelUrl) useGLTF.preload(selectedModelUrl);
  }, [selectedModelUrl]);

  React.useEffect(() => {
    if (!autoView3DRef.current && available3DModels.length > 0) {
      setView3D(true);
      autoView3DRef.current = true;
    }
  }, [available3DModels]);

  const activePhoto = productImage || outfitType.photo;
  const activeName  = productName  || outfitType.label;
  const stepNum = (n) => !productImage ? `${n}.` : `${n - 1}.`;
  const selectedModelLabel = available3DModels.find((m) => m.url === selectedModelUrl)?.label || 'Outfit';
  const customizationNote = `Color: ${selectedColor.name} | Pattern: ${selectedPattern}${showEmbroidery ? ` | Embroidery: ${EMB_COLORS.find(e => e.hex === embColor)?.name}` : ''}${view3D ? ` | 3D Model: ${selectedModelLabel}` : ''}`;

  const handleDownload = useCallback(() => {
    if (!previewRef.current) return;
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(previewRef.current, { useCORS: true, scale: 2 }).then(canvas => {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `tinytots-${activeName.replace(/\s+/g, '-')}.png`;
        a.click();
      });
    }).catch(() => {});
  }, [activeName]);

  return (
    <Paper elevation={0} sx={{
      border: '2px solid #ffd7a8',
      borderRadius: 3,
      overflow: 'hidden',
      mb: 2,
      boxShadow: '0 14px 32px rgba(249,115,22,0.14)',
      background: 'linear-gradient(180deg,#fffaf5 0%,#fff4e8 100%)'
    }}>
      {/* Header */}
      <Box sx={{
        px: 2.5, py: 1.8,
        background: 'linear-gradient(100deg,#f97316 0%,#fb923c 55%,#f59e0b 100%)',
        color: 'white', display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Checkroom />
        <Typography variant="subtitle1" fontWeight={800} letterSpacing={0.4}>
          🎨 Design Your Custom Outfit
        </Typography>
        <Chip label="Made to Order" size="small"
          sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.22)', color: 'white', fontWeight: 700, fontSize: 11 }} />
      </Box>

      <Box sx={{
        p: { xs: 1.5, sm: 2.5 },
        background:
          'radial-gradient(circle at 10% 0%, rgba(251,146,60,0.12), transparent 32%), radial-gradient(circle at 92% 14%, rgba(244,114,182,0.12), transparent 28%)'
      }}>
        <Grid container spacing={3} alignItems="flex-start">

          {/* LEFT: Live Preview */}
          <Grid item xs={12} sm={5}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}
                sx={{ letterSpacing: 1.5 }}>
                LIVE PREVIEW
              </Typography>
              <Chip
                icon={<ViewInAr sx={{ fontSize: 14 }} />}
                label={view3D ? '2D View' : '3D View'}
                size="small"
                onClick={() => setView3D(v => !v)}
                color={view3D ? 'warning' : 'default'}
                variant={view3D ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 10 }}
              />
            </Box>
            <Box ref={previewRef} sx={{
              position: 'relative', borderRadius: 2.5, overflow: 'hidden',
              bgcolor: '#f9f5f0', border: '1.5px solid #ffe0b2',
              aspectRatio: '3/4', boxShadow: '0 10px 28px rgba(255,111,0,0.2)',
            }}>
              {view3D ? (
                <GLBErrorBoundary key={selectedModelUrl} modelUrl={selectedModelUrl}>
                  <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }}
                    style={{ width: '100%', height: '100%' }}>
                    <ambientLight intensity={0.9} />
                    <directionalLight position={[5, 5, 5]} intensity={0.7} />
                    <Suspense fallback={<GLBLoadingMesh />}>
                      <GLBOutfitModel
                        colorHex={selectedColor.hex}
                        modelUrl={selectedModelUrl}
                        selectedPattern={selectedPattern}
                        colorOpacity={colorOpacity}
                      />
                    </Suspense>
                    <DreiOrbitControls enablePan={false} minDistance={1.5} maxDistance={6} />
                  </Canvas>
                </GLBErrorBoundary>
              ) : (
                <>
                  {/* ① Real dress photo */}
                  <Box component="img" src={activePhoto} alt={activeName} crossOrigin="anonymous"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1593032457869-0038260b2f6b?w=600&q=80&auto=format&fit=crop'; }} />

                  {/* ② Fabric colour wash */}
                  <Box sx={{
                    position: 'absolute', inset: 0,
                    bgcolor: selectedColor.hex, opacity: colorOpacity / 100, mixBlendMode: 'multiply', pointerEvents: 'none',
                  }} />

                  {/* ③ Pattern overlay */}
                  <PatternOverlay pattern={selectedPattern} opacity={colorOpacity} />

                  {/* ④ Embroidery stitching */}
                  {showEmbroidery && <EmbroideryOverlay color={embColor} />}

                  <Box sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.08) 100%)',
                    pointerEvents: 'none'
                  }} />

                  {/* ⑤ Label chips */}
                  <Box sx={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 0.6, flexWrap: 'wrap', px: 1 }}>
                    {!productImage && (
                      <Chip label={outfitType.label.toUpperCase()} size="small"
                        sx={{ bgcolor: '#ff6f00', color: 'white', fontWeight: 700, fontSize: 10 }} />
                    )}
                    <Chip label={selectedColor.name} size="small"
                      sx={{ bgcolor: selectedColor.hex, color: 'white', fontWeight: 700, fontSize: 10, textShadow: '0 1px 2px rgba(0,0,0,0.45)' }} />
                    {selectedPattern !== 'solid' && (
                      <Chip label={PATTERNS.find(p => p.id === selectedPattern)?.name} size="small"
                        sx={{ bgcolor: 'rgba(0,0,0,0.55)', color: 'white', fontWeight: 700, fontSize: 10 }} />
                    )}
                    {showEmbroidery && (
                      <Chip label="✿ Embroidery" size="small"
                        sx={{ bgcolor: embColor, color: 'white', fontWeight: 700, fontSize: 10, textShadow: '0 1px 2px rgba(0,0,0,0.45)' }} />
                    )}
                  </Box>
                </>
              )}
            </Box>
            {view3D && available3DModels.length > 1 && (
              <Box sx={{ mt: 1.2, display: 'flex', gap: 0.7, flexWrap: 'wrap', justifyContent: 'center' }}>
                {available3DModels.map((m) => (
                  <Chip
                    key={m.url}
                    label={m.label}
                    size="small"
                    onClick={() => setSelectedModelUrl(m.url)}
                    color={selectedModelUrl === m.url ? 'warning' : 'default'}
                    variant={selectedModelUrl === m.url ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer', fontWeight: selectedModelUrl === m.url ? 700 : 500 }}
                  />
                ))}
              </Box>
            )}
            {!view3D && (
              <Button fullWidth variant="outlined" startIcon={<Download />} onClick={handleDownload} size="small"
                sx={{ mt: 1.5, borderRadius: 2, fontWeight: 600, borderColor: '#ff6f00', color: '#ff6f00', '&:hover': { borderColor: '#e65100', bgcolor: '#fff3e0' } }}>
                Save Preview
              </Button>
            )}
          </Grid>

          {/* RIGHT: Controls */}
          <Grid item xs={12} sm={7}>

            {/* 1. Outfit Type picker — only on shop main page */}
            {!productImage && (
              <Box mb={2.5}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom
                  sx={{ color: '#e65100', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Checkroom fontSize="small" /> 1. Choose Outfit
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {OUTFIT_TYPES.map(ot => (
                    <Box key={ot.id} onClick={() => setOutfitType(ot)} sx={{
                      cursor: 'pointer',
                      border: outfitType.id === ot.id ? '2.5px solid #ff6f00' : '1.5px solid #e0e0e0',
                      borderRadius: 2, overflow: 'hidden', width: 72,
                      bgcolor: outfitType.id === ot.id ? '#fff3e0' : 'white',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: '#ff8f00', boxShadow: 2 },
                    }}>
                      <Box component="img" src={ot.photo} alt={ot.label}
                        sx={{ width: '100%', height: 60, objectFit: 'cover', display: 'block' }} />
                      <Typography variant="caption"
                        sx={{ display: 'block', textAlign: 'center', py: 0.4, fontWeight: 600, fontSize: 9.5, lineHeight: 1.3 }}>
                        {ot.emoji} {ot.label}
                      </Typography>
                      {outfitType.id === ot.id && (
                        <Box sx={{ bgcolor: '#ff6f00', py: 0.2, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: 'white', fontSize: 9, fontWeight: 700 }}>✓ Selected</Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Fabric Colour */}
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom
                sx={{ color: '#e65100', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Palette fontSize="small" /> {stepNum(2)} Fabric Colour
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                {COLORS.map(c => (
                  <Tooltip key={c.hex} title={c.name} arrow>
                    <Box onClick={() => setSelectedColor(c)} sx={{
                      width: 30, height: 30, borderRadius: '50%', bgcolor: c.hex, cursor: 'pointer',
                      border: selectedColor.hex === c.hex ? '3px solid #ff6f00' : '2px solid #e0e0e0',
                      boxShadow: selectedColor.hex === c.hex ? '0 0 0 2px white, 0 0 0 4px #ff6f00' : 'none',
                      transition: 'all 0.15s', '&:hover': { transform: 'scale(1.2)' },
                    }} />
                  </Tooltip>
                ))}
              </Box>
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Colour Intensity: <b>{colorOpacity}%</b></Typography>
                <Slider value={colorOpacity} onChange={(_, v) => setColorOpacity(v)} min={10} max={90} size="small"
                  sx={{ color: selectedColor.hex, mt: 0.5, '& .MuiSlider-thumb': { boxShadow: `0 0 0 4px ${selectedColor.hex}40` } }} />
              </Box>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Pattern / Texture */}
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom
                sx={{ color: '#e65100', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AutoFixHigh fontSize="small" /> {stepNum(3)} Pattern / Texture
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                {PATTERNS.map(p => (
                  <Chip key={p.id} label={`${p.icon} ${p.name}`} onClick={() => setSelectedPattern(p.id)}
                    variant={selectedPattern === p.id ? 'filled' : 'outlined'} size="small"
                    sx={{
                      cursor: 'pointer', fontWeight: selectedPattern === p.id ? 700 : 400,
                      bgcolor: selectedPattern === p.id ? '#ff6f00' : undefined,
                      color: selectedPattern === p.id ? 'white' : undefined,
                      borderColor: selectedPattern === p.id ? '#ff6f00' : '#ddd',
                    }} />
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Embroidery */}
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom
                sx={{ color: '#e65100', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ColorLens fontSize="small" /> {stepNum(4)} Embroidery
              </Typography>
              <Chip label={showEmbroidery ? '✿ Remove Embroidery' : '✿ Add Embroidery Trim'}
                onClick={() => setShowEmbroidery(v => !v)}
                variant={showEmbroidery ? 'filled' : 'outlined'} size="small"
                sx={{
                  cursor: 'pointer', fontWeight: 600, mb: 1,
                  bgcolor: showEmbroidery ? '#e91e8c' : undefined,
                  color: showEmbroidery ? 'white' : undefined,
                  borderColor: showEmbroidery ? '#e91e8c' : '#ddd',
                }} />
              {showEmbroidery && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Thread Colour:</Typography>
                  <Stack direction="row" spacing={0.8}>
                    {EMB_COLORS.map(ec => (
                      <Tooltip key={ec.hex} title={ec.name} arrow>
                        <Box onClick={() => setEmbColor(ec.hex)} sx={{
                          width: 26, height: 26, borderRadius: '50%', bgcolor: ec.hex, cursor: 'pointer',
                          border: embColor === ec.hex ? '3px solid #333' : '2px solid #ccc',
                          transition: 'all 0.15s', '&:hover': { transform: 'scale(1.2)' },
                        }} />
                      </Tooltip>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Design Summary */}
            <Paper sx={{ p: 1.5, bgcolor: '#fff8f0', borderRadius: 2, border: '1px solid #ffe0b2', mb: 2 }}>
              <Typography variant="caption" fontWeight={700} color="#e65100" display="block" gutterBottom>Your Design</Typography>
              <Stack spacing={0.5}>
                {!productImage && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontSize={14}>{outfitType.emoji}</Typography>
                    <Typography variant="caption">{outfitType.label}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: selectedColor.hex, border: '1px solid #ccc', flexShrink: 0 }} />
                  <Typography variant="caption">{selectedColor.name} · {PATTERNS.find(p => p.id === selectedPattern)?.name}</Typography>
                </Box>
                {showEmbroidery && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: embColor, border: '1px solid #ccc', flexShrink: 0 }} />
                    <Typography variant="caption">Embroidery — {EMB_COLORS.find(e => e.hex === embColor)?.name || 'Custom'} thread</Typography>
                  </Box>
                )}
              </Stack>
            </Paper>

            {onAddToCart && (
              <Button fullWidth variant="contained" size="large" startIcon={<ShoppingCart />}
                onClick={() => onAddToCart(customizationNote)}
                sx={{
                  borderRadius: 3, fontWeight: 700,
                  background: 'linear-gradient(90deg,#ff6f00,#ff8f00)',
                  py: 1.5, boxShadow: '0 4px 14px rgba(255,111,0,0.30)',
                  '&:hover': { background: 'linear-gradient(90deg,#e65100,#f57c00)' },
                }}>
                Add to Cart with This Design
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default DressCustomizer;
