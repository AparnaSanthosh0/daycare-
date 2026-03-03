import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Paper,
  Stack,
  Chip,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  School,
  Psychology,
  Face,
  Extension,
  AutoStories,
  Explore,
  ArrowBack,
} from '@mui/icons-material';
import DragMatchGame from '../components/Games/DragMatchGame';

/**
 * Learning Games Page
 * 
 * Hub for educational games and interactive learning experiences
 */
const LearningGamesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedGame, setSelectedGame] = useState(null);

  // Demo child data
  const demoChild = {
    id: 'demo-child',
    name: 'Alex',
    dateOfBirth: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 4).toISOString(), // 4 years old
  };

  // Check for query parameter to auto-select game
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const gameParam = params.get('game');
    if (gameParam) {
      setSelectedGame(gameParam);
    }
  }, [location]);

  const handleGameComplete = (result) => {
    console.log('Game completed:', result);
    // In production, this would save to backend
    setSelectedGame(null);
  };

  const games = [
    {
      id: 'drag-match',
      title: 'Drag & Match Game',
      description: 'Match shapes, colors, and objects to learn!',
      icon: Extension,
      color: '#FF6B6B',
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      age: '3-5 years',
      skills: ['Colors', 'Shapes', 'Matching'],
    },
    {
      id: 'body-learning',
      title: 'Virtual Body Learning',
      description: 'Explore body parts in 3D and learn their functions!',
      icon: Face,
      color: '#4ECDC4',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      age: '4-6 years',
      skills: ['Anatomy', 'Science', 'Interactive'],
      route: '/virtual-body-learning',
    },
    {
      id: 'vr-360',
      title: 'Interactive Explorer',
      description: 'Explore in 2D or 360°! Zoom, rotate, and click objects to learn.',
      icon: Explore,
      color: '#3498db',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      age: '3-7 years',
      skills: ['Exploration', 'Vocabulary', 'Interactive'],
      route: '/vr-360',
    },
    {
      id: 'vr-story',
      title: 'VR Story Experience',
      description: 'Immersive storytelling adventures in 360°!',
      icon: AutoStories,
      color: '#9B59B6',
      gradient: 'linear-gradient(135deg, #FA8BFF 0%, #2BD2FF 50%, #2BFF88 100%)',
      age: '3-6 years',
      skills: ['Listening', 'Imagination', 'Language'],
      route: '/vr-story',
    },
  ];

  // If a game is selected and it's the drag-match game, show it
  if (selectedGame === 'drag-match') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <DragMatchGame child={demoChild} onComplete={handleGameComplete} />
      </Box>
    );
  }

  // Otherwise, show the game selection menu
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 6,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Paper
          elevation={6}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          }}
        >
          {/* Back Button */}
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
          
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: '#667eea',
              }}
            >
              <School sx={{ fontSize: 35 }} />
            </Avatar>
            <Box>
              <Typography variant="h3" fontWeight="bold" color="primary">
                🎮 Learning Games
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Fun educational games for {demoChild.name}
              </Typography>
            </Box>
          </Stack>
          
          <Chip
            icon={<Psychology />}
            label="Interactive Learning & Development"
            color="primary"
            sx={{ mt: 1 }}
          />
        </Paper>

        {/* Game Cards */}
        <Grid container spacing={3}>
          {games.map((game) => (
            <Grid item xs={12} md={6} key={game.id}>
              <Card
                elevation={8}
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => {
                    if (game.route) {
                      navigate(game.route);
                    } else {
                      setSelectedGame(game.id);
                    }
                  }}
                  sx={{ height: '100%' }}
                >
                  {/* Card Header with Gradient */}
                  <Box
                    sx={{
                      background: game.gradient,
                      p: 3,
                      color: 'white',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar
                        sx={{
                          width: 70,
                          height: 70,
                          bgcolor: 'rgba(255,255,255,0.3)',
                        }}
                      >
                        <game.icon sx={{ fontSize: 40 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                          {game.title}
                        </Typography>
                        <Chip
                          label={game.age}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(255,255,255,0.3)',
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                        />
                      </Box>
                    </Stack>
                  </Box>

                  {/* Card Content */}
                  <CardContent sx={{ p: 3 }}>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      paragraph
                      sx={{ fontSize: '1.1rem' }}
                    >
                      {game.description}
                    </Typography>

                    <Typography
                      variant="subtitle2"
                      color="primary"
                      fontWeight="bold"
                      gutterBottom
                    >
                      🎯 Skills Developed:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      {game.skills.map((skill) => (
                        <Chip
                          key={skill}
                          label={skill}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Info Section */}
        <Paper
          elevation={4}
          sx={{
            p: 3,
            mt: 4,
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.95)',
          }}
        >
          <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>
            💡 Learning Benefits
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>🧠 Cognitive Development:</strong> Enhance memory, problem-solving,
                and critical thinking skills
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>🎨 Interactive Learning:</strong> Hands-on experiences make learning
                fun and engaging
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                <strong>📈 Progress Tracking:</strong> Monitor development and celebrate
                achievements
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default LearningGamesPage;
