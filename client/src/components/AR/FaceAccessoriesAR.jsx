import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, IconButton, Button, Paper,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, Stack, Tooltip, Tabs, Tab, Chip,
} from "@mui/material";
import {
  Close, CameraAlt, FlipCameraIos, ShoppingCart,
  Refresh, Download, ArrowBack,
} from "@mui/icons-material";

const ACCESSORIES = [
  { id: "sunglasses",   name: "Sunglasses",    category: "glasses",  emoji: "🕶️",  type: "glasses" },
  { id: "heartglasses", name: "Heart Glasses", category: "glasses",  emoji: "🩷",  type: "heartglasses" },
  { id: "nerdglasses",  name: "Nerd Glasses",  category: "glasses",  emoji: "🤓",  type: "glasses" },
  { id: "starglasses",  name: "Star Glasses",  category: "glasses",  emoji: "⭐",  type: "starglasses" },
  { id: "crown",        name: "Crown",         category: "crowns",   emoji: "👑",  type: "crown" },
  { id: "floral",       name: "Flower Crown",  category: "crowns",   emoji: "🌸",  type: "flowercrown" },
  { id: "rainbow",      name: "Rainbow",       category: "crowns",   emoji: "🌈",  type: "crown" },
  { id: "tiara",        name: "Tiara",         category: "crowns",   emoji: "✨",  type: "tiara" },
  { id: "catears",      name: "Cat Ears",      category: "ears",     emoji: "🐱",  type: "ears" },
  { id: "bunnyears",    name: "Bunny Ears",    category: "ears",     emoji: "🐰",  type: "ears" },
  { id: "bearears",     name: "Bear Ears",     category: "ears",     emoji: "🐻",  type: "ears" },
  { id: "unicorn",      name: "Unicorn Horn",  category: "ears",     emoji: "🦄",  type: "unicornhorn" },
  { id: "tophat",       name: "Top Hat",       category: "hats",     emoji: "🎩",  type: "hat" },
  { id: "partyhat",     name: "Party Hat",     category: "hats",     emoji: "🎉",  type: "hat" },
  { id: "cowboy",       name: "Cowboy Hat",    category: "hats",     emoji: "🤠",  type: "hat" },
  { id: "santa",        name: "Santa Hat",     category: "hats",     emoji: "🎅",  type: "hat" },
  { id: "diamond",      name: "Diamonds",      category: "earrings", emoji: "💎",  type: "earring" },
  { id: "starrings",    name: "Star Drops",    category: "earrings", emoji: "⭐",  type: "earring" },
  { id: "heartring",    name: "Heart Drops",   category: "earrings", emoji: "❤️",  type: "earring" },
  { id: "flowerring",   name: "Flowers",       category: "earrings", emoji: "🌺",  type: "earring" },
  { id: "butterfly",    name: "Butterfly",     category: "face",     emoji: "🦋",  type: "facecenter" },
  { id: "clown",        name: "Clown Nose",    category: "face",     emoji: "🤡",  type: "nose" },
  { id: "sparkles",     name: "Sparkles",      category: "face",     emoji: "✨",  type: "fullface" },
  { id: "blush",        name: "Heart Blush",   category: "face",     emoji: "💕",  type: "blush" },
];

const CATEGORIES = ["All", "glasses", "crowns", "ears", "hats", "earrings", "face"];
const CATEGORY_LABELS = {
  All: "🎭 All", glasses: "👓 Glasses", crowns: "👑 Crowns",
  ears: "🐾 Ears", hats: "🎩 Hats", earrings: "💎 Earrings", face: "😊 Face",
};

