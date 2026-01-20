// Language detection using Google Cloud Translation API
// Returns detected language code (e.g. 'en', 'ml', 'hi')
export async function detectLanguage(text) {
  const GOOGLE_DETECT_API_URL = "https://translation.googleapis.com/language/translate/v2/detect";
  const API_KEY = process.env.REACT_APP_GOOGLE_TRANSLATE_KEY || "";
  // Graceful fallback when API key isn't configured: assume English.
  if (!API_KEY) return "en";
  const res = await fetch(`${GOOGLE_DETECT_API_URL}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data.detections[0][0].language;
}
