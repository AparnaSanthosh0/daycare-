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
import { Mic, Stop } from '@mui/icons-material';
import { translateText } from "./utils/translate";
import { detectLanguage } from "./utils/detectLanguage";
import { extractIntent } from "./utils/extractIntent";
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
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      setTranscript(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
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
      // 1) Detect language (fallbacks to 'en' if key not set)
      const lang = await detectLanguage(text);
      setDetectedLang(lang);

      // 2) Translate to English if needed
      let inputForIntent = text;
      if (lang !== "en") {
        inputForIntent = await translateText(text, "en");
      }
      setTranslatedInput(inputForIntent);

      // 3) Intent Understanding
      const { intent: detectedIntent, params } = extractIntent(inputForIntent);
      setIntent(detectedIntent);

      // 4) Action execution (real modules/APIs where available)
      let result = "";
      if (detectedIntent === "book_doctor") {
        if (!activeChildId) {
          result = "Please select a child first, then try again.";
        } else {
          const appointmentDate = parseSimpleDate(params?.time || inputForIntent);
          const appointmentTime = parseSimpleTime(params?.time || inputForIntent);
          const reason = params?.reason || "Requested via Voice Assistant";

          await api.post('/appointments', {
            childId: activeChildId,
            appointmentDate,
            appointmentTime,
            reason,
            appointmentType: 'onsite',
            isEmergency: false
          });

          result = `Doctor appointment request submitted for ${appointmentTime} on ${appointmentDate}.`;
        }
      } else if (detectedIntent === "check_attendance") {
        if (!activeChildId) {
          result = "Please select a child first, then ask to check attendance.";
        } else {
          await api.get(`/children/${activeChildId}/attendance`);
          result = "Attendance loaded successfully for your child.";
        }
      } else if (detectedIntent === "track_delivery") {
        result = "Open 'My Orders' to track delivery status.";
      } else if (detectedIntent === "pay_fees") {
        result = "Open 'Billing' to pay fees.";
      } else if (detectedIntent === "book_transport") {
        result = "Open 'Transport' to submit a transport request.";
      } else {
        result = "Sorry, I did not understand your request. Try: 'Book doctor appointment for my child tomorrow at 10 AM'.";
      }

      setActionResult(result);

      // 5) Translate response back to user language
      let finalResponse = result;
      if (lang !== "en") {
        finalResponse = await translateText(result, lang);
      }
      setTranslatedResponse(finalResponse);

      // 6) Text-to-Speech (optional)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utter = new window.SpeechSynthesisUtterance(finalResponse);
        utter.lang = lang === "en" ? "en-US" : lang;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {
      setError(e?.message || 'Failed to process voice command');
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
