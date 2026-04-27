const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  id: String,
  caseId: { type: String, index: true },
  eventDate: { type: String, index: true },
  source: String,
  eventType: String,
  summary: String
});

module.exports = mongoose.model('Timeline', timelineSchema);
