/**
 * Enhanced Voice Assistant with Multilingual Support
 * Supports 100+ languages including Malayalam, Hindi, Tamil
 * Powered by OpenAI GPT, Whisper, and TTS
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Mic,
  Stop,
  VolumeUp,
  Translate,
  Language,
  RecordVoiceOver,
  Send
} from '@mui/icons-material';
import api from './config/api';

const VoiceAssistantEnhanced = ({ themeColor = '#1abc9c', activeChildId, userId } = {}) => {
  // State management
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [translatedInput, setTranslatedInput] = useState("");
  const [intent, setIntent] = useState("");
  const [intentConfidence, setIntentConfidence] = useState(0);
  const [actionResult, setActionResult] = useState("");
  const [translatedResponse, setTranslatedResponse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");
  
  // Language settings
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [autoDetect, setAutoDetect] = useState(true);
  
  // Audio settings
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  
  // Quick commands
  const [showQuickCommands, setShowQuickCommands] = useState(true);
  
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Web Speech API support check
  const canRecognize = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  // Fetch supported languages on mount
  useEffect(() => {
    fetchSupportedLanguages();
  }, []);

  // Auto-process transcript when it changes
  useEffect(() => {
    if (!transcript) return;
    if (transcript === lastProcessedTranscript) return;
    setLastProcessedTranscript(transcript);
    runPipeline(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const fetchSupportedLanguages = async () => {
    try {
      const response = await api.get('/voice/languages');
      if (response.data.success) {
        setAvailableLanguages(response.data.languages);
      }
    } catch (error) {
      console.error('Failed to fetch languages:', error);
      // Fallback to basic languages
      setAvailableLanguages([
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
        { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
        { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' }
      ]);
    }
  };

  const startListening = () => {
    if (!canRecognize) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Set language based on user selection
    const langCode = selectedLanguage;
    const langMap = {
      'en': 'en-US',
      'ml': 'ml-IN',
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'kn': 'kn-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN',
      'bn': 'bn-IN',
      'pa': 'pa-IN',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'ar': 'ar-SA',
      'pt': 'pt-PT',
      'ru': 'ru-RU',
      'it': 'it-IT'
    };
    
    recognition.lang = langMap[langCode] || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      setTranscript(text);
      setError('');
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setListening(false);
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'audio-capture') {
        setError('Microphone access denied or not available.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };
    
    recognition.onend = () => setListening(false);
    
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setError('');
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const runPipeline = async (text) => {
    if (!text || text.trim().length === 0) return;
    
    setLoading(true);
    setError("");
    setActionResult("");
    setTranslatedResponse("");

    try {
      // Step 1: Process voice command through backend API
      const processResponse = await api.post('/voice/process', {
        text,
        childId: activeChildId,
        userId,
        preferredLanguage: selectedLanguage
      });

      if (!processResponse.data.success) {
        throw new Error('Failed to process voice command');
      }

      const {
        detectedLanguage,
        translatedText,
        intent: detectedIntent,
        confidence,
        entities
      } = processResponse.data;

      setDetectedLang(detectedLanguage);
      setTranslatedInput(translatedText);
      setIntent(detectedIntent);
      setIntentConfidence(confidence);

      // Step 2: Execute action based on intent
      let result = "";
      
      if (detectedIntent === "book_doctor") {
        if (!activeChildId) {
          result = "Please select a child first, then try again.";
        } else {
          try {
            const appointmentDate = entities.date || parseSimpleDate(entities.time || translatedText);
            const appointmentTime = entities.time || parseSimpleTime(entities.time || translatedText);
            const reason = entities.reason || "Requested via Voice Assistant";

            await api.post('/appointments', {
              childId: activeChildId,
              appointmentDate,
              appointmentTime,
              reason,
              appointmentType: 'onsite',
              isEmergency: false
            });

            result = `Doctor appointment booked successfully for ${appointmentTime} on ${appointmentDate}.`;
          } catch (err) {
            result = `Failed to book appointment: ${err.message}`;
          }
        }
      } else if (detectedIntent === "check_attendance") {
        if (!activeChildId) {
          result = "Please select a child first.";
        } else {
          try {
            await api.get(`/children/${activeChildId}/attendance`);
            result = "Attendance information loaded successfully for your child.";
          } catch (err) {
            result = "Failed to load attendance data.";
          }
        }
      } else if (detectedIntent === "view_menu") {
        result = "Opening today's menu. Please check the meal plan section in the dashboard.";
      } else if (detectedIntent === "message_teacher") {
        result = "Opening messaging interface to contact your child's teacher.";
      } else if (detectedIntent === "check_schedule") {
        result = "Loading your child's schedule for today.";
      } else if (detectedIntent === "track_delivery") {
        result = "Opening 'My Orders' to track your delivery status.";
      } else if (detectedIntent === "pay_fees") {
        result = "Opening billing section to pay fees.";
      } else if (detectedIntent === "book_transport") {
        result = "Opening transport section to book transportation for your child.";
      } else if (detectedIntent === "report_issue") {
        result = "Opening feedback form to report your concern.";
      } else if (detectedIntent === "get_updates") {
        result = "Loading latest notifications and updates for you.";
      } else {
        result = confidence < 0.5 
          ? "Sorry, I didn't understand that. Try commands like: 'Show today's menu', 'Book doctor appointment', or 'Check attendance'."
          : "Command recognized but not fully implemented yet. We're working on it!";
      }

      setActionResult(result);

      // Step 3: Generate conversational response
      const responseGenerated = await api.post('/voice/generate-response', {
        intent: detectedIntent,
        actionResult: result,
        targetLanguage: detectedLanguage === 'en' ? 'English' : getLanguageName(detectedLanguage)
      });

      const finalResponse = responseGenerated.data.response || result;
      setTranslatedResponse(finalResponse);

      // Step 4: Text-to-Speech
      await playTextToSpeech(finalResponse, selectedVoice);

    } catch (e) {
      console.error('Pipeline error:', e);
      setError(e?.message || 'Failed to process voice command. Please try again.');
      setActionResult('An error occurred while processing your request.');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Play text-to-speech using OpenAI TTS API
  const playTextToSpeech = async (text, voice = 'alloy') => {
    try {
      setAudioPlaying(true);
      const response = await api.post('/voice/tts', {
        text,
        voice,
        speed: 1.0
      }, {
        responseType: 'blob'
      });

      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setAudioPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setAudioPlaying(false);
        console.error('Audio playback failed, using browser TTS fallback');
        // Fallback to browser TTS
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utter = new window.SpeechSynthesisUtterance(text);
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setAudioPlaying(false);
      // Fallback to browser TTS
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utter = new window.SpeechSynthesisUtterance(text);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    }
  };

  // Helper: Get language name from code
  const getLanguageName = (code) => {
    const lang = availableLanguages.find(l => l.code === code);
    return lang ? lang.name : 'English';
  };

  // Helper: Parse simple date strings
  function parseSimpleDate(input = '') {
    const lower = String(input).toLowerCase();
    const d = new Date();
    if (lower.includes('tomorrow')) d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Helper: Parse simple time strings
  function parseSimpleTime(input = '') {
    const lower = String(input).toLowerCase();
    const m = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!m) return '09:00';
    let h = Number(m[1]);
    const min = Number(m[2] || '0');
    const ap = m[3];
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (Number.isNaN(h) || Number.isNaN(min)) return '09:00';
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  // Quick command buttons
  const quickCommands = [
    { text: 'Show today\'s menu', icon: '🍽️' },
    { text: 'Book doctor appointment', icon: '👨‍⚕️' },
    { text: 'Check attendance', icon: '📋' },
    { text: 'Message teacher', icon: '✉️' },
    { text: 'Book transport', icon: '🚌' },
    { text: 'Track delivery', icon: '📦' }
  ];

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3, bgcolor: '#fff', maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RecordVoiceOver sx={{ fontSize: 32, color: themeColor }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: themeColor }}>
            Voice Assistant
          </Typography>
        </Box>
        <Chip 
          icon={<Language />}
          label={`${availableLanguages.length}+ Languages`}
          color="primary"
          size="small"
        />
      </Box>

      {/* Language Selection */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2, mb: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Preferred Language</InputLabel>
          <Select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            label="Preferred Language"
            disabled={loading}
          >
            {availableLanguages.map((lang) => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.nativeName} - {lang.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Voice</InputLabel>
          <Select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            label="Voice"
            disabled={loading}
          >
            <MenuItem value="alloy">Alloy</MenuItem>
            <MenuItem value="echo">Echo</MenuItem>
            <MenuItem value="fable">Fable</MenuItem>
            <MenuItem value="onyx">Onyx</MenuItem>
            <MenuItem value="nova">Nova</MenuItem>
            <MenuItem value="shimmer">Shimmer</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Voice Control Buttons */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={listening ? stopListening : startListening}
          startIcon={listening ? <Stop /> : <Mic />}
          disabled={loading}
          sx={{
            bgcolor: listening ? '#e74c3c' : themeColor,
            textTransform: 'none',
            fontWeight: 700,
            py: 1.5,
            borderRadius: 2,
            fontSize: '1.1rem',
            '&:hover': { bgcolor: listening ? '#c0392b' : themeColor },
            animation: listening ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.7 }
            }
          }}
        >
          {listening ? 'Stop Listening' : 'Start Voice Command'}
        </Button>

        <Tooltip title="Replay last response">
          <Button
            fullWidth
            variant="outlined"
            startIcon={<VolumeUp />}
            onClick={() => translatedResponse && playTextToSpeech(translatedResponse, selectedVoice)}
            disabled={!translatedResponse || audioPlaying || loading}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              py: 1.5,
              borderRadius: 2,
              borderColor: themeColor,
              color: themeColor
            }}
          >
            {audioPlaying ? 'Playing...' : 'Replay Response'}
          </Button>
        </Tooltip>
      </Box>

      {!canRecognize && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Speech recognition isn't supported in this browser. Type your command below or use Chrome/Edge.
        </Alert>
      )}

      {/* Quick Commands */}
      {showQuickCommands && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}>
            Quick Commands
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {quickCommands.map((cmd, idx) => (
              <Chip
                key={idx}
                label={`${cmd.icon} ${cmd.text}`}
                onClick={() => {
                  setManualText(cmd.text);
                  runPipeline(cmd.text);
                }}
                disabled={loading}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f0f0f0' }
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Manual Text Input */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Type a command (or use voice)"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !loading && manualText.trim() && runPipeline(manualText)}
          size="small"
          multiline
          rows={2}
          placeholder="E.g., 'Show today's menu', 'Book doctor appointment tomorrow at 10 AM'"
          InputProps={{
            endAdornment: (
              <IconButton
                onClick={() => runPipeline(manualText)}
                disabled={loading || !manualText.trim()}
                sx={{ color: themeColor }}
              >
                <Send />
              </IconButton>
            )
          }}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Results Display */}
      <Box sx={{ display: 'grid', gap: 2 }}>
        {transcript && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Transcript (You said)
            </Typography>
            <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1, mt: 0.5 }}>
              <Typography variant="body2">{transcript}</Typography>
            </Paper>
          </Box>
        )}

        {detectedLang && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              icon={<Translate />}
              label={`Detected: ${getLanguageName(detectedLang)}`}
              size="small"
              color="info"
            />
            {intent && (
              <Chip
                label={`Intent: ${intent} (${(intentConfidence * 100).toFixed(0)}%)`}
                size="small"
                color={intentConfidence > 0.7 ? 'success' : 'warning'}
              />
            )}
          </Box>
        )}

        {translatedInput && detectedLang !== 'en' && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Translated to English
            </Typography>
            <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#e3f2fd', borderRadius: 1, mt: 0.5 }}>
              <Typography variant="body2">{translatedInput}</Typography>
            </Paper>
          </Box>
        )}

        {actionResult && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Action Result
            </Typography>
            <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#e8f5e9', borderRadius: 1, mt: 0.5 }}>
              <Typography variant="body2">{actionResult}</Typography>
            </Paper>
          </Box>
        )}

        {translatedResponse && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Response ({getLanguageName(detectedLang)})
            </Typography>
            <Paper elevation={0} sx={{ p: 2, bgcolor: themeColor, color: '#fff', borderRadius: 1, mt: 0.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {translatedResponse}
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'center' }}>
          <CircularProgress size={20} sx={{ color: themeColor }} />
          <Typography variant="body2" color="text.secondary">Processing your request...</Typography>
        </Box>
      )}

      {/* Footer Info */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #eee' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
          🌐 Powered by OpenAI GPT & Whisper • Supports 100+ languages including Malayalam, Hindi, Tamil
        </Typography>
      </Box>
    </Paper>
  );
};

export default VoiceAssistantEnhanced;
