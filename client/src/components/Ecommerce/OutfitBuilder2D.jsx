/**
 * OutfitBuilder2D.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Advanced print-on-demand dress/outfit customizer with detailed options.
 * Inspired by professional dress customization platforms.
 * Renders inline as a section on the ProductDetail page.
 *
 * Features
 * ─────────
 * • Multiple dress silhouettes: A-line, Empire, Sheath, Fit & Flare, etc.
 * • Neckline options: Round, V-neck, Scoop, Square, Sweetheart, etc.
 * • Sleeve styles: Sleeveless, Cap, Short, 3/4, Long, Puff, Bell, etc.
 * • Length options: Mini, Knee, Midi, Maxi
 * • Waist styles: Natural, High, Empire, Drop
 * • Canvas-based real-time preview
 * • 12 base-colour swatches
 * • 6 print/pattern options
 * • Custom text (baby name or message) with colour & font choice
 * • "Add Customised to Cart" attaches full `customization` payload
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Grid,
  Typography,
  Button,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  ShoppingCart,
  Palette,
  TextFields,
  AutoAwesome,
  Download,
  Checkroom,
  ExpandMore,
} from '@mui/icons-material';

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 300;
const CANVAS_H = 360;

// ─── Product Categories ───────────────────────────────────────────────────────
const CATEGORIES = {
  GIRLS: 'girls',
  BOYS: 'boys',
  TWINS: 'twins',
};

// ─── Garment Types ────────────────────────────────────────────────────────────
const GIRLS_GARMENTS = [
  { value: 'dress',     label: '👗 Dress',     desc: 'Stylish dresses' },
  { value: 'skirt',     label: '👚 Skirt Set', desc: 'Top with skirt' },
  { value: 'romper',    label: '👶 Romper',    desc: 'One-piece romper' },
  { value: 'onesie',    label: '👕 Onesie',    desc: 'Baby onesie' },
];

const BOYS_GARMENTS = [
  { value: 'tshirt',    label: '👕 T-Shirt',   desc: 'Casual t-shirt' },
  { value: 'polo',      label: '👔 Polo Shirt',desc: 'Collared polo' },
  { value: 'shorts',    label: '🩳 Shorts Set',desc: 'Shirt & shorts' },
  { value: 'romper',    label: '👶 Romper',    desc: 'One-piece romper' },
  { value: 'onesie',    label: '👕 Onesie',    desc: 'Baby onesie' },
];

const TWINS_GARMENTS = [
  { value: 'matching_dress',   label: '👗👗 Matching Dresses', desc: 'Twin dresses' },
  { value: 'matching_outfit',  label: '👕👕 Matching Outfits',desc: 'Twin sets' },
  { value: 'boy_girl',         label: '👔👗 Boy & Girl Set',  desc: 'Coordinated pair' },
];

// ─── Dress Silhouettes (for Girls) ───────────────────────────────────────────
const DRESS_SILHOUETTES = [
  { value: 'aline',      label: 'A-Line',      desc: 'Fitted bodice, flared skirt', icon: '👗' },
  { value: 'empire',     label: 'Empire',      desc: 'High waist under bust', icon: '👗' },
  { value: 'fitflare',   label: 'Fit & Flare', desc: 'Fitted top, flared hem', icon: '👗' },
  { value: 'princess',   label: 'Princess',    desc: 'Full, twirly skirt', icon: '👸' },
  { value: 'tutu',       label: 'Tutu Style',  desc: 'Fluffy tulle skirt', icon: '🩰' },
  { value: 'casual',     label: 'Casual',      desc: 'Comfortable everyday', icon: '👚' },
];

// ─── Neckline Styles ──────────────────────────────────────────────────────────
const NECKLINES = [
  { value: 'round',      label: 'Round' },
  { value: 'vneck',      label: 'V-Neck' },
  { value: 'scoop',      label: 'Scoop' },
  { value: 'square',     label: 'Square' },
  { value: 'sweetheart', label: 'Sweetheart' },
  { value: 'boatneck',   label: 'Boat Neck' },
];

// ─── Sleeve Options ───────────────────────────────────────────────────────────
const SLEEVES = [
  { value: 'sleeveless', label: 'Sleeveless' },
  { value: 'cap',        label: 'Cap Sleeve' },
  { value: 'short',      label: 'Short Sleeve' },
  { value: 'threequarter',label: '3/4 Sleeve' },
  { value: 'long',       label: 'Long Sleeve' },
  { value: 'puff',       label: 'Puff Sleeve' },
  { value: 'bell',       label: 'Bell Sleeve' },
];

// ─── Dress Length ─────────────────────────────────────────────────────────────
const LENGTHS = [
  { value: 'mini',  label: 'Mini',  desc: 'Above knee' },
  { value: 'knee',  label: 'Knee',  desc: 'At knee length' },
  { value: 'midi',  label: 'Midi',  desc: 'Mid-calf length' },
  { value: 'maxi',  label: 'Maxi',  desc: 'Full length' },
];

// ─── Waist Styles ─────────────────────────────────────────────────────────────
const WAIST_STYLES = [
  { value: 'natural',   label: 'Natural Waist' },
  { value: 'high',      label: 'High Waist' },
  { value: 'empire',    label: 'Empire (Under Bust)' },
  { value: 'drop',      label: 'Drop Waist' },
];

// ─── Additional Features ──────────────────────────────────────────────────────
const FEATURES = [
  { value: 'pockets',   label: '👜 Pockets' },
  { value: 'belt',      label: '🎀 Belt/Sash' },
  { value: 'ruffles',   label: '🎀 Ruffles' },
  { value: 'buttons',   label: '⚪ Buttons' },
  { value: 'bow',       label: '🎀 Bow Detail' },
];

const BASE_COLOURS = [
  // Girls palette - softer, brighter
  { label: 'Baby Pink',   value: '#FFB6C1', category: 'girls' },
  { label: 'Rose',        value: '#FF69B4', category: 'girls' },
  { label: 'Lavender',    value: '#E6E6FA', category: 'girls' },
  { label: 'Peach',       value: '#FFDAB9', category: 'girls' },
  { label: 'Mint',        value: '#98FF98', category: 'girls' },
  { label: 'Sky Blue',    value: '#87CEEB', category: 'girls' },
  { label: 'Lilac',       value: '#DDA0DD', category: 'girls' },
  { label: 'Coral',       value: '#FF7F50', category: 'girls' },
  
  // Boys palette - bolder, cooler
  { label: 'Navy',        value: '#1E3A8A', category: 'boys' },
  { label: 'Royal Blue',  value: '#4169E1', category: 'boys' },
  { label: 'Forest Green',value: '#228B22', category: 'boys' },
  { label: 'Maroon',      value: '#800000', category: 'boys' },
  { label: 'Steel Blue',  value: '#4682B4', category: 'boys' },
  { label: 'Olive',       value: '#808000', category: 'boys' },
  { label: 'Charcoal',    value: '#36454F', category: 'boys' },
  { label: 'Orange',      value: '#FF8C00', category: 'boys' },
  
  // Neutral - for all
  { label: 'White',       value: '#FFFFFF', category: 'all' },
  { label: 'Cream',       value: '#FFF8DC', category: 'all' },
  { label: 'Yellow',      value: '#FFD700', category: 'all' },
  { label: 'Light Gray',  value: '#D3D3D3', category: 'all' },
];

const PATTERNS = [
  { value: 'none',      label: 'Plain' },
  { value: 'stars',     label: '⭐ Stars' },
  { value: 'hearts',    label: '❤️ Hearts' },
  { value: 'dots',      label: '● Polka Dots' },
  { value: 'stripes',   label: '▥ Stripes' },
  { value: 'clouds',    label: '☁ Clouds' },
  { value: 'dinosaurs', label: '🦕 Dinosaurs' },
  { value: 'cars',      label: '🚗 Cars' },
  { value: 'flowers',   label: '🌸 Flowers' },
  { value: 'animals',   label: '🐻 Animals' },
];

const TEXT_COLOURS = [
  '#1A1A2E', '#B71C1C', '#1565C0', '#2E7D32',
  '#F57F17', '#6A1B9A', '#FFFFFF', '#004D40',
];

const FONTS = [
  { value: 'Arial, sans-serif',         label: 'Classic' },
  { value: "'Georgia', serif",          label: 'Elegant' },
  { value: "'Trebuchet MS', sans-serif",label: 'Round' },
  { value: "'Courier New', monospace",  label: 'Typewriter' },
];

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

/** Helper to determine what type of garment to draw based on category and selection */
function drawGarmentBody(ctx, config) {
  const { garmentType, category } = config;
  
  if (category === CATEGORIES.GIRLS && garmentType === 'dress') {
    drawDress(ctx, config);
  } else if (category === CATEGORIES.GIRLS && garmentType === 'skirt') {
    drawSkirtSet(ctx, config);
  } else if (garmentType === 'romper') {
    drawRomper(ctx, config);
  } else if (garmentType === 'onesie') {
    drawOnesie(ctx, config);
  } else if (category === CATEGORIES.BOYS && garmentType === 'tshirt') {
    drawTShirt(ctx, config);
  } else if (category === CATEGORIES.BOYS && garmentType === 'polo') {
    drawPoloShirt(ctx, config);
  } else if (category === CATEGORIES.BOYS && garmentType === 'shorts') {
    drawShortsSet(ctx, config);
  } else if (category === CATEGORIES.TWINS) {
    drawTwinsOutfit(ctx, config);
  } else {
    drawDress(ctx, config); // Default
  }
}

