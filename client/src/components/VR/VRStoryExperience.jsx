import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  IconButton,
  Chip,
  Paper,
} from '@mui/material';
import {
  NavigateBefore,
  NavigateNext,
  VolumeUp,
  Replay,
  ArrowBack,
  AutoStories,
} from '@mui/icons-material';

/**
 * Story data with scenes
 */
const STORIES = {
  playground: {
    title: 'A Day at the Playground',
    icon: '🎠',
    color: '#FF6B6B',
    scenes: [
      {
        id: 1,
        backgroundImage: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1600&q=80',
        background: 'linear-gradient(to bottom, rgba(135, 206, 235, 0.7) 0%, rgba(152, 216, 200, 0.7) 50%, rgba(144, 238, 144, 0.7) 100%)',
        title: 'Welcome to the Playground!',
        text: 'Today is a beautiful sunny day! Let\'s go to the playground and have some fun!',
        narration: 'Today is a beautiful sunny day! Lets go to the playground and have some fun!',
      },
      {
        id: 2,
        backgroundImage: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1600&q=80',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.6) 0%, rgba(118, 75, 162, 0.6) 50%, rgba(240, 147, 251, 0.6) 100%)',
        title: 'The Slide',
        text: 'Look at the big colorful slide! We can climb up the ladder and slide down. Wheee!',
        narration: 'Look at the big colorful slide! We can climb up the ladder and slide down. Wheee!',
      },
      {
        id: 3,
        backgroundImage: '/images/vr-stories/playground-swings.jpg',
        background: 'linear-gradient(to right, rgba(250, 112, 154, 0.6) 0%, rgba(254, 225, 64, 0.6) 100%)',
        title: 'The Swings',
        text: 'Now let\'s go to the swings! We can swing high up in the air. It feels like flying!',
        narration: 'Now lets go to the swings! We can swing high up in the air. It feels like flying!',
      },
      {
        id: 4,
        backgroundImage: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1600&q=80',
        background: 'linear-gradient(120deg, rgba(137, 247, 254, 0.6) 0%, rgba(102, 166, 255, 0.6) 100%)',
        title: 'Making Friends',
        text: 'We meet new friends at the playground! We can play together and share our toys.',
        narration: 'We meet new friends at the playground! We can play together and share our toys.',
      },
      {
        id: 5,
        backgroundImage: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=1600&q=80',
        background: 'linear-gradient(to top, rgba(251, 194, 235, 0.6) 0%, rgba(166, 193, 238, 0.6) 100%)',
        title: 'Time to Go Home',
        text: 'What a fun day at the playground! Time to go home now. We can come back again tomorrow!',
        narration: 'What a fun day at the playground! Time to go home now. We can come back again tomorrow!',
      },
    ],
  },
  farm: {
    title: 'Visit to the Farm',
    icon: '🚜',
    color: '#4ECDC4',
    scenes: [
      {
        id: 1,
        backgroundImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80',
        background: 'linear-gradient(to bottom, rgba(224, 247, 250, 0.7) 0%, rgba(178, 235, 242, 0.7) 50%, rgba(128, 222, 234, 0.7) 100%)',
        title: 'Welcome to the Farm!',
        text: 'Today we\'re visiting a farm! Let\'s see all the animals and learn about farm life.',
        narration: 'Today were visiting a farm! Lets see all the animals and learn about farm life.',
      },
      {
        id: 2,
        backgroundImage: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1600&q=80',
        background: 'linear-gradient(135deg, rgba(255, 249, 196, 0.6) 0%, rgba(240, 244, 195, 0.6) 50%, rgba(220, 237, 200, 0.6) 100%)',
        title: 'The Barn',
        text: 'This is the big red barn where the animals sleep. Can you hear the animals saying hello?',
        narration: 'This is the big red barn where the animals sleep. Can you hear the animals saying hello?',
      },
      {
        id: 3,
        backgroundImage: 'https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?w=1600&q=80',
        background: 'linear-gradient(to right, rgba(200, 230, 201, 0.6) 0%, rgba(165, 214, 167, 0.6) 50%, rgba(129, 199, 132, 0.6) 100%)',
        title: 'Meeting the Cows',
        text: 'Look at the cows! They give us milk. Cows say "Moo!" Let\'s say moo together!',
        narration: 'Look at the cows! They give us milk. Cows say Moo! Lets say moo together!',
      },
      {
        id: 4,
        backgroundImage: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=1600&q=80',
        background: 'linear-gradient(120deg, rgba(255, 224, 178, 0.6) 0%, rgba(255, 204, 128, 0.6) 50%, rgba(255, 183, 77, 0.6) 100%)',
        title: 'The Chicken Coop',
        text: 'The chickens live here! They lay eggs for us to eat. Chickens say "Cluck cluck!"',
        narration: 'The chickens live here! They lay eggs for us to eat. Chickens say Cluck cluck!',
      },
      {
        id: 5,
        backgroundImage: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1600&q=80',
        background: 'linear-gradient(to top, rgba(248, 187, 208, 0.6) 0%, rgba(244, 143, 177, 0.6) 50%, rgba(240, 98, 146, 0.6) 100%)',
        title: 'Goodbye Farm!',
        text: 'We had so much fun at the farm! We learned about animals and where our food comes from. Goodbye!',
        narration: 'We had so much fun at the farm! We learned about animals and where our food comes from. Goodbye!',
      },
    ],
  },
  ocean: {
    title: 'Under the Ocean',
    icon: '🐠',
    color: '#3498DB',
    scenes: [
      {
        id: 1,
        backgroundImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&q=80',
        background: 'linear-gradient(to bottom, rgba(0, 119, 190, 0.6) 0%, rgba(30, 144, 255, 0.6) 50%, rgba(70, 130, 180, 0.6) 100%)',
        title: 'Diving Into the Ocean',
        text: 'Let\'s put on our diving gear and explore the beautiful ocean! What will we find?',
        narration: 'Lets put on our diving gear and explore the beautiful ocean! What will we find?',
      },
      {
        id: 2,
        backgroundImage: 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=1600&q=80',
        background: 'linear-gradient(135deg, rgba(30, 60, 114, 0.6) 0%, rgba(42, 82, 152, 0.6) 50%, rgba(126, 34, 206, 0.6) 100%)',
        title: 'Colorful Fish',
        text: 'Wow! Look at all the colorful fish swimming around! They live in coral reefs.',
        narration: 'Wow! Look at all the colorful fish swimming around! They live in coral reefs.',
      },
      {
        id: 3,
        backgroundImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&q=80',
        background: 'linear-gradient(to right, rgba(19, 78, 94, 0.6) 0%, rgba(113, 178, 128, 0.6) 100%)',
        title: 'Sea Turtles',
        text: 'A sea turtle is swimming by! Sea turtles are very gentle and have beautiful shells.',
        narration: 'A sea turtle is swimming by! Sea turtles are very gentle and have beautiful shells.',
      },
      {
        id: 4,
        backgroundImage: 'https://images.unsplash.com/photo-1607988795691-3d0147b43231?w=1600&q=80',
        background: 'linear-gradient(120deg, rgba(44, 62, 80, 0.6) 0%, rgba(76, 161, 175, 0.6) 100%)',
        title: 'Dolphins Playing',
        text: 'Look, dolphins are jumping and playing! Dolphins are very smart and friendly animals.',
        narration: 'Look, dolphins are jumping and playing! Dolphins are very smart and friendly animals.',
      },
      {
        id: 5,
        backgroundImage: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&q=80',
        background: 'linear-gradient(to top, rgba(102, 125, 182, 0.6) 0%, rgba(0, 130, 200, 0.6) 50%, rgba(102, 125, 182, 0.6) 100%)',
        title: 'Back to the Surface',
        text: 'Time to swim back up! The ocean is amazing with so many wonderful creatures. See you next time!',
        narration: 'Time to swim back up! The ocean is amazing with so many wonderful creatures. See you next time!',
      },
    ],
  },
};

