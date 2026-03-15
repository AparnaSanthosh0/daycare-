import React, { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls as DreiOrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  Box, Typography, Paper, Grid, Chip, Button, Slider,
  Tooltip, Stack, Divider, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Palette, ShoppingCart, AutoFixHigh,
  Checkroom, ExpandMore,
} from '@mui/icons-material';

const COLORS = [
  { name: 'Black',       hex: '#111111' },
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

const DEFAULT_STYLE_CONFIG = {
  mannequin: ['/models/customization/model.glb'],
  girlMannequin: ['/models/customization/model.glb'],
  boyMannequin: ['/models/customization/model.glb'],
  mannequinForOutfits: [
    '/models/customization/outfit.glb',
    '/models/customization/outfit2.glb',
  ],
  girlDresses: [
    '/models/customization/outfit.glb',
    '/models/customization/outfit2.glb',
    '/models/customization/outfit3.glb',
  ],
  boyDresses: [
    '/models/customization/outfit12.glb',
  ],
};

const pathLooksLikeModel = (url) => /\.(glb|gltf)$/i.test(url || '');

const probeModelUrl = async (url) => {
  if (!url || !pathLooksLikeModel(url)) return false;
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) return false;
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) return false;
    const txt = await res.clone().text();
    if (txt.trimStart().startsWith('<!DOCTYPE') || txt.trimStart().startsWith('<html')) return false;
    return true;
  } catch {
    return false;
  }
};

const normaliseModelItem = (url, fallbackLabel = '3D Model') => {
  const filename = (url || '').split('/').pop() || fallbackLabel;
  const pretty = filename.replace(/\.(glb|gltf)$/i, '').replace(/[-_]/g, ' ');
  const label = pretty ? pretty.replace(/\b\w/g, (m) => m.toUpperCase()) : fallbackLabel;
  return { url, label };
};

const uniqueModelItems = (items) => {
  const out = [];
  const seen = new Set();
  items.forEach((m) => {
    if (!m?.url || seen.has(m.url) || !pathLooksLikeModel(m.url)) return;
    seen.add(m.url);
    out.push(m);
  });
  return out;
};

