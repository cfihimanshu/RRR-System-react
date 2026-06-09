const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('Communication', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  commId: { type: DataTypes.STRING },
  caseId: { type: DataTypes.STRING },
  dateTime: { type: DataTypes.STRING },
  mode: { type: DataTypes.STRING },
  direction: { type: DataTypes.STRING },
  fromTo: { type: DataTypes.STRING },
  summary: { type: DataTypes.TEXT },
  exactDemand: { type: DataTypes.BOOLEAN, defaultValue: false },
  legalThreat: { type: DataTypes.BOOLEAN, defaultValue: false },
  smMentioned: { type: DataTypes.BOOLEAN, defaultValue: false },
  demandAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  refundDemanded: { type: DataTypes.FLOAT, defaultValue: 0 },
  amountSaved: { type: DataTypes.FLOAT, defaultValue: 0 },
  loggedBy: { type: DataTypes.STRING }
}, { tableName: 'communications', timestamps: true });