/** Draws GIRLS dress with enhanced, attractive silhouettes */
function drawDress(ctx, config) {
  const { silhouette, neckline, sleeve, length, waist } = config;
  
  // ── Body proportions ──
  const centerX = CANVAS_W / 2;
  const shoulderWidth = 70;
  const neckWidth = 20;
  
  // Vertical key points
  const shoulderY = 75;
  const bustY = 120;
  const waistY = waist === 'empire' ? 130 : (waist === 'high' ? 150 : (waist === 'drop' ? 190 : 165));
  const hipY = waistY + 45;
  const hemY = length === 'mini' ? 230 : (length === 'knee' ? 285 : (length === 'midi' ? 330 : 355));
  
  // Horizontal measurements
  const bustWidth = 48;
  const waistWidth = (silhouette === 'princess' || silhouette === 'tutu') ? 32 : (silhouette === 'casual' ? 42 : 38);
  const hipWidth = (silhouette === 'princess' || silhouette === 'tutu') ? 36 : (silhouette === 'casual' ? 45 : 42);
  
  // Hem width based on silhouette
  let hemWidth;
  if (silhouette === 'aline') hemWidth = 80;
  else if (silhouette === 'fitflare') hemWidth = 90;
  else if (silhouette === 'empire') hemWidth = 75;
  else if (silhouette === 'princess') hemWidth = 100; // Extra wide for princess
  else if (silhouette === 'tutu') hemWidth = 95; // Very flowy
  else if (silhouette === 'casual') hemWidth = 60; // More relaxed
  else hemWidth = 50; // Default
  
  ctx.beginPath();
  
  // ────────────────────────────────────────────────────────────
  // Start from left shoulder
  // ────────────────────────────────────────────────────────────
  
  // ── Left Sleeve ──
  if (sleeve === 'sleeveless') {
    ctx.moveTo(centerX - shoulderWidth/2 + 15, shoulderY);
  } else if (sleeve === 'cap') {
    ctx.moveTo(centerX - shoulderWidth/2 - 5, shoulderY - 5);
    ctx.quadraticCurveTo(centerX - shoulderWidth/2 - 10, shoulderY + 10, centerX - shoulderWidth/2 + 12, shoulderY + 15);
  } else if (sleeve === 'short') {
    ctx.moveTo(centerX - shoulderWidth/2 - 15, shoulderY - 3);
    ctx.lineTo(centerX - shoulderWidth/2 - 35, shoulderY + 5);
    ctx.lineTo(centerX - shoulderWidth/2 - 38, shoulderY + 45);
    ctx.lineTo(centerX - shoulderWidth/2 + 8, shoulderY + 50);
  } else if (sleeve === 'threequarter') {
    ctx.moveTo(centerX - shoulderWidth/2 - 15, shoulderY - 3);
    ctx.lineTo(centerX - shoulderWidth/2 - 38, shoulderY + 5);
    ctx.lineTo(centerX - shoulderWidth/2 - 42, bustY + 55);
    ctx.lineTo(centerX - shoulderWidth/2 + 5, bustY + 60);
  } else if (sleeve === 'long') {
    ctx.moveTo(centerX - shoulderWidth/2 - 15, shoulderY - 3);
    ctx.lineTo(centerX - shoulderWidth/2 - 40, shoulderY + 5);
    ctx.lineTo(centerX - shoulderWidth/2 - 45, waistY + 55);
    ctx.lineTo(centerX - shoulderWidth/2 + 2, waistY + 60);
  } else if (sleeve === 'puff') {
    ctx.moveTo(centerX - shoulderWidth/2 - 8, shoulderY - 5);
    ctx.quadraticCurveTo(centerX - shoulderWidth/2 - 25, shoulderY + 5, centerX - shoulderWidth/2 - 30, shoulderY + 25);
    ctx.quadraticCurveTo(centerX - shoulderWidth/2 - 18, shoulderY + 35, centerX - shoulderWidth/2 + 8, shoulderY + 38);
  } else if (sleeve === 'bell') {
    ctx.moveTo(centerX - shoulderWidth/2 - 15, shoulderY - 3);
    ctx.lineTo(centerX - shoulderWidth/2 - 32, shoulderY + 5);
    ctx.quadraticCurveTo(centerX - shoulderWidth/2 - 50, bustY + 40, centerX - shoulderWidth/2 - 55, bustY + 70);
    ctx.lineTo(centerX - shoulderWidth/2 + 5, bustY + 65);
  } else {
    // Default shoulder
    ctx.moveTo(centerX - shoulderWidth/2, shoulderY);
  }
  
  // Connect to armhole if sleeve exists
  if (sleeve !== 'sleeveless') {
    ctx.lineTo(centerX - shoulderWidth/2 + 10, shoulderY + 20);
  }
  
  // ── Left Neckline ──
  const neckLeft = centerX - neckWidth;
  const neckRight = centerX + neckWidth;
  const neckTop = shoulderY + 18;
  
  if (neckline === 'vneck') {
    ctx.lineTo(neckLeft, neckTop);
    ctx.lineTo(centerX, neckTop + 35);
  } else if (neckline === 'scoop') {
    ctx.lineTo(neckLeft, neckTop);
    ctx.quadraticCurveTo(centerX, neckTop + 25, neckRight, neckTop);
  } else if (neckline === 'square') {
    ctx.lineTo(neckLeft, neckTop);
    ctx.lineTo(neckLeft, neckTop + 20);
    ctx.lineTo(neckRight, neckTop + 20);
    ctx.lineTo(neckRight, neckTop);
  } else if (neckline === 'sweetheart') {
    ctx.lineTo(neckLeft, neckTop + 5);
    ctx.quadraticCurveTo(neckLeft + 10, neckTop + 20, centerX - 5, neckTop + 15);
    ctx.quadraticCurveTo(centerX, neckTop + 10, centerX + 5, neckTop + 15);
    ctx.quadraticCurveTo(neckRight - 10, neckTop + 20, neckRight, neckTop + 5);
  } else if (neckline === 'boatneck') {
    ctx.lineTo(neckLeft - 15, neckTop);
    ctx.lineTo(neckRight + 15, neckTop);
  } else {
    // Round neck (default)
    ctx.lineTo(neckLeft, neckTop);
    ctx.quadraticCurveTo(centerX, neckTop + 18, neckRight, neckTop);
  }
  
  // ── Right Neckline to Shoulder ──
  if (neckline === 'vneck') {
    ctx.lineTo(neckRight, neckTop);
  }
  
  ctx.lineTo(centerX + shoulderWidth/2 + 10, shoulderY + 20);
  
  // ── Right Sleeve ──
  if (sleeve === 'cap') {
    ctx.quadraticCurveTo(centerX + shoulderWidth/2 + 10, shoulderY + 10, centerX + shoulderWidth/2 + 5, shoulderY - 5);
  } else if (sleeve === 'short') {
    ctx.lineTo(centerX + shoulderWidth/2 - 8, shoulderY + 50);
    ctx.lineTo(centerX + shoulderWidth/2 + 38, shoulderY + 45);
    ctx.lineTo(centerX + shoulderWidth/2 + 35, shoulderY + 5);
    ctx.lineTo(centerX + shoulderWidth/2 + 15, shoulderY - 3);
  } else if (sleeve === 'threequarter') {
    ctx.lineTo(centerX + shoulderWidth/2 - 5, bustY + 60);
    ctx.lineTo(centerX + shoulderWidth/2 + 42, bustY + 55);
    ctx.lineTo(centerX + shoulderWidth/2 + 38, shoulderY + 5);
    ctx.lineTo(centerX + shoulderWidth/2 + 15, shoulderY - 3);
  } else if (sleeve === 'long') {
    ctx.lineTo(centerX + shoulderWidth/2 - 2, waistY + 60);
    ctx.lineTo(centerX + shoulderWidth/2 + 45, waistY + 55);
    ctx.lineTo(centerX + shoulderWidth/2 + 40, shoulderY + 5);
    ctx.lineTo(centerX + shoulderWidth/2 + 15, shoulderY - 3);
  } else if (sleeve === 'puff') {
    ctx.lineTo(centerX + shoulderWidth/2 - 8, shoulderY + 38);
    ctx.quadraticCurveTo(centerX + shoulderWidth/2 + 18, shoulderY + 35, centerX + shoulderWidth/2 + 30, shoulderY + 25);
    ctx.quadraticCurveTo(centerX + shoulderWidth/2 + 25, shoulderY + 5, centerX + shoulderWidth/2 + 8, shoulderY - 5);
  } else if (sleeve === 'bell') {
    ctx.lineTo(centerX + shoulderWidth/2 - 5, bustY + 65);
    ctx.lineTo(centerX + shoulderWidth/2 + 55, bustY + 70);
    ctx.quadraticCurveTo(centerX + shoulderWidth/2 + 50, bustY + 40, centerX + shoulderWidth/2 + 32, shoulderY + 5);
    ctx.lineTo(centerX + shoulderWidth/2 + 15, shoulderY - 3);
  } else if (sleeve !== 'sleeveless') {
    ctx.lineTo(centerX + shoulderWidth/2, shoulderY);
  }
  
  // ── Right side seam (bodice to skirt) ──
  
  // From shoulder/armhole down to bust
  ctx.lineTo(centerX + bustWidth, bustY);
  
  // Bust to waist with smooth curve
  ctx.bezierCurveTo(
    centerX + bustWidth, bustY + 15,
    centerX + waistWidth + 3, waistY - 15,
    centerX + waistWidth, waistY
  );
  
  // Waist to hip
  if (silhouette === 'princess' || silhouette === 'tutu') {
    // Very dramatic flare for princess/tutu
    ctx.bezierCurveTo(
      centerX + waistWidth, waistY + 10,
      centerX + hipWidth - 10, hipY - 15,
      centerX + hipWidth, hipY
    );
  } else {
    ctx.lineTo(centerX + hipWidth, hipY);
  }
  
  // Hip to hem
  if (silhouette === 'aline' || silhouette === 'fitflare' || silhouette === 'empire' || silhouette === 'princess' || silhouette === 'tutu') {
    ctx.bezierCurveTo(
      centerX + hipWidth, hipY + 20,
      centerX + hemWidth - 5, hemY - 30,
      centerX + hemWidth, hemY
    );
  } else if (silhouette === 'casual') {
    ctx.lineTo(centerX + hemWidth, hemY);
  } else {
    // Default - straight
    ctx.lineTo(centerX + hemWidth, hemY);
  }
  
  // ── Hem (bottom) ──
  ctx.lineTo(centerX - hemWidth, hemY);
  
  // ── Left side seam (mirror of right) ──
  
  // Hem to hip
  if (silhouette === 'aline' || silhouette === 'fitflare' || silhouette === 'empire' || silhouette === 'princess' || silhouette === 'tutu') {
    ctx.bezierCurveTo(
      centerX - hemWidth + 5, hemY - 30,
      centerX - hipWidth, hipY + 20,
      centerX - hipWidth, hipY
    );
  } else if (silhouette === 'casual') {
    ctx.lineTo(centerX - hipWidth, hipY);
  } else {
    ctx.lineTo(centerX - hipWidth, hipY);
  }
  
  // Hip to waist
  if (silhouette === 'princess' || silhouette === 'tutu') {
    ctx.bezierCurveTo(
      centerX - hipWidth, hipY - 15,
      centerX - waistWidth, waistY + 10,
      centerX - waistWidth, waistY
    );
  } else {
    ctx.lineTo(centerX - waistWidth, waistY);
  }
  
  // Waist to bust
  ctx.bezierCurveTo(
    centerX - waistWidth - 3, waistY - 15,
    centerX - bustWidth, bustY + 15,
    centerX - bustWidth, bustY
  );
  
  // Back to armhole/shoulder to close path
  // (Already connected via sleeve drawing)
  
  ctx.closePath();
}

