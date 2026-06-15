const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('Refund', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  caseId: { type: DataTypes.STRING },
  amount: { type: DataTypes.STRING },
  summary: { type: DataTypes.TEXT },
  bankName: { type: DataTypes.STRING },
  accHolder: { type: DataTypes.STRING },
  ifsc: { type: DataTypes.STRING },
  accNum: { type: DataTypes.STRING },
  branch: { type: DataTypes.STRING },
  accType: { type: DataTypes.STRING },
  requestedBy: { type: DataTypes.STRING },
  requestedByName: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'Pending Review' },
  reviewerRemark: { type: DataTypes.TEXT },
  reviewedBy: { type: DataTypes.STRING },
  approvedBy: { type: DataTypes.STRING },
  approvedAt: { type: DataTypes.STRING },
  installments: { type: DataTypes.JSON, defaultValue: [] },
  requests: { type: DataTypes.JSON, defaultValue: [] },
  documentLink: { type: DataTypes.STRING },
  transactionId: { type: DataTypes.STRING },
  paymentDate: { type: DataTypes.STRING },
  paymentProof: { type: DataTypes.STRING },
  paidBy: { type: DataTypes.STRING },
  reqId: { type: DataTypes.STRING },
  timestamp: { type: DataTypes.STRING },
  lastStatusAtMs: { type: DataTypes.BIGINT },
  // Legacy fields
  refundAmount: { type: DataTypes.FLOAT },
  reason: { type: DataTypes.TEXT },
  remarks: { type: DataTypes.TEXT }
}, { tableName: 'refunds', timestamps: true });