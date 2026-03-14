import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Grid, Chip, IconButton,
  CircularProgress, Alert, Stack, Tab, Tabs, Tooltip
} from '@mui/material';
import {
  CameraAlt, Print, VolumeUp, ArrowBack,
  FlipCameraIos, Refresh, CheckCircle
} from '@mui/icons-material';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// ── Alphabet Data ─────────────────────────────────────────────────────────────
const ALPHABET = {
  A: { emoji: '🍎', word: 'Apple',    phrase: 'A for Apple',    color: '#e74c3c' },
  B: { emoji: '🎈', word: 'Balloon',  phrase: 'B for Balloon',  color: '#e91e63' },
  C: { emoji: '🐱', word: 'Cat',      phrase: 'C for Cat',      color: '#ff9800' },
  D: { emoji: '🐶', word: 'Dog',      phrase: 'D for Dog',      color: '#8bc34a' },
  E: { emoji: '🐘', word: 'Elephant', phrase: 'E for Elephant', color: '#607d8b' },
  F: { emoji: '🐟', word: 'Fish',     phrase: 'F for Fish',     color: '#03a9f4' },
  G: { emoji: '🍇', word: 'Grapes',   phrase: 'G for Grapes',   color: '#9c27b0' },
  H: { emoji: '🏠', word: 'House',    phrase: 'H for House',    color: '#795548' },
  I: { emoji: '🍦', word: 'Ice Cream',phrase: 'I for Ice Cream',color: '#e91e63' },
  J: { emoji: '🧃', word: 'Juice',    phrase: 'J for Juice',    color: '#ff9800' },
  K: { emoji: '🥝', word: 'Kiwi',     phrase: 'K for Kiwi',     color: '#4caf50' },
  L: { emoji: '🦁', word: 'Lion',     phrase: 'L for Lion',     color: '#ff5722' },
  M: { emoji: '🐵', word: 'Monkey',   phrase: 'M for Monkey',   color: '#795548' },
  N: { emoji: '🌙', word: 'Night',    phrase: 'N for Night',    color: '#3f51b5' },
  O: { emoji: '🐙', word: 'Octopus',  phrase: 'O for Octopus',  color: '#f44336' },
  P: { emoji: '🐧', word: 'Penguin',  phrase: 'P for Penguin',  color: '#2196f3' },
  Q: { emoji: '👑', word: 'Queen',    phrase: 'Q for Queen',    color: '#ffd700' },
  R: { emoji: '🌈', word: 'Rainbow',  phrase: 'R for Rainbow',  color: '#ff5722' },
  S: { emoji: '🌟', word: 'Star',     phrase: 'S for Star',     color: '#ff9800' },
  T: { emoji: '🐯', word: 'Tiger',    phrase: 'T for Tiger',    color: '#ff9800' },
  U: { emoji: '☂️', word: 'Umbrella', phrase: 'U for Umbrella', color: '#2196f3' },
  V: { emoji: '🌸', word: 'Violet',   phrase: 'V for Violet',   color: '#e91e63' },
  W: { emoji: '🐳', word: 'Whale',    phrase: 'W for Whale',    color: '#039be5' },
  X: { emoji: '🎵', word: 'Xylophone',phrase: 'X for Xylophone',color: '#9c27b0' },
  Y: { emoji: '🐑', word: 'Yak',      phrase: 'Y for Yak',      color: '#8bc34a' },
  Z: { emoji: '🦓', word: 'Zebra',    phrase: 'Z for Zebra',    color: '#607d8b' },
};

// ── Helper: draw rounded rect ─────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}

// ── Speak helper ──────────────────────────────────────────────────────────────
let lastSpoken = '';
function speak(text) {
  if (!window.speechSynthesis || text === lastSpoken) return;
  lastSpoken = text;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.85;
  utt.pitch = 1.1;
  utt.volume = 1;
  window.speechSynthesis.speak(utt);
  setTimeout(() => { lastSpoken = ''; }, 4000);
}

function unlockSpeech() {
  if (!window.speechSynthesis) return;
  const prime = new SpeechSynthesisUtterance('');
  prime.volume = 0;
  window.speechSynthesis.speak(prime);
  window.speechSynthesis.cancel();
}

