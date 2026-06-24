const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('LegalProcess', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  caseId: { type: DataTypes.STRING, allowNull: false },
  stage: { type: DataTypes.STRING, allowNull: false },
  mouDocChecked: { type: DataTypes.BOOLEAN, defaultValue: false },
  invoicesChecked: { type: DataTypes.BOOLEAN, defaultValue: false },
  paymentReceiptChecked: { type: DataTypes.BOOLEAN, defaultValue: false },
  caseStudyDocChecked: { type: DataTypes.BOOLEAN, defaultValue: false },
  summary: { type: DataTypes.TEXT },
  submittedBy: { type: DataTypes.STRING }
}, { tableName: 'legal_processes', timestamps: true });
