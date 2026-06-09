const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

module.exports = sequelize.define('Progress', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  caseId: { type: DataTypes.STRING, allowNull: false, unique: true },
  stage: { type: DataTypes.STRING },
  percentage: { type: DataTypes.INTEGER },
  summary: { type: DataTypes.TEXT, allowNull: false },
  nextAction: { type: DataTypes.STRING },
  updatedBy: { type: DataTypes.STRING },
  checklist: { type: DataTypes.JSON, defaultValue: [] },
  updates: { type: DataTypes.JSON, defaultValue: [] }
}, { tableName: 'progresses', timestamps: true });