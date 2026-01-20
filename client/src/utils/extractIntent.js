// Simple intent extraction using keywords
// Returns { intent: string, params: object }
export function extractIntent(text) {
  const lower = text.toLowerCase();
  if (lower.includes("doctor") || lower.includes("appointment")) {
    // Example: "Book doctor appointment for my child tomorrow"
    const timeMatch = lower.match(/tomorrow|today|\d{1,2}(:\d{2})?\s*(am|pm)?/);
    return { intent: "book_doctor", params: { time: timeMatch ? timeMatch[0] : "" } };
  }
  if (lower.includes("attendance")) {
    return { intent: "check_attendance", params: {} };
  }
  if (lower.includes("delivery") || lower.includes("track")) {
    return { intent: "track_delivery", params: {} };
  }
  if (lower.includes("pay") || lower.includes("fee")) {
    return { intent: "pay_fees", params: {} };
  }
  if (lower.includes("transport") || lower.includes("bus")) {
    return { intent: "book_transport", params: {} };
  }
  // Default fallback
  return { intent: "unknown", params: {} };
}
