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

timelineSchema.index({ createdAt: -1 });
timelineSchema.index({ eventType: 1 });
timelineSchema.index({ caseId: 1, eventType: 1 });
timelineSchema.index({ source: 1 });
timelineSchema.index({ source: 1, createdAt: -1 });
timelineSchema.index({ caseId: 1, createdAt: -1 });

module.exports = mongoose.model('Timeline', timelineSchema);
