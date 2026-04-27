const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  actionId: String,
  caseId: String,
  dateTime: String,
  dept: String,
  doneBy: String,
  actionType: String,
  summary: String,
  notes: String,
  clientResp: String,
  observation: String,
  nextAction: String,
  nextActionBy: String,
  nextActionDate: String,
  fileLink: String,
  remarks: String
});

module.exports = mongoose.model('Action', actionSchema);
