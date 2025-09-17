const mongoose = require('mongoose');

// Stores hashed OTP codes for email verification
// TTL index on expiresAt auto-removes expired documents
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true, lowercase: true, trim: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpToken', otpSchema);