import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import {
  Mic,
  Stop
} from '@mui/icons-material';
import api from './config/api';

function parseSimpleDate(input = '') {
  const lower = String(input).toLowerCase();
  const d = new Date();
  if (lower.includes('tomorrow')) d.setDate(d.getDate() + 1);
  // today/default => keep as-is
  // Format YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseSimpleTime(input = '') {
  // Supports "10", "10 am", "10:30", "10:30 pm"
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

// Simple intent extraction fallback
function extractSimpleIntent(text) {
  const lower = text.toLowerCase();
  // More flexible matching with variations
  if (lower.match(/\b(doctor|appointment|medical|health)\b/)) return 'book_doctor';
  if (lower.match(/\b(attendance|present|absent)\b/)) return 'check_attendance';
  if (lower.match(/\b(menu|meal|food|lunch|breakfast|dinner|today.*menu|show.*menu)\b/)) return 'view_menu';
  if (lower.match(/\b(message|teacher|talk|contact|reach)\b/)) return 'message_teacher';
  if (lower.match(/\b(schedule|timetable|routine|activity|activities)\b/)) return 'check_schedule';
  if (lower.match(/\b(delivery|track|order|package)\b/)) return 'track_delivery';
  if (lower.match(/\b(pay|fee|bill|payment|charge)\b/)) return 'pay_fees';
  if (lower.match(/\b(transport|bus|pickup|drop)\b/)) return 'book_transport';
  if (lower.match(/\b(issue|problem|report|concern|complain)\b/)) return 'report_issue';
  if (lower.match(/\b(update|notification|news|latest)\b/)) return 'get_updates';
  return 'unknown';
}

const VoiceAssistant = ({ themeColor = '#1abc9c', activeChildId } = {}) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [translatedInput, setTranslatedInput] = useState("");
  const [intent, setIntent] = useState("");
  const [actionResult, setActionResult] = useState("");
  const [translatedResponse, setTranslatedResponse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");
  const recognitionRef = useRef(null);

  const canRecognize = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const startListening = () => {
    if (!canRecognize) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
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

  // Automatically run the pipeline whenever a new transcript comes in
  useEffect(() => {
    if (!transcript) return;
    if (transcript === lastProcessedTranscript) return;
    setLastProcessedTranscript(transcript);
    // Fire and forget – we don't await here so UI stays responsive
    runPipeline(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const runPipeline = async (text) => {
    if (!text) return;
    setLoading(true);
    setError("");
    setActionResult("");
    setTranslatedResponse("");

    try {
      let detectedIntent = "unknown";
      let detectedLanguage = "en";
      let translatedText = text;
      let entities = {};

      // Try to use backend API for better accuracy
      try {
        const processResponse = await api.post('/voice/process', {
          text,
          childId: activeChildId,
          preferredLanguage: 'en'
        });

        if (processResponse.data.success) {
          detectedLanguage = processResponse.data.detectedLanguage;
          translatedText = processResponse.data.translatedText;
          detectedIntent = processResponse.data.intent;
          entities = processResponse.data.entities || {};
          
          // If API returns unknown, use fallback
          if (detectedIntent === 'unknown') {
            detectedIntent = extractSimpleIntent(text);
          }
        }
      } catch (apiError) {
        console.log('Using fallback intent extraction:', apiError.message);
        // Fallback to simple intent extraction
        detectedIntent = extractSimpleIntent(text);
      }

      setDetectedLang(detectedLanguage);
      setTranslatedInput(translatedText);
      setIntent(detectedIntent);

      // Execute action based on intent
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

            result = `Doctor appointment booked for ${appointmentTime} on ${appointmentDate}.`;
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
            result = "Attendance loaded successfully for your child.";
          } catch (err) {
            result = "Failed to load attendance data.";
          }
        }
      } else if (detectedIntent === "view_menu") {
        result = "Opening today's menu. Please check the meal plan section.";
      } else if (detectedIntent === "message_teacher") {
        result = "Opening messaging interface to contact your child's teacher.";
      } else if (detectedIntent === "check_schedule") {
        result = "Loading your child's schedule for today.";
      } else if (detectedIntent === "track_delivery") {
        result = "Open 'My Orders' to track delivery status.";
      } else if (detectedIntent === "pay_fees") {
        result = "Opening billing section to pay fees.";
      } else if (detectedIntent === "book_transport") {
        result = "Opening transport section to book transportation.";
      } else if (detectedIntent === "report_issue") {
        result = "Opening feedback form to report your concern.";
      } else if (detectedIntent === "get_updates") {
        result = "Loading latest notifications and updates.";
      } else {
        result = "Sorry, I didn't understand that. Try commands like: 'Book doctor appointment', 'Check attendance', 'View today's menu'.";
      }

      setActionResult(result);

      // Generate conversational response (with fallback and timeout)
      let finalResponse = result;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const responseGenerated = await api.post('/voice/generate-response', {
          intent: detectedIntent,
          actionResult: result,
          targetLanguage: 'English'
        }, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (responseGenerated.data && responseGenerated.data.response) {
          finalResponse = responseGenerated.data.response;
        }
      } catch (responseError) {
        if (responseError.name === 'CanceledError') {
          console.log('Response generation timeout, using direct result');
        } else {
          console.log('Response generation failed, using direct result:', responseError.message);
        }
        // Use result directly if API fails or times out
      }

      setTranslatedResponse(finalResponse);

      // Text-to-Speech
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utter = new window.SpeechSynthesisUtterance(finalResponse);
        utter.lang = detectedLanguage === "en" ? "en-US" : detectedLanguage;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }

    } catch (e) {
      console.error('Pipeline error:', e);
      setError(e?.message || 'Failed to process voice command');
      // Make sure to show some result even on error
      if (!actionResult) {
        setActionResult('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eaeaea', bgcolor: '#fff' }}>
      <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', color: themeColor, mb: 2 }}>
        Voice Assistant
      </Typography>

      <Button
        fullWidth
        variant="contained"
        onClick={listening ? stopListening : startListening}
        startIcon={listening ? <Stop /> : <Mic />}
        disabled={loading}
        sx={{
          bgcolor: themeColor,
          textTransform: 'none',
          fontWeight: 700,
          py: 1.25,
          borderRadius: 2,
          '&:hover': { bgcolor: themeColor }
        }}
      >
        {listening ? 'Stop Listening' : 'Start Listening'}
      </Button>

      {!canRecognize && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Speech recognition isn’t supported in this browser. Type your command below.
        </Alert>
      )}

      <Box sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="Type a command (optional)"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          size="small"
        />
        <Button
          fullWidth
          variant="outlined"
          onClick={() => runPipeline(manualText)}
          disabled={loading || !manualText.trim()}
          sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700, borderColor: themeColor, color: themeColor }}
        >
          Run Command
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'grid', gap: 1.25 }}>
        <TextField label="Transcript" value={transcript} size="small" multiline minRows={2} InputProps={{ readOnly: true }} />
        <TextField label="Detected Language" value={detectedLang} size="small" InputProps={{ readOnly: true }} />
        <TextField label="Translated Input (English)" value={translatedInput} size="small" multiline minRows={2} InputProps={{ readOnly: true }} />
        <TextField label="Intent" value={intent} size="small" InputProps={{ readOnly: true }} />
        <TextField label="System Action Result" value={actionResult} size="small" multiline minRows={2} InputProps={{ readOnly: true }} />
        <TextField label="Response (User Language)" value={translatedResponse} size="small" multiline minRows={2} InputProps={{ readOnly: true }} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Processing…</Typography>
        </Box>
      )}

      <Button
        fullWidth
        variant="text"
        onClick={() => runPipeline(transcript)}
        disabled={loading || !transcript.trim()}
        sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700, color: themeColor }}
      >
        Re-run pipeline on transcript
      </Button>
    </Paper>
  );
};

export default VoiceAssistant;
