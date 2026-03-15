import React, { useState, useRef, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, useFBX } from '@react-three/drei';
import * as THREE from 'three';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Alert,
  Fade,
  Zoom,
} from '@mui/material';
import {
  VolumeUp,
  Quiz,
  School,
  EmojiEvents,
  Refresh,
  Visibility,
  HearingOutlined,
  PanTool,
  MoodOutlined,
  DirectionsWalk,
  Psychology,
  Favorite,
  Face,
  ChildCare,
  Person,
  BabyChangingStation,
  ArrowBack,
} from '@mui/icons-material';

/**
 * Position adjustments for different body types
 */
const BODY_TYPE_OFFSETS = {
  child: { x: 0, y: 0, z: 0 },
  adult: { x: 0, y: -0.1, z: 0 },
  baby: { x: 0, y: -0.2, z: 0 },
  fbx: { x: 0, y: 0, z: 0 },
};

/**
 * Normalized [0..1] anchors for FBX marker placement.
 * These are mapped to the loaded model's bounding box for reliable alignment.
 */
const FBX_PART_ANCHORS = {
  head: [0.5, 0.92, 0.58],
  eyes: [0.5, 0.89, 0.62],
  'ears-left': [0.2, 0.87, 0.52],
  'ears-right': [0.8, 0.87, 0.52],
  neck: [0.5, 0.79, 0.55],
  'shoulder-left': [0.33, 0.72, 0.5],
  'shoulder-right': [0.67, 0.72, 0.5],
  stomach: [0.5, 0.56, 0.55],
  'hands-left': [0.16, 0.45, 0.52],
  'hands-right': [0.84, 0.45, 0.52],
  'finger-left': [0.08, 0.39, 0.56],
  'finger-right': [0.92, 0.39, 0.56],
  'knee-left': [0.44, 0.25, 0.56],
  'knee-right': [0.56, 0.25, 0.56],
  'feet-left': [0.45, 0.06, 0.54],
  'feet-right': [0.55, 0.06, 0.54],
  'toe-left': [0.45, 0.02, 0.62],
  'toe-right': [0.55, 0.02, 0.62],
};

const FBX_MARKER_HINTS = {
  head: [/head/i, /neck_0?1/i],
  eyes: [/eye/i, /eyeball/i],
  'ears-left': [/(left|_l\b|\.l\b| l\b).*ear/i, /ear.*(left|_l\b|\.l\b| l\b)/i],
  'ears-right': [/(right|_r\b|\.r\b| r\b).*ear/i, /ear.*(right|_r\b|\.r\b| r\b)/i],
  neck: [/neck/i, /spine0?4/i, /spine0?3/i],
  'shoulder-left': [/(left|_l\b|\.l\b| l\b).*(shoulder|clavicle)/i, /(shoulder|clavicle).*(left|_l\b|\.l\b| l\b)/i],
  'shoulder-right': [/(right|_r\b|\.r\b| r\b).*(shoulder|clavicle)/i, /(shoulder|clavicle).*(right|_r\b|\.r\b| r\b)/i],
  stomach: [/spine0?2/i, /spine0?1/i, /pelvis/i, /hips?/i],
  'hands-left': [/(left|_l\b|\.l\b| l\b).*hand/i, /hand.*(left|_l\b|\.l\b| l\b)/i],
  'hands-right': [/(right|_r\b|\.r\b| r\b).*hand/i, /hand.*(right|_r\b|\.r\b| r\b)/i],
  'finger-left': [/(left|_l\b|\.l\b| l\b).*(finger|thumb|index)/i, /(finger|thumb|index).*(left|_l\b|\.l\b| l\b)/i],
  'finger-right': [/(right|_r\b|\.r\b| r\b).*(finger|thumb|index)/i, /(finger|thumb|index).*(right|_r\b|\.r\b| r\b)/i],
  'knee-left': [/(left|_l\b|\.l\b| l\b).*knee/i, /knee.*(left|_l\b|\.l\b| l\b)/i],
  'knee-right': [/(right|_r\b|\.r\b| r\b).*knee/i, /knee.*(right|_r\b|\.r\b| r\b)/i],
  'feet-left': [/(left|_l\b|\.l\b| l\b).*(foot|ankle)/i, /(foot|ankle).*(left|_l\b|\.l\b| l\b)/i],
  'feet-right': [/(right|_r\b|\.r\b| r\b).*(foot|ankle)/i, /(foot|ankle).*(right|_r\b|\.r\b| r\b)/i],
  'toe-left': [/(left|_l\b|\.l\b| l\b).*toe/i, /toe.*(left|_l\b|\.l\b| l\b)/i],
  'toe-right': [/(right|_r\b|\.r\b| r\b).*toe/i, /toe.*(right|_r\b|\.r\b| r\b)/i],
};

