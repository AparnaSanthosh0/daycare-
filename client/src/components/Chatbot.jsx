import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Stack,
  Avatar,
  CircularProgress,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Send,
  DeleteOutline,
  SmartToy,
  Person,
} from '@mui/icons-material';
import api from '../config/api';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat session on mount
  useEffect(() => {
    loadSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSession = async () => {
    try {
      const response = await api.get('/chatbot/session');

      if (response.data.success) {
        const sessionHistory = response.data.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        // If empty session, show welcome message
        if (sessionHistory.length === 0) {
          loadWelcomeMessage();
        } else {
          setMessages(sessionHistory);
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      // Show welcome message on error too
      loadWelcomeMessage();
    }
  };

  const loadWelcomeMessage = async () => {
    try {
      const response = await api.get('/chatbot/welcome');
      if (response.data.success) {
        setMessages([{
          role: 'assistant',
          content: response.data.message
        }]);
      }
    } catch (error) {
      console.error('Failed to load welcome message:', error);
      // Fallback welcome message
      setMessages([{
        role: 'assistant',
        content: '👋 Welcome to TinyTots 24/7 Assistant! I\'m here to help with all your childcare needs. Ask me anything! 😊'
      }]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post(
        '/chatbot/query',
        { query: input }
      );

      if (response.data.success) {
        const botMessage = { role: 'assistant', content: response.data.answer };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearSession = async () => {
    try {
      await api.delete('/chatbot/session');
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  };

  return (
    <Paper elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '4px 4px 0 0'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToy />
          <Typography variant="h6" fontWeight="bold">
            TinyTots 24/7 Assistant
          </Typography>
        </Box>
        <Tooltip title="Clear Chat">
          <IconButton onClick={clearSession} size="small" sx={{ color: 'white' }}>
            <DeleteOutline />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Messages */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 2, 
        bgcolor: 'grey.50',
        minHeight: 400,
        maxHeight: 500
      }}>
        {messages.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <SmartToy sx={{ fontSize: 60, mb: 2, opacity: 0.3 }} />
            <Typography variant="h6" gutterBottom>
              TinyTots 24/7 Assistant
            </Typography>
            <Typography variant="body2">
              Getting your personalized welcome message...
            </Typography>
          </Box>
        )}
        
        <Stack spacing={2}>
          {messages.map((msg, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main',
                  width: 32,
                  height: 32
                }}
              >
                {msg.role === 'user' ? <Person fontSize="small" /> : <SmartToy fontSize="small" />}
              </Avatar>
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '75%',
                  bgcolor: msg.role === 'user' ? 'primary.light' : 'white',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary'
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </Typography>
              </Paper>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                <SmartToy fontSize="small" />
              </Avatar>
              <Paper elevation={1} sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Thinking...
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}
        </Stack>
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input */}
      <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
        <form onSubmit={sendMessage}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={loading}
              variant="outlined"
            />
            <IconButton 
              type="submit" 
              disabled={loading || !input.trim()}
              color="primary"
              sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
            >
              <Send />
            </IconButton>
          </Box>
        </form>
      </Box>
    </Paper>
  );
};

export default Chatbot;