/** Draw additional features (pockets, belt, ruffles, etc.). */
function drawFeatures(ctx, config) {
  const { features, silhouette, length, waist } = config;
  if (!features || features.length === 0) return;
  
  const centerX = CANVAS_W / 2;
  const waistY = waist === 'empire' ? 130 : (waist === 'high' ? 150 : (waist === 'drop' ? 190 : 165));
  const hemY = length === 'mini' ? 230 : (length === 'knee' ? 285 : (length === 'midi' ? 330 : 355));
  const hipY = waistY + 45;
  
  features.forEach(f => {
    if (f === 'pockets') {
      // Side pockets at hip level
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX - 35, hipY, 14, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX + 35, hipY, 14, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    }
    
    if (f === 'belt') {
      // Waist belt/sash
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      const waistWidth = silhouette === 'bodycon' ? 40 : (silhouette === 'sheath' ? 42 : 38);
      ctx.moveTo(centerX - waistWidth - 5, waistY);
      ctx.lineTo(centerX + waistWidth + 5, waistY);
      ctx.stroke();
      // Bow on right side
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(centerX + waistWidth - 5, waistY - 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + waistWidth + 10, waistY - 2, 9, 0, Math.PI * 2);
      ctx.fill();
      // Knot center
      ctx.fillRect(centerX + waistWidth - 2, waistY - 6, 8, 8);
      ctx.restore();
    }
    
    if (f === 'ruffles') {
      // Hem ruffles with better spacing
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 1.8;
      const ruffleY = hemY - 18;
      const hemWidth = silhouette === 'aline' ? 80 : (silhouette === 'fitflare' ? 90 : 46);
      const startX = centerX - hemWidth + 10;
      const endX = centerX + hemWidth - 10;
      for (let x = startX; x < endX; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, ruffleY);
        ctx.quadraticCurveTo(x + 5, ruffleY + 10, x + 10, ruffleY);
        ctx.stroke();
      }
      ctx.restore();
    }
    
    if (f === 'buttons') {
      // Center front buttons from neckline to waist
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      const startY = 110;
      for (let y = startY; y < waistY; y += 22) {
        ctx.beginPath();
        ctx.arc(centerX, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    
    if (f === 'bow') {
      // Bow at waist center front
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      // Left loop
      ctx.beginPath();
      ctx.arc(centerX - 10, waistY, 11, 0, Math.PI * 2);
      ctx.fill();
      // Right loop
      ctx.beginPath();
      ctx.arc(centerX + 10, waistY, 11, 0, Math.PI * 2);
      ctx.fill();
      // Center knot
      ctx.fillRect(centerX - 5, waistY - 6, 10, 12);
      // Ribbon tails
      ctx.beginPath();
      ctx.moveTo(centerX - 3, waistY + 6);
      ctx.lineTo(centerX - 8, waistY + 25);
      ctx.lineTo(centerX - 5, waistY + 25);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(centerX + 3, waistY + 6);
      ctx.lineTo(centerX + 8, waistY + 25);
      ctx.lineTo(centerX + 5, waistY + 25);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });
}

/** Tiny 5-point star centered on (x,y). */
function drawStar(ctx, x, y, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const ir    = r * 0.4;
    const ia    = angle + (2 * Math.PI) / 5 / 2;
    if (i === 0) ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    else             ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    ctx.lineTo(x + ir * Math.cos(ia), y + ir * Math.sin(ia));
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Tiny heart centered on (x,y), scale ~r pixels. */
function drawHeart(ctx, x, y, r, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r / 10, r / 10);
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.bezierCurveTo(-5, -10, -12, -2, 0, 5);
  ctx.bezierCurveTo(12, -2, 5, -10, 0, -3);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

/** Small cloud shape. */
function drawCloud(ctx, x, y, s, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(-s * 0.4, 0, s * 0.45, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(0, -s * 0.35, s * 0.5, Math.PI, 0);
  ctx.arc(s * 0.4, 0, s * 0.45, Math.PI * 1.5, Math.PI * 0.5);
  ctx.lineTo(-s * 0.4, s * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Draw repeat pattern inside clipped onesie. */
function drawPattern(ctx, pattern, accentColor) {
  if (pattern === 'none') return;

  const alpha = 'CC'; // ~80% opacity hex suffix
  const col1  = `${accentColor}${alpha}`;
  const spacing = 34;

  // We draw a grid covering the whole canvas – the clip region handles masking
  for (let row = -1; row < Math.ceil(CANVAS_H / spacing) + 1; row++) {
    for (let col = -1; col < Math.ceil(CANVAS_W / spacing) + 1; col++) {
      const ox = col % 2 === 0 ? 0 : spacing / 2;
      const px = col * spacing + ox;
      const py = row * spacing;

      if (pattern === 'stars') {
        drawStar(ctx, px, py, 7, col1);
      } else if (pattern === 'hearts') {
        drawHeart(ctx, px, py, 9, col1);
      } else if (pattern === 'dots') {
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = col1;
        ctx.fill();
      } else if (pattern === 'clouds') {
        drawCloud(ctx, px, py, 9, col1);
      }
    }
  }

  if (pattern === 'stripes') {
    ctx.save();
    ctx.lineWidth = 10;
    ctx.strokeStyle = col1;
    for (let x = -CANVAS_H; x < CANVAS_W + CANVAS_H; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + CANVAS_H, CANVAS_H);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Draws BOYS t-shirt - simple, clean design */
function drawTShirt(ctx, config) {
  const centerX = CANVAS_W / 2;
  const { neckline = 'round', sleeve = 'short' } = config;
  
  ctx.beginPath();
  
  // Start from left shoulder
  if (sleeve === 'short' || sleeve === 'cap') {
    ctx.moveTo(centerX - 55, 85);
    ctx.lineTo(centerX - 75, 90);
    ctx.lineTo(centerX - 80, 130);
    ctx.lineTo(centerX - 50, 135);
  } else if (sleeve === 'long') {
    ctx.moveTo(centerX - 55, 85);
    ctx.lineTo(centerX - 80, 90);
    ctx.lineTo(centerX - 85, 210);
    ctx.lineTo(centerX - 50, 215);
  } else {
    // Sleeveless/tank
    ctx.moveTo(centerX - 40, 85);
  }
  
  // Left armhole to neckline
  ctx.lineTo(centerX - 45, 95);
  ctx.lineTo(centerX - 25, 95);
  
  // Neckline
  if (neckline === 'vneck') {
    ctx.lineTo(centerX, 110);
    ctx.lineTo(centerX + 25, 95);
  } else {
    ctx.quadraticCurveTo(centerX, 105, centerX + 25, 95);
  }
  
  // Right armhole
  ctx.lineTo(centerX + 45, 95);
  
  // Right sleeve
  if (sleeve === 'short' || sleeve === 'cap') {
    ctx.lineTo(centerX + 50, 135);
    ctx.lineTo(centerX + 80, 130);
    ctx.lineTo(centerX + 75, 90);
    ctx.lineTo(centerX + 55, 85);
  } else if (sleeve === 'long') {
    ctx.lineTo(centerX + 50, 215);
    ctx.lineTo(centerX + 85, 210);
    ctx.lineTo(centerX + 80, 90);
    ctx.lineTo(centerX + 55, 85);
  }
  
  // Right side seam
  ctx.lineTo(centerX + 48, 140);
  ctx.lineTo(centerX + 48, 220);
  
  // Bottom hem
  ctx.lineTo(centerX - 48, 220);
  
  // Left side seam
  ctx.lineTo(centerX - 48, 140);
  
  ctx.closePath();
}

/** Draws BOYS polo shirt - with collar and buttons */
function drawPoloShirt(ctx, config) {
  const centerX = CANVAS_W / 2;
  const { sleeve = 'short' } = config;
  
  ctx.beginPath();
  
  // Start from left shoulder
  if (sleeve === 'short' || sleeve === 'cap') {
    ctx.moveTo(centerX - 55, 85);
    ctx.lineTo(centerX - 75, 90);
    ctx.lineTo(centerX - 80, 130);
    ctx.lineTo(centerX - 50, 135);
  } else if (sleeve === 'long') {
    ctx.moveTo(centerX - 55, 85);
    ctx.lineTo(centerX - 80, 90);
    ctx.lineTo(centerX - 85, 210);
    ctx.lineTo(centerX - 50, 215);
  } else {
    ctx.moveTo(centerX - 40, 85);
  }
  
  // Left armhole to collar
  ctx.lineTo(centerX - 45, 95);
  ctx.lineTo(centerX - 28, 95);
  
  // Collar - more structured than t-shirt
  ctx.lineTo(centerX - 28, 85);
  ctx.lineTo(centerX - 15, 80);
  ctx.lineTo(centerX - 8, 95);
  
  // Placket opening
  ctx.lineTo(centerX - 8, 150);
  ctx.lineTo(centerX + 8, 150);
  ctx.lineTo(centerX + 8, 95);
  
  // Right collar
  ctx.lineTo(centerX + 15, 80);
  ctx.lineTo(centerX + 28, 85);
  ctx.lineTo(centerX + 28, 95);
  
  // Right armhole
  ctx.lineTo(centerX + 45, 95);
  
  // Right sleeve
  if (sleeve === 'short' || sleeve === 'cap') {
    ctx.lineTo(centerX + 50, 135);
    ctx.lineTo(centerX + 80, 130);
    ctx.lineTo(centerX + 75, 90);
    ctx.lineTo(centerX + 55, 85);
  } else if (sleeve === 'long') {
    ctx.lineTo(centerX + 50, 215);
    ctx.lineTo(centerX + 85, 210);
    ctx.lineTo(centerX + 80, 90);
    ctx.lineTo(centerX + 55, 85);
  }
  
  // Right side seam
  ctx.lineTo(centerX + 48, 140);
  ctx.lineTo(centerX + 48, 220);
  
  // Bottom hem
  ctx.lineTo(centerX - 48, 220);
  
  // Left side seam
  ctx.lineTo(centerX - 48, 140);
  
  ctx.closePath();
  
  // Draw collar buttons
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (let y = 105; y < 145; y += 15) {
    ctx.beginPath();
    ctx.arc(centerX, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Draws BOYS shorts set */
function drawShortsSet(ctx, config) {
  const centerX = CANVAS_W / 2;
  
  // Draw shirt component
  ctx.beginPath();
  ctx.moveTo(centerX - 40, 85);
  ctx.lineTo(centerX - 45, 95);
  ctx.lineTo(centerX - 22, 95);
  ctx.quadraticCurveTo(centerX, 102, centerX + 22, 95);
  ctx.lineTo(centerX + 45, 95);
  ctx.lineTo(centerX + 40, 85);
  // Right side of shirt
  ctx.lineTo(centerX + 45, 140);
  ctx.lineTo(centerX + 45, 195);
  // Bottom of shirt
  ctx.lineTo(centerX - 45, 195);
  // Left side of shirt
  ctx.lineTo(centerX - 45, 140);
  ctx.closePath();
  
  // Draw shorts
  ctx.beginPath();
  // Waist
  ctx.moveTo(centerX - 42, 210);
  // Left leg
  ctx.lineTo(centerX - 42, 240);
  ctx.lineTo(centerX - 15, 280);
  ctx.lineTo(centerX - 8, 280);
  ctx.lineTo(centerX - 3, 240);
  // Crotch
  ctx.lineTo(centerX + 3, 240);
  // Right leg
  ctx.lineTo(centerX + 8, 280);
  ctx.lineTo(centerX + 15, 280);
  ctx.lineTo(centerX + 42, 240);
  ctx.lineTo(centerX + 42, 210);
  ctx.closePath();
}

/** Draws ROMPER - suitable for boys or girls */
function drawRomper(ctx, config) {
  const centerX = CANVAS_W / 2;
  const { neckline = 'round', sleeve = 'short' } = config;
  
  ctx.beginPath();
  
  // Left sleeve
  if (sleeve === 'short' || sleeve === 'cap') {
    ctx.moveTo(centerX - 50, 85);
    ctx.lineTo(centerX - 70, 90);
    ctx.lineTo(centerX - 73, 125);
    ctx.lineTo(centerX - 48, 130);
  } else if (sleeve === 'long') {
    ctx.moveTo(centerX - 50, 85);
    ctx.lineTo(centerX - 75, 90);
    ctx.lineTo(centerX - 78, 195);
    ctx.lineTo(centerX - 48, 200);
  } else {
    ctx.moveTo(centerX - 38, 85);
  }
  
  // Left armhole/shoulder to neckline
  ctx.lineTo(centerX - 42, 95);
  ctx.lineTo(centerX - 22, 95);
  
  // Neckline
  ctx.quadraticCurveTo(centerX, 105, centerX + 22, 95);
  
  // Right shoulder/armhole
  ctx.lineTo(centerX + 42, 95);
  
  // Right sleeve
  if (sleeve === 'short' || sleeve === 'cap') {
    ctx.lineTo(centerX + 48, 130);
    ctx.lineTo(centerX + 73, 125);
    ctx.lineTo(centerX + 70, 90);
    ctx.lineTo(centerX + 50, 85);
  } else if (sleeve === 'long') {
    ctx.lineTo(centerX + 48, 200);
    ctx.lineTo(centerX + 78, 195);
    ctx.lineTo(centerX + 75, 90);
    ctx.lineTo(centerX + 50, 85);
  }
  
  // Right bodice side
  ctx.lineTo(centerX + 45, 140);
  ctx.lineTo(centerX + 45, 200);
  
  // Right leg
  ctx.lineTo(centerX + 35, 200);
  ctx.lineTo(centerX + 32, 285);
  ctx.lineTo(centerX + 10, 285);
  ctx.lineTo(centerX + 5, 230);
  
  // Crotch
  ctx.lineTo(centerX - 5, 230);
  
  // Left leg
  ctx.lineTo(centerX - 10, 285);
  ctx.lineTo(centerX - 32, 285);
  ctx.lineTo(centerX - 35, 200);
  ctx.lineTo(centerX - 45, 200);
  
  // Left bodice side
  ctx.lineTo(centerX - 45, 140);
  
  ctx.closePath();
}

/** Draws ONESIE for babies */
function drawOnesie(ctx, config) {
  const centerX = CANVAS_W / 2;
  const { sleeve = 'long' } = config;
  
  ctx.beginPath();
  
  // Left sleeve
  if (sleeve === 'long') {
    ctx.moveTo(centerX - 48, 90);
    ctx.lineTo(centerX - 72, 95);
    ctx.lineTo(centerX - 75, 200);
    ctx.lineTo(centerX - 45, 205);
  } else {
    ctx.moveTo(centerX - 48, 90);
    ctx.lineTo(centerX - 65, 95);
    ctx.lineTo(centerX - 68, 135);
    ctx.lineTo(centerX - 45, 140);
  }
  
  // Left bodice
  ctx.lineTo(centerX - 40, 100);
  ctx.lineTo(centerX - 20, 100);
  
  // Neckline
  ctx.quadraticCurveTo(centerX, 108, centerX + 20, 100);
  
  // Right bodice
  ctx.lineTo(centerX + 40, 100);
  
  // Right sleeve
  if (sleeve === 'long') {
    ctx.lineTo(centerX + 45, 205);
    ctx.lineTo(centerX + 75, 200);
    ctx.lineTo(centerX + 72, 95);
    ctx.lineTo(centerX + 48, 90);
  } else {
    ctx.lineTo(centerX + 45, 140);
    ctx.lineTo(centerX + 68, 135);
    ctx.lineTo(centerX + 65, 95);
    ctx.lineTo(centerX + 48, 90);
  }
  
  // Right side
  ctx.lineTo(centerX + 42, 145);
  ctx.lineTo(centerX + 40, 240);
  
  // Right leg with foot
  ctx.lineTo(centerX + 25, 240);
  ctx.lineTo(centerX + 22, 310);
  ctx.lineTo(centerX + 28, 320);
  ctx.lineTo(centerX + 18, 325);
  ctx.lineTo(centerX + 8, 320);
  ctx.lineTo(centerX + 5, 310);
  ctx.lineTo(centerX + 5, 265);
  
  // Crotch
  ctx.lineTo(centerX - 5, 265);
  
  // Left leg with foot
  ctx.lineTo(centerX - 5, 310);
  ctx.lineTo(centerX - 8, 320);
  ctx.lineTo(centerX - 18, 325);
  ctx.lineTo(centerX - 28, 320);
  ctx.lineTo(centerX - 22, 310);
  ctx.lineTo(centerX - 25, 240);
  ctx.lineTo(centerX - 40, 240);
  
  // Left side
  ctx.lineTo(centerX - 42, 145);
  
  ctx.closePath();
}

/** Draws skirt set for girls */
function drawSkirtSet(ctx, config) {
  const centerX = CANVAS_W / 2;
  const { neckline = 'round', sleeve = 'short' } = config;
  
  // Top
  ctx.beginPath();
  if (sleeve === 'short') {
    ctx.moveTo(centerX - 50, 85);
    ctx.lineTo(centerX - 68, 90);
    ctx.lineTo(centerX - 70, 125);
    ctx.lineTo(centerX - 45, 128);
  } else if (sleeve === 'cap') {
    ctx.moveTo(centerX - 45, 85);
    ctx.quadraticCurveTo(centerX - 55, 95, centerX - 42, 100);
  } else {
    ctx.moveTo(centerX - 38, 85);
  }
  
  ctx.lineTo(centerX - 40, 95);
  ctx.lineTo(centerX - 22, 95);
  
  if (neckline === 'scoop') {
    ctx.quadraticCurveTo(centerX, 110, centerX + 22, 95);
  } else {
    ctx.quadraticCurveTo(centerX, 102, centerX + 22, 95);
  }
  
  ctx.lineTo(centerX + 40, 95);
  
  if (sleeve === 'short') {
    ctx.lineTo(centerX + 45, 128);
    ctx.lineTo(centerX + 70, 125);
    ctx.lineTo(centerX + 68, 90);
    ctx.lineTo(centerX + 50, 85);
  } else if (sleeve === 'cap') {
    ctx.quadraticCurveTo(centerX + 55, 95, centerX + 45, 85);
  }
  
  ctx.lineTo(centerX + 45, 160);
  ctx.lineTo(centerX - 45, 160);
  ctx.lineTo(centerX - 45, 140);
  ctx.closePath();
  
  // Skirt
  ctx.beginPath();
  ctx.moveTo(centerX - 42, 175);
  ctx.bezierCurveTo(centerX - 45, 200, centerX - 75, 280, centerX - 80, 300);
  ctx.lineTo(centerX + 80, 300);
  ctx.bezierCurveTo(centerX + 75, 280, centerX + 45, 200, centerX + 42, 175);
  ctx.closePath();
}

/** Luminance check to decide whether to use a dark/light accent. */
function contrastAccent(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#444466' : '#DDEEFF';
}

/** Draws twins/matching outfits - two smaller garments side by side */
function drawTwinsOutfit(ctx, config) {
  const { garmentType = 'matching_dress', baseColour, pattern } = config;
  const accent = contrastAccent(baseColour);
  
  // Helper function to render a complete garment
  const renderGarment = (drawFunc) => {
    // Drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;
    drawFunc(ctx, config);
    ctx.fillStyle = baseColour;
    ctx.fill();
    ctx.restore();
    
    // Pattern
    ctx.save();
    drawFunc(ctx, config);
    ctx.clip();
    drawPattern(ctx, pattern, accent);
    ctx.restore();
    
    // Outline
    ctx.save();
    drawFunc(ctx, config);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  };
  
  // Left garment
  ctx.save();
  ctx.translate(-50, 0);
  ctx.scale(0.7, 0.7);
  
  if (garmentType === 'matching_dress' || garmentType === 'boy_girl') {
    renderGarment(drawDress);
  } else {
    renderGarment(drawRomper);
  }
  
  ctx.restore();
  
  // Right garment
  ctx.save();
  ctx.translate(75, 0);
  ctx.scale(0.7, 0.7);
  
  if (garmentType === 'boy_girl') {
    renderGarment(drawTShirt);
  } else if (garmentType === 'matching_dress') {
    renderGarment(drawDress);
  } else {
    renderGarment(drawRomper);
  }
  
  ctx.restore();
  
  // Draw connecting heart between them
  ctx.save();
  ctx.fillStyle = 'rgba(255, 105, 180, 0.6)';
  drawHeart(ctx, CANVAS_W / 2, 150, 15, 'rgba(255, 105, 180, 0.7)');
  ctx.restore();
}

/** Main render function — called on every state change. */
function renderCanvas(canvas, config) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Twins outfits render themselves completely
  if (config.category === CATEGORIES.TWINS) {
    drawTwinsOutfit(ctx, config);
    
    // Custom text for twins
    if (config.text && config.text.trim()) {
      ctx.save();
      ctx.font = `bold 20px ${config.fontFamily}`;
      ctx.fillStyle = config.textColour;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.shadowBlur = 4;
      ctx.fillText(config.text, CANVAS_W / 2, 320);
      ctx.restore();
    }
    return;
  }

  // ── Drop shadow ──
  ctx.save();
  ctx.shadowColor  = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur   = 18;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;
  drawGarmentBody(ctx, config);
  ctx.fillStyle = config.baseColour;
  ctx.fill();
  ctx.restore();

  // ── Pattern (clipped to garment silhouette) ──
  ctx.save();
  drawGarmentBody(ctx, config);
  ctx.clip();
  const accent = contrastAccent(config.baseColour);
  drawPattern(ctx, config.pattern, accent);
  ctx.restore();

  // ── Outline & stitching ──
  ctx.save();
  drawGarmentBody(ctx, config);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  // ── Stitching detail ──
  ctx.save();
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  drawGarmentBody(ctx, config);
  ctx.stroke();
  ctx.restore();

  // ── Additional features (only for dresses/skirts) ──
  if (config.garmentType === 'dress' || config.garmentType === 'skirt') {
    drawFeatures(ctx, config);
  }

  // ── Custom text ──
  if (config.text && config.text.trim()) {
    ctx.save();
    drawGarmentBody(ctx, config);
    ctx.clip();
    ctx.font         = `bold 22px ${config.fontFamily}`;
    ctx.fillStyle    = config.textColour;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    // Subtle shadow for legibility
    ctx.shadowColor  = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur   = 4;
    // Wrap text if > 12 chars
    const words = config.text.trim().split(' ');
    const yBase = config.length === 'maxi' ? 220 : (config.length === 'midi' ? 200 : (config.garmentType === 'romper' || config.garmentType === 'onesie' ? 160 : 180));
    if (words.length > 1 || config.text.length > 12) {
      const mid = Math.ceil(words.length / 2);
      ctx.fillText(words.slice(0, mid).join(' '), CANVAS_W / 2, yBase - 15);
      ctx.fillText(words.slice(mid).join(' '),    CANVAS_W / 2, yBase + 17);
    } else {
      ctx.fillText(config.text, CANVAS_W / 2, yBase);
    }
    ctx.restore();
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OutfitBuilder2D({ product, onAddToCart }) {
  const canvasRef = useRef(null);

  // Detect category from product name/tags (used for initial default only)
  const detectCategory = useCallback(() => {
    const productName = (product?.name || '').toLowerCase();
    const productTags = (product?.tags || []).map(t => t.toLowerCase()).join(' ');
    const searchText = `${productName} ${productTags}`;
    
    if (searchText.match(/\b(boy|boys|son|brother|male|him)\b/i)) {
      return CATEGORIES.BOYS;
    } else if (searchText.match(/\b(twin|twins|pair|matching|duo)\b/i)) {
      return CATEGORIES.TWINS;
    } else {
      return CATEGORIES.GIRLS; // Default
    }
  }, [product]);

  const initialCategory = detectCategory();

  // State for category and garment type
  const [category, setCategory] = useState(initialCategory);
  const [garmentType, setGarmentType] = useState(() => {
    if (initialCategory === CATEGORIES.BOYS) return 'tshirt';
    if (initialCategory === CATEGORIES.GIRLS) return 'dress';
    return 'matching_dress';
  });

  // State for all customization options
  const [silhouette,  setSilhouette]  = useState('aline');
  const [neckline,    setNeckline]    = useState('round');
  const [sleeve,      setSleeve]      = useState('cap');
  const [length,      setLength]      = useState('knee');
  const [waist,       setWaist]       = useState('natural');
  const [features,    setFeatures]    = useState([]);
  const [baseColour,  setBaseColour]  = useState(() => {
    return initialCategory === CATEGORIES.BOYS ? '#4169E1' : '#FFB6C1';
  });
  const [pattern,     setPattern]     = useState('stars');
  const [text,        setText]        = useState('');
  const [textColour,  setTextColour]  = useState('#1A1A2E');
  const [fontFamily,  setFontFamily]  = useState('Arial, sans-serif');

  // Optional: Auto-detect category on initial load only (commented out to allow manual selection)
  // useEffect(() => {
  //   const newCategory = detectCategory();
  //   setCategory(newCategory);
  //   
  //   // Update garment type based on category
  //   if (newCategory === CATEGORIES.BOYS) {
  //     setGarmentType('tshirt');
  //     setBaseColour('#4169E1');
  //   } else if (newCategory === CATEGORIES.GIRLS) {
  //     setGarmentType('dress');
  //     setBaseColour('#FFB6C1');
  //   } else {
  //     setGarmentType('matching_dress');
  //   }
  // }, [product, detectCategory]);

  // Get available colors based on category
  const availableColours = BASE_COLOURS.filter(c => 
    c.category === 'all' || c.category === category
  );

  // Re-draw canvas whenever any visual config changes
  const config = { 
    category,
    garmentType,
    silhouette, neckline, sleeve, length, waist, features,
    baseColour, pattern, text, textColour, fontFamily 
  };

  useEffect(() => {
    renderCanvas(canvasRef.current, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, garmentType, silhouette, neckline, sleeve, length, waist, features, baseColour, pattern, text, textColour, fontFamily]);

  const handleAddToCart = useCallback(() => {
    const previewDataUrl = canvasRef.current?.toDataURL('image/png') || null;
    const customization = {
      category,
      garmentType,
      silhouette,
      neckline,
      sleeve,
      length,
      waist,
      features,
      baseColour,
      pattern,
      text: text.trim(),
      textColour,
      fontFamily,
      previewDataUrl,
    };
    onAddToCart(product, customization);
  }, [category, garmentType, silhouette, neckline, sleeve, length, waist, features, baseColour, pattern, text, textColour, fontFamily, onAddToCart, product]);

  const handleDownloadPreview = () => {
    const url  = canvasRef.current?.toDataURL('image/png');
    if (!url) return;
    const link = document.createElement('a');
    link.href     = url;
    link.download = `${(product?.name || 'custom-dress').replace(/\s+/g, '-')}-design.png`;
    link.click();
  };

  const toggleFeature = (feature) => {
    setFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: '#f8fafc',
        borderRadius: 3,
        border: '2px solid #ff6f00',
        overflow: 'hidden',
        mt: 3,
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #ff6f00 0%, #ff8f00 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2.5,
          py: 1.5,
        }}
      >
        <Checkroom sx={{ fontSize: 24 }} />
        <Typography fontWeight={800} variant="h6" sx={{ flex: 1 }}>
          {category === CATEGORIES.BOYS ? 'Design Your Custom Boys Outfit' :
           category === CATEGORIES.TWINS ? 'Design Matching Twins Outfits' :
           'Design Your Custom Girls Outfit'}
        </Typography>
        <Chip
          size="small"
          label="Made to Order"
          sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700 }}
        />
      </Box>

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* ─── Left Preview Panel ─── */}
          <Grid
            item
            xs={12}
            md={4}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" fontWeight={700} letterSpacing={1}>
              LIVE PREVIEW
            </Typography>
            <Paper
              elevation={3}
              sx={{
                background: 'white',
                borderRadius: 3,
                p: 2,
                position: 'sticky',
                top: 20,
              }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
              />
              
              {/* Summary chips */}
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.6, justifyContent: 'center' }}>
                <Chip size="small" label={category.toUpperCase()} color="primary" sx={{ fontSize: 10 }} />
                <Chip size="small" label={garmentType.toUpperCase().replace('_', ' ')} sx={{ fontSize: 10 }} />
                {garmentType === 'dress' && <Chip size="small" label={DRESS_SILHOUETTES.find(s => s.value === silhouette)?.label} sx={{ fontSize: 10 }} />}
                {SLEEVES.find(s => s.value === sleeve)?.label && <Chip size="small" label={SLEEVES.find(s => s.value === sleeve)?.label} sx={{ fontSize: 10 }} />}
              </Box>

              <Button
                size="small"
                variant="outlined"
                startIcon={<Download />}
                onClick={handleDownloadPreview}
                fullWidth
                sx={{ borderRadius: 5, mt: 2 }}
              >
                Download Design
              </Button>
            </Paper>
          </Grid>

          {/* ─── Right Customization Options ─── */}
          <Grid item xs={12} md={8}>
            
            {/* ── GENDER/CATEGORY SELECTOR ── */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>👶 SELECT CATEGORY</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Paper
                      onClick={() => {
                        setCategory(CATEGORIES.GIRLS);
                        setGarmentType('dress');
                        setBaseColour('#FFB6C1');
                      }}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        border: category === CATEGORIES.GIRLS ? '3px solid #FF6B9D' : '2px solid #e0e0e0',
                        bgcolor: category === CATEGORIES.GIRLS ? '#FFF0F5' : 'white',
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'scale(1.05)', boxShadow: 3 },
                      }}
                    >
                      <Typography variant="h3" sx={{ mb: 1 }}>👧</Typography>
                      <Typography variant="h6" fontWeight={700}>Girls</Typography>
                      <Typography variant="caption" color="text.secondary">Dresses, Skirts & More</Typography>
                      {category === CATEGORIES.GIRLS && (
                        <Typography variant="caption" display="block" sx={{ mt: 1, color: '#FF6B9D', fontWeight: 700 }}>
                          ✓ Selected
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper
                      onClick={() => {
                        setCategory(CATEGORIES.BOYS);
                        setGarmentType('tshirt');
                        setBaseColour('#4169E1');
                      }}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        border: category === CATEGORIES.BOYS ? '3px solid #4169E1' : '2px solid #e0e0e0',
                        bgcolor: category === CATEGORIES.BOYS ? '#E8F0FE' : 'white',
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'scale(1.05)', boxShadow: 3 },
                      }}
                    >
                      <Typography variant="h3" sx={{ mb: 1 }}>👦</Typography>
                      <Typography variant="h6" fontWeight={700}>Boys</Typography>
                      <Typography variant="caption" color="text.secondary">T-Shirts, Polos & More</Typography>
                      {category === CATEGORIES.BOYS && (
                        <Typography variant="caption" display="block" sx={{ mt: 1, color: '#4169E1', fontWeight: 700 }}>
                          ✓ Selected
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper
                      onClick={() => {
                        setCategory(CATEGORIES.TWINS);
                        setGarmentType('matching_dress');
                      }}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        border: category === CATEGORIES.TWINS ? '3px solid #9C27B0' : '2px solid #e0e0e0',
                        bgcolor: category === CATEGORIES.TWINS ? '#F3E5F5' : 'white',
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'scale(1.05)', boxShadow: 3 },
                      }}
                    >
                      <Typography variant="h3" sx={{ mb: 1 }}>👫</Typography>
                      <Typography variant="h6" fontWeight={700}>Twins</Typography>
                      <Typography variant="caption" color="text.secondary">Matching Sets</Typography>
                      {category === CATEGORIES.TWINS && (
                        <Typography variant="caption" display="block" sx={{ mt: 1, color: '#9C27B0', fontWeight: 700 }}>
                          ✓ Selected
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* ── GARMENT TYPE ── */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>
                  {category === CATEGORIES.GIRLS ? '👗' : category === CATEGORIES.BOYS ? '👕' : '👫'} GARMENT TYPE
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {category === CATEGORIES.GIRLS && GIRLS_GARMENTS.map((g) => (
                    <Grid item xs={6} sm={3} key={g.value}>
                      <Paper
                        onClick={() => setGarmentType(g.value)}
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          cursor: 'pointer',
                          border: garmentType === g.value ? '3px solid #FF6B9D' : '2px solid transparent',
                          bgcolor: garmentType === g.value ? '#FFF0F5' : 'white',
                          transition: 'all 0.2s',
                          '&:hover': { transform: 'scale(1.05)', boxShadow: 3 },
                        }}
                      >
                        <Typography variant="h6">{g.value === garmentType && '✓ '}{g.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{g.desc}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                  {category === CATEGORIES.BOYS && BOYS_GARMENTS.map((g) => (
                    <Grid item xs={6} sm={3} key={g.value}>
                      <Paper
                        onClick={() => setGarmentType(g.value)}
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          cursor: 'pointer',
                          border: garmentType === g.value ? '3px solid #4169E1' : '2px solid transparent',
                          bgcolor: garmentType === g.value ? '#E8F0FE' : 'white',
                          transition: 'all 0.2s',
                          '&:hover': { transform: 'scale(1.05)', boxShadow: 3 },
                        }}
                      >
                        <Typography variant="h6">{g.value === garmentType && '✓ '}{g.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{g.desc}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                  {category === CATEGORIES.TWINS && TWINS_GARMENTS.map((g) => (
                    <Grid item xs={6} sm={4} key={g.value}>
                      <Paper
                        onClick={() => setGarmentType(g.value)}
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          cursor: 'pointer',
                          border: garmentType === g.value ? '3px solid #9C27B0' : '2px solid transparent',
                          bgcolor: garmentType === g.value ? '#F3E5F5' : 'white',
                          transition: 'all 0.2s',
                          '&:hover': { transform: 'scale(1.05)', boxShadow: 3 },
                        }}
                      >
                        <Typography variant="h6">{g.value === garmentType && '✓ '}{g.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{g.desc}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* ── SILHOUETTE (only for dresses) ── */}
            {garmentType === 'dress' && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>👗 DRESS SILHOUETTE</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {DRESS_SILHOUETTES.map((s) => (
                    <Grid item xs={6} sm={4} key={s.value}>
                      <Paper
                        onClick={() => setSilhouette(s.value)}
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          cursor: 'pointer',
                          border: silhouette === s.value
                            ? '2px solid #ff6f00'
                            : '2px solid #e0e0e0',
                          background: silhouette === s.value ? '#fff3e0' : 'white',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: '#ff8f00', transform: 'translateY(-2px)' },
                        }}
                      >
                        <Typography variant="h4" sx={{ mb: 0.5 }}>{s.icon}</Typography>
                        <Typography variant="subtitle2" fontWeight={600}>{s.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
            )}

            {/* ── NECKLINE ── */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>👔 NECKLINE</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {NECKLINES.map((n) => (
                    <Chip
                      key={n.value}
                      label={n.label}
                      onClick={() => setNeckline(n.value)}
                      variant={neckline === n.value ? 'filled' : 'outlined'}
                      color={neckline === n.value ? 'primary' : 'default'}
                      sx={{
                        fontWeight: neckline === n.value ? 700 : 400,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* ── SLEEVES ── */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>👕 SLEEVES</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControl component="fieldset">
                  <RadioGroup value={sleeve} onChange={(e) => setSleeve(e.target.value)}>
                    <Grid container spacing={1}>
                      {SLEEVES.map((s) => (
                        <Grid item xs={6} key={s.value}>
                          <FormControlLabel
                            value={s.value}
                            control={<Radio size="small" />}
                            label={<Typography variant="body2">{s.label}</Typography>}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </RadioGroup>
                </FormControl>
              </AccordionDetails>
            </Accordion>

            {/* ── LENGTH ── */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>📏 LENGTH</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <ToggleButtonGroup
                  value={length}
                  exclusive
                  onChange={(_, v) => v && setLength(v)}
                  fullWidth
                  size="small"
                >
                  {LENGTHS.map((l) => (
                    <ToggleButton key={l.value} value={l.value}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{l.label}</Typography>
                        <Typography variant="caption" display="block">{l.desc}</Typography>
                      </Box>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </AccordionDetails>
            </Accordion>

            {/* ── WAIST STYLE ── */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>⚡ WAIST STYLE</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {WAIST_STYLES.map((w) => (
                    <Chip
                      key={w.value}
                      label={w.label}
                      onClick={() => setWaist(w.value)}
                      variant={waist === w.value ? 'filled' : 'outlined'}
                      color={waist === w.value ? 'primary' : 'default'}
                      sx={{
                        fontWeight: waist === w.value ? 700 : 400,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* ── ADDITIONAL FEATURES ── */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>✨ FEATURES & DETAILS</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {FEATURES.map((f) => (
                    <Chip
                      key={f.value}
                      label={f.label}
                      onClick={() => toggleFeature(f.value)}
                      variant={features.includes(f.value) ? 'filled' : 'outlined'}
                      color={features.includes(f.value) ? 'secondary' : 'default'}
                      sx={{
                        fontWeight: features.includes(f.value) ? 700 : 400,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Select multiple features to add to your design
                </Typography>
              </AccordionDetails>
            </Accordion>

            {/* ── COLOUR ── */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>🎨 COLOUR</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {availableColours.map((c) => (
                    <Tooltip key={c.value} title={c.label}>
                      <Box
                        onClick={() => setBaseColour(c.value)}
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          backgroundColor: c.value,
                          border: baseColour === c.value
                            ? '3px solid #ff6f00'
                            : '2px solid #ccc',
                          cursor: 'pointer',
                          boxShadow: baseColour === c.value
                            ? '0 0 0 4px rgba(255,111,0,0.25)'
                            : 'none',
                          transition: 'all 0.15s',
                          '&:hover': { transform: 'scale(1.15)' },
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                  Selected: <strong>{BASE_COLOURS.find((c) => c.value === baseColour)?.label || baseColour}</strong>
                </Typography>
              </AccordionDetails>
            </Accordion>

            {/* ── PATTERN ── */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>🌟 PATTERN / PRINT</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {PATTERNS.map((p) => (
                    <Chip
                      key={p.value}
                      label={p.label}
                      onClick={() => setPattern(p.value)}
                      variant={pattern === p.value ? 'filled' : 'outlined'}
                      color={pattern === p.value ? 'primary' : 'default'}
                      size="medium"
                      sx={{
                        fontWeight: pattern === p.value ? 700 : 400,
                        cursor: 'pointer',
                        px: 2,
                      }}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* ── PERSONALIZATION (TEXT) ── */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>✍️ PERSONALIZATION</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, 20))}
                    placeholder="Baby's name or message..."
                    size="small"
                    fullWidth
                    helperText={`${text.length}/20 characters`}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />

                  <Box>
                    <Typography variant="caption" fontWeight={600} gutterBottom display="block">
                      Text Colour
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {TEXT_COLOURS.map((c) => (
                        <Tooltip key={c} title={c}>
                          <Box
                            onClick={() => setTextColour(c)}
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: c,
                              border: textColour === c
                                ? '3px solid #ff6f00'
                                : '2px solid #ccc',
                              cursor: 'pointer',
                              '&:hover': { transform: 'scale(1.15)' },
                              transition: 'transform 0.15s',
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" fontWeight={600} gutterBottom display="block">
                      Font Style
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {FONTS.map((f) => (
                        <Chip
                          key={f.value}
                          label={f.label}
                          onClick={() => setFontFamily(f.value)}
                          variant={fontFamily === f.value ? 'filled' : 'outlined'}
                          color={fontFamily === f.value ? 'primary' : 'default'}
                          sx={{
                            fontFamily: f.value,
                            fontWeight: fontFamily === f.value ? 700 : 400,
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>

            <Divider sx={{ my: 3 }} />

            {/* Add to Cart button */}
            <Button
              variant="contained"
              color="success"
              size="large"
              fullWidth
              startIcon={<ShoppingCart />}
              onClick={handleAddToCart}
              disabled={!product}
              sx={{ borderRadius: 5, fontWeight: 700, py: 2, fontSize: 16 }}
            >
              Add Custom Design to Cart
            </Button>
            
            <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ mt: 1.5 }}>
              ⏱ Made to order • Ships in 7-10 business days
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}

OutfitBuilder2D.propTypes = {
  product:      PropTypes.object,
  onAddToCart:  PropTypes.func.isRequired,
};
