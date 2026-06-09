const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('Action', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  caseId: { type: DataTypes.STRING },
  actionText: { type: DataTypes.TEXT },
  dateTime: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  type: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING }
}, { tableName: 'actions', timestamps: true });