const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  histId: String,
  caseId: String,
  eventDate: String,
  histType: String,
  summary: String,
  notes: String,
  fileLink: String,
  source: String,
  enteredBy: String,
  timestamp: String
});

module.exports = mongoose.model('History', historySchema);
