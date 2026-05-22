
const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  reqId: String,
  caseId: String,
  amount: String,
  requestedBy: String,
  requestedByName: String,
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
  documentLink: String,
  installments: [{
    amount: String,
    dueDate: String,
    status: { type: String, default: 'Pending' },
    transactionId: String,
    paymentDate: String,
    paymentProof: String,
    paidBy: String
  }],
  requests: [{
    reqId: String,
    amount: String,
    requestedBy: String,
    requestedByName: String,
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
    documentLink: String,
    installments: [{
      amount: String,
      dueDate: String,
      status: { type: String, default: 'Pending' },
      transactionId: String,
      paymentDate: String,
      paymentProof: String,
      paidBy: String
    }],
    timestamp: String
  }],
  lastStatusAtMs: Number,
  timestamp: String
});

refundSchema.index({ requestedBy: 1 });
refundSchema.index({ status: 1 });
refundSchema.index({ caseId: 1 });
refundSchema.index({ status: 1, requestedBy: 1 });
refundSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Refund', refundSchema);
