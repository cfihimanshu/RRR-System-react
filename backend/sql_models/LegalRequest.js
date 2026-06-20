const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('LegalRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  caseId: { type: DataTypes.STRING, allowNull: false },
  documentName: { type: DataTypes.STRING, allowNull: false },
  fileLink: { type: DataTypes.STRING },
  remark: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING, defaultValue: "Pending" },
  rejectRemark: { type: DataTypes.TEXT },
  requestedBy: { type: DataTypes.STRING },
  requestedByName: { type: DataTypes.STRING }
}, { tableName: 'legal_requests', timestamps: true });
