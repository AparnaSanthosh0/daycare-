const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: String, enum: ['staff', 'admin'], default: 'staff' },
  subject: { type: String, trim: true },
  body: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);