// ── Main Component ────────────────────────────────────────────────────────────
const AlphabetARScanner = ({ onBack }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const detectorRef = useRef(null);
  const html5QrRef = useRef(null);
  const html5ContainerIdRef = useRef(`html5-qr-reader-${Math.random().toString(36).slice(2, 8)}`);
  const lastDetectedRef = useRef(null);
  const cooldownRef = useRef(false);

  const [tab, setTab] = useState(0); // 0=Scanner, 1=Print Cards
  const [cameraStarted, setCameraStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [detected, setDetected] = useState(null); // current letter data
  const [scannedLetters, setScannedLetters] = useState(new Set());
  const [supported, setSupported] = useState(null); // null=unknown, true/false for BarcodeDetector

  const onLetterDetected = useCallback((rawInput) => {
    const rawValue = String(rawInput || '').trim().toUpperCase();
    const raw = (rawValue.match(/[A-Z]/) || [])[0] || '';
    if (raw && ALPHABET[raw] && raw !== lastDetectedRef.current) {
      lastDetectedRef.current = raw;
      setDetected(ALPHABET[raw]);
      setScannedLetters(prev => new Set([...prev, raw]));
      speak(ALPHABET[raw].phrase);
    }
  }, []);

  // ── Check BarcodeDetector support ─────────────────────────────────────────
  useEffect(() => {
    setSupported('BarcodeDetector' in window);
  }, []);

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      unlockSpeech();

      if (!('BarcodeDetector' in window)) {
        const reader = new Html5Qrcode(html5ContainerIdRef.current, { verbose: false });
        html5QrRef.current = reader;
        await reader.start(
          { facingMode },
          {
            fps: 12,
            qrbox: { width: 320, height: 320 },
            aspectRatio: 1.333,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          },
          (decodedText) => {
            onLetterDetected(decodedText);
          },
          () => {}
        );
        setCameraStarted(true);
        setLoading(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      await new Promise(r => { videoRef.current.onloadedmetadata = r; });

      // Init BarcodeDetector
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });

      setCameraStarted(true);
      setLoading(false);
      startRenderLoop();
    } catch (err) {
      setError(err.message || 'Camera failed');
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, onLetterDetected]);

  // ── Stop camera ──────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (html5QrRef.current) {
      const reader = html5QrRef.current;
      try {
        const stopResult = reader.stop();
        Promise.resolve(stopResult).catch(() => {}).finally(() => {
          try {
            const clearResult = reader.clear();
            Promise.resolve(clearResult).catch(() => {});
          } catch (_) {
            // ignore clear errors when scanner is already disposed
          }
          if (html5QrRef.current === reader) {
            html5QrRef.current = null;
          }
        });
      } catch (_) {
        try {
          const clearResult = reader.clear();
          Promise.resolve(clearResult).catch(() => {});
        } catch (__){
          // ignore stop/clear errors when scanner is not running
        }
        if (html5QrRef.current === reader) {
          html5QrRef.current = null;
        }
      }
    }
    setCameraStarted(false);
    setDetected(null);
    lastDetectedRef.current = null;
  }, []);

  // ── Auto-restart camera when facing mode changes (after flip) ──────────────
  const flipRequestedRef = useRef(false);
  useEffect(() => {
    if (!cameraStarted && !loading && flipRequestedRef.current) {
      flipRequestedRef.current = false;
      startCamera();
    }
  }, [cameraStarted, loading, startCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Render loop ──────────────────────────────────────────────────────────
  const startRenderLoop = () => {
    const loop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) { animFrameRef.current = requestAnimationFrame(loop); return; }

      const ctx = canvas.getContext('2d');
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Scanning guide box
      const gw = canvas.width * 0.55, gh = canvas.width * 0.55;
      const gx = (canvas.width - gw) / 2, gy = (canvas.height - gh) / 2;
      ctx.strokeStyle = lastDetectedRef.current ? '#4caf50' : 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3;
      ctx.strokeRect(gx, gy, gw, gh);
      // Corner decorations
      const cs = 24;
      ctx.lineWidth = 5;
      ctx.strokeStyle = lastDetectedRef.current ? '#4caf50' : '#2196f3';
      [[gx,gy],[gx+gw-cs,gy],[gx,gy+gh-cs],[gx+gw-cs,gy+gh-cs]].forEach(([px,py],i) => {
        ctx.beginPath();
        ctx.moveTo(px + (i%2===0?0:cs), py); ctx.lineTo(px + (i%2===0?cs:0), py);
        ctx.moveTo(px, py + (i<2?cs:0)); ctx.lineTo(px, py + (i<2?0:cs));
        ctx.stroke();
      });

      // Hint text
      if (!lastDetectedRef.current) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        roundRect(ctx, canvas.width/2 - 170, canvas.height - 58, 340, 42, 10, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📷 Point at letter card (A-Z)', canvas.width/2, canvas.height - 30);
      }

      // Overlay if letter detected
      const cur = lastDetectedRef.current;
      if (cur) {
        const info = ALPHABET[cur];
        if (info) drawLetterOverlay(ctx, canvas, cur, info);
      }

      // Scan for QR code (every ~15 frames to save CPU)
      if (!cooldownRef.current && detectorRef.current) {
        cooldownRef.current = true;
        setTimeout(() => { cooldownRef.current = false; }, 300);
        try {
          const barcodes = await detectorRef.current.detect(video);
          if (barcodes.length > 0) {
            const rawValue = String(barcodes[0].rawValue || '').trim().toUpperCase();
            const raw = (rawValue.match(/[A-Z]/) || [])[0] || '';
            if (raw && ALPHABET[raw]) {
              if (raw !== lastDetectedRef.current) {
                lastDetectedRef.current = raw;
                setDetected(ALPHABET[raw]);
                setScannedLetters(prev => new Set([...prev, raw]));
                speak(ALPHABET[raw].phrase);
              }
            }
          } else {
            if (lastDetectedRef.current) {
              lastDetectedRef.current = null;
            }
          }
        } catch (_) { /* silent */ }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  };

  // ── Draw letter overlay on canvas ─────────────────────────────────────────
  const drawLetterOverlay = (ctx, canvas, letter, info) => {
    const cw = canvas.width, ch = canvas.height;

    // Background card
    roundRect(ctx, cw * 0.1, ch * 0.05, cw * 0.8, ch * 0.42, 20, null);
    ctx.fillStyle = info.color + 'dd';
    ctx.fill();

    // 3D-style object pop effect
    const emojiSize = Math.min(cw, ch) * 0.22;
    ctx.font = `${emojiSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let depth = 6; depth >= 1; depth -= 1) {
      ctx.fillStyle = `rgba(0,0,0,${0.04 * depth})`;
      ctx.fillText(info.emoji, (cw * 0.3) + depth, (ch * 0.26) + depth);
    }
    ctx.fillStyle = 'white';
    ctx.fillText(info.emoji, cw * 0.3, ch * 0.26);

    ctx.font = `bold ${Math.min(cw, ch) * 0.045}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(`3D ${info.word}`, cw * 0.3, ch * 0.38);

    // Big letter
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.min(cw, ch) * 0.28}px sans-serif`;
    ctx.fillText(letter, cw * 0.7, ch * 0.22);

    // Word
    ctx.font = `bold ${Math.min(cw, ch) * 0.07}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(info.word, cw * 0.7, ch * 0.38);

    // Phrase banner at bottom
    roundRect(ctx, 0, ch * 0.87, cw, ch * 0.13, 0, null);
    ctx.fillStyle = info.color + 'ee';
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.min(cw, ch) * 0.06}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(info.phrase, cw / 2, ch * 0.945);
  };

  // ── Speak current letter ──────────────────────────────────────────────────
  const handleSpeak = () => {
    if (detected) { lastSpoken = ''; speak(detected.phrase); }
  };

  // ── Printable card grid ───────────────────────────────────────────────────
  const handlePrint = () => window.print();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, background: 'linear-gradient(90deg,#667eea,#764ba2)', color: 'white' }}>
        {onBack && <IconButton onClick={onBack} sx={{ color: 'white' }}><ArrowBack /></IconButton>}
        <Box flex={1}>
          <Typography variant="h6" fontWeight="bold">🔤 AR Alphabet Scanner</Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>Print cards → scan with camera → learn letters!</Typography>
        </Box>
        <Chip label={`${scannedLetters.size}/26 Scanned`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }} />
      </Paper>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => { setTab(v); if (v === 0 && cameraStarted) {} }} sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
        <Tab label="📷 Scanner" />
        <Tab label="🖨️ Print Flashcards" />
        <Tab label="✅ Progress" />
      </Tabs>

      {/* ── SCANNER TAB ─────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
          {/* Browser mode notice */}
          {supported === false && (
            <Alert severity="info" sx={{ mb: 2, maxWidth: 500 }}>
              BarcodeDetector is unavailable in this browser. Fallback scanner mode is enabled for mobile support.
            </Alert>
          )}

          {!cameraStarted && !loading && (
            <Box textAlign="center" maxWidth={420}>
              <Typography variant="h2" mb={2}>📷</Typography>
              <Typography variant="h6" fontWeight="bold" mb={1}>Start the AR Scanner</Typography>
              <Typography color="text.secondary" mb={3}>
                Print letter cards from the "Print Flashcards" tab, then hold a card like A in front of the camera. A 3D-style object and voice prompt will appear automatically.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<CameraAlt />}
                onClick={startCamera}
                sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' }, px: 4, py: 1.5 }}
              >
                Start Camera
              </Button>
            </Box>
          )}

          {loading && <Box textAlign="center"><CircularProgress size={60} /><Typography mt={2} color="text.secondary">Starting camera...</Typography></Box>}

          {error && (
            <Alert severity="error" sx={{ mb: 2, maxWidth: 400 }}
              action={<Button onClick={startCamera} size="small" startIcon={<Refresh />}>Retry</Button>}
            >{error}</Alert>
          )}

          {/* Camera View */}
          {'BarcodeDetector' in window ? (
            <Box sx={{
              position: 'relative', width: '100%', maxWidth: 600, maxHeight: 480,
              bgcolor: 'black', borderRadius: 2, overflow: 'hidden',
              display: cameraStarted ? 'block' : 'none'
            }}>
              <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

              {/* Controls */}
              <Stack direction="row" spacing={1.5} sx={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)' }}>
                <Tooltip title="Flip Camera">
                  <IconButton onClick={() => { flipRequestedRef.current = true; stopCamera(); setFacingMode(p => p === 'user' ? 'environment' : 'user'); }} sx={{ bgcolor: 'rgba(255,255,255,0.85)' }}>
                    <FlipCameraIos />
                  </IconButton>
                </Tooltip>
                {detected && (
                  <Tooltip title="Speak Again">
                    <IconButton onClick={handleSpeak} sx={{ bgcolor: '#4caf50', color: 'white', '&:hover': { bgcolor: '#388e3c' } }}>
                      <VolumeUp />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Stop Camera">
                  <IconButton onClick={stopCamera} sx={{ bgcolor: 'rgba(255,255,255,0.85)' }}>
                    <ArrowBack />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          ) : (
            <Box sx={{ width: '100%', maxWidth: 600 }}>
              {/* Container always in DOM so Html5Qrcode can render into it immediately */}
              <Box
                id={html5ContainerIdRef.current}
                sx={{
                  width: '100%',
                  borderRadius: 2,
                  overflow: 'hidden',
                  '& video': { width: '100%' },
                }}
              />
              {cameraStarted && (
                <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center', mt: 1.5 }}>
                  <Tooltip title="Flip Camera">
                    <IconButton onClick={() => { flipRequestedRef.current = true; stopCamera(); setFacingMode(p => p === 'user' ? 'environment' : 'user'); }} sx={{ bgcolor: 'rgba(255,255,255,0.85)' }}>
                      <FlipCameraIos />
                    </IconButton>
                  </Tooltip>
                  {detected && (
                    <Tooltip title="Speak Again">
                      <IconButton onClick={handleSpeak} sx={{ bgcolor: '#4caf50', color: 'white', '&:hover': { bgcolor: '#388e3c' } }}>
                        <VolumeUp />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Stop Camera">
                    <IconButton onClick={stopCamera} sx={{ bgcolor: 'rgba(255,255,255,0.85)' }}>
                      <ArrowBack />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}

              {cameraStarted && detected && (
                <Paper sx={{ mt: 1.5, p: 1.5, borderRadius: 2, border: '1px solid #e5e7eb', bgcolor: '#ffffff' }}>
                  <Typography variant="body2" fontWeight={700} sx={{ color: detected.color }}>
                    {detected.phrase}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Scanned: {detected.word}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}

          {cameraStarted && (
            <Paper sx={{ mt: 2, p: 1.5, maxWidth: 700, width: '100%', border: '1px dashed #cbd5e1' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Scan not detecting? Tap the letter card manually
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(ALPHABET).map(([letter, info]) => (
                  <Grid item xs={2} sm={1} key={`manual-${letter}`}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onLetterDetected(letter)}
                      sx={{
                        minWidth: 0,
                        width: '100%',
                        borderColor: info.color,
                        color: info.color,
                        fontWeight: 700,
                        '&:hover': { borderColor: info.color, backgroundColor: `${info.color}11` }
                      }}
                    >
                      {letter}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Restart camera when facingMode changes */}
          {!cameraStarted && !loading && error === '' && facingMode !== 'environment' && (
            <Button size="small" onClick={startCamera} sx={{ mt: 1 }}>Restart Camera</Button>
          )}

          {/* Instructions */}
          {
            <Paper sx={{ mt: 2, p: 2, maxWidth: 500, width: '100%' }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>📌 How to use:</Typography>
              <Typography variant="body2" color="text.secondary">
                1. Print the flashcards (next tab)<br />
                2. Click "Start Camera" above<br />
                3. Show one letter card (for example A) to the camera<br />
                4. Keep the QR square centered and close to camera for 1-2 seconds<br />
                5. If scan fails on screen-glare, use manual letter tap buttons
              </Typography>
            </Paper>
          }
        </Box>
      )}

      {/* ── PRINT FLASHCARDS TAB ───────────────────────────────────── */}
      {tab === 1 && (
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">🖨️ Printable Flashcards</Typography>
              <Typography variant="body2" color="text.secondary">Print these cards then scan with the camera</Typography>
            </Box>
            <Button variant="contained" startIcon={<Print />} onClick={handlePrint} sx={{ bgcolor: '#667eea' }}>
              Print All Cards
            </Button>
          </Box>

          {/* Print styles injected inline */}
          <style>{`
            @media print {
              .no-print { display: none !important; }
              .print-grid { display: grid !important; grid-template-columns: repeat(4, 1fr); gap: 8px; }
              .flash-card { break-inside: avoid; page-break-inside: avoid; border: 2px solid #ddd !important; padding: 12px !important; }
            }
          `}</style>

          <Grid container spacing={2} className="print-grid">
            {Object.entries(ALPHABET).map(([letter, info]) => (
              <Grid item xs={6} sm={4} md={3} key={letter}>
                <Paper
                  className="flash-card"
                  elevation={2}
                  sx={{
                    p: 2, textAlign: 'center',
                    border: `3px solid ${info.color}`,
                    borderRadius: 3,
                    bgcolor: scannedLetters.has(letter) ? info.color + '15' : 'white',
                    position: 'relative',
                    transition: 'all 0.2s',
                    '&:hover': { transform: 'scale(1.03)', boxShadow: 4 }
                  }}
                >
                  {scannedLetters.has(letter) && (
                    <CheckCircle sx={{ position: 'absolute', top: 8, right: 8, color: '#4caf50', fontSize: 20 }} />
                  )}
                  <Typography variant="h2" fontWeight="black" sx={{ color: info.color, lineHeight: 1 }}>{letter}</Typography>
                  <Typography variant="h3" my={0.5}>{info.emoji}</Typography>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>{info.word}</Typography>
                  {/* QR code from external service */}
                  <Box
                    component="img"
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(letter)}&size=180x180&margin=10&color=000000&bgcolor=FFFFFF&ecc=H`}
                    alt={`QR ${letter}`}
                    sx={{ width: 110, height: 110, mt: 0.5, border: `2px solid ${info.color}`, borderRadius: 1 }}
                    onError={e => { e.target.src = `https://api.qrserver.com/v1/create-qr-code/?data=${letter}&size=180x180&color=000000`; }}
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.65rem' }}>
                    High-contrast QR
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── PROGRESS TAB ─────────────────────────────────────────────── */}
      {tab === 2 && (
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            ✅ Scanned Letters ({scannedLetters.size}/26)
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ height: 12, bgcolor: '#e0e0e0', borderRadius: 6, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${(scannedLetters.size / 26) * 100}%`, bgcolor: '#4caf50', transition: 'width 0.5s', borderRadius: 6 }} />
            </Box>
            <Typography variant="caption" color="text.secondary">{Math.round((scannedLetters.size / 26) * 100)}% complete</Typography>
          </Box>
          <Grid container spacing={1.5}>
            {Object.entries(ALPHABET).map(([letter, info]) => {
              const done = scannedLetters.has(letter);
              return (
                <Grid item xs={4} sm={3} md={2} key={letter}>
                  <Paper sx={{
                    p: 1.5, textAlign: 'center',
                    bgcolor: done ? info.color : '#f5f5f5',
                    border: `2px solid ${done ? info.color : '#e0e0e0'}`,
                    borderRadius: 2, opacity: done ? 1 : 0.5
                  }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: done ? 'white' : '#bbb' }}>{letter}</Typography>
                    {done && <Typography variant="h6">{info.emoji}</Typography>}
                    {done && <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>{info.word}</Typography>}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
          {scannedLetters.size > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              sx={{ mt: 3 }}
              onClick={() => setScannedLetters(new Set())}
            >
              Reset Progress
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AlphabetARScanner;
