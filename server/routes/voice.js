/**
 * Voice Assistant Routes
 * Handles multilingual voice processing, translation, and real-time communication
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const voiceService = require('../services/voiceService');

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max (Whisper API limit)
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/wav',
      'audio/webm',
      'audio/m4a',
      'audio/mpga'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Supported: mp3, mp4, wav, webm, m4a'));
    }
  }
});

// POST /api/voice/process - Process voice command
router.post('/process', async (req, res) => {
  try {
    const { text, childId, userId, preferredLanguage } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const userContext = {
      childId,
      userId,
      preferredLanguage: preferredLanguage || 'en'
    };

    const result = await voiceService.processVoiceCommand(text, userContext);
    res.json(result);
  } catch (error) {
    console.error('Voice processing error:', error);
    res.status(500).json({
      error: 'Failed to process voice command',
      details: error.message
    });
  }
});

// POST /api/voice/translate - Translate text
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and targetLanguage are required' });
    }

    const translatedText = await voiceService.translateText(
      text,
      targetLanguage,
      sourceLanguage || 'auto'
    );

    res.json({
      success: true,
      originalText: text,
      translatedText,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      error: 'Translation failed',
      details: error.message
    });
  }
});

// POST /api/voice/detect-language - Detect language
router.post('/detect-language', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const language = await voiceService.detectLanguage(text);

    res.json({
      success: true,
      text,
      detectedLanguage: language
    });
  } catch (error) {
    console.error('Language detection error:', error);
    res.status(500).json({
      error: 'Language detection failed',
      details: error.message
    });
  }
});

// POST /api/voice/extract-intent - Extract intent from text
router.post('/extract-intent', async (req, res) => {
  try {
    const { text, childId, userId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const userContext = { childId, userId };
    const intentData = await voiceService.extractIntent(text, userContext);

    res.json({
      success: true,
      text,
      ...intentData
    });
  } catch (error) {
    console.error('Intent extraction error:', error);
    res.status(500).json({
      error: 'Intent extraction failed',
      details: error.message
    });
  }
});

// POST /api/voice/generate-response - Generate conversational response
router.post('/generate-response', async (req, res) => {
  try {
    const { intent, actionResult, targetLanguage } = req.body;

    if (!intent || !actionResult) {
      return res.status(400).json({ error: 'Intent and actionResult are required' });
    }

    const response = await voiceService.generateResponse(
      intent,
      actionResult,
      targetLanguage || 'en'
    );

    res.json({
      success: true,
      response,
      targetLanguage: targetLanguage || 'en'
    });
  } catch (error) {
    console.error('Response generation error:', error);
    res.status(500).json({
      error: 'Response generation failed',
      details: error.message
    });
  }
});

// GET /api/voice/languages - Get supported languages
router.get('/languages', (req, res) => {
  try {
    const languages = voiceService.getSupportedLanguages();
    res.json({
      success: true,
      languages,
      count: languages.length
    });
  } catch (error) {
    console.error('Languages fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch languages',
      details: error.message
    });
  }
});

// POST /api/voice/transcribe - Transcribe audio using Whisper
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const language = req.body.language || null;
    const result = await voiceService.transcribeAudio(req.file.buffer, language);

    if (!result.success) {
      return res.status(500).json({
        error: 'Transcription failed',
        details: result.error
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      error: 'Transcription failed',
      details: error.message
    });
  }
});

// POST /api/voice/tts - Text to speech
router.post('/tts', async (req, res) => {
  try {
    const { text, voice, speed } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await voiceService.textToSpeech(
      text,
      voice || 'alloy',
      speed || 1.0
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'TTS failed',
        details: result.error
      });
    }

    // Send audio as binary data
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': result.audio.length
    });
    res.send(result.audio);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({
      error: 'TTS failed',
      details: error.message
    });
  }
});

// GET /api/voice/health - Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Voice Assistant API',
    openai: !!process.env.OPENAI_API_KEY,
    timestamp: new Date()
  });
});

module.exports = router;