const extractFbxMarkerPositions = (fbxRoot) => {
  const namedNodes = [];

  fbxRoot.updateMatrixWorld(true);
  fbxRoot.traverse((node) => {
    if (!node.name) return;
    const wp = new THREE.Vector3();
    node.getWorldPosition(wp);
    namedNodes.push({
      name: node.name.toLowerCase(),
      position: [wp.x, wp.y, wp.z],
    });
  });

  const markerMap = {};
  Object.entries(FBX_MARKER_HINTS).forEach(([partId, patterns]) => {
    const match = namedNodes.find((n) => patterns.some((re) => re.test(n.name)));
    if (match) markerMap[partId] = match.position;
  });

  return markerMap;
};

const getFbxBodyPartPosition = (partId, fbxBounds) => {
  if (!fbxBounds) return null;
  if (fbxBounds.markers?.[partId]) return fbxBounds.markers[partId];
  const anchor = FBX_PART_ANCHORS[partId];
  if (!anchor) return null;

  const [ax, ay, az] = anchor;
  const { min, size } = fbxBounds;
  return [
    min.x + size.x * ax,
    min.y + size.y * ay,
    min.z + size.z * az,
  ];
};

/**
 * Body part data with educational information
 */
const BODY_PARTS = [
  {
    id: 'head',
    name: 'Head',
    position: [0, 0.85, 0.1],
    color: '#CE93D8',
    icon: '👤',
    muiIcon: Person,
    description: 'This is our head!',
    funFact: 'The head contains our brain and face.',
    quiz: 'Which body part is at the top?',
  },
  {
    id: 'eyes',
    name: 'Eyes',
    position: [0, 0.6, 0.35],
    color: '#4FC3F7',
    icon: '👀',
    muiIcon: Visibility,
    description: 'We see with our eyes!',
    funFact: 'Eyes help us see colors, shapes, and everything around us.',
    quiz: 'Which body part helps us see?',
  },
  {
    id: 'ears-left',
    name: 'Ears',
    position: [-0.35, 0.55, 0.0],
    color: '#FFB74D',
    icon: '👂',
    muiIcon: HearingOutlined,
    description: 'We hear with our ears!',
    funFact: 'Ears help us hear music, voices, and sounds.',
    quiz: 'Which body part helps us hear?',
  },
  {
    id: 'ears-right',
    name: 'Ears',
    position: [0.35, 0.55, 0.0],
    color: '#FFB74D',
    icon: '👂',
    muiIcon: HearingOutlined,
    description: 'We hear with our ears!',
    funFact: 'Ears help us hear music, voices, and sounds.',
    quiz: 'Which body part helps us hear?',
  },
  {
    id: 'neck',
    name: 'Neck',
    position: [0, 0.25, 0.2],
    color: '#FFD54F',
    icon: '🔗',
    muiIcon: Face,
    description: 'Our neck connects our head to our body!',
    funFact: 'The neck helps us turn our head.',
    quiz: 'Which body part connects the head to the body?',
  },
  {
    id: 'shoulder-left',
    name: 'Shoulder',
    position: [-0.25, 0.15, 0.1],
    color: '#A5D6A7',
    icon: '💪',
    muiIcon: Favorite,
    description: 'Our shoulders help us move our arms!',
    funFact: 'Shoulders connect our arms to our body.',
    quiz: 'Which body part helps us move our arms?',
  },
  {
    id: 'shoulder-right',
    name: 'Shoulder',
    position: [0.25, 0.15, 0.1],
    color: '#A5D6A7',
    icon: '💪',
    muiIcon: Favorite,
    description: 'Our shoulders help us move our arms!',
    funFact: 'Shoulders connect our arms to our body.',
    quiz: 'Which body part helps us move our arms?',
  },
  {
    id: 'stomach',
    name: 'Stomach',
    position: [0, -0.15, 0.25],
    color: '#FFB74D',
    icon: '🍎',
    muiIcon: MoodOutlined,
    description: 'Our stomach digests food!',
    funFact: 'The stomach breaks down the food we eat.',
    quiz: 'Which body part digests food?',
  },
  {
    id: 'hands-left',
    name: 'Hand',
    position: [-0.5, -0.2, 0.1],
    color: '#81C784',
    icon: '🖐',
    muiIcon: PanTool,
    description: 'We hold things with our hands!',
    funFact: 'Hands help us touch, hold, and feel things.',
    quiz: 'Which body part helps us hold things?',
  },
  {
    id: 'hands-right',
    name: 'Hand',
    position: [0.5, -0.2, 0.1],
    color: '#81C784',
    icon: '🖐',
    muiIcon: PanTool,
    description: 'We hold things with our hands!',
    funFact: 'Hands help us touch, hold, and feel things.',
    quiz: 'Which body part helps us hold things?',
  },
  {
    id: 'finger-left',
    name: 'Finger',
    position: [-0.55, -0.3, 0.15],
    color: '#90CAF9',
    icon: '☝️',
    muiIcon: PanTool,
    description: 'We have fingers on our hands!',
    funFact: 'Fingers help us pick up small things.',
    quiz: 'Which body part helps us point?',
  },
  {
    id: 'finger-right',
    name: 'Finger',
    position: [0.55, -0.3, 0.15],
    color: '#90CAF9',
    icon: '☝️',
    muiIcon: PanTool,
    description: 'We have fingers on our hands!',
    funFact: 'Fingers help us pick up small things.',
    quiz: 'Which body part helps us point?',
  },
  {
    id: 'knee-left',
    name: 'Knee',
    position: [-0.1, -0.75, 0.15],
    color: '#FFAB91',
    icon: '🦵',
    muiIcon: DirectionsWalk,
    description: 'Our knees help us bend our legs!',
    funFact: 'Knees help us walk, run, and jump.',
    quiz: 'Which body part helps us bend our legs?',
  },
  {
    id: 'knee-right',
    name: 'Knee',
    position: [0.1, -0.75, 0.15],
    color: '#FFAB91',
    icon: '🦵',
    muiIcon: DirectionsWalk,
    description: 'Our knees help us bend our legs!',
    funFact: 'Knees help us walk, run, and jump.',
    quiz: 'Which body part helps us bend our legs?',
  },
  {
    id: 'feet-left',
    name: 'Foot',
    position: [-0.13, -1.35, 0.15],
    color: '#9575CD',
    icon: '🦶',
    muiIcon: DirectionsWalk,
    description: 'We walk with our feet!',
    funFact: 'Feet help us walk, run, and jump.',
    quiz: 'Which body part helps us walk?',
  },
  {
    id: 'feet-right',
    name: 'Foot',
    position: [0.13, -1.35, 0.15],
    color: '#9575CD',
    icon: '🦶',
    muiIcon: DirectionsWalk,
    description: 'We walk with our feet!',
    funFact: 'Feet help us walk, run, and jump.',
    quiz: 'Which body part helps us walk?',
  },
  {
    id: 'toe-left',
    name: 'Toe',
    position: [-0.13, -1.42, 0.2],
    color: '#F48FB1',
    icon: '🦶',
    muiIcon: DirectionsWalk,
    description: 'We have toes on our feet!',
    funFact: 'Toes help us balance when we stand.',
    quiz: 'Which body part is at the end of our foot?',
  },
  {
    id: 'toe-right',
    name: 'Toe',
    position: [0.13, -1.42, 0.2],
    color: '#F48FB1',
    icon: '🦶',
    muiIcon: DirectionsWalk,
    description: 'We have toes on our feet!',
    funFact: 'Toes help us balance when we stand.',
    quiz: 'Which body part is at the end of our foot?',
  },
];