function drawAccessoryEmoji(ctx, canvas, face, accessory) {
  const { x, y, width, height } = face;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  switch (accessory.type) {
    case "glasses":
      ctx.font = `${width * 0.7}px serif`;
      ctx.fillText(accessory.emoji, x + width / 2, y + height * 0.38);
      break;
    case "heartglasses":
      ctx.font = `${width * 0.32}px serif`;
      ctx.fillText("🩷", x + width * 0.3, y + height * 0.38);
      ctx.fillText("🩷", x + width * 0.7, y + height * 0.38);
      break;
    case "starglasses":
      ctx.font = `${width * 0.32}px serif`;
      ctx.fillText("⭐", x + width * 0.28, y + height * 0.37);
      ctx.fillText("⭐", x + width * 0.72, y + height * 0.37);
      ctx.strokeStyle = "gold"; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + width * 0.44, y + height * 0.37);
      ctx.lineTo(x + width * 0.56, y + height * 0.37);
      ctx.stroke();
      break;
    case "hat":
      ctx.font = `${width * 0.75}px serif`;
      ctx.fillText(accessory.emoji, x + width / 2, y - height * 0.12);
      break;
    case "crown":
      ctx.font = `${width * 0.7}px serif`;
      ctx.fillText(accessory.emoji, x + width / 2, y - height * 0.08);
      break;
    case "tiara":
      ctx.font = `${width * 0.22}px serif`;
      ctx.fillText("💍", x + width * 0.18, y - height * 0.05);
      ctx.font = `${width * 0.32}px serif`;
      ctx.fillText("✨", x + width * 0.5, y - height * 0.12);
      ctx.font = `${width * 0.22}px serif`;
      ctx.fillText("💍", x + width * 0.82, y - height * 0.05);
      break;
    case "flowercrown": {
      const fl = ["🌸","🌼","🌺","🌸","🌼"];
      const sp = width / (fl.length + 1);
      ctx.font = `${width * 0.22}px serif`;
      fl.forEach((f, i) => ctx.fillText(f, x + sp * (i + 1), y - height * 0.06));
      break;
    }
    case "ears":
      ctx.font = `${width * 0.38}px serif`;
      ctx.fillText(accessory.emoji, x - width * 0.05, y - height * 0.05);
      ctx.fillText(accessory.emoji, x + width + width * 0.05, y - height * 0.05);
      break;
    case "unicornhorn":
      ctx.font = `${width * 0.55}px serif`;
      ctx.fillText("🦄", x + width / 2, y - height * 0.1);
      break;
    case "earring":
      ctx.font = `${width * 0.22}px serif`;
      ctx.fillText(accessory.emoji, x - width * 0.1, y + height * 0.52);
      ctx.fillText(accessory.emoji, x + width + width * 0.1, y + height * 0.52);
      break;
    case "nose":
      ctx.font = `${width * 0.18}px serif`;
      ctx.fillText("🔴", x + width / 2, y + height * 0.6);
      break;
    case "facecenter":
      ctx.font = `${width * 0.32}px serif`;
      ctx.fillText(accessory.emoji, x + width / 2, y + height * 0.38);
      break;
    case "blush":
      ctx.font = `${width * 0.22}px serif`;
      ctx.fillText("🌸", x + width * 0.15, y + height * 0.55);
      ctx.fillText("🌸", x + width * 0.85, y + height * 0.55);
      break;
    case "fullface": {
      const sp2 = [[0.1,0.15],[0.9,0.15],[0.05,0.5],[0.95,0.5],[0.15,0.85],[0.85,0.85],[0.5,0.0],[0.5,1.0]];
      ctx.font = `${width * 0.12}px serif`;
      sp2.forEach(([rx,ry]) => ctx.fillText("✨", x + rx * width, y + ry * height));
      break;
    }
    default:
      ctx.font = `${width * 0.6}px serif`;
      ctx.fillText(accessory.emoji, x + width / 2, y + height / 2);
  }
  ctx.restore();
}

function estimatedFace(canvas) {
  const cw = canvas.width, ch = canvas.height;
  const size = Math.min(cw, ch) * 0.5;
  return { x: (cw - size) / 2, y: ch * 0.12, width: size, height: size * 1.2 };
}