// Builds a canvas texture with color + pattern fully baked in.
// Works with MeshBasicMaterial, MeshStandardMaterial, MeshPhysicalMaterial, etc.
const buildColorPatternTexture = (colorHex, pattern, opacity) => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = colorHex || '#ffffff';
  ctx.fillRect(0, 0, size, size);

  if (pattern && pattern !== 'solid') {
    const a = Math.max(0.15, Math.min(0.85, (opacity || 50) / 100));
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 18;

    if (pattern === 'stripes') {
      for (let x = -size; x < size * 2; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + size * 0.6, size); ctx.stroke();
      }
    } else if (pattern === 'polka') {
      for (let y = 50; y <= size - 20; y += 90) {
        for (let x = 50; x <= size - 20; x += 90) {
          ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (pattern === 'plaid') {
      for (let i = 0; i <= size; i += 72) {
        ctx.fillRect(i, 0, 20, size);
        ctx.fillRect(0, i, size, 20);
      }
    } else if (pattern === 'floral') {
      ctx.font = 'bold 72px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let y = 70; y <= size - 40; y += 110) {
        for (let x = 70; x <= size - 40; x += 110) {
          ctx.fillText('✿', x, y);
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  tex.needsUpdate = true;
  return tex;
};

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

const GLBSceneModel = ({
  modelUrl,
  role,
  colorHex,
  selectedPattern,
  colorOpacity,
  targetHeight,
  positionOffset,
}) => {
  const { scene } = useGLTF(modelUrl);
  const cloned = React.useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    if (targetHeight && size.y > 0) {
      c.scale.setScalar(targetHeight / size.y);
    } else {
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) c.scale.setScalar(2.2 / maxDim);
    }
    const ab = new THREE.Box3().setFromObject(c);
    const ac = ab.getCenter(new THREE.Vector3());
    c.position.set(-ac.x, -ab.min.y, -ac.z);
    if (Array.isArray(positionOffset) && positionOffset.length === 3) {
      c.position.x += positionOffset[0];
      c.position.y += positionOffset[1];
      c.position.z += positionOffset[2];
    }
    return c;
  }, [positionOffset, scene, targetHeight]);

  // Single canvas texture: color + pattern baked together — works on ALL material types
  const colorPatternTex = React.useMemo(
    () => buildColorPatternTexture(colorHex, selectedPattern, colorOpacity),
    [colorHex, selectedPattern, colorOpacity]
  );

  // Dispose old texture when it changes
  React.useEffect(() => () => { colorPatternTex?.dispose(); }, [colorPatternTex]);

  React.useEffect(() => {
    if (role !== 'dress') {
      cloned.traverse((child) => {
        if (!child.isMesh) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        const next = mats.map((m) => {
          if (!m) return m;
          const nm = m.clone();
          if (nm.color) { nm.color = nm.color.clone(); nm.color.multiplyScalar(0.95); }
          nm.needsUpdate = true;
          return nm;
        });
        child.material = Array.isArray(child.material) ? next : next[0];
      });
      return;
    }

    // World bounds for clothing mesh filtering
    const worldBox = new THREE.Box3().setFromObject(cloned);
    const worldH   = worldBox.max.y - worldBox.min.y;
    const worldW   = worldBox.max.x - worldBox.min.x;
    const isOutfit4 = /\/outfit4\.(glb|gltf)$/i.test(modelUrl || '');

    const looksLikeSkin = (color) => {
      if (!color) return false;
      const r = color.r;
      const g = color.g;
      const b = color.b;
      return r > 0.45 && g > 0.25 && b > 0.15 && r > g && g > b && (r - b) < 0.55;
    };

    cloned.traverse((child) => {
      if (!child.isMesh) return;

      const name = (child.name || '').toLowerCase();
      const clothingByName = /dress|cloth|fabric|outfit|shirt|top|skirt|pant|trouser|gown|kurta|lehenga|frock|jacket|coat|blouse/i.test(name);
      const bodyByName = /skin|body|face|head|hair|eye|brow|lash|lip|teeth|hand|foot|leg/i.test(name);

      const mb    = new THREE.Box3().setFromObject(child);
      const mCtrY = (mb.max.y + mb.min.y) / 2;
      const mH    = mb.max.y - mb.min.y;
      const mW    = mb.max.x - mb.min.x;
      const relY  = worldH > 0 ? (mCtrY - worldBox.min.y) / worldH : 0;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const materialLooksSkin = materials.some((material) => looksLikeSkin(material?.color));
      const torsoZone = relY > 0.16 && relY < 0.9 && mH > worldH * 0.12 && mW > worldW * 0.12;
      const likelyClothing = clothingByName || (!bodyByName && !materialLooksSkin && torsoZone);
      const shouldTintMesh = isOutfit4 ? likelyClothing : likelyClothing;

      if (!shouldTintMesh) {
        const keepMats = materials.map((material) => {
          if (!material) return material;
          const nextMaterial = material.clone();
          nextMaterial.needsUpdate = true;
          return nextMaterial;
        });
        child.material = Array.isArray(child.material) ? keepMats : keepMats[0];
        return;
      }

      const applyTex = (m) => {
        if (!m) return m;
        const nm = m.clone();
        if ('color' in nm && nm.color) nm.color = new THREE.Color(0xffffff);
        nm.map = colorPatternTex;
        if ('emissiveMap' in nm) { nm.emissiveMap = null; nm.emissiveIntensity = 0; }
        nm.needsUpdate = true;
        return nm;
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(applyTex)
        : applyTex(child.material);
    });
  }, [cloned, colorPatternTex, role]);

  return <primitive object={cloned} />;
};
// ─────────────────────────────────────────────────────────────────────────────
const DressCustomizer = ({
  model3DUrl,
  model3DUrls,
  onAddToCart,
}) => {
  const previewContainerRef = useRef(null);
  const [gender,          setGender]          = useState('girl'); // 'girl' | 'boy'
  const [selectedColor,   setSelectedColor]   = useState(COLORS[0]);
  const [colorOpacity,    setColorOpacity]    = useState(50);
  const [selectedPattern, setSelectedPattern] = useState('solid');
  const [styleConfig,     setStyleConfig]     = useState(DEFAULT_STYLE_CONFIG);
  const [selectedDressUrl, setSelectedDressUrl] = useState(DEFAULT_STYLE_CONFIG.girlDresses[0]);
  const [resolvedGirlMannequinModels, setResolvedGirlMannequinModels] = useState([]);
  const [resolvedBoyMannequinModels, setResolvedBoyMannequinModels] = useState([]);
  const [resolvedGirlModels,      setResolvedGirlModels]      = useState([]);
  const [resolvedBoyModels,       setResolvedBoyModels]       = useState([]);

  React.useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const r = await fetch('/models/customization/styles.json', { cache: 'no-store' });
        if (!r.ok) return;
        const cfg = await r.json();
        if (!active) return;
        const mannequin   = Array.isArray(cfg?.mannequin)   ? cfg.mannequin   : DEFAULT_STYLE_CONFIG.mannequin;
        const girlMannequin = Array.isArray(cfg?.girlMannequin) ? cfg.girlMannequin : mannequin;
        const boyMannequin = Array.isArray(cfg?.boyMannequin) ? cfg.boyMannequin : mannequin;
        const mannequinForOutfits = Array.isArray(cfg?.mannequinForOutfits)
          ? cfg.mannequinForOutfits
          : DEFAULT_STYLE_CONFIG.mannequinForOutfits;
        const girlDresses = Array.isArray(cfg?.girlDresses) ? cfg.girlDresses
          : (Array.isArray(cfg?.dresses) ? cfg.dresses : DEFAULT_STYLE_CONFIG.girlDresses);
        const boyDresses  = Array.isArray(cfg?.boyDresses)  ? cfg.boyDresses  : DEFAULT_STYLE_CONFIG.boyDresses;
        setStyleConfig({ mannequin, girlMannequin, boyMannequin, mannequinForOutfits, girlDresses, boyDresses });
      } catch {
        // keep defaults
      }
    };
    loadConfig();
    return () => { active = false; };
  }, []);

  const candidateModels = React.useMemo(() => {
    const externalUrls = [
      ...(Array.isArray(model3DUrls) ? model3DUrls : []),
      ...(model3DUrl ? [model3DUrl] : []),
    ].filter(Boolean);

    const external          = externalUrls.map((url) => normaliseModelItem(url));
    const externalMannequin = external.filter((m) => /mannequin|human|body|avatar/i.test(m.label));
    const externalGirl      = external.filter((m) => !/mannequin|human|body|avatar|boy|outfit12/i.test(m.label));
    const externalBoy       = external.filter((m) => /boy|outfit12/i.test(m.label));

    const mannequin = uniqueModelItems([
      ...styleConfig.mannequin.map((url) => normaliseModelItem(url, 'Mannequin')),
      ...externalMannequin,
      normaliseModelItem('/models/customization/model.glb', 'Mannequin'),
    ]);
    const girlMannequin = uniqueModelItems([
      ...styleConfig.girlMannequin.map((url) => normaliseModelItem(url, 'Girl Mannequin')),
      ...mannequin,
    ]);
    const boyMannequin = uniqueModelItems([
      ...styleConfig.boyMannequin.map((url) => normaliseModelItem(url, 'Boy Mannequin')),
      ...mannequin,
    ]);

    const girlDresses = uniqueModelItems([
      ...styleConfig.girlDresses.map((url) => normaliseModelItem(url, 'Girl Style')),
      ...externalGirl,
      normaliseModelItem('/models/customization/outfit.glb', 'Outfit'),
    ]);

    const boyDresses = uniqueModelItems([
      ...styleConfig.boyDresses.map((url) => normaliseModelItem(url, 'Boy Style')),
      ...externalBoy,
      normaliseModelItem('/models/customization/outfit12.glb', 'Outfit'),
    ]);

    return { girlMannequin, boyMannequin, girlDresses, boyDresses };
  }, [model3DUrl, model3DUrls, styleConfig]);

  React.useEffect(() => {
    let active = true;
    const resolve = async () => {
      const [gmChecks, bmChecks, gChecks, bChecks] = await Promise.all([
        Promise.all(candidateModels.girlMannequin.map(async (m) => ({ ...m, ok: await probeModelUrl(m.url) }))),
        Promise.all(candidateModels.boyMannequin.map(async (m) => ({ ...m, ok: await probeModelUrl(m.url) }))),
        Promise.all(candidateModels.girlDresses.map(async (m) => ({ ...m, ok: await probeModelUrl(m.url) }))),
        Promise.all(candidateModels.boyDresses.map(async (m) => ({ ...m, ok: await probeModelUrl(m.url) }))),
      ]);
      if (!active) return;
      setResolvedGirlMannequinModels(gmChecks.filter((m) => m.ok).map(({ ok, ...rest }) => rest));
      setResolvedBoyMannequinModels(bmChecks.filter((m) => m.ok).map(({ ok, ...rest }) => rest));
      setResolvedGirlModels(gChecks.filter((m) => m.ok).map(({ ok, ...rest }) => rest));
      setResolvedBoyModels(bChecks.filter((m) => m.ok).map(({ ok, ...rest }) => rest));
    };
    resolve();
    return () => { active = false; };
  }, [candidateModels]);

  // Keep selectedDressUrl in sync with gender + resolved lists
  React.useEffect(() => {
    const list = gender === 'girl' ? resolvedGirlModels : resolvedBoyModels;
    if (list.length > 0) {
      setSelectedDressUrl((prev) => {
        const stillExists = list.some((m) => m.url === prev);
        return stillExists ? prev : list[0].url;
      });
    }
  }, [gender, resolvedGirlModels, resolvedBoyModels]);

  React.useEffect(() => {
    if (selectedDressUrl) useGLTF.preload(selectedDressUrl);
    if (resolvedGirlMannequinModels[0]?.url) useGLTF.preload(resolvedGirlMannequinModels[0].url);
    if (resolvedBoyMannequinModels[0]?.url) useGLTF.preload(resolvedBoyMannequinModels[0].url);
  }, [resolvedBoyMannequinModels, resolvedGirlMannequinModels, selectedDressUrl]);

  const mannequinModel = React.useMemo(() => {
    const list = gender === 'girl' ? resolvedGirlMannequinModels : resolvedBoyMannequinModels;
    return list[0] || null;
  }, [gender, resolvedBoyMannequinModels, resolvedGirlMannequinModels]);

  const activeDresses = React.useMemo(
    () => (gender === 'girl' ? resolvedGirlModels : resolvedBoyModels),
    [gender, resolvedGirlModels, resolvedBoyModels]
  );

  const dressModel = React.useMemo(
    () => activeDresses.find((m) => m.url === selectedDressUrl) || activeDresses[0] || null,
    [activeDresses, selectedDressUrl]
  );

  const shouldShowMannequin = React.useMemo(() => {
    const allowed = Array.isArray(styleConfig.mannequinForOutfits)
      ? styleConfig.mannequinForOutfits
      : DEFAULT_STYLE_CONFIG.mannequinForOutfits;
    return !!selectedDressUrl && allowed.includes(selectedDressUrl);
  }, [selectedDressUrl, styleConfig.mannequinForOutfits]);

  const customizationPayload = React.useMemo(() => ({
    type: 'dress_customizer',
    customizationKind: 'customized_dress',
    isCustomized: true,
    gender,
    colorName: selectedColor.name,
    baseColour: selectedColor.hex,
    opacity: colorOpacity,
    pattern: selectedPattern,
    selectedDressUrl,
    selectedDressLabel: dressModel?.label || 'Custom Outfit',
  }), [colorOpacity, dressModel?.label, gender, selectedColor.hex, selectedColor.name, selectedDressUrl, selectedPattern]);

  const handleAddCustomized = React.useCallback(() => {
    let previewDataUrl = null;
    try {
      const canvasEl = previewContainerRef.current?.querySelector('canvas');
      if (canvasEl && typeof canvasEl.toDataURL === 'function') {
        previewDataUrl = canvasEl.toDataURL('image/png', 0.92);
      }
    } catch {
      // fall back without preview image
    }

    onAddToCart?.({
      ...customizationPayload,
      previewDataUrl,
    });
  }, [customizationPayload, onAddToCart]);

  return (
    <Accordion defaultExpanded sx={{
      border: '2px solid #2e7d32',
      borderRadius: 3,
      overflow: 'hidden',
      mb: 2,
      boxShadow: '0 14px 32px rgba(46,125,50,0.14)',
      background: 'linear-gradient(180deg,#f7fff7 0%,#eef8ef 100%)',
      '&:before': { display: 'none' }
    }}>
      <AccordionSummary
        expandIcon={<ExpandMore sx={{ color: 'white' }} />}
        sx={{
          px: 2.5,
          py: 1.1,
          background: 'linear-gradient(100deg,#2e7d32 0%,#388e3c 55%,#43a047 100%)',
          color: 'white',
          '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5, my: 0.5 }
        }}
      >
        <Checkroom />
        <Typography variant="subtitle1" fontWeight={800} letterSpacing={0.4}>
          Design Your Design
        </Typography>
        <Chip label="Made to Order" size="small"
          sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.22)', color: 'white', fontWeight: 700, fontSize: 11 }} />
      </AccordionSummary>

      <AccordionDetails sx={{
        p: { xs: 1.5, sm: 2.5 },
        background:
          'radial-gradient(circle at 10% 0%, rgba(251,146,60,0.12), transparent 32%), radial-gradient(circle at 92% 14%, rgba(244,114,182,0.12), transparent 28%)'
      }}>
        <Grid container spacing={3} alignItems="flex-start">

          {/* LEFT: 3D Model Viewer */}
          <Grid item xs={12} sm={5}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 1.5 }}>
                3D PREVIEW
              </Typography>
            </Box>
            <Box ref={previewContainerRef} sx={{
              position: 'relative', borderRadius: 2.5, overflow: 'hidden',
              bgcolor: '#f9f5f0', border: '1.5px solid #ffe0b2',
              aspectRatio: '3/4', boxShadow: '0 10px 28px rgba(255,111,0,0.2)',
            }}>
              <GLBErrorBoundary key={selectedDressUrl} modelUrl={selectedDressUrl}>
                {/* camera y=1.1 = midpoint of a 2.2-unit model so full outfit is framed */}
                <Canvas camera={{ position: [0, 1.1, 3.8], fov: 42 }}
                  style={{ width: '100%', height: '100%' }}>
                  <ambientLight intensity={1.1} />
                  <directionalLight position={[4, 6, 4]} intensity={1.0} />
                  <pointLight position={[-4, 4, -4]} intensity={0.4} />
                  <Suspense fallback={<GLBLoadingMesh />}>
                    {mannequinModel && shouldShowMannequin && (
                      <GLBSceneModel
                        modelUrl={mannequinModel.url}
                        role="mannequin"
                        targetHeight={2.2}
                      />
                    )}
                    {dressModel && (
                      <GLBSceneModel
                        colorHex={selectedColor.hex}
                        modelUrl={dressModel.url}
                        role="dress"
                        selectedPattern={selectedPattern}
                        colorOpacity={colorOpacity}
                        targetHeight={2.0}
                        positionOffset={[0, 0.03, 0.02]}
                      />
                    )}
                  </Suspense>
                  <DreiOrbitControls enablePan={false} minDistance={1.5} maxDistance={7} target={[0, 1.0, 0]} />
                </Canvas>
              </GLBErrorBoundary>
            </Box>
            {activeDresses.length > 1 && (
              <Box sx={{ mt: 1.2, display: 'flex', gap: 0.7, flexWrap: 'wrap', justifyContent: 'center' }}>
                {activeDresses.map((m) => (
                  <Chip
                    key={m.url}
                    label={m.label}
                    size="small"
                    onClick={() => setSelectedDressUrl(m.url)}
                    color={selectedDressUrl === m.url ? 'warning' : 'default'}
                    variant={selectedDressUrl === m.url ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer', fontWeight: selectedDressUrl === m.url ? 700 : 500 }}
                  />
                ))}
              </Box>
            )}
          </Grid>

          {/* RIGHT: Controls */}
          <Grid item xs={12} sm={7}>
            {/* 1. Gender Selector */}
            <Box mb={2.5}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom
                sx={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Checkroom fontSize="small" /> 1. Choose Gender
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                {[
                  { value: 'girl', label: 'Girl', emoji: '👧' },
                  { value: 'boy',  label: 'Boy',  emoji: '👦' },
                ].map((g) => (
                  <Chip
                    key={g.value}
                    label={`${g.emoji} ${g.label}`}
                    onClick={() => setGender(g.value)}
                    variant={gender === g.value ? 'filled' : 'outlined'}
                    color={gender === g.value ? 'success' : 'default'}
                    sx={{ cursor: 'pointer', fontWeight: gender === g.value ? 700 : 500, fontSize: 14, py: 2.5, px: 1 }}
                  />
                ))}
              </Box>
            </Box>

            {/* 2. Fabric Colour */}
            <Box mb={2}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom
                sx={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Palette fontSize="small" /> 2. Fabric Colour
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                {COLORS.map(c => (
                  <Tooltip key={c.hex} title={c.name} arrow>
                    <Box onClick={() => setSelectedColor(c)} sx={{
                      width: 30, height: 30, borderRadius: '50%', bgcolor: c.hex, cursor: 'pointer',
                      border: selectedColor.hex === c.hex ? '3px solid #2e7d32' : '2px solid #e0e0e0',
                      boxShadow: selectedColor.hex === c.hex ? '0 0 0 2px white, 0 0 0 4px #2e7d32' : 'none',
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
                sx={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AutoFixHigh fontSize="small" /> 3. Pattern / Texture
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                {PATTERNS.map(p => (
                  <Chip key={p.id} label={`${p.icon} ${p.name}`} onClick={() => setSelectedPattern(p.id)}
                    variant={selectedPattern === p.id ? 'filled' : 'outlined'} size="small"
                    sx={{
                      cursor: 'pointer', fontWeight: selectedPattern === p.id ? 700 : 400,
                      bgcolor: selectedPattern === p.id ? '#2e7d32' : undefined,
                      color: selectedPattern === p.id ? 'white' : undefined,
                      borderColor: selectedPattern === p.id ? '#2e7d32' : '#ddd',
                    }} />
                ))}
              </Box>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Design Summary */}
            <Paper sx={{ p: 1.5, bgcolor: '#fff8f0', borderRadius: 2, border: '1px solid #ffe0b2', mb: 2 }}>
              <Typography variant="caption" fontWeight={700} color="#2e7d32" display="block" gutterBottom>Your Design</Typography>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography fontSize={14}>{gender === 'girl' ? '👧' : '👦'}</Typography>
                  <Typography variant="caption">{gender === 'girl' ? 'Girl' : 'Boy'} Outfit</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: selectedColor.hex, border: '1px solid #ccc', flexShrink: 0 }} />
                  <Typography variant="caption">{selectedColor.name} · {PATTERNS.find(p => p.id === selectedPattern)?.name}</Typography>
                </Box>
              </Stack>
            </Paper>

            {onAddToCart && (
              <Button fullWidth variant="contained" color="success" size="large" startIcon={<ShoppingCart />}
                onClick={handleAddCustomized}
                sx={{
                  borderRadius: 3, fontWeight: 700,
                  py: 1.5, boxShadow: '0 4px 14px rgba(46,125,50,0.30)',
                }}>
                Add to Cart with This Design
              </Button>
            )}
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default DressCustomizer;
