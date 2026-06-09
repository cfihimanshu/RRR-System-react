const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('Agreement', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  caseId: { type: DataTypes.STRING },
  generatedBy: { type: DataTypes.STRING, allowNull: false },
  generatedByName: { type: DataTypes.STRING, defaultValue: '' },
  clientName: { type: DataTypes.STRING, allowNull: false },
  firstPartyCompany: { type: DataTypes.STRING, defaultValue: '' },
  secondCompany: { type: DataTypes.STRING, defaultValue: '' },
  address: { type: DataTypes.TEXT, defaultValue: '' },
  pincode: { type: DataTypes.STRING, defaultValue: '' },
  firstPartySignatory: { type: DataTypes.STRING, defaultValue: '' },
  secondPartySignatory: { type: DataTypes.STRING, defaultValue: '' },
  templateId: { type: DataTypes.STRING, defaultValue: '' },
  settlementAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  amountInWords: { type: DataTypes.STRING, defaultValue: '' },
  date: { type: DataTypes.STRING, defaultValue: '' },
  installments: { type: DataTypes.JSON, defaultValue: [] },
  pdfBase64: { type: DataTypes.TEXT('long') },
  pdfUrl: { type: DataTypes.STRING, defaultValue: '' }
}, { tableName: 'agreements', timestamps: true });