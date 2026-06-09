const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('AuditLog', {
  id: { type: DataTypes.STRING, primaryKey: true },
  timestamp: { type: DataTypes.STRING },
  user: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING },
  category: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  caseId: { type: DataTypes.STRING }
}, { tableName: 'audit_logs', timestamps: true });