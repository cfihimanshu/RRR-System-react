const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('Timeline', {
  id: { type: DataTypes.STRING, primaryKey: true },
  caseId: { type: DataTypes.STRING },
  eventDate: { type: DataTypes.STRING },
  source: { type: DataTypes.STRING },
  eventType: { type: DataTypes.STRING },
  summary: { type: DataTypes.TEXT },
  fieldChanged: { type: DataTypes.STRING },
  oldValue: { type: DataTypes.TEXT },
  newValue: { type: DataTypes.TEXT }
}, { tableName: 'timelines', timestamps: true });