const FaceAccessoriesAR = ({ product, onClose, onAddToCart }) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const detectorRef = useRef(null);
  const selectedRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAccessory, setSelectedAccessory] = useState(null);
  const [facingMode, setFacingMode] = useState("user");
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCapture, setShowCapture] = useState(false);
  const [categoryTab, setCategoryTab] = useState(0);

  const selectAccessory = (acc) => {
    setSelectedAccessory(acc);
    selectedRef.current = acc;
  };

  const currentCategory = CATEGORIES[categoryTab];
  const filteredAccessories = currentCategory === "All"
    ? ACCESSORIES
    : ACCESSORIES.filter(a => a.category === currentCategory);

  const startCamera = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      await new Promise(r => { videoRef.current.onloadedmetadata = r; });
      if ("FaceDetector" in window) {
        try { detectorRef.current = new window.FaceDetector({ maxDetectedFaces: 1, fastMode: true }); }
        catch (_) { detectorRef.current = null; }
      }
      setLoading(false);
      startRenderLoop();
    } catch (err) {
      setError(err.message || "Camera access failed.");
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => { startCamera(); return () => stopCamera(); }, [startCamera, stopCamera]);

  const startRenderLoop = () => {
    let lastFaceBounds = null;
    let frameCount = 0;
    const loop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) { animRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext("2d");
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }
      if (facingMode === "user") {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const acc = selectedRef.current;
      if (acc) {
        frameCount++;
        let faceBounds = lastFaceBounds;
        if (frameCount % 10 === 0 || !lastFaceBounds) {
          if (detectorRef.current) {
            try {
              const faces = await detectorRef.current.detect(video);
              if (faces.length > 0) {
                const f = faces[0].boundingBox;
                const bx = facingMode === "user" ? canvas.width - f.x - f.width : f.x;
                faceBounds = { x: bx, y: f.y, width: f.width, height: f.height };
                lastFaceBounds = faceBounds;
              }
            } catch (_) {
              faceBounds = estimatedFace(canvas);
              lastFaceBounds = faceBounds;
            }
          } else {
            faceBounds = estimatedFace(canvas);
            lastFaceBounds = faceBounds;
          }
        }
        if (faceBounds) drawAccessoryEmoji(ctx, canvas, faceBounds, acc);
      }
      if (!acc) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
        ctx.fillStyle = "white";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("👆 Select an accessory below!", canvas.width / 2, canvas.height - 20);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  };

  const handleCapture = () => {
    if (!canvasRef.current) return;
    setCapturedImage(canvasRef.current.toDataURL("image/png"));
    setShowCapture(true);
  };

  const handleFlip = () => { stopCamera(); setFacingMode(p => (p === "user" ? "environment" : "user")); };

  const handleDownload = () => {
    if (!capturedImage) return;
    const a = document.createElement("a");
    a.href = capturedImage;
    a.download = `tinytots-look-${Date.now()}.png`;
    a.click();
  };

  const handleShopClick = () => {
    setShowCapture(false);
    if (onClose) onClose();
    navigate("/shop?category=accessories");
  };

  const handleAddToCart = () => {
    if (onAddToCart && product) onAddToCart(product);
    setShowCapture(false);
    if (onClose) onClose();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#0a0a0a" }}>
      <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1, bgcolor: "rgba(255,255,255,0.07)" }}>
        <Tooltip title="Go Back">
          <IconButton onClick={onClose} sx={{ color: "white", mr: 1 }}><ArrowBack /></IconButton>
        </Tooltip>
        <Typography variant="h6" sx={{ color: "white", flex: 1, fontWeight: 700 }}>
          👒 Try On Accessories
        </Typography>
        {selectedAccessory && (
          <Chip
            label={`${selectedAccessory.emoji} ${selectedAccessory.name}`}
            sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "white", fontWeight: 600, mr: 1 }}
          />
        )}
        <Tooltip title="Capture Photo">
          <IconButton onClick={handleCapture} sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", mx: 0.5 }}>
            <CameraAlt />
          </IconButton>
        </Tooltip>
        <Tooltip title="Flip Camera">
          <IconButton onClick={handleFlip} sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", mx: 0.5 }}>
            <FlipCameraIos />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ position: "relative", flex: 1, bgcolor: "black", minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {loading && (
          <Box sx={{ position: "absolute", zIndex: 10, textAlign: "center", color: "white" }}>
            <CircularProgress sx={{ color: "white" }} />
            <Typography mt={1}>Starting camera…</Typography>
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ position: "absolute", zIndex: 10, m: 2 }}
            action={<Button size="small" startIcon={<Refresh />} onClick={startCamera}>Retry</Button>}
          >
            {error}
          </Alert>
        )}
        <video ref={videoRef} style={{ display: "none" }} playsInline muted />
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      </Box>

      <Paper elevation={8} sx={{ bgcolor: "#111", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <Tabs
          value={categoryTab}
          onChange={(_, v) => setCategoryTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 38,
            "& .MuiTab-root": { color: "rgba(255,255,255,0.6)", minHeight: 38, fontSize: "0.7rem", px: 1 },
            "& .Mui-selected": { color: "white" },
            "& .MuiTabs-indicator": { bgcolor: "#764ba2" },
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {CATEGORIES.map((c) => <Tab key={c} label={CATEGORY_LABELS[c]} />)}
        </Tabs>

        <Box sx={{ overflowX: "auto", display: "flex", gap: 1, p: 1.5 }}>
          {filteredAccessories.map((acc) => {
            const sel = selectedAccessory?.id === acc.id;
            return (
              <Box
                key={acc.id}
                onClick={() => selectAccessory(sel ? null : acc)}
                sx={{
                  minWidth: 64, maxWidth: 64, cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  p: 1, borderRadius: 2,
                  border: sel ? "2px solid #a855f7" : "2px solid transparent",
                  bgcolor: sel ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.05)",
                  transition: "all 0.15s",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.12)", transform: "scale(1.07)" },
                }}
              >
                <Typography sx={{ fontSize: 28, lineHeight: 1 }}>{acc.emoji}</Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.6rem", mt: 0.3, textAlign: "center", lineHeight: 1.2 }}>
                  {acc.name}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Stack direction="row" spacing={1} sx={{ px: 2, pb: 1.5 }}>
          <Button fullWidth variant="contained" startIcon={<CameraAlt />} onClick={handleCapture}
            sx={{ bgcolor: "#764ba2", "&:hover": { bgcolor: "#5c3d82" }, textTransform: "none", fontWeight: 700 }}>
            Capture Look
          </Button>
          <Button fullWidth variant="outlined" startIcon={<ShoppingCart />} onClick={handleShopClick}
            sx={{ borderColor: "rgba(255,255,255,0.3)", color: "white", textTransform: "none", fontWeight: 700,
              "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.08)" } }}>
            Shop Accessories
          </Button>
        </Stack>
      </Paper>

      <Dialog open={showCapture} onClose={() => setShowCapture(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 700 }}>
          📸 Your Look!
          <IconButton onClick={() => setShowCapture(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {capturedImage && <Box component="img" src={capturedImage} alt="Captured" sx={{ width: "100%", display: "block" }} />}
          {selectedAccessory && (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h5">{selectedAccessory.emoji}</Typography>
              <Typography fontWeight="bold">{selectedAccessory.name}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
          <Button onClick={handleDownload} variant="outlined" startIcon={<Download />} sx={{ minWidth: 140 }}>Download</Button>
          <Button onClick={handleShopClick} variant="contained" startIcon={<ShoppingCart />}
            sx={{ bgcolor: "#764ba2", "&:hover": { bgcolor: "#5c3d82" }, minWidth: 180, fontWeight: 700 }}>
            🛍️ Shop Accessories
          </Button>
          {product && onAddToCart && (
            <Button onClick={handleAddToCart} variant="contained" color="success" startIcon={<ShoppingCart />} sx={{ minWidth: 160, fontWeight: 700 }}>
              Add to Cart
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FaceAccessoriesAR;
