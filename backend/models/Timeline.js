const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  id: String,
  caseId: { type: String, index: true },
  eventDate: { type: String, index: true },
  source: String,
  eventType: String,
  summary: String,
  details: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('Timeline', timelineSchema);
