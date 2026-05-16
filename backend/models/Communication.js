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
  loggedBy: String,
  demandAmount: { type: Number, default: 0 },
  amountSaved: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Communication', communicationSchema);
