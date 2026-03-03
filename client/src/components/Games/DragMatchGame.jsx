import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Close,
  Refresh,
  Star,
  EmojiEvents,
  NavigateNext,
  NavigateBefore,
  ArrowBack,
} from '@mui/icons-material';

/**
 * DragMatchGame Component
 * 
 * Educational drag-and-drop matching game for children
 * - Multiple game types: Shapes, Animals, Numbers, Colors, Letters
 * - Touch and mouse support
 * - Progressive difficulty levels
 * - Visual and audio feedback
 * - Score tracking
 * - No camera or 3D required
 */
const DragMatchGame = ({ child, onComplete }) => {
  const navigate = useNavigate();
  const [gameType, setGameType] = useState(null); // 'shapes', 'animals', 'numbers', 'colors', 'letters'
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [items, setItems] = useState([]);
  const [targets, setTargets] = useState([]);
  const [matched, setMatched] = useState([]);
  const [recentlyMatched, setRecentlyMatched] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [feedback, setFeedback] = useState({ show: false, type: '', message: '' });
  const [showCelebration, setShowCelebration] = useState(false);
  
  const dragItemRef = useRef(null);
  const touchOffsetRef = useRef({ x: 0, y: 0 });

  // Game content definitions
  const gameContent = {
    shapes: {
      title: 'Match the Shapes',
      icon: '🔷',
      color: '#2196f3',
      levels: [
        {
          items: [
            { id: 'circle', name: 'Circle', emoji: '🔵', color: '#2196f3' },
            { id: 'square', name: 'Square', emoji: '🟦', color: '#1976d2' },
            { id: 'triangle', name: 'Triangle', emoji: '🔺', color: '#0d47a1' },
          ]
        },
        {
          items: [
            { id: 'circle', name: 'Circle', emoji: '🔵', color: '#2196f3' },
            { id: 'square', name: 'Square', emoji: '🟦', color: '#1976d2' },
            { id: 'triangle', name: 'Triangle', emoji: '🔺', color: '#0d47a1' },
            { id: 'star', name: 'Star', emoji: '⭐', color: '#ffd700' },
            { id: 'heart', name: 'Heart', emoji: '❤️', color: '#e91e63' },
          ]
        }
      ]
    },
    animals: {
      title: 'Match Animals to Habitats',
      icon: '🦁',
      color: '#4caf50',
      levels: [
        {
          items: [
            { id: 'fish', name: 'Fish', emoji: '🐟', habitat: 'Water' },
            { id: 'bird', name: 'Bird', emoji: '🐦', habitat: 'Sky' },
            { id: 'dog', name: 'Dog', emoji: '🐕', habitat: 'Land' },
          ],
          targets: [
            { id: 'water', name: 'Water', emoji: '🌊', accepts: ['fish'] },
            { id: 'sky', name: 'Sky', emoji: '☁️', accepts: ['bird'] },
            { id: 'land', name: 'Land', emoji: '🌳', accepts: ['dog'] },
          ]
        },
        {
          items: [
            { id: 'fish', name: 'Fish', emoji: '🐟', habitat: 'Water' },
            { id: 'bird', name: 'Bird', emoji: '🐦', habitat: 'Sky' },
            { id: 'dog', name: 'Dog', emoji: '🐕', habitat: 'Land' },
            { id: 'whale', name: 'Whale', emoji: '🐋', habitat: 'Water' },
            { id: 'eagle', name: 'Eagle', emoji: '🦅', habitat: 'Sky' },
          ],
          targets: [
            { id: 'water', name: 'Water', emoji: '🌊', accepts: ['fish', 'whale'] },
            { id: 'sky', name: 'Sky', emoji: '☁️', accepts: ['bird', 'eagle'] },
            { id: 'land', name: 'Land', emoji: '🌳', accepts: ['dog'] },
          ]
        }
      ]
    },
    numbers: {
      title: 'Match Numbers to Quantities',
      icon: '🔢',
      color: '#ff9800',
      levels: [
        {
          items: [
            { id: '1', name: 'One', emoji: '1️⃣', quantity: 1 },
            { id: '2', name: 'Two', emoji: '2️⃣', quantity: 2 },
            { id: '3', name: 'Three', emoji: '3️⃣', quantity: 3 },
          ],
          targets: [
            { id: 'one', name: '⚽', emoji: '⚽', accepts: ['1'] },
            { id: 'two', name: '⚽⚽', emoji: '⚽⚽', accepts: ['2'] },
            { id: 'three', name: '⚽⚽⚽', emoji: '⚽⚽⚽', accepts: ['3'] },
          ]
        },
        {
          items: [
            { id: '1', name: 'One', emoji: '1️⃣', quantity: 1 },
            { id: '2', name: 'Two', emoji: '2️⃣', quantity: 2 },
            { id: '3', name: 'Three', emoji: '3️⃣', quantity: 3 },
            { id: '4', name: 'Four', emoji: '4️⃣', quantity: 4 },
            { id: '5', name: 'Five', emoji: '5️⃣', quantity: 5 },
          ],
          targets: [
            { id: 'one', name: '🍎', emoji: '🍎', accepts: ['1'] },
            { id: 'two', name: '🍎🍎', emoji: '🍎🍎', accepts: ['2'] },
            { id: 'three', name: '🍎🍎🍎', emoji: '🍎🍎🍎', accepts: ['3'] },
            { id: 'four', name: '🍎🍎🍎🍎', emoji: '🍎🍎🍎🍎', accepts: ['4'] },
            { id: 'five', name: '🍎🍎🍎🍎🍎', emoji: '🍎🍎🍎🍎🍎', accepts: ['5'] },
          ]
        }
      ]
    },
    colors: {
      title: 'Match the Colors',
      icon: '🎨',
      color: '#e91e63',
      levels: [
        {
          items: [
            { id: 'red', name: 'Red', emoji: '🔴', color: '#f44336' },
            { id: 'blue', name: 'Blue', emoji: '🔵', color: '#2196f3' },
            { id: 'yellow', name: 'Yellow', emoji: '🟡', color: '#ffeb3b' },
          ]
        },
        {
          items: [
            { id: 'red', name: 'Red', emoji: '🔴', color: '#f44336' },
            { id: 'blue', name: 'Blue', emoji: '🔵', color: '#2196f3' },
            { id: 'yellow', name: 'Yellow', emoji: '🟡', color: '#ffeb3b' },
            { id: 'green', name: 'Green', emoji: '🟢', color: '#4caf50' },
            { id: 'purple', name: 'Purple', emoji: '🟣', color: '#9c27b0' },
          ]
        }
      ]
    },
    letters: {
      title: 'Match Uppercase & Lowercase',
      icon: '🔤',
      color: '#9c27b0',
      levels: [
        {
          items: [
            { id: 'A', name: 'A', emoji: 'A', lowercase: 'a' },
            { id: 'B', name: 'B', emoji: 'B', lowercase: 'b' },
            { id: 'C', name: 'C', emoji: 'C', lowercase: 'c' },
          ],
          targets: [
            { id: 'a', name: 'a', emoji: 'a', accepts: ['A'] },
            { id: 'b', name: 'b', emoji: 'b', accepts: ['B'] },
            { id: 'c', name: 'c', emoji: 'c', accepts: ['C'] },
          ]
        },
        {
          items: [
            { id: 'A', name: 'A', emoji: 'A', lowercase: 'a' },
            { id: 'B', name: 'B', emoji: 'B', lowercase: 'b' },
            { id: 'C', name: 'C', emoji: 'C', lowercase: 'c' },
            { id: 'D', name: 'D', emoji: 'D', lowercase: 'd' },
            { id: 'E', name: 'E', emoji: 'E', lowercase: 'e' },
          ],
          targets: [
            { id: 'a', name: 'a', emoji: 'a', accepts: ['A'] },
            { id: 'b', name: 'b', emoji: 'b', accepts: ['B'] },
            { id: 'c', name: 'c', emoji: 'c', accepts: ['C'] },
            { id: 'd', name: 'd', emoji: 'd', accepts: ['D'] },
            { id: 'e', name: 'e', emoji: 'e', accepts: ['E'] },
          ]
        }
      ]
    },
    pictureLetters: {
      title: 'Picture to Letter Match',
      icon: '🍎',
      color: '#00bcd4',
      levels: [
        {
          items: [
            { id: 'apple', name: 'Apple', emoji: '🍎', letter: 'A' },
            { id: 'dog', name: 'Dog', emoji: '🐕', letter: 'D' },
            { id: 'cat', name: 'Cat', emoji: '🐱', letter: 'C' },
          ],
          targets: [
            { id: 'A', name: 'Letter A', emoji: 'A', accepts: ['apple'] },
            { id: 'D', name: 'Letter D', emoji: 'D', accepts: ['dog'] },
            { id: 'C', name: 'Letter C', emoji: 'C', accepts: ['cat'] },
          ]
        },
        {
          items: [
            { id: 'apple', name: 'Apple', emoji: '🍎', letter: 'A' },
            { id: 'ball', name: 'Ball', emoji: '⚽', letter: 'B' },
            { id: 'cat', name: 'Cat', emoji: '🐱', letter: 'C' },
            { id: 'dog', name: 'Dog', emoji: '🐕', letter: 'D' },
            { id: 'elephant', name: 'Elephant', emoji: '🐘', letter: 'E' },
          ],
          targets: [
            { id: 'A', name: 'Letter A', emoji: 'A', accepts: ['apple'] },
            { id: 'B', name: 'Letter B', emoji: 'B', accepts: ['ball'] },
            { id: 'C', name: 'Letter C', emoji: 'C', accepts: ['cat'] },
            { id: 'D', name: 'Letter D', emoji: 'D', accepts: ['dog'] },
            { id: 'E', name: 'Letter E', emoji: 'E', accepts: ['elephant'] },
          ]
        },
        {
          items: [
            { id: 'apple', name: 'Apple', emoji: '🍎', letter: 'A' },
            { id: 'ball', name: 'Ball', emoji: '⚽', letter: 'B' },
            { id: 'car', name: 'Car', emoji: '🚗', letter: 'C' },
            { id: 'duck', name: 'Duck', emoji: '🦆', letter: 'D' },
            { id: 'egg', name: 'Egg', emoji: '🥚', letter: 'E' },
            { id: 'fish', name: 'Fish', emoji: '🐟', letter: 'F' },
            { id: 'grapes', name: 'Grapes', emoji: '🍇', letter: 'G' },
            { id: 'house', name: 'House', emoji: '🏠', letter: 'H' },
          ],
          targets: [
            { id: 'A', name: 'Letter A', emoji: 'A', accepts: ['apple'] },
            { id: 'B', name: 'Letter B', emoji: 'B', accepts: ['ball'] },
            { id: 'C', name: 'Letter C', emoji: 'C', accepts: ['car'] },
            { id: 'D', name: 'Letter D', emoji: 'D', accepts: ['duck'] },
            { id: 'E', name: 'Letter E', emoji: 'E', accepts: ['egg'] },
            { id: 'F', name: 'Letter F', emoji: 'F', accepts: ['fish'] },
            { id: 'G', name: 'Letter G', emoji: 'G', accepts: ['grapes'] },
            { id: 'H', name: 'Letter H', emoji: 'H', accepts: ['house'] },
          ]
        }
      ]
    }
  };

  // Initialize game level
  const initializeLevel = useCallback(() => {
    if (!gameType) return;

    const content = gameContent[gameType];
    const levelData = content.levels[level - 1] || content.levels[0];

    // Shuffle items for randomness
    const shuffledItems = [...levelData.items].sort(() => Math.random() - 0.5);
    setItems(shuffledItems);

    // Set targets (or create matching targets for shapes/colors)
    if (levelData.targets) {
      setTargets(levelData.targets);
    } else {
      // For shapes/colors/simple matches, targets are same as items
      const shuffledTargets = [...levelData.items].sort(() => Math.random() - 0.5);
      setTargets(shuffledTargets.map(item => ({
        ...item,
        id: `target-${item.id}`,
        accepts: [item.id]
      })));
    }

    setMatched([]);
    setRecentlyMatched(null);
    setGameComplete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType, level]);

  useEffect(() => {
    if (gameType) {
      initializeLevel();
    }
  }, [gameType, level, initializeLevel]);

  // Drag handlers for mouse
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.parentNode);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, target) => {
    e.preventDefault();
    checkMatch(draggedItem, target);
    setDraggedItem(null);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e, item) => {
    const touch = e.touches[0];
    const element = e.currentTarget;
    
    setDraggedItem(item);
    dragItemRef.current = element;
    
    const rect = element.getBoundingClientRect();
    touchOffsetRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };

    element.style.position = 'fixed';
    element.style.zIndex = 1000;
    element.style.opacity = 0.8;
  };

  const handleTouchMove = (e) => {
    if (!dragItemRef.current) return;
    
    const touch = e.touches[0];
    const element = dragItemRef.current;
    
    element.style.left = `${touch.clientX - touchOffsetRef.current.x}px`;
    element.style.top = `${touch.clientY - touchOffsetRef.current.y}px`;
  };

  const handleTouchEnd = (e) => {
    if (!dragItemRef.current || !draggedItem) return;
    
    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Reset dragged element
    dragItemRef.current.style.position = '';
    dragItemRef.current.style.zIndex = '';
    dragItemRef.current.style.opacity = '';
    
    // Find target
    const targetElement = dropTarget?.closest('[data-target-id]');
    if (targetElement) {
      const targetId = targetElement.getAttribute('data-target-id');
      const target = targets.find(t => t.id === targetId);
      if (target) {
        checkMatch(draggedItem, target);
      }
    }
    
    dragItemRef.current = null;
    setDraggedItem(null);
  };

  // Check if item matches target
  const checkMatch = (item, target) => {
    if (!item || !target) return;

    const isCorrect = target.accepts?.includes(item.id) || target.id === `target-${item.id}`;

    if (isCorrect) {
      // Correct match - trigger green glow animation
      setRecentlyMatched(item.id);
      playSuccessSound();
      setMatched([...matched, item.id]);
      setScore(score + 10);
      setFeedback({ show: true, type: 'success', message: '🎉 Great job!' });

      // Clear recently matched state after animation
      setTimeout(() => {
        setRecentlyMatched(null);
      }, 1500);

      // Check if level complete
      if (matched.length + 1 === items.length) {
        setTimeout(() => {
          handleLevelComplete();
        }, 1000);
      }
    } else {
      // Incorrect match
      playErrorSound();
      setFeedback({ show: true, type: 'error', message: '❌ Try again!' });
    }

    // Clear feedback after 2 seconds
    setTimeout(() => {
      setFeedback({ show: false, type: '', message: '' });
    }, 2000);
  };

  // Handle level completion
  const handleLevelComplete = () => {
    const content = gameContent[gameType];
    const isLastLevel = level >= content.levels.length;

    if (isLastLevel) {
      setGameComplete(true);
      setShowCelebration(true);
      if (onComplete) {
        onComplete({ gameType, level, score });
      }
    } else {
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        setLevel(level + 1);
      }, 2000);
    }
  };

  // Sound effects
  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create clap sound (short burst of noise)
      const bufferSize = audioContext.sampleRate * 0.1; // 100ms
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = buffer.getChannelData(0);
      
      // Generate clap sound with noise burst
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize / 10));
      }
      
      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;
      
      const noiseGain = audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.5, audioContext.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      noise.connect(noiseGain);
      noiseGain.connect(audioContext.destination);
      noise.start(audioContext.currentTime);
      
      // Add celebratory chime after clap
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 523.25; // C5
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }, 100);
    } catch (e) {
      console.log('Audio not available');
    }
  };

  const playErrorSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 200;
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.log('Audio not available');
    }
  };

  // Game selection screen
  if (!gameType) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper elevation={3} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={() => navigate('/dashboard', { state: { initialTab: 11 } })}
              sx={{ 
                color: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' }
              }}
            >
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" fontWeight="bold">
              🎮 Drag & Match Games
            </Typography>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {Object.entries(gameContent).map(([type, content]) => (
            <Grid item xs={12} sm={6} md={4} key={type}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                }}
                onClick={() => setGameType(type)}
              >
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <Typography variant="h1" sx={{ mb: 2 }}>
                    {content.icon}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {content.title}
                  </Typography>
                  <Chip
                    label={`${content.levels.length} Levels`}
                    sx={{ mt: 2, bgcolor: content.color, color: 'white' }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const currentGame = gameContent[gameType];
  const progress = (matched.length / items.length) * 100;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 2, mb: 3, background: `linear-gradient(135deg, ${currentGame.color} 0%, ${currentGame.color}dd 100%)`, color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {currentGame.icon} {currentGame.title}
            </Typography>
            <Typography variant="body2">
              Level {level} of {currentGame.levels.length}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip icon={<Star />} label={`Score: ${score}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
            <IconButton onClick={() => setGameType(null)} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>
        </Box>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.3)' }} />
      </Paper>

      {/* Feedback Alert */}
      {feedback.show && (
        <Alert severity={feedback.type} sx={{ mb: 2 }}>
          {feedback.message}
        </Alert>
      )}

      {/* Game Board */}
      <Grid container spacing={3}>
        {/* Items to Drag */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>
              Drag These:
            </Typography>
            <Grid container spacing={2}>
              {items.map((item) => {
                const isMatched = matched.includes(item.id);
                const isRecentlyMatched = recentlyMatched === item.id;
                return (
                  <Grid item xs={6} sm={4} key={item.id}>
                    <Box
                      draggable={!isMatched}
                      onDragStart={(e) => handleDragStart(e, item)}
                      onTouchStart={(e) => handleTouchStart(e, item)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      sx={{
                        p: 2,
                        border: '2px solid',
                        borderColor: isMatched ? 'success.main' : currentGame.color,
                        borderRadius: 2,
                        textAlign: 'center',
                        cursor: isMatched ? 'default' : 'grab',
                        opacity: isMatched ? 0.4 : 1,
                        bgcolor: isMatched ? 'success.light' : 'white',
                        transition: 'all 0.3s',
                        // Green glow animation for recently matched items
                        ...(isRecentlyMatched && {
                          animation: 'greenGlow 1.5s ease-in-out',
                          '@keyframes greenGlow': {
                            '0%': { 
                              boxShadow: '0 0 5px #4caf50',
                              transform: 'scale(1)',
                            },
                            '50%': { 
                              boxShadow: '0 0 30px #4caf50, 0 0 40px #4caf50, 0 0 50px #4caf50',
                              transform: 'scale(1.1)',
                              bgcolor: '#e8f5e9',
                            },
                            '100%': { 
                              boxShadow: '0 0 5px #4caf50',
                              transform: 'scale(1)',
                            },
                          },
                        }),
                        '&:hover': !isMatched && {
                          transform: 'scale(1.05)',
                          boxShadow: 3,
                        },
                        '&:active': !isMatched && {
                          cursor: 'grabbing',
                        },
                      }}
                    >
                      <Typography variant="h3">{item.emoji}</Typography>
                      <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                        {item.name}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>

        {/* Drop Targets */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, minHeight: 400, bgcolor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom>
              Match Here:
            </Typography>
            <Grid container spacing={2}>
              {targets.map((target) => {
                const isTargetMatched = target.accepts?.some(id => matched.includes(id));
                return (
                  <Grid item xs={6} sm={4} key={target.id}>
                    <Box
                      data-target-id={target.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, target)}
                      sx={{
                        p: 2,
                        border: '3px dashed',
                        borderColor: isTargetMatched ? 'success.main' : '#ccc',
                        borderRadius: 2,
                        textAlign: 'center',
                        minHeight: 100,
                        bgcolor: isTargetMatched ? 'success.light' : 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        transition: 'all 0.3s',
                      }}
                    >
                      <Typography variant="h3">{target.emoji}</Typography>
                      <Typography variant="caption" sx={{ mt: 1 }}>
                        {target.name}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Controls */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={initializeLevel}
        >
          Restart Level
        </Button>
        {level > 1 && (
          <Button
            variant="outlined"
            startIcon={<NavigateBefore />}
            onClick={() => setLevel(level - 1)}
          >
            Previous Level
          </Button>
        )}
      </Box>

      {/* Celebration Dialog */}
      <Dialog open={showCelebration} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h2" sx={{ mb: 2 }}>
            🎉
          </Typography>
          <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
            {gameComplete ? 'All Levels Complete!' : 'Level Complete!'}
          </Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>
            Score: {score} points
          </Typography>
          {!gameComplete && (
            <Button
              variant="contained"
              size="large"
              startIcon={<NavigateNext />}
              onClick={() => {
                setShowCelebration(false);
                setLevel(level + 1);
              }}
              sx={{ mt: 3 }}
            >
              Next Level
            </Button>
          )}
          {gameComplete && (
            <Button
              variant="contained"
              size="large"
              startIcon={<EmojiEvents />}
              onClick={() => {
                setShowCelebration(false);
                setGameType(null);
                setLevel(1);
                setScore(0);
              }}
              sx={{ mt: 3 }}
            >
              Play Again
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DragMatchGame;
