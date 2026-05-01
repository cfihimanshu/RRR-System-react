const mongoose = require('mongoose');

const actionSchema = new mongoose.Schema({
  actionId: String,
  caseId: String,
  dateTime: { type: Date, default: Date.now },
  actionModality: String,
  operatorNode: String,
  remarks: String,
  nextScheduledDate: String,
  attachment: String,
  stateChangeAuthorization: {
    type: String,
    enum: ['New', 'In-progress', 'Settled', 'Stucked'],
    default: 'New'
  },
  doneBy: String,
  // Keep some old fields for compatibility
  actionType: String,
  summary: String,
  fileLink: String
}, { timestamps: true });

module.exports = mongoose.model('Action', actionSchema);
