
const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  reqId: String,
  caseId: String,
  amount: String,
  requestedBy: String,
  summary: String,
  ifsc: String,
  accNum: String,
  accHolder: String,
  branch: String,
  accType: String,
  bankName: String,
  status: { type: String, default: "Pending Review" },
  reviewerRemark: String,
  reviewedBy: String,
  approvedBy: String,
  approvedAt: String,
  transactionId: String,
  paymentDate: String,
  paymentProof: String,
  paidBy: String,
  lastStatusAtMs: Number,
  timestamp: String
});

module.exports = mongoose.model('Refund', refundSchema);
