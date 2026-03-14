import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowBack, CameraAlt, FlipCameraIos, Print, VolumeUp } from '@mui/icons-material';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Image3DViewer from '../Image3DViewer';

const FOODS = {
  CARROT: { word: 'Carrot', emoji: '🥕', healthy: true, color: '#43a047' },
  APPLE: { word: 'Apple', emoji: '🍎', healthy: true, color: '#e53935' },
  BROCCOLI: { word: 'Broccoli', emoji: '🥦', healthy: true, color: '#2e7d32' },
  BANANA: { word: 'Banana', emoji: '🍌', healthy: true, color: '#fbc02d' },
  MILK: { word: 'Milk', emoji: '🥛', healthy: true, color: '#1976d2' },
  BURGER: { word: 'Burger', emoji: '🍔', healthy: false, color: '#8d6e63' },
  PIZZA: { word: 'Pizza', emoji: '🍕', healthy: false, color: '#ff7043' },
  CHIPS: { word: 'Chips', emoji: '🍟', healthy: false, color: '#ef6c00' },
  SODA: { word: 'Soda', emoji: '🥤', healthy: false, color: '#6d4c41' },
  DONUT: { word: 'Donut', emoji: '🍩', healthy: false, color: '#ab47bc' },
};

function resolveFoodKey(rawInput) {
  const raw = String(rawInput || '').trim().toUpperCase();
  if (!raw) return '';

  const normalized = raw.replace(/[^A-Z]/g, '');
  if (FOODS[raw]) return raw;
  if (FOODS[normalized]) return normalized;

  const lowered = raw.toLowerCase();
  const byWord = Object.keys(FOODS).find((k) => lowered.includes(FOODS[k].word.toLowerCase()));
  if (byWord) return byWord;

  const byKey = Object.keys(FOODS).find((k) => lowered.includes(k.toLowerCase()));
  return byKey || '';
}

let lastSpoken = '';
function speak(text) {
  if (!window.speechSynthesis || text === lastSpoken) return;
  lastSpoken = text;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.92;
  utt.pitch = 1.08;
  utt.volume = 1;
  window.speechSynthesis.speak(utt);
  setTimeout(() => {
    lastSpoken = '';
  }, 3000);
}

function unlockSpeech() {
  if (!window.speechSynthesis) return;
  const prime = new SpeechSynthesisUtterance('');
  prime.volume = 0;
  window.speechSynthesis.speak(prime);
  window.speechSynthesis.cancel();
}

