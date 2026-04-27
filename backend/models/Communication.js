const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema({
  commId: String,
  caseId: String,
  dateTime: String,
  mode: String,
  direction: String,
  fromTo: String,
  summary: String,
  exactDemand: String,
  refundDemanded: String,
  legalThreat: String,
  smMentioned: String,
  fileLink: String,
  loggedBy: String
});

module.exports = mongoose.model('Communication', communicationSchema);