/**
 * Error boundary — catches FBX loading failures and shows a friendly message
 */
class ModelErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <Html center distanceFactor={10}>
          <div style={{
            background: 'rgba(20,20,20,0.92)', color: '#ff9800',
            padding: '14px 20px', borderRadius: 10, textAlign: 'center', maxWidth: 260,
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
            <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>FBX File Not Found</div>
            <div style={{ fontSize: 11, color: '#ccc', lineHeight: 1.6 }}>
              Drop your file at:<br />
              <code style={{ color: '#4fc3f7' }}>public/models/body/human-body.fbx</code>
            </div>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

/** Spinning torus shown while FBX is loading */
const FBXLoadingMesh = () => {
  const meshRef = useRef();
  useFrame((s) => { if (meshRef.current) meshRef.current.rotation.y = s.clock.elapsedTime * 2; });
  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[0.35, 0.06, 8, 24]} />
      <meshStandardMaterial color="#667eea" wireframe />
    </mesh>
  );
};

/**
 * Loads /public/models/body/human-body.fbx, auto-normalises scale/centre,
 * and renders it so the existing body-part dot markers line up correctly.
 */
const FBXBodyMesh = ({ onBoundsReady }) => {
  const fbx = useFBX('/models/body/human-body.fbx');
  React.useEffect(() => {
    const box = new THREE.Box3().setFromObject(fbx);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      fbx.scale.setScalar(2.5 / maxDim);
      const scaledBox = new THREE.Box3().setFromObject(fbx);
      const center = scaledBox.getCenter(new THREE.Vector3());
      fbx.position.set(-center.x, -center.y, -center.z);

      const alignedBox = new THREE.Box3().setFromObject(fbx);
      const alignedSize = alignedBox.getSize(new THREE.Vector3());
      const markers = extractFbxMarkerPositions(fbx);
      onBoundsReady?.({
        min: alignedBox.min.clone(),
        size: alignedSize.clone(),
        markers,
      });
    }
  }, [fbx, onBoundsReady]);

  return <primitive object={fbx} />;
};

