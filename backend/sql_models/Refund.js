const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('Refund', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  caseId: { type: DataTypes.STRING },
  refundAmount: { type: DataTypes.FLOAT },
  reason: { type: DataTypes.TEXT },
  requestedBy: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'Pending Review' },
  remarks: { type: DataTypes.TEXT },
  installments: { type: DataTypes.JSON, defaultValue: [] },
  transactionId: { type: DataTypes.STRING },
  paymentDate: { type: DataTypes.STRING }
}, { tableName: 'refunds', timestamps: true });