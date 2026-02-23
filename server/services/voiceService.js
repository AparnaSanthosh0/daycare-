/**
 * Voice Assistant Service
 * Handles multilingual voice processing, translation, intent extraction, and TTS
 * Supports 100+ languages including Malayalam, Hindi, Tamil
 */

const OpenAI = require('openai');

// Initialize OpenAI client (reuse existing config)
let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Translate text using OpenAI GPT (more reliable than Google Translate API)
 * Supports 100+ languages
 */
async function translateText(text, targetLanguage, sourceLanguage = 'auto') {
  try {
    const client = getOpenAIClient();
    const sourceInfo = sourceLanguage === 'auto' ? 'detected source language' : sourceLanguage;
    
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the given text from ${sourceInfo} to ${targetLanguage}. Return ONLY the translated text, nothing else.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Translation error:', error.message);
    return text; // Fallback to original text
  }
}

/**
 * Detect language using OpenAI
 * Returns language code (e.g., 'en', 'ml', 'hi', 'ta')
 */
async function detectLanguage(text) {
  try {
    const client = getOpenAIClient();
    
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Detect the language of the given text and return ONLY the ISO 639-1 language code (e.g., "en" for English, "ml" for Malayalam, "hi" for Hindi, "ta" for Tamil). Return just the code, nothing else.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0,
      max_tokens: 10
    });

    const langCode = response.choices[0].message.content.trim().toLowerCase();
    return langCode || 'en';
  } catch (error) {
    console.error('Language detection error:', error.message);
    return 'en'; // Default to English
  }
}

/**
 * Extract intent and parameters using OpenAI
 * Much more accurate than keyword matching
 */
async function extractIntent(text, userContext = {}) {
  try {
    const client = getOpenAIClient();
    
    const systemPrompt = `You are an intent extraction system for a daycare management app. Extract the intent and parameters from user commands.

Supported intents:
- book_doctor: Book doctor appointment
- check_attendance: Check child attendance
- track_delivery: Track order/delivery
- pay_fees: Pay fees/billing
- book_transport: Book/request transport
- view_menu: View today's menu/meal plan
- message_teacher: Send message to teacher/staff
- check_schedule: Check child's schedule
- report_issue: Report an issue/concern
- get_updates: Get latest updates/notifications

Return JSON format:
{
  "intent": "intent_name",
  "confidence": 0.95,
  "entities": {
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "reason": "string",
    "recipient": "string",
    "message": "string"
  }
}

If the intent is unclear, return "unknown" intent with low confidence.`;

    const userMessage = userContext.childId 
      ? `User has selected child ID: ${userContext.childId}\nCommand: ${text}`
      : `Command: ${text}`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0,
      max_tokens: 300
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      intent: result.intent || 'unknown',
      confidence: result.confidence || 0,
      entities: result.entities || {}
    };
  } catch (error) {
    console.error('Intent extraction error:', error.message);
    return {
      intent: 'unknown',
      confidence: 0,
      entities: {}
    };
  }
}

/**
 * Generate conversational response based on action result
 */
async function generateResponse(intent, actionResult, targetLanguage = 'en') {
  try {
    const client = getOpenAIClient();
    
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful voice assistant for a daycare management system. Generate a brief, friendly response based on the action result. Keep it conversational and under 50 words. Response should be in ${targetLanguage}.`
        },
        {
          role: 'user',
          content: `Intent: ${intent}\nAction Result: ${actionResult}\n\nGenerate a friendly voice response.`
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Response generation error:', error.message);
    return actionResult; // Fallback to original result
  }
}

/**
 * Process voice command - complete pipeline
 */
async function processVoiceCommand(text, userContext = {}) {
  try {
    // Step 1: Detect language
    const detectedLang = await detectLanguage(text);
    
    // Step 2: Translate to English if needed (for intent extraction)
    let englishText = text;
    if (detectedLang !== 'en') {
      englishText = await translateText(text, 'English', detectedLang);
    }

    // Step 3: Extract intent
    const intentData = await extractIntent(englishText, userContext);

    // Step 4: Return structured data (action execution happens on frontend/backend)
    return {
      success: true,
      detectedLanguage: detectedLang,
      originalText: text,
      translatedText: englishText,
      intent: intentData.intent,
      confidence: intentData.confidence,
      entities: intentData.entities,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Voice command processing error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * Get supported languages list
 */
function getSupportedLanguages() {
  return [
    // Indian Languages
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
    
    // Major Global Languages
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย' },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
    { code: 'ro', name: 'Romanian', nativeName: 'Română' },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
    { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
    { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
    { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
    { code: 'da', name: 'Danish', nativeName: 'Dansk' },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk' }
    // OpenAI supports 100+ languages
  ];
}

/**
 * Convert speech to text using OpenAI Whisper API
 * Supports multiple audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
 */
async function transcribeAudio(audioBuffer, language = null) {
  try {
    const client = getOpenAIClient();
    
    // Create a File object from buffer
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
    
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: language || undefined, // Auto-detect if not provided
      response_format: 'json'
    });

    return {
      success: true,
      text: transcription.text,
      language: language || 'auto-detected'
    };
  } catch (error) {
    console.error('Whisper transcription error:', error.message);
    return {
      success: false,
      error: error.message,
      text: ''
    };
  }
}

/**
 * Generate speech from text using OpenAI TTS
 * Voices: alloy, echo, fable, onyx, nova, shimmer
 */
async function textToSpeech(text, voice = 'alloy', speed = 1.0) {
  try {
    const client = getOpenAIClient();
    
    const mp3 = await client.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
      speed: speed
    });

    // Return audio buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return {
      success: true,
      audio: buffer,
      format: 'mp3'
    };
  } catch (error) {
    console.error('TTS error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  translateText,
  detectLanguage,
  extractIntent,
  generateResponse,
  processVoiceCommand,
  getSupportedLanguages,
  transcribeAudio,
  textToSpeech
};
