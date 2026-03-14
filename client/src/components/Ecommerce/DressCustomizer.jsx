import React, { useState, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button, Slider,
  Tooltip, Stack, IconButton, Divider
} from '@mui/material';
import {
  Palette, Download, ShoppingCart, AutoFixHigh,
  Checkroom, ColorLens, ExpandMore, ExpandLess
} from '@mui/icons-material';

// ── Color swatches ────────────────────────────────────────────────────────────
const COLORS = [
  { name: 'Rose Pink',    hex: '#e91e8c' },
  { name: 'Sky Blue',     hex: '#1e88e5' },
  { name: 'Mint Green',   hex: '#43a047' },
  { name: 'Sunshine',     hex: '#fdd835' },
  { name: 'Lavender',     hex: '#9c27b0' },
  { name: 'Coral',        hex: '#ff5722' },
  { name: 'Pearl White',  hex: '#f5f5f5' },
  { name: 'Navy Blue',    hex: '#1a237e' },
  { name: 'Blush',        hex: '#f8bbd0' },
  { name: 'Olive',        hex: '#827717' },
  { name: 'Cherry Red',   hex: '#c62828' },
  { name: 'Teal',         hex: '#00695c' },
];

// ── Patterns ──────────────────────────────────────────────────────────────────
const PATTERNS = [
  { id: 'solid',      name: 'Solid',      emoji: '◼' },
  { id: 'stripes',    name: 'Stripes',    emoji: '〓' },
  { id: 'polka',      name: 'Polka Dots', emoji: '⁙' },
  { id: 'floral',     name: 'Floral',     emoji: '🌸' },
  { id: 'plaid',      name: 'Plaid',      emoji: '▦' },
  { id: 'embroidery', name: 'Embroidery', emoji: '✿' },
];

// ── Embroidery accent colours ─────────────────────────────────────────────────
const EMBROIDERY_COLORS = ['#ffd700', '#ffffff', '#e91e8c', '#4caf50', '#1e88e5', '#ff5722'];

// ── SVG Pattern defs renderer ─────────────────────────────────────────────────
function buildPatternDef(pattern, color, opacity) {
  const o = (opacity / 100).toFixed(2);
  switch (pattern) {
    case 'stripes':
      return (
        <defs>
          <pattern id="dp" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect x="0" y="0" width="12" height="24" fill={color} opacity={o} />
          </pattern>
        </defs>
      );
    case 'polka':
      return (
        <defs>
          <pattern id="dp" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="14" cy="14" r="6" fill={color} opacity={o} />
          </pattern>
        </defs>
      );
    case 'floral':
      return (
        <defs>
          <pattern id="dp" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <text x="20" y="28" fontSize="26" textAnchor="middle" opacity={o}>🌸</text>
          </pattern>
        </defs>
      );
    case 'plaid':
      return (
        <defs>
          <pattern id="dp" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="12" height="24" fill={color} opacity={(o * 0.5).toFixed(2)} />
            <rect x="0" y="0" width="24" height="12" fill={color} opacity={(o * 0.5).toFixed(2)} />
          </pattern>
        </defs>
      );
    default:
      return null;
  }
}

