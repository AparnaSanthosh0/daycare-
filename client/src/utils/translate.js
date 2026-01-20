// Translation API utility
// Uses Google Translate API (or similar) via fetch. Replace API_KEY with your own if needed.
// For production, proxy this through your backend for security.

const GOOGLE_TRANSLATE_API_URL = "https://translation.googleapis.com/language/translate/v2";
const API_KEY = process.env.REACT_APP_GOOGLE_TRANSLATE_KEY || ""; // Set in .env

export async function translateText(text, targetLang = "en") {
  // Graceful fallback for local/dev environments without a key.
  // If there's no key, just return the original text (no translation).
  if (!API_KEY) return text;
  const res = await fetch(`${GOOGLE_TRANSLATE_API_URL}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      target: targetLang,
      format: "text"
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data.translations[0].translatedText;
}