function buildFood3DImage(foodKey, info) {
  const key = String(foodKey || '').toUpperCase();
  const safeWord = String(info?.word || 'Food');
  const safeEmoji = String(info?.emoji || '🍽️');
  const color = String(info?.color || '#43a047');
  const badge = info?.healthy ? 'HEALTHY' : 'UNHEALTHY';
  const badgeColor = info?.healthy ? '#2e7d32' : '#c62828';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fbff"/>
        <stop offset="100%" stop-color="#e3f2fd"/>
      </linearGradient>
      <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.96"/>
        <stop offset="100%" stop-color="#1f2937" stop-opacity="0.94"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000" flood-opacity="0.25"/>
      </filter>
    </defs>
    <rect width="900" height="900" fill="url(#bg)"/>
    <rect x="90" y="90" width="720" height="720" rx="56" fill="url(#card)" filter="url(#shadow)"/>
    <text x="450" y="295" font-size="180" text-anchor="middle" font-family="Segoe UI Emoji, Arial">${safeEmoji}</text>
    <text x="450" y="520" font-size="190" text-anchor="middle" font-weight="900" font-family="Arial Black, Arial" fill="#fff">${safeWord.toUpperCase()}</text>
    <rect x="260" y="575" width="380" height="86" rx="30" fill="#ffffff" opacity="0.95"/>
    <text x="450" y="632" font-size="46" text-anchor="middle" font-family="Segoe UI, Arial" font-weight="700" fill="${badgeColor}">${badge}</text>
    <text x="450" y="730" font-size="52" text-anchor="middle" font-family="Segoe UI, Arial" fill="#e2e8f0">${info?.healthy ? `${safeWord} helps your body grow strong` : `${safeWord} should be eaten sometimes only`}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function qrImageUrl(text) {
  const data = encodeURIComponent(String(text || '').trim().toUpperCase());
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${data}`;
}

const HealthyFoodARScanner = ({ onBack }) => {
  const html5QrRef = useRef(null);
  const html5ContainerIdRef = useRef(`healthy-food-reader-${Math.random().toString(36).slice(2, 8)}`);

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [detectedKey, setDetectedKey] = useState('');
  const [detected, setDetected] = useState(null);

  const onFoodDetected = useCallback((rawInput) => {
    const key = resolveFoodKey(rawInput);
    if (!key) return;

    const item = FOODS[key];
    setDetectedKey(key);
    setDetected(item);
    speak(`${item.word}. ${item.healthy ? 'Healthy food.' : 'Unhealthy food. Eat occasionally.'}`);
  }, []);

  const stopCamera = useCallback(async () => {
    try {
      if (html5QrRef.current) {
        try {
          await html5QrRef.current.stop();
        } catch (_) {}
        try {
          await html5QrRef.current.clear();
        } catch (_) {}
        html5QrRef.current = null;
      }
    } finally {
      setCameraStarted(false);
      setLoading(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    setLoading(true);
    setError('');
    unlockSpeech();

    try {
      if (html5QrRef.current) {
        try {
          await html5QrRef.current.stop();
        } catch (_) {}
        try {
          await html5QrRef.current.clear();
        } catch (_) {}
        html5QrRef.current = null;
      }

      const reader = new Html5Qrcode(html5ContainerIdRef.current, { verbose: false });
      html5QrRef.current = reader;

      await reader.start(
        { facingMode },
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.333,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
        },
        (decodedText) => onFoodDetected(decodedText),
        () => {}
      );

      setCameraStarted(true);
    } catch (e) {
      setError('Camera start failed. Please allow camera permission or use manual tap buttons.');
      setCameraStarted(false);
    } finally {
      setLoading(false);
    }
  }, [facingMode, onFoodDetected]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handlePrint = () => {
    window.print();
  };

  const healthyCount = Object.values(FOODS).filter((f) => f.healthy).length;
  const unhealthyCount = Object.values(FOODS).length - healthyCount;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
      <Box sx={{ p: 2, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'white', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton onClick={onBack} sx={{ color: 'white' }}><ArrowBack /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight="bold">🥗 AR Healthy Food Game</Typography>
          <Typography variant="body2" sx={{ opacity: 0.95 }}>Scan food cards to learn Healthy vs Unhealthy foods</Typography>
        </Box>
        <Chip label={`Healthy ${healthyCount}`} sx={{ bgcolor: '#ffffff22', color: 'white', fontWeight: 700 }} />
        <Chip label={`Unhealthy ${unhealthyCount}`} sx={{ bgcolor: '#ffffff22', color: 'white', fontWeight: 700 }} />
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, bgcolor: '#fff' }}>
        <Tab label="Scanner" />
        <Tab label="Print Food Cards" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, overflowY: 'auto' }}>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<CameraAlt />} onClick={startCamera} disabled={loading || cameraStarted}>
              {loading ? 'Starting...' : (cameraStarted ? 'Camera Running' : 'Start Camera')}
            </Button>
            <Button variant="outlined" color="error" startIcon={<ArrowBack />} onClick={stopCamera} disabled={!cameraStarted}>
              Stop
            </Button>
            <Tooltip title="Flip Camera">
              <span>
                <IconButton onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))} disabled={cameraStarted}>
                  <FlipCameraIos />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          {error && <Alert severity="warning" sx={{ width: '100%', maxWidth: 720 }}>{error}</Alert>}

          <Box sx={{ width: '100%', maxWidth: 640, borderRadius: 2, overflow: 'hidden', bgcolor: '#000' }}>
            <Box
              id={html5ContainerIdRef.current}
              sx={{
                width: '100%',
                minHeight: 300,
                '& video': { width: '100%' },
              }}
            />
            {!cameraStarted && !loading && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#e2e8f0' }}>Start camera and show a food card code (QR/Barcode text like CARROT)</Typography>
              </Box>
            )}
          </Box>

          {detected && detectedKey && (
            <Paper sx={{ p: 2, width: '100%', maxWidth: 760 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                3D Food Preview: {detected.word}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {detected.healthy ? 'Great choice! This is a healthy food.' : 'This is an unhealthy food. Eat in small amounts.'}
              </Typography>
              <Image3DViewer
                imageUrl={buildFood3DImage(detectedKey, detected)}
                title={`${detected.word} ${detected.healthy ? '(Healthy)' : '(Unhealthy)'}`}
                height="360px"
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip color={detected.healthy ? 'success' : 'error'} label={detected.healthy ? 'Healthy Food' : 'Unhealthy Food'} />
                <Button size="small" startIcon={<VolumeUp />} onClick={() => speak(`${detected.word}. ${detected.healthy ? 'Healthy food.' : 'Unhealthy food.'}`)}>Speak</Button>
              </Stack>
            </Paper>
          )}

          <Paper sx={{ mt: 1, p: 1.5, maxWidth: 760, width: '100%', border: '1px dashed #cbd5e1' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Scan not working? Tap food card manually
            </Typography>
            <Grid container spacing={1}>
              {Object.entries(FOODS).map(([key, item]) => (
                <Grid item xs={6} sm={4} md={3} key={key}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => onFoodDetected(key)}
                    sx={{ borderColor: item.color, color: item.color, fontWeight: 700 }}
                  >
                    {item.emoji} {item.word}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ p: 2.5, overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>🖨️ Printable Food QR Cards</Typography>
            <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>Print Cards</Button>
          </Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Real QR codes are generated below automatically. Print these cards and scan them to see 3D food preview + healthy/unhealthy result.
          </Alert>
          <Grid container spacing={2}>
            {Object.entries(FOODS).map(([key, item]) => (
              <Grid item xs={6} sm={4} md={3} key={key}>
                <Paper sx={{ p: 2, textAlign: 'center', border: `2px solid ${item.color}`, borderRadius: 2 }}>
                  <Box
                    component="img"
                    src={qrImageUrl(key)}
                    alt={`${item.word} QR`}
                    sx={{ width: 120, height: 120, objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: 1, mb: 1 }}
                  />
                  <Typography variant="h3">{item.emoji}</Typography>
                  <Typography variant="h6" fontWeight={800}>{item.word}</Typography>
                  <Typography variant="caption" color="text.secondary">Scan code: {key}</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip size="small" color={item.healthy ? 'success' : 'error'} label={item.healthy ? 'Healthy' : 'Unhealthy'} />
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default HealthyFoodARScanner;