// ── Embroidery SVG border overlay ─────────────────────────────────────────────
function EmbroideryBorder({ color, width, height }) {
  const r = 18;
  const dash = 8;
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {/* outer stitch */}
      <rect x="10" y="10" rx={r} ry={r} width={width - 20} height={height - 20}
        fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${dash}`} strokeLinecap="round" />
      {/* inner stitch */}
      <rect x="18" y="18" rx={r - 4} ry={r - 4} width={width - 36} height={height - 36}
        fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.6"
        strokeDasharray={`${dash * 0.6} ${dash * 1.4}`} strokeLinecap="round" />
      {/* corner rosettes */}
      {[[20, 20], [width - 20, 20], [20, height - 20], [width - 20, height - 20]].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="6" fill={color} opacity="0.9" />
          <circle cx={cx} cy={cy} r="3" fill="white" opacity="0.8" />
        </g>
      ))}
    </svg>
  );
}

// ── Mannequin SVG (fallback when no product image) ────────────────────────────
function MannequinSVG({ color, pattern, opacity, embroideryColor, showEmbroidery }) {
  const dressColor = color;
  const dressBg = color + '22';
  return (
    <svg viewBox="0 0 300 520" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        {/* Dress gradient */}
        <linearGradient id="dressGrad" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.75" />
        </linearGradient>
        {/* Skin gradient */}
        <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5cba7" />
          <stop offset="100%" stopColor="#e8a87c" />
        </linearGradient>
        {/* Pattern for dress */}
        {pattern === 'stripes' && (
          <pattern id="pat" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
            <rect x="0" y="0" width="8" height="16" fill="white" opacity="0.25" />
          </pattern>
        )}
        {pattern === 'polka' && (
          <pattern id="pat" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="4" fill="white" opacity="0.25" />
          </pattern>
        )}
        {pattern === 'plaid' && (
          <pattern id="pat" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="10" height="20" fill="white" opacity="0.15" />
            <rect x="0" y="0" width="20" height="10" fill="white" opacity="0.15" />
          </pattern>
        )}
        <filter id="bodyShadow">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#00000028" />
        </filter>
      </defs>

      {/* ── Neck & Head area ── */}
      <ellipse cx="150" cy="52" rx="24" ry="28" fill="url(#skinGrad)" />
      {/* Shoulders/arms visible beside dress */}
      <ellipse cx="72" cy="155" rx="22" ry="48" fill="url(#skinGrad)" transform="rotate(-8 72 155)" />
      <ellipse cx="228" cy="155" rx="22" ry="48" fill="url(#skinGrad)" transform="rotate(8 228 155)" />

      {/* ── Dress body ── */}
      <path
        d="M100,100 Q80,115 68,140 L60,200 L45,380 Q44,420 80,430 L220,430 Q256,420 255,380 L240,200 L232,140 Q220,115 200,100 Q175,108 150,108 Q125,108 100,100 Z"
        fill="url(#dressGrad)"
        filter="url(#bodyShadow)"
      />
      {/* Pattern overlay on dress */}
      {pattern !== 'solid' && pattern !== 'embroidery' && pattern !== 'floral' && (
        <path
          d="M100,100 Q80,115 68,140 L60,200 L45,380 Q44,420 80,430 L220,430 Q256,420 255,380 L240,200 L232,140 Q220,115 200,100 Q175,108 150,108 Q125,108 100,100 Z"
          fill="url(#pat)"
        />
      )}
      {pattern === 'floral' && (
        <>
          {[[150, 200], [110, 260], [190, 270], [135, 330], [175, 350], [150, 400]].map(([fx, fy], i) => (
            <text key={i} x={fx} y={fy} fontSize="22" textAnchor="middle">🌸</text>
          ))}
        </>
      )}

      {/* ── Neckline ── */}
      <path
        d="M118,100 Q150,130 182,100"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeOpacity="0.5"
      />

      {/* ── Dress hem ruffle ── */}
      <path
        d="M45,380 Q70,405 95,390 Q120,375 150,395 Q180,415 205,390 Q230,365 255,380"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeOpacity="0.4"
      />

      {/* ── Glossy shine on shoulder ── */}
      <ellipse cx="118" cy="130" rx="18" ry="10" fill="white" fillOpacity="0.18" transform="rotate(-30 118 130)" />

      {/* ── Waist tie (belt hint) ── */}
      <path d="M80,240 Q150,255 220,240" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.35" />

      {/* ── Embroidery effect ── */}
      {showEmbroidery && (
        <>
          {/* Neckline embroidery */}
          <path d="M115,102 Q150,135 185,102" fill="none"
            stroke={embroideryColor} strokeWidth="3"
            strokeDasharray="5 4" strokeLinecap="round" />
          {/* Hem embroidery */}
          <path d="M48,382 Q70,406 95,392 Q122,377 150,396 Q178,416 205,392 Q232,366 252,382"
            fill="none" stroke={embroideryColor} strokeWidth="3"
            strokeDasharray="5 4" strokeLinecap="round" />
          {/* Waist embroidery */}
          <path d="M82,242 Q150,257 218,242" fill="none"
            stroke={embroideryColor} strokeWidth="2.5"
            strokeDasharray="4 4" strokeLinecap="round" />
          {/* Decorative dots on neckline */}
          {[118, 133, 150, 167, 182].map((x, i) => (
            <circle key={i} cx={x} cy={102 + Math.sin((x - 150) / 25) * 14} r="3"
              fill={embroideryColor} opacity="0.9" />
          ))}
        </>
      )}

      {/* ── Stand/base ── */}
      <rect x="140" y="430" width="20" height="48" rx="4" fill="#9e9e9e" />
      <ellipse cx="150" cy="478" rx="38" ry="10" fill="#bdbdbd" />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const DressCustomizer = ({ productImage, productName, productPrice, onAddToCart }) => {
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedPattern, setSelectedPattern] = useState('solid');
  const [colorOpacity, setColorOpacity] = useState(55);
  const [embroideryColor, setEmbroideryColor] = useState('#ffd700');
  const [showEmbroidery, setShowEmbroidery] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const previewRef = useRef(null);

  const hasImage = Boolean(productImage);

  const handleDownload = useCallback(() => {
    if (!previewRef.current) return;
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(previewRef.current, { useCORS: true, scale: 2 }).then(canvas => {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `tinytots-${(productName || 'dress').replace(/\s+/g, '-')}-preview.png`;
        a.click();
      });
    }).catch(() => {
      // html2canvas not available — skip silently
    });
  }, [productName]);

  const customizationNote = `Color: ${selectedColor.name} | Pattern: ${selectedPattern}${showEmbroidery ? ` | Embroidery: ${embroideryColor}` : ''}`;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '2px solid #e8eaf6',
        borderRadius: 3,
        overflow: 'hidden',
        mb: 2,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          background: 'linear-gradient(90deg,#667eea,#764ba2)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(v => !v)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Checkroom />
          <Typography variant="subtitle1" fontWeight={700}>
            🎨 Customize &amp; Preview
          </Typography>
          <Chip label="Photo Preview" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11 }} />
        </Box>
        {expanded ? <ExpandLess /> : <ExpandMore />}
      </Box>

      {expanded && (
        <Box sx={{ p: 2 }}>
          <Grid container spacing={3} alignItems="flex-start">
            {/* ── Left: Live Preview ── */}
            <Grid item xs={12} sm={5}>
              <Box
                ref={previewRef}
                sx={{
                  position: 'relative',
                  borderRadius: 3,
                  overflow: 'hidden',
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  aspectRatio: '3/4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {hasImage ? (
                  <>
                    {/* Real product photo */}
                    <Box
                      component="img"
                      src={productImage}
                      alt={productName}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />

                    {/* Color wash layer */}
                    {selectedColor && selectedPattern !== 'embroidery' && (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          bgcolor: selectedColor.hex,
                          opacity: colorOpacity / 100,
                          mixBlendMode: 'multiply',
                        }}
                      />
                    )}

                    {/* SVG pattern overlay */}
                    {selectedPattern !== 'solid' && selectedPattern !== 'embroidery' && (
                      <svg
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                        viewBox="0 0 400 500"
                        preserveAspectRatio="xMidYMid slice"
                      >
                        {buildPatternDef(selectedPattern, '#ffffff', Math.round(colorOpacity * 0.5))}
                        <rect width="400" height="500" fill="url(#dp)" />
                      </svg>
                    )}

                    {/* Floral emoji overlay */}
                    {selectedPattern === 'floral' && (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gridTemplateRows: 'repeat(5, 1fr)',
                          gap: 0,
                          pointerEvents: 'none',
                          opacity: colorOpacity / 100,
                        }}
                      >
                        {Array.from({ length: 20 }).map((_, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, opacity: 0.6 }}>
                            🌸
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Embroidery border */}
                    {showEmbroidery && (
                      <EmbroideryBorder color={embroideryColor} width={400} height={500} />
                    )}
                  </>
                ) : (
                  /* Fallback SVG mannequin */
                  <Box sx={{ width: '100%', height: '100%', p: 1 }}>
                    <MannequinSVG
                      color={selectedColor.hex}
                      pattern={selectedPattern}
                      opacity={colorOpacity}
                      embroideryColor={embroideryColor}
                      showEmbroidery={showEmbroidery || selectedPattern === 'embroidery'}
                    />
                    {showEmbroidery && (
                      <EmbroideryBorder color={embroideryColor} width={300} height={520} />
                    )}
                  </Box>
                )}

                {/* Color badge */}
                <Chip
                  label={selectedColor.name}
                  size="small"
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: selectedColor.hex,
                    color: 'white',
                    fontWeight: 700,
                    boxShadow: 2,
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                  }}
                />
              </Box>

              {/* Download */}
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Download />}
                onClick={handleDownload}
                size="small"
                sx={{ mt: 1.5, borderRadius: 2, fontWeight: 600 }}
              >
                Save Preview
              </Button>
            </Grid>

            {/* ── Right: Controls ── */}
            <Grid item xs={12} sm={7}>

              {/* Color palette */}
              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Palette fontSize="small" sx={{ color: '#667eea' }} /> Fabric Colour
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                  {COLORS.map(c => (
                    <Tooltip key={c.hex} title={c.name} arrow>
                      <Box
                        onClick={() => setSelectedColor(c)}
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: c.hex,
                          cursor: 'pointer',
                          border: selectedColor.hex === c.hex ? '3px solid #667eea' : '2px solid #e0e0e0',
                          boxShadow: selectedColor.hex === c.hex ? '0 0 0 2px white, 0 0 0 4px #667eea' : 'none',
                          transition: 'all 0.15s',
                          '&:hover': { transform: 'scale(1.2)', boxShadow: 2 },
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </Box>

              {/* Colour opacity slider */}
              <Box mb={2}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Colour Intensity: {colorOpacity}%
                </Typography>
                <Slider
                  value={colorOpacity}
                  onChange={(_, v) => setColorOpacity(v)}
                  min={10}
                  max={90}
                  size="small"
                  sx={{ color: selectedColor.hex, '& .MuiSlider-thumb': { boxShadow: `0 0 0 4px ${selectedColor.hex}33` } }}
                />
              </Box>

              <Divider sx={{ my: 1.5 }} />

              {/* Pattern selection */}
              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AutoFixHigh fontSize="small" sx={{ color: '#764ba2' }} /> Pattern / Texture
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                  {PATTERNS.map(p => (
                    <Chip
                      key={p.id}
                      label={`${p.emoji} ${p.name}`}
                      onClick={() => {
                        setSelectedPattern(p.id);
                        if (p.id === 'embroidery') setShowEmbroidery(true);
                        else setShowEmbroidery(false);
                      }}
                      variant={selectedPattern === p.id ? 'filled' : 'outlined'}
                      color={selectedPattern === p.id ? 'primary' : 'default'}
                      size="small"
                      sx={{
                        fontWeight: selectedPattern === p.id ? 700 : 400,
                        cursor: 'pointer',
                        borderColor: selectedPattern === p.id ? '#667eea' : '#e0e0e0',
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Embroidery colour (shown when embroidery pattern or manually toggled) */}
              {(selectedPattern === 'embroidery' || showEmbroidery) && (
                <Box mb={2}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ColorLens fontSize="small" sx={{ color: '#e91e8c' }} /> Embroidery Thread
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {EMBROIDERY_COLORS.map(ec => (
                      <Tooltip key={ec} title={ec} arrow>
                        <Box
                          onClick={() => setEmbroideryColor(ec)}
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            bgcolor: ec,
                            cursor: 'pointer',
                            border: embroideryColor === ec ? '3px solid #333' : '2px solid #e0e0e0',
                            transition: 'all 0.15s',
                            '&:hover': { transform: 'scale(1.2)' },
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Add embroidery toggle */}
              {selectedPattern !== 'embroidery' && (
                <Box mb={2}>
                  <Chip
                    label={showEmbroidery ? '✿ Remove Embroidery' : '✿ Add Embroidery Trim'}
                    onClick={() => setShowEmbroidery(v => !v)}
                    variant={showEmbroidery ? 'filled' : 'outlined'}
                    color={showEmbroidery ? 'secondary' : 'default'}
                    size="small"
                    sx={{ cursor: 'pointer', fontWeight: 600 }}
                  />
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />

              {/* Summary */}
              <Paper
                sx={{
                  p: 1.5,
                  bgcolor: '#f8f9ff',
                  borderRadius: 2,
                  border: '1px solid #e8eaf6',
                  mb: 2,
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom fontWeight={600}>
                  Your Customization
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: selectedColor.hex, border: '1px solid #ddd', flexShrink: 0 }} />
                  <Typography variant="caption">{selectedColor.name} · {PATTERNS.find(p => p.id === selectedPattern)?.name}</Typography>
                </Box>
                {showEmbroidery && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: embroideryColor, border: '1px solid #ddd', flexShrink: 0 }} />
                    <Typography variant="caption">Embroidery trim in {embroideryColor}</Typography>
                  </Box>
                )}
              </Paper>

              {onAddToCart && (
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<ShoppingCart />}
                  onClick={() => onAddToCart(customizationNote)}
                  sx={{
                    borderRadius: 3,
                    fontWeight: 700,
                    background: 'linear-gradient(90deg,#667eea,#764ba2)',
                    py: 1.5,
                    '&:hover': { background: 'linear-gradient(90deg,#5a6fd6,#682ea8)' },
                  }}
                >
                  Add to Cart with These Options
                </Button>
              )}
            </Grid>
          </Grid>
        </Box>
      )}
    </Paper>
  );
};

export default DressCustomizer;
