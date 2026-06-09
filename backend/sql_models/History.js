const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('History', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  caseId: { type: DataTypes.STRING },
  field: { type: DataTypes.STRING },
  oldValue: { type: DataTypes.TEXT },
  newValue: { type: DataTypes.TEXT },
  modifiedBy: { type: DataTypes.STRING },
  modifiedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'histories', timestamps: true });