/**
 * VR Story Experience Component
 */
const VRStoryExperience = () => {
  const navigate = useNavigate();
  const [selectedStory, setSelectedStory] = useState(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);
  const speechRef = useRef(null);

  // Cancel any ongoing narration when component unmounts
  useEffect(() => {
    return () => {
      if (speechRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleNarrate = useCallback(() => {
    if (!selectedStory) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const scene = STORIES[selectedStory].scenes[currentScene];
    const utterance = new SpeechSynthesisUtterance(scene.narration);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    utterance.onstart = () => setIsNarrating(true);
    utterance.onend = () => setIsNarrating(false);
    utterance.onerror = () => setIsNarrating(false);

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [selectedStory, currentScene]);

  // Auto-narrate when scene changes
  useEffect(() => {
    if (selectedStory && STORIES[selectedStory].scenes[currentScene]) {
      const timer = setTimeout(() => {
        handleNarrate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentScene, selectedStory, handleNarrate]);

  const handleNext = () => {
    if (!selectedStory) return;
    const maxScenes = STORIES[selectedStory].scenes.length;
    if (currentScene < maxScenes - 1) {
      window.speechSynthesis.cancel();
      setCurrentScene(currentScene + 1);
    }
  };

  const handlePrevious = () => {
    if (currentScene > 0) {
      window.speechSynthesis.cancel();
      setCurrentScene(currentScene - 1);
    }
  };

  const handleRestart = () => {
    window.speechSynthesis.cancel();
    setCurrentScene(0);
  };

  const handleBackToMenu = () => {
    window.speechSynthesis.cancel();
    setSelectedStory(null);
    setCurrentScene(0);
  };

  // Story selection screen
  if (!selectedStory) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4,
          px: 2,
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          {/* Header */}
          <Paper
            elevation={3}
            sx={{
              p: 3,
              mb: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 3,
            }}
          >
            <IconButton
              onClick={() => navigate('/dashboard', { state: { initialTab: 11 } })}
              sx={{
                mb: 2,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              <ArrowBack />
            </IconButton>
            <Stack direction="row" spacing={2} alignItems="center">
              <AutoStories sx={{ fontSize: 40, color: '#667eea' }} />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  📖 VR Story Experience
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Choose a story to begin your adventure!
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Story Selection */}
          <Stack spacing={3}>
            {Object.entries(STORIES).map(([key, story]) => (
              <Card
                key={key}
                onClick={() => setSelectedStory(key)}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent>
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Box
                      sx={{
                        fontSize: 60,
                        width: 80,
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `${story.color}22`,
                        borderRadius: 2,
                      }}
                    >
                      {story.icon}
                    </Box>
                    <Box flex={1}>
                      <Typography variant="h5" fontWeight="bold" gutterBottom>
                        {story.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={`${story.scenes.length} Scenes`}
                          size="small"
                          sx={{ bgcolor: `${story.color}33`, color: story.color }}
                        />
                        <Chip
                          label="Voice Narration"
                          size="small"
                          icon={<VolumeUp />}
                          sx={{ bgcolor: '#4CAF5033', color: '#4CAF50' }}
                        />
                      </Stack>
                    </Box>
                    <NavigateNext sx={{ fontSize: 40, color: story.color }} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          {/* Instructions */}
          <Paper
            sx={{
              mt: 4,
              p: 3,
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 3,
            }}
          >
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              How to Use:
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                🎯 <strong>Select a story</strong> to begin your adventure
              </Typography>
              <Typography variant="body2">
                🔊 <strong>Listen</strong> to the narration as the story unfolds
              </Typography>
              <Typography variant="body2">
                ➡️ <strong>Navigate</strong> through scenes using the arrow buttons
              </Typography>
              <Typography variant="body2">
                🔄 <strong>Replay</strong> the story anytime!
              </Typography>
            </Stack>
          </Paper>
        </Box>
      </Box>
    );
  }

  // Story viewing screen
  const story = STORIES[selectedStory];
  const scene = story.scenes[currentScene];
  const progress = ((currentScene + 1) / story.scenes.length) * 100;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Animated 360° Panoramic Background */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: scene.background,
          backgroundImage: scene.backgroundImage ? `url(${scene.backgroundImage})` : 'none',
          backgroundSize: 'auto 100%',
          backgroundPosition: '0% center',
          backgroundRepeat: 'repeat-x',
          backgroundBlendMode: 'overlay',
          animation: 'panorama 60s linear infinite',
          transition: 'background-image 1.5s ease-in-out',
          '@keyframes panorama': {
            '0%': {
              backgroundPosition: '0% center',
            },
            '100%': {
              backgroundPosition: '100% center',
            },
          },
        }}
      />

      {/* Gradient Overlay Animation */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: scene.background,
          opacity: 0.3,
          animation: 'gradientPan 45s ease-in-out infinite alternate',
          zIndex: 0,
          '@keyframes gradientPan': {
            '0%': {
              transform: 'scale(1)',
            },
            '100%': {
              transform: 'scale(1.1)',
            },
          },
        }}
      />

      {/* Overlay for better content visibility */}
      {scene.backgroundImage && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.1) 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* VR Vignette Effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.15) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Top Bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          p: 2,
          zIndex: 10,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton
              onClick={handleBackToMenu}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" color="white" fontWeight="bold">
              {story.icon} {story.title}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`Scene ${currentScene + 1}/${story.scenes.length}`}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)', fontWeight: 'bold' }}
            />
            <IconButton
              onClick={handleRestart}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              <Replay />
            </IconButton>
          </Stack>
        </Stack>
        {/* Progress Bar */}
        <Box
          sx={{
            mt: 2,
            height: 4,
            bgcolor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${progress}%`,
              bgcolor: 'white',
              transition: 'width 0.5s ease',
            }}
          />
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          p: 2,
          pl: 4,
          mt: 10,
          mb: 8,
          zIndex: 5,
          position: 'relative',
        }}
      >
        <Paper
          elevation={8}
          sx={{
            maxWidth: 550,
            width: 'auto',
            px: 3,
            py: 2.5,
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(15px)',
            borderRadius: 3,
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Typography
            variant="h4"
            fontWeight="bold"
            color="primary"
            gutterBottom
            sx={{ mb: 2 }}
          >
            {scene.title}
          </Typography>
          <Typography
            variant="body1"
            color="text.primary"
            sx={{
              lineHeight: 1.6,
              mb: 2.5,
              fontSize: { xs: '1rem', md: '1.1rem' },
            }}
          >
            {scene.text}
          </Typography>

          {/* Narration Button */}
          <Button
            variant="contained"
            size="medium"
            startIcon={<VolumeUp />}
            onClick={handleNarrate}
            disabled={isNarrating}
            sx={{
              px: 3,
              py: 1,
              fontSize: '1rem',
              borderRadius: 3,
              textTransform: 'none',
              background: isNarrating
                ? 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)'
                : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: 3,
            }}
          >
            {isNarrating ? 'Speaking...' : 'Play Narration'}
          </Button>
        </Paper>
      </Box>

      {/* Bottom Navigation */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          p: 3,
          zIndex: 10,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          maxWidth={550}
          mx="auto"
        >
          <Button
            variant="contained"
            size="medium"
            startIcon={<NavigateBefore />}
            onClick={handlePrevious}
            disabled={currentScene === 0}
            sx={{
              px: 2.5,
              py: 1,
              borderRadius: 3,
              textTransform: 'none',
              fontSize: '0.95rem',
            }}
          >
            Previous
          </Button>
          <Typography variant="body1" color="white" fontWeight="bold">
            {currentScene + 1} / {story.scenes.length}
          </Typography>
          <Button
            variant="contained"
            size="medium"
            endIcon={<NavigateNext />}
            onClick={handleNext}
            disabled={currentScene === story.scenes.length - 1}
            sx={{
              px: 2.5,
              py: 1,
              borderRadius: 3,
              textTransform: 'none',
              fontSize: '0.95rem',
            }}
          >
            Next
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default VRStoryExperience;