/**
 * Interactive Body Part (3D clickable sphere)
 */
const BodyPart = ({ part, onClick, isActive, isHovered, onHover, bodyType = 'child', positionOverride = null }) => {
  const meshRef = useRef();
  
  // Adjust position based on body type
  const offset = BODY_TYPE_OFFSETS[bodyType] || BODY_TYPE_OFFSETS.child;
  const basePosition = positionOverride || part.position;
  const adjustedPosition = [
    basePosition[0] + offset.x,
    basePosition[1] + offset.y,
    basePosition[2] + offset.z,
  ];
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = adjustedPosition[1] + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      
      // Pulse when active
      if (isActive) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
        meshRef.current.scale.set(scale, scale, scale);
      } else if (isHovered) {
        meshRef.current.scale.set(1.2, 1.2, 1.2);
      } else {
        meshRef.current.scale.set(1, 1, 1);
      }
    }
  });

  return (
    <group
      ref={meshRef}
      position={adjustedPosition}
      onClick={() => onClick(part)}
      onPointerOver={() => onHover(part.id)}
      onPointerOut={() => onHover(null)}
    >
      {/* Small glowing dot marker */}
      <mesh>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial
          color={part.color}
          emissive={part.color}
          emissiveIntensity={isActive ? 2.5 : isHovered ? 1.8 : 0.8}
          roughness={0.05}
          metalness={1.0}
          toneMapped={false}
        />
      </mesh>
      
      {/* Outer glow halo when active/hovered */}
      {(isActive || isHovered) && (
        <mesh>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial
            color={part.color}
            transparent
            opacity={isActive ? 0.4 : 0.25}
            toneMapped={false}
          />
        </mesh>
      )}
      
      {/* Label */}
      {(isHovered || isActive) && (
        <Html center distanceFactor={10}>
          <div
            style={{
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {part.icon} {part.name}
          </div>
        </Html>
      )}
    </group>
  );
};

/**
 * Child Body (using image texture)
 */
const ChildBody = () => {
  const textureRef = useRef();
  
  React.useEffect(() => {
    // Load the actual cartoon child image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/images/body-learning/child-character.png';
    
    img.onload = () => {
      if (textureRef.current) {
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        textureRef.current.map = texture;
        textureRef.current.needsUpdate = true;
      }
    };
    
    // Fallback: Use canvas-drawn character if image fails to load
    img.onerror = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      
      // Background
      ctx.fillStyle = 'rgba(255,255,255,0)';
      ctx.fillRect(0, 0, 512, 640);
      
      // Draw simple child character
      // Head with brown hair
      ctx.fillStyle = '#8B5A3C';
      ctx.beginPath();
      ctx.arc(256, 120, 80, Math.PI, Math.PI * 2);
      ctx.fill();
      
      // Face
      ctx.fillStyle = '#FFD7B5';
      ctx.beginPath();
      ctx.arc(256, 140, 70, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(235, 135, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(277, 135, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Smile
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(256, 145, 25, 0.2, Math.PI - 0.2);
      ctx.stroke();
      
      // Ears
      ctx.fillStyle = '#FFD7B5';
      ctx.beginPath();
      ctx.ellipse(195, 140, 15, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(317, 140, 15, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Body - blue overalls
      ctx.fillStyle = '#5DADE2';
      ctx.fillRect(206, 220, 100, 200);
      
      // Overalls straps
      ctx.fillStyle = '#5DADE2';
      ctx.fillRect(220, 210, 12, 30);
      ctx.fillRect(280, 210, 12, 30);
      
      // Buttons
      ctx.fillStyle = '#F4D03F';
      ctx.beginPath();
      ctx.arc(226, 230, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(286, 230, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Shirt under overalls
      ctx.fillStyle = '#A8E6CF';
      ctx.fillRect(216, 220, 80, 60);
      
      // Arms
      ctx.fillStyle = '#FFD7B5';
      ctx.fillRect(166, 240, 35, 120);
      ctx.fillRect(311, 240, 35, 120);
      
      // Legs
      ctx.fillStyle = '#5DADE2';
      ctx.fillRect(216, 420, 35, 120);
      ctx.fillRect(261, 420, 35, 120);
      
      // Shoes
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(211, 535, 45, 20);
      ctx.fillRect(256, 535, 45, 20);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      if (textureRef.current) {
        textureRef.current.map = texture;
        textureRef.current.needsUpdate = true;
      }
    };
  }, []);
  
  return (
    <mesh position={[0, -0.2, 0]}>
      <planeGeometry args={[2.2, 2.8]} />
      <meshBasicMaterial ref={textureRef} transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  );
};

/**
 * Adult Body (elegant woman) - positioned lower
 */
const AdultBody = () => {
  const textureRef = useRef();
  
  React.useEffect(() => {
    // Load the actual adult image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/images/body-learning/8e935bbe48064e22b213c44387ed8421.png';
    
    img.onload = () => {
      if (textureRef.current) {
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        textureRef.current.map = texture;
        textureRef.current.needsUpdate = true;
      }
    };
    
    // Fallback: Use canvas-drawn character if image fails to load
    img.onerror = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 768;
      const ctx = canvas.getContext('2d');
      
      // Background
      ctx.fillStyle = 'rgba(255,255,255,0)';
        ctx.fillRect(0, 0, 512, 768);
      
      // Draw adult woman
      // Hair (brown, flowing)
      ctx.fillStyle = '#6B4423';
      ctx.beginPath();
      ctx.arc(256, 95, 65, 0, Math.PI * 2);
      ctx.fill();
      
      // Hair sides
      ctx.fillStyle = '#6B4423';
      ctx.beginPath();
      ctx.ellipse(205, 95, 40, 65, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(307, 95, 40, 65, 0.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Face
      ctx.fillStyle = '#FFE4C4';
      ctx.beginPath();
      ctx.arc(256, 105, 50, 0, Math.PI * 2);
      ctx.fill();
      
      // Eyes (blue)
      ctx.fillStyle = '#4A90E2';
      ctx.beginPath();
      ctx.arc(238, 100, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(274, 100, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Pupils
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(238, 100, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(274, 100, 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Smile
      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(256, 110, 15, 0.3, Math.PI - 0.3);
      ctx.stroke();
      
      // Neck
      ctx.fillStyle = '#FFE4C4';
      ctx.fillRect(238, 150, 36, 28);
      
      // Red cardigan
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(186, 178, 140, 190);
      
      // White shirt
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(222, 188, 68, 140);
      
      // Cardigan buttons
      ctx.fillStyle = '#333';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(210, 200 + i * 30, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Gray skirt (A-line)
      ctx.fillStyle = '#A9A9A9';
      ctx.beginPath();
      ctx.moveTo(206, 368);
      ctx.lineTo(175, 530);
      ctx.lineTo(337, 530);
      ctx.lineTo(306, 368);
      ctx.closePath();
      ctx.fill();
      
      // Arms
      ctx.fillStyle = '#E74C3C';
      ctx.fillRect(146, 198, 32, 130);
      ctx.fillRect(334, 198, 32, 130);
      
      // Hands
      ctx.fillStyle = '#FFE4C4';
      ctx.beginPath();
      ctx.arc(162, 328, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(350, 328, 16, 0, Math.PI * 2);
      ctx.fill();
      
      // Legs (visible below skirt)
      ctx.fillStyle = '#FFE4C4';
      ctx.fillRect(216, 530, 32, 95);
      ctx.fillRect(264, 530, 32, 95);
      
      // Brown shoes
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.ellipse(232, 630, 23, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(280, 630, 23, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      if (textureRef.current) {
        textureRef.current.map = texture;
        textureRef.current.needsUpdate = true;
      }
    };
  }, []);
  
  return (
    <mesh position={[0, -0.3, 0]}>
      <planeGeometry args={[2, 3]} />
      <meshBasicMaterial ref={textureRef} transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  );
};

/**
 * Baby Body (cute sitting baby) - positioned lower
 */
const BabyBody = () => {
  const textureRef = useRef();
  
  React.useEffect(() => {
    // Load the actual baby image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/images/body-learning/baby 55.png';
    
    img.onload = () => {
      if (textureRef.current) {
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        textureRef.current.map = texture;
        textureRef.current.needsUpdate = true;
      }
    };
    
    // Fallback: Use canvas-drawn character if image fails to load
    img.onerror = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      // Background
      ctx.fillStyle = 'rgba(255,255,255,0)';
      ctx.fillRect(0, 0, 512, 512);
      
      // Draw cute baby - sitting pose
      // Big head
      ctx.fillStyle = '#6B4423';
      ctx.beginPath();
      ctx.arc(256, 130, 85, Math.PI, Math.PI * 2);
      ctx.fill();
      
      // Hair tuft
      ctx.fillStyle = '#6B4423';
      ctx.beginPath();
      ctx.arc(256, 70, 35, 0, Math.PI * 2);
      ctx.fill();
      
      // Face
      ctx.fillStyle = '#FFE4C4';
      ctx.beginPath();
      ctx.arc(256, 145, 75, 0, Math.PI * 2);
      ctx.fill();
      
      // Rosy cheeks
      ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
      ctx.beginPath();
      ctx.arc(205, 155, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(307, 155, 22, 0, Math.PI * 2);
      ctx.fill();
      
      // Big eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(233, 140, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(279, 140, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Eye highlights
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(236, 137, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(282, 137, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Big smile
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(256, 150, 30, 0.3, Math.PI - 0.3);
      ctx.stroke();
      
      // Ears
      ctx.fillStyle = '#FFE4C4';
      ctx.beginPath();
      ctx.ellipse(185, 145, 18, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(327, 145, 18, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Body - white shirt
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(256, 290, 80, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Gray pants
      ctx.fillStyle = '#B0B0B0';
      ctx.fillRect(198, 330, 116, 80);
      
      // Chubby arms
      ctx.fillStyle = '#FFE4C4';
      ctx.beginPath();
      ctx.ellipse(170, 290, 25, 55, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(342, 290, 25, 55, 0.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Sitting legs
      ctx.fillStyle = '#B0B0B0';
      ctx.fillRect(188, 400, 55, 45);
      ctx.fillRect(269, 400, 55, 45);
      
      // Feet
      ctx.fillStyle = '#FFE4C4';
      ctx.beginPath();
      ctx.ellipse(215, 440, 28, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(296, 440, 28, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      if (textureRef.current) {
        textureRef.current.map = texture;
        textureRef.current.needsUpdate = true;
      }
    };
  }, []);
  
  return (
    <mesh position={[0, -0.5, 0]}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial ref={textureRef} transparent opacity={1} side={THREE.DoubleSide} />
    </mesh>
  );
};

/**
 * 3D Scene Component
 */
const Scene3D = ({ onPartClick, activePart, hoveredPart, onHover, bodyType, fbxBounds, onFbxBoundsReady }) => {
  const BodyComponent = bodyType === 'adult' ? AdultBody : bodyType === 'baby' ? BabyBody : bodyType === 'fbx' ? null : ChildBody;
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, 5, -5]} intensity={0.4} />
      
      {/* Selected Body Type */}
      {bodyType === 'fbx' ? (
        <ModelErrorBoundary>
          <Suspense fallback={<FBXLoadingMesh />}>
            <FBXBodyMesh onBoundsReady={onFbxBoundsReady} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <BodyComponent />
      )}
      
      {/* Interactive Body Parts */}
      {BODY_PARTS.map((part) => (
        
        <BodyPart
          key={part.id}
          part={part}
          onClick={onPartClick}
          isActive={activePart?.id === part.id}
          isHovered={hoveredPart === part.id}
          onHover={onHover}
          bodyType={bodyType}
          positionOverride={bodyType === 'fbx' ? getFbxBodyPartPosition(part.id, fbxBounds) : null}
        />
      ))}
      
      {/* Camera Controls */}
      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={5}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
};

/**
 * Main Virtual Body Learning Component
 */
const VirtualBodyLearning = ({ child, onComplete }) => {
  const navigate = useNavigate();
  const [selectedPart, setSelectedPart] = useState(null);
  const [hoveredPart, setHoveredPart] = useState(null);
  const [mode, setMode] = useState('explore'); // 'explore' or 'quiz'
  const [score, setScore] = useState(0);
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [learnedParts, setLearnedParts] = useState(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [bodyType, setBodyType] = useState('child'); // 'child', 'adult', or 'baby'
  const [fbxBounds, setFbxBounds] = useState(null);

  const handlePartClick = (part) => {
    setSelectedPart(part);
    
    if (mode === 'explore') {
      // Explore mode - show information
      setLearnedParts(prev => new Set([...prev, part.name]));
      speakText(part.description);
    } else if (mode === 'quiz') {
      // Quiz mode - check answer
      if (quizQuestion && quizQuestion.name === part.name) {
        setScore(prev => prev + 1);
        setShowCelebration(true);
        speakText('Correct! ' + part.description);
        setTimeout(() => {
          setShowCelebration(false);
          nextQuizQuestion();
        }, 2000);
      } else {
        speakText('Try again!');
      }
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.2;
      utterance.volume = 1;
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      window.speechSynthesis.speak(utterance);
    }
  };

  const startQuizMode = () => {
    setMode('quiz');
    setScore(0);
    setSelectedPart(null);
    nextQuizQuestion();
  };

  const nextQuizQuestion = () => {
    // Get unique body parts (no duplicates)
    const uniqueParts = BODY_PARTS.filter((part, index, self) =>
      index === self.findIndex((t) => t.name === part.name)
    );
    const randomPart = uniqueParts[Math.floor(Math.random() * uniqueParts.length)];
    setQuizQuestion(randomPart);
    speakText(randomPart.quiz);
  };

  const resetExploreMode = () => {
    setMode('explore');
    setSelectedPart(null);
    setQuizQuestion(null);
    setLearnedParts(new Set());
  };

  const handleClose = () => {
    // Navigate back to Learning Games tab in parent dashboard
    navigate('/dashboard', { state: { initialTab: 11 } });
  };

  const PartIcon = selectedPart?.muiIcon || School;

  return (
    <Box sx={{ height: '100vh', width: '100%', bgcolor: '#f0f4f8', position: 'relative' }}>
      {/* Header */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          p: 2,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <School sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                🧒 Virtual Body Learning Room
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {mode === 'explore'
                  ? 'Click on body parts to learn!'
                  : `Quiz Mode - Score: ${score}`}
              </Typography>
            </Box>
          </Stack>
          
          <Stack direction="row" spacing={1}>
            {mode === 'explore' ? (
              <Button
                variant="contained"
                color="success"
                startIcon={<Quiz />}
                onClick={startQuizMode}
                sx={{ bgcolor: '#4caf50' }}
              >
                Start Quiz
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={resetExploreMode}
                sx={{ bgcolor: '#ff9800' }}
              >
                Explore Mode
              </Button>
            )}
            <IconButton onClick={handleClose} sx={{ color: 'white' }}>
              <ArrowBack />
            </IconButton>
          </Stack>
        </Stack>
        
        {/* Body Type Selector */}
        <Stack direction="row" spacing={1} mt={2} justifyContent="center">
          <Chip
            icon={<ChildCare />}
            label="Child"
            onClick={() => setBodyType('child')}
            color={bodyType === 'child' ? 'primary' : 'default'}
            variant={bodyType === 'child' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer', fontWeight: bodyType === 'child' ? 'bold' : 'normal' }}
          />
          <Chip
            icon={<Person />}
            label="Adult"
            onClick={() => setBodyType('adult')}
            color={bodyType === 'adult' ? 'primary' : 'default'}
            variant={bodyType === 'adult' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer', fontWeight: bodyType === 'adult' ? 'bold' : 'normal' }}
          />
          <Chip
            icon={<BabyChangingStation />}
            label="Baby"
            onClick={() => setBodyType('baby')}
            color={bodyType === 'baby' ? 'primary' : 'default'}
            variant={bodyType === 'baby' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer', fontWeight: bodyType === 'baby' ? 'bold' : 'normal' }}
          />
          <Chip
            label="🗂️ 3D (Your FBX)"
            onClick={() => setBodyType('fbx')}
            color={bodyType === 'fbx' ? 'warning' : 'default'}
            variant={bodyType === 'fbx' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer', fontWeight: bodyType === 'fbx' ? 'bold' : 'normal' }}
          />
        </Stack>
      </Paper>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.5, 3], fov: 50 }}
        style={{ height: '100%', width: '100%' }}
      >
        <Scene3D
          onPartClick={handlePartClick}
          activePart={selectedPart}
          hoveredPart={hoveredPart}
          onHover={setHoveredPart}
          bodyType={bodyType}
          fbxBounds={fbxBounds}
          onFbxBoundsReady={setFbxBounds}
        />
      </Canvas>

      {/* Quiz Question */}
      {mode === 'quiz' && quizQuestion && (
        <Zoom in={true}>
          <Paper
            elevation={6}
            sx={{
              position: 'absolute',
              top: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              p: 3,
              bgcolor: '#fff',
              borderRadius: 3,
              minWidth: 300,
              textAlign: 'center',
              border: '3px solid #667eea',
            }}
          >
            <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
              {quizQuestion.icon} {quizQuestion.quiz}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click on the correct body part!
            </Typography>
          </Paper>
        </Zoom>
      )}

      {/* Information Panel */}
      {selectedPart && mode === 'explore' && (
        <Fade in={true}>
          <Card
            sx={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              minWidth: 350,
              maxWidth: 500,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              borderRadius: 3,
              border: `3px solid ${selectedPart.color}`,
            }}
          >
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: selectedPart.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                  }}
                >
                  {selectedPart.icon}
                </Box>
                <Box flex={1}>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {selectedPart.name}
                  </Typography>
                  <Chip
                    icon={<PartIcon />}
                    label={selectedPart.description}
                    color="primary"
                    size="small"
                  />
                </Box>
                <IconButton
                  onClick={() => speakText(selectedPart.funFact)}
                  color="primary"
                  size="large"
                >
                  <VolumeUp />
                </IconButton>
              </Stack>
              
              <Alert severity="info" icon={<Psychology />}>
                <Typography variant="body2">
                  <strong>Fun Fact:</strong> {selectedPart.funFact}
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Fade>
      )}

      {/* Celebration */}
      {showCelebration && (
        <Zoom in={true}>
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              p: 4,
              bgcolor: '#4caf50',
              color: 'white',
              borderRadius: 4,
              textAlign: 'center',
            }}
          >
            <EmojiEvents sx={{ fontSize: 80 }} />
            <Typography variant="h3" fontWeight="bold">
              Correct! 🎉
            </Typography>
          </Paper>
        </Zoom>
      )}

      {/* Progress Tracker */}
      {mode === 'explore' && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            p: 2,
            borderRadius: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Parts Learned
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="primary">
            {learnedParts.size} / {new Set(BODY_PARTS.map(p => p.name)).size}
          </Typography>
        </Paper>
      )}

      {/* Instructions */}
      <Paper
        elevation={2}
        sx={{
          position: 'absolute',
          top: 90,
          left: 20,
          p: 2,
          bgcolor: 'rgba(255,255,255,0.95)',
          borderRadius: 2,
          maxWidth: 250,
        }}
      >
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">
          📖 How to Play:
        </Typography>
        {bodyType === 'fbx' && (
          <Typography variant="caption" sx={{ display: 'block', color: '#ff9800', mb: 0.5, fontSize: '0.72rem', lineHeight: 1.5 }}>
            📁 Place your FBX at:<br />
            <code>public/models/body/human-body.fbx</code>
          </Typography>
        )}
        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
          {mode === 'explore' ? (
            <>
              • Rotate the 3D model by dragging
              <br />
              • Click colored dots to learn
              <br />
              • Listen to the voice description
              <br />• Start quiz when ready!
            </>
          ) : (
            <>
              • Listen to the question
              <br />
              • Click the correct body part
              <br />• Earn points for correct answers!
            </>
          )}
        </Typography>
      </Paper>
    </Box>
  );
};

export default VirtualBodyLearning;
