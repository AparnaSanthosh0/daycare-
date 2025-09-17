// Lazy-load Twilio to avoid crashing when the SDK is not installed
function loadTwilioLib() {
  try { return require('twilio'); } catch (_) { return null; }
}

let smsClient;
function getTwilioClient() {
  if (smsClient) return smsClient;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('SMS env not fully configured. Using console logger for development.');
    return null; // fall back to console in sendSms
  }
  const twilio = loadTwilioLib();
  if (!twilio) {
    console.warn('Twilio SDK not installed. Using console logger for development.');
    return null;
  }
  smsClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return smsClient;
}

async function sendSms(to, body) {
  const client = getTwilioClient();
  const from = process.env.TWILIO_SMS_FROM || '+0000000000';
  if (!client) {
    // Dev fallback: log SMS contents so you can see what would be sent
    console.log(`DEV SMS -> to: ${to}, from: ${from}, body: ${body}`);
    return { preview: true };
  }
  if (!process.env.TWILIO_SMS_FROM) {
    console.warn('TWILIO_SMS_FROM not configured. Using development preview log.');
    console.log(`DEV SMS -> to: ${to}, from: ${from}, body: ${body}`);
    return { preview: true };
  }
  return client.messages.create({ to, from, body });
}

async function sendWhatsApp(to, body) {
  const client = getTwilioClient();
  if (!client) {
    console.warn(`Skipping WhatsApp to ${to}: client not configured`);
    return { skipped: true };
  }
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g., 'whatsapp:+14155238886'
  if (!from) {
    console.warn('TWILIO_WHATSAPP_FROM not configured. Skipping WhatsApp.');
    return { skipped: true };
  }
  const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  return client.messages.create({ to: toWa, from, body });
}

module.exports = {
  sendSms,
  sendWhatsApp